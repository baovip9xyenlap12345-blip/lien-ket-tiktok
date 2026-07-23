import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { createCashTx } from '@/modules/finance/server';
import { balanceOf } from '@/modules/finance/domain';

const In = z.object({
  fromId: z.number().int(), toId: z.number().int(),
  amount: z.number().int().positive('Số tiền phải > 0'),
  note: z.string().optional().nullable(),
  idempotencyKey: z.string().trim().min(8).optional(),
});

/** Chuyen quy: 1 cap chung tu CQ- (di + den) trong 1 transaction. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('finance.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  if (d.fromId === d.toId) throw jsonError(400, 'Chọn 2 quỹ khác nhau.');
  const result = await prisma.$transaction(async (tx) => {
    if (d.idempotencyKey) {
      const dup = await tx.cashTransaction.findUnique({ where: { idempotencyKey: d.idempotencyKey } });
      if (dup) return { out: dup, duplicated: true };
    }
    const from = await tx.cashAccount.findFirst({ where: { id: d.fromId, active: true },
      include: { txs: { select: { kind: true, status: true, amount: true } } } });
    if (!from) throw jsonError(400, 'Quỹ nguồn không tồn tại.');
    const bal = balanceOf(from.openingBalance, from.txs);
    if (bal < d.amount) {
      throw jsonError(400, `Quỹ ${from.name} chỉ còn ${bal.toLocaleString('vi-VN')}đ — không đủ để chuyển.`);
    }
    const group = `CQ${Date.now().toString(36)}${from.id}`;
    const { tx: out } = await createCashTx(tx, { actor, kind: 'TRANSFER_OUT',
      accountId: d.fromId, amount: d.amount, reason: 'Chuyển quỹ đi', note: d.note ?? null,
      transferGroup: group, idempotencyKey: d.idempotencyKey ?? null, forceApproved: true });
    await createCashTx(tx, { actor, kind: 'TRANSFER_IN',
      accountId: d.toId, amount: d.amount, reason: 'Chuyển quỹ đến', note: d.note ?? null,
      transferGroup: group, forceApproved: true });
    return { out, duplicated: false };
  });
  if (!result.duplicated) {
    const { ip, ua } = reqMeta();
    await audit({ actorId: actor.id, actorName: actor.name, action: 'cash_transfer',
      entity: 'cash_tx', entityId: result.out.code, after: { from: d.fromId, to: d.toId, amount: d.amount }, ip, ua });
  }
  return Response.json({ ok: true, code: result.out.code, duplicated: result.duplicated });
});
