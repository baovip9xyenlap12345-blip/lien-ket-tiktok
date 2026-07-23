import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { createCashTx } from '@/modules/finance/server';
import { assertRefundable } from '@/modules/finance/domain';

const In = z.object({
  txId: z.number().int(),                 // phieu thu goc
  amount: z.number().int().positive(),
  reason: z.string().trim().min(1, 'Nhập lý do hoàn tiền'),
  idempotencyKey: z.string().trim().min(8).optional(),
});

/** Hoan tien: chung tu HT- LIEN KET phieu thu goc — khong sua/xoa phieu cu. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('finance.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const result = await prisma.$transaction(async (tx) => {
    if (d.idempotencyKey) {
      const dup = await tx.cashTransaction.findUnique({ where: { idempotencyKey: d.idempotencyKey } });
      if (dup) return { row: dup, duplicated: true };
    }
    const orig = await tx.cashTransaction.findFirst({
      where: { id: d.txId, kind: 'RECEIPT', status: 'APPROVED' }, include: { refunds: true } });
    if (!orig) throw jsonError(404, 'Không tìm thấy phiếu thu gốc (phải là phiếu thu đã duyệt).');
    const refunded = orig.refunds.filter((r) => r.status === 'APPROVED').reduce((a, r) => a + r.amount, 0);
    try { assertRefundable(orig.amount, refunded, d.amount); }
    catch (e) { throw jsonError(400, (e as Error).message); }
    const { tx: row } = await createCashTx(tx, { actor, kind: 'REFUND',
      accountId: orig.accountId, amount: d.amount,
      partnerId: orig.partnerId, partnerName: orig.partnerName, orderId: orig.orderId,
      reason: d.reason, note: `Hoàn cho ${orig.code}`,
      refundOfId: orig.id, idempotencyKey: d.idempotencyKey ?? null, forceApproved: true });
    if (orig.orderId) {
      const order = await tx.salesOrder.findUnique({ where: { id: orig.orderId } });
      if (order) {
        // Ghi giao dich lien ket am vao lich su thu cua don — KHONG dung phieu cu
        await tx.payment.create({ data: { code: row.code, orderId: order.id, partnerId: order.partnerId,
          amount: -d.amount, method: 'CASH', note: `Hoàn tiền: ${d.reason}`, cashTxId: row.id, createdById: actor.id } });
        const paidAmt = order.paidAmt - d.amount;
        await tx.salesOrder.update({ where: { id: order.id },
          data: { paidAmt, paymentStatus: paidAmt <= 0 ? 'REFUNDED' : 'PARTIAL' } });
      }
    }
    return { row, duplicated: false };
  });
  if (!result.duplicated) {
    const { ip, ua } = reqMeta();
    await audit({ actorId: actor.id, actorName: actor.name, action: 'cash_refund', entity: 'cash_tx',
      entityId: result.row.code, after: { original: d.txId, amount: d.amount, reason: d.reason }, ip, ua });
  }
  return Response.json({ ok: true, code: result.row.code, duplicated: result.duplicated });
});
