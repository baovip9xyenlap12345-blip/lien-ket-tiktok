import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { inScope } from '@/lib/scope';
import { nextCode } from '@/lib/seq';
import { paymentStatusOf } from '@/modules/sales/domain';
import { logStatus } from '@/modules/sales/server';
import { createCashTx, accountForMethod } from '@/modules/finance/server';

/** Thu tien cho don hang (POS/ban hang). So cai cong no day du lam o GD5. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('sales.manage');
  const b = z.object({ orderId: z.number().int(), amount: z.number().int().positive('Số tiền phải > 0'),
    method: z.enum(['CASH', 'TRANSFER']).default('CASH'), note: z.string().optional(),
    idempotencyKey: z.string().trim().min(8).optional() })
    .safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const pre = await prisma.salesOrder.findFirst({ where: { id: d.orderId, deletedAt: null } });
  if (!pre || !inScope(actor, pre)) throw jsonError(404, 'Không tìm thấy đơn trong phạm vi của bạn.');
  if (pre.orderStatus === 'CANCELLED') throw jsonError(400, 'Đơn đã hủy — không thu tiền được.');
  const result = await prisma.$transaction(async (tx) => {
    // KHOA DONG don → doc paidAmt/total MOI NHAT trong tx, chong lost-update khi thu 2 lan dong thoi
    await tx.$queryRaw`SELECT id FROM "SalesOrder" WHERE id = ${d.orderId} FOR UPDATE`;
    const order = await tx.salesOrder.findUniqueOrThrow({ where: { id: d.orderId } });
    const remaining = order.total - order.paidAmt;
    if (remaining <= 0) throw jsonError(400, 'Đơn đã thu đủ tiền.');
    const amount = Math.min(d.amount, remaining);
    const code = await nextCode(tx, 'PT-');
    const cash = await createCashTx(tx, { actor, kind: 'RECEIPT', code,
      accountId: await accountForMethod(tx, d.method), amount,
      partnerId: order.partnerId, partnerName: order.partnerName, orderId: order.id,
      reason: `Thu tiền đơn ${order.code}`, note: d.note ?? null,
      idempotencyKey: d.idempotencyKey ?? null });
    if (cash.duplicated) return { code: cash.tx.code, paidAmt: order.paidAmt,
      newStatus: order.paymentStatus, change: 0, amount: 0, duplicated: true };
    const pay = await tx.payment.create({ data: {
      code, orderId: order.id, partnerId: order.partnerId, amount, method: d.method,
      note: d.note ?? null, cashTxId: cash.tx.id, createdById: actor.id } });
    const paidAmt = order.paidAmt + amount;
    const newStatus = paymentStatusOf(order.total, paidAmt);
    await tx.salesOrder.update({ where: { id: order.id }, data: { paidAmt, paymentStatus: newStatus } });
    if (newStatus !== order.paymentStatus) {
      await logStatus(tx, 'order', order.id, 'payment', order.paymentStatus, newStatus, actor,
        `${pay.code}: +${amount.toLocaleString('vi-VN')}đ (${d.method === 'CASH' ? 'tiền mặt' : 'chuyển khoản'})`);
    }
    return { code: pay.code, paidAmt, newStatus, change: Math.max(0, d.amount - amount), amount, duplicated: false };
  });
  if (!result.duplicated) {
    const { ip, ua } = reqMeta();
    await audit({ actorId: actor.id, actorName: actor.name, action: 'payment_create', entity: 'payment',
      entityId: result.code, after: { order: pre.code, amount: result.amount, method: d.method }, ip, ua });
  }
  return Response.json({ ok: true, code: result.code, paidAmt: result.paidAmt,
    paymentStatus: result.newStatus, change: result.change, duplicated: result.duplicated });
});
