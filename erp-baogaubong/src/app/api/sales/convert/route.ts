import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { inScope } from '@/lib/scope';
import { nextCode } from '@/lib/seq';
import { currentDebtOf, logStatus } from '@/modules/sales/server';
import { checkApproval } from '@/modules/sales/domain';

/** Chuyen bao gia → don hang, KHONG nhap lai. Chong chuyen trung bang quoteId unique. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('sales.manage');
  const b = z.object({ quoteId: z.number().int() }).safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Thiếu quoteId');
  const quote = await prisma.quote.findFirst({
    where: { id: b.data.quoteId, deletedAt: null }, include: { lines: true, order: true } });
  if (!quote || !inScope(actor, quote)) throw jsonError(404, 'Không tìm thấy báo giá trong phạm vi của bạn.');
  if (quote.order) {
    return Response.json({ ok: false, error: `Báo giá đã được chuyển thành đơn ${quote.order.code} — không chuyển lại được.`,
      orderId: quote.order.id, orderCode: quote.order.code }, { status: 409 });
  }
  if (!['SENT', 'ACCEPTED'].includes(quote.status)) {
    throw jsonError(400, 'Chỉ chuyển được báo giá Đã gửi hoặc Khách đồng ý.');
  }
  if (quote.approvalStatus === 'PENDING') throw jsonError(400, 'Báo giá đang chờ duyệt — chưa chuyển được.');
  if (quote.approvalStatus === 'REJECTED') throw jsonError(400, 'Báo giá bị từ chối duyệt — sửa lại trước.');
  // Xet cong no khach cho DON (bao gia khong xet no)
  let approvalStatus: 'NONE' | 'PENDING' = 'NONE';
  let approvalReason: string | null = null;
  if (quote.partnerId) {
    const p = await prisma.partner.findUnique({ where: { id: quote.partnerId }, select: { creditLimit: true } });
    const debt = await currentDebtOf(quote.partnerId);
    const chk = checkApproval({ discountPct: 0, maxDiscountPct: 100,
      isAdmin: actor.perms.includes('sales.approve'),
      total: quote.total, creditLimit: p?.creditLimit ?? 0, currentDebt: debt, paidNow: 0 });
    if (chk.needed) { approvalStatus = 'PENDING'; approvalReason = chk.reasons.join('; '); }
  }
  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, 'DH-');
    const o = await tx.salesOrder.create({ data: {
      code, quoteId: quote.id, partnerId: quote.partnerId, partnerName: quote.partnerName,
      vatEnabled: quote.vatEnabled, vatPercent: quote.vatPercent,
      subtotal: quote.subtotal, discountPct: quote.discountPct, discountAmt: quote.discountAmt,
      otherFee: quote.otherFee, shippingFee: quote.shippingFee, taxAmt: quote.taxAmt, total: quote.total,
      approvalStatus, approvalReason, note: quote.note,
      assignedToId: quote.assignedToId, createdById: actor.id, branchId: quote.branchId } });
    await tx.orderLine.createMany({ data: quote.lines.map((l) => ({
      orderId: o.id, variantId: l.variantId, sku: l.sku, name: l.name, unit: l.unit,
      qty: l.qty, unitPrice: l.unitPrice, discountPct: l.discountPct, taxPercent: l.taxPercent,
      lineTotal: l.lineTotal, note: l.note })) });
    if (quote.status !== 'ACCEPTED') {
      await tx.quote.update({ where: { id: quote.id }, data: { status: 'ACCEPTED' } });
      await logStatus(tx, 'quote', quote.id, 'quote', quote.status, 'ACCEPTED', actor, 'Chuyển thành đơn');
    }
    await logStatus(tx, 'order', o.id, 'order', '—', 'NEW', actor, `Từ báo giá ${quote.code}`);
    return o;
    });
  } catch (e) {
    // Race double-submit: quoteId @unique bi dam → bao 409 than thien thay vi 500
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') {
      const existing = await prisma.salesOrder.findUnique({ where: { quoteId: quote.id }, select: { id: true, code: true } });
      return Response.json({ ok: false, error: `Báo giá đã được chuyển thành đơn ${existing?.code ?? ''} — không chuyển lại được.`,
        orderId: existing?.id, orderCode: existing?.code }, { status: 409 });
    }
    throw e;
  }
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'quote_convert', entity: 'order',
    entityId: order.code, after: { from: quote.code, total: order.total, approvalStatus }, ip, ua });
  return Response.json({ ok: true, orderId: order.id, orderCode: order.code,
    approvalNeeded: approvalStatus === 'PENDING', approvalReason });
});
