import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guarded, jsonError } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { nextCode } from '@/lib/seq';
import { requirePortal } from '@/modules/portal/server';
import { storagePut, MAX_UPLOAD_BYTES, ALLOWED_MIME } from '@/lib/storage';

const QuoteReqIn = z.object({ action: z.literal('quote_request'),
  lines: z.array(z.object({ variantId: z.number().int(), qty: z.number().int().positive() })).min(1, 'Chọn ít nhất 1 sản phẩm'),
  note: z.string().optional().nullable() });
const DesignDecideIn = z.object({ action: z.literal('design_decide'),
  versionId: z.number().int(), approve: z.boolean(), note: z.string().optional().nullable() });
const DesignCommentIn = z.object({ action: z.literal('design_comment'),
  versionId: z.number().int(), content: z.string().trim().min(1) });
const ReorderIn = z.object({ action: z.literal('reorder'), orderId: z.number().int() });
const SupportIn = z.object({ action: z.literal('support'), content: z.string().trim().min(3, 'Nhập nội dung cần hỗ trợ') });
const In = z.discriminatedUnion('action', [QuoteReqIn, DesignDecideIn, DesignCommentIn, ReorderIn, SupportIn]);

/** Hanh dong tu cong khach — moi thu deu gan partnerId cua phien. */
export const POST = guarded(async (req) => {
  const me = await requirePortal();
  const ct = req.headers.get('content-type') ?? '';

  // Upload logo/thiet ke (multipart)
  if (ct.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw jsonError(400, 'Thiếu file.');
    if (file.size > MAX_UPLOAD_BYTES) throw jsonError(400, 'File quá 10MB.');
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_MIME.has(mime)) throw jsonError(400, 'Chỉ nhận ảnh, PDF, Word, Excel.');
    const key = await storagePut(Buffer.from(await file.arrayBuffer()), file.name);
    // uploadedById tro ve sale phu trach (FK user that) — ten file danh dau ro do khach gui
    const owner = await prisma.partner.findUnique({ where: { id: me.partnerId } });
    const row = await prisma.attachment.create({ data: {
      partnerId: me.partnerId, entity: 'partner', entityId: String(me.partnerId),
      fileName: `[KH gửi] ${file.name}`, mime, size: file.size, storageKey: key,
      uploadedById: owner?.assignedToId ?? 1 } });
    await audit({ actorId: null, actorName: `portal:${me.username}`, action: 'portal_upload',
      entity: 'partner', entityId: String(me.partnerId), after: { fileName: file.name } });
    return Response.json({ ok: true, id: row.id });
  }

  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;

  // Yeu cau bao gia: tao Quote NHAP gan sale phu trach — gia de trong cho sale bao
  if (d.action === 'quote_request' || d.action === 'reorder') {
    let lines: { variantId: number; qty: number }[] = [];
    let note = '';
    if (d.action === 'reorder') {
      const old = await prisma.salesOrder.findFirst({
        where: { id: d.orderId, partnerId: me.partnerId, deletedAt: null }, include: { lines: true } });
      if (!old) throw jsonError(404, 'Không tìm thấy đơn của bạn.');   // IDOR: don nguoi khac → 404
      lines = old.lines.filter((l) => l.variantId).map((l) => ({ variantId: l.variantId!, qty: l.qty }));
      note = `Khách đặt lại từ đơn ${old.code}`;
    } else {
      lines = d.lines;
      note = d.note ?? '';
    }
    if (!lines.length) throw jsonError(400, 'Không có dòng hàng hợp lệ.');
    const partner = await prisma.partner.findUnique({ where: { id: me.partnerId } });
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: lines.map((l) => l.variantId) }, deletedAt: null },
      include: { product: { include: { unit: true } } } });
    const vMap = new Map(variants.map((v) => [v.id, v]));
    const quote = await prisma.$transaction(async (tx) => {
      const code = await nextCode(tx, 'BG-');
      const q = await tx.quote.create({ data: { code,
        partnerId: me.partnerId, partnerName: me.partnerName,
        priceListId: me.priceListId, vatEnabled: true,
        note: `[TỪ CỔNG KHÁCH] ${note}`.trim(),
        assignedToId: partner?.assignedToId ?? null, createdById: partner?.assignedToId ?? 1 } });
      await tx.quoteLine.createMany({ data: lines.map((l) => {
        const v = vMap.get(l.variantId);
        return { quoteId: q.id, variantId: l.variantId, sku: v?.sku ?? String(l.variantId),
          name: v ? [v.product.name, v.size, v.color].filter(Boolean).join(' - ') : '?',
          unit: v?.product.unit.name ?? '', qty: l.qty, unitPrice: 0, lineTotal: 0 };
      }) });
      return q;
    });
    await audit({ actorId: null, actorName: `portal:${me.username}`,
      action: d.action === 'reorder' ? 'portal_reorder' : 'portal_quote_request',
      entity: 'quote', entityId: quote.code });
    return Response.json({ ok: true, code: quote.code });
  }

  // Duyet / gop y ban demo — CHI thiet ke cua chinh khach nay
  if (d.action === 'design_decide' || d.action === 'design_comment') {
    const ver = await prisma.designVersion.findUnique({ where: { id: d.versionId },
      include: { design: true } });
    if (!ver || ver.design.partnerId !== me.partnerId || ver.design.deletedAt) {
      throw jsonError(404, 'Không tìm thấy bản thiết kế của bạn.');   // IDOR
    }
    if (d.action === 'design_comment') {
      await prisma.designComment.create({ data: { versionId: ver.id, content: d.content,
        byId: 0, byName: `Khách: ${me.partnerName}` } });
      return Response.json({ ok: true });
    }
    if (ver.status !== 'PENDING') throw jsonError(400, 'Bản này đã được quyết định.');
    await prisma.$transaction(async (tx) => {
      await tx.designVersion.update({ where: { id: ver.id },
        data: { status: d.approve ? 'APPROVED' : 'REJECTED',
          decidedById: 0, decidedByName: `Khách: ${me.partnerName}`,
          decidedAt: new Date(), decideNote: d.note ?? null } });
      if (d.approve) {
        await tx.designRequest.update({ where: { id: ver.designId }, data: { status: 'APPROVED' } });
      }
    });
    await audit({ actorId: null, actorName: `portal:${me.username}`,
      action: d.approve ? 'portal_design_approve' : 'portal_design_reject',
      entity: 'design', entityId: ver.design.code, after: { version: ver.no, note: d.note } });
    return Response.json({ ok: true });
  }

  // Gui ho tro → thanh hoat dong cham soc trong CRM (sale thay ngay)
  const partner = await prisma.partner.findUnique({ where: { id: me.partnerId } });
  await prisma.careActivity.create({ data: { partnerId: me.partnerId, kind: 'TASK',
    content: `[HỖ TRỢ TỪ CỔNG KHÁCH] ${d.content}`,
    dueAt: new Date(Date.now() + 24 * 3600 * 1000),
    assigneeId: partner?.assignedToId ?? null, createdById: partner?.assignedToId ?? 1 } });
  await audit({ actorId: null, actorName: `portal:${me.username}`, action: 'portal_support',
    entity: 'partner', entityId: String(me.partnerId) });
  return Response.json({ ok: true });
});
