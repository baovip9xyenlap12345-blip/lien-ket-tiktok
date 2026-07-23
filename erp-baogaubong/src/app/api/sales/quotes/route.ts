import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { scopeWhere, inScope } from '@/lib/scope';
import { nextCode } from '@/lib/seq';
import { priceAndApprove, logStatus } from '@/modules/sales/server';

export const GET = guarded(async (req) => {
  const user = await requirePerm('sales.view');
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const status = url.searchParams.get('status') ?? '';
  const id = Number(url.searchParams.get('id')) || 0;
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const take = 20;
  if (id) {
    const quote = await prisma.quote.findFirst({ where: { id, deletedAt: null },
      include: { lines: true, revisions: { orderBy: { version: 'desc' }, select: { version: true, createdAt: true } } } });
    if (!quote || !inScope(user, quote)) throw jsonError(404, 'Không tìm thấy báo giá trong phạm vi của bạn.');
    return Response.json({ ok: true, quote });
  }
  const where: Prisma.QuoteWhereInput = {
    deletedAt: null, ...scopeWhere(user),
    ...(status ? { status: status as never } : {}),
    ...(q ? { OR: [
      { code: { contains: q, mode: 'insensitive' } },
      { partnerName: { contains: q, mode: 'insensitive' } },
    ] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.quote.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * take, take,
      include: { order: { select: { id: true, code: true } } } }),
    prisma.quote.count({ where }),
  ]);
  return Response.json({ ok: true, rows, total, page, take });
});

const LineIn = z.object({
  variantId: z.number().int(), qty: z.number().int().positive(),
  unitPrice: z.number().int().min(0), discountPct: z.number().min(0).max(100).default(0),
  note: z.string().optional() });
const QuoteIn = z.object({
  id: z.number().int().optional(),
  partnerId: z.number().int().nullable().optional(),
  partnerName: z.string().trim().min(1, 'Thiếu tên khách'),
  priceListId: z.number().int().nullable().optional(),
  lines: z.array(LineIn).min(1, 'Báo giá cần ít nhất 1 dòng hàng'),
  discountPct: z.number().min(0).max(100).default(0),
  discountAmt: z.number().int().min(0).default(0),
  otherFee: z.number().int().min(0).default(0),
  shippingFee: z.number().int().min(0).default(0),
  vatEnabled: z.boolean().default(true),
  vatPercent: z.number().int().min(0).max(100).optional(),
  validUntil: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const POST = guarded(async (req) => {
  const actor = await requirePerm('sales.manage');
  const b = QuoteIn.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const { snap, totals, vatPercent, approval } = await priceAndApprove({
    actor, lines: d.lines, partnerId: d.partnerId, priceListId: d.priceListId,
    discountPct: d.discountPct, discountAmt: d.discountAmt,
    otherFee: d.otherFee, shippingFee: d.shippingFee,
    vatEnabled: d.vatEnabled, vatPercent: d.vatPercent, checkDebt: false });
  const base = {
    partnerId: d.partnerId ?? null, partnerName: d.partnerName, priceListId: d.priceListId ?? null,
    vatEnabled: d.vatEnabled, vatPercent,
    subtotal: totals.subtotal, discountPct: d.discountPct, discountAmt: totals.discountAmt,
    otherFee: d.otherFee, shippingFee: d.shippingFee, taxAmt: totals.taxAmt, total: totals.total,
    validUntil: d.validUntil ? new Date(d.validUntil) : null, note: d.note ?? null,
    approvalStatus: (approval.needed ? 'PENDING' : 'NONE') as 'PENDING' | 'NONE',
    approvalReason: approval.needed ? approval.reasons.join('; ') : null,
  };
  const result = await prisma.$transaction(async (tx) => {
    let quote;
    if (d.id) {
      const cur = await tx.quote.findFirst({ where: { id: d.id, deletedAt: null }, include: { order: true } });
      if (!cur || !inScope(actor, cur)) throw jsonError(404, 'Không tìm thấy báo giá trong phạm vi của bạn.');
      if (cur.order) throw jsonError(400, 'Báo giá đã chuyển thành đơn — không sửa được nữa.');
      if (!['DRAFT', 'SENT'].includes(cur.status)) throw jsonError(400, 'Chỉ sửa được báo giá Nháp hoặc Đã gửi.');
      quote = await tx.quote.update({ where: { id: d.id },
        data: { ...base, version: { increment: 1 },
          status: 'DRAFT' } });
      await tx.quoteLine.deleteMany({ where: { quoteId: d.id } });
    } else {
      const code = await nextCode(tx, 'BG-');
      quote = await tx.quote.create({ data: { ...base, code,
        assignedToId: actor.id, createdById: actor.id, branchId: actor.branchId ?? null } });
    }
    await tx.quoteLine.createMany({ data: snap.map((s) => ({ ...s, quoteId: quote.id })) });
    // Snapshot phien ban (spec: luu snapshot dong hang & phien ban bao gia)
    await tx.quoteRevision.create({ data: { quoteId: quote.id, version: quote.version,
      data: { base: { ...base, validUntil: base.validUntil?.toISOString() ?? null }, lines: snap } as never } });
    return quote;
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: d.id ? 'quote_update' : 'quote_create',
    entity: 'quote', entityId: result.code,
    after: { total: totals.total, lines: snap.length, approval: approval.reasons }, ip, ua });
  return Response.json({ ok: true, id: result.id, code: result.code, version: result.version,
    approvalNeeded: approval.needed, approvalReasons: approval.reasons });
});

export const DELETE = guarded(async (req) => {
  const actor = await requirePerm('sales.manage');
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) throw jsonError(400, 'Thiếu id');
  const cur = await prisma.quote.findFirst({ where: { id, deletedAt: null }, include: { order: true } });
  if (!cur || !inScope(actor, cur)) throw jsonError(404, 'Không tìm thấy báo giá trong phạm vi của bạn.');
  if (cur.order) throw jsonError(400, 'Báo giá đã có đơn hàng — hủy đơn trước.');
  await prisma.quote.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ actorId: actor.id, actorName: actor.name, action: 'quote_delete', entity: 'quote', entityId: cur.code });
  return Response.json({ ok: true });
});

/** Chuyen trang thai bao gia (may trang thai + chan khi cho duyet). */
export const PATCH = guarded(async (req) => {
  const actor = await requirePerm('sales.manage');
  const b = z.object({ id: z.number().int(), to: z.string() }).safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu không hợp lệ');
  const cur = await prisma.quote.findFirst({ where: { id: b.data.id, deletedAt: null } });
  if (!cur || !inScope(actor, cur)) throw jsonError(404, 'Không tìm thấy báo giá trong phạm vi của bạn.');
  const { assertTransition } = await import('@/modules/sales/domain');
  try { assertTransition('quote', cur.status, b.data.to); }
  catch (e) { throw jsonError(400, (e as Error).message); }
  if (b.data.to === 'SENT' && cur.approvalStatus === 'PENDING') {
    throw jsonError(400, 'Báo giá đang chờ duyệt chiết khấu — chưa gửi được.');
  }
  if (b.data.to === 'SENT' && cur.approvalStatus === 'REJECTED') {
    throw jsonError(400, 'Báo giá đã bị từ chối duyệt — sửa lại chiết khấu trước.');
  }
  await prisma.$transaction(async (tx) => {
    await tx.quote.update({ where: { id: cur.id }, data: { status: b.data.to as never } });
    await logStatus(tx, 'quote', cur.id, 'quote', cur.status, b.data.to, actor);
  });
  return Response.json({ ok: true });
});
