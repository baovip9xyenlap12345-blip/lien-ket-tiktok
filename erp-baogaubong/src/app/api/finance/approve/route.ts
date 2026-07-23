import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { lockedPeriods, accountBalance } from '@/modules/finance/server';
import { assertPeriodOpen, signOf } from '@/modules/finance/domain';

/** Danh sach phieu chi cho duyet + duyet/tu choi (CHI finance.approve). */
export const GET = guarded(async () => {
  await requirePerm('finance.approve');
  const rows = await prisma.cashTransaction.findMany({
    where: { status: 'PENDING' },
    include: { account: { select: { code: true, name: true } } },
    orderBy: { id: 'asc' } });
  return Response.json({ ok: true, rows });
});

export const POST = guarded(async (req) => {
  const actor = await requirePerm('finance.approve');
  const b = z.object({ id: z.number().int(), approve: z.boolean(), note: z.string().optional() })
    .safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu không hợp lệ');
  const code = await prisma.$transaction(async (tx) => {
    const cur = await tx.cashTransaction.findFirst({ where: { id: b.data.id, status: 'PENDING' } });
    if (!cur) throw jsonError(404, 'Không tìm thấy chứng từ chờ duyệt.');
    if (b.data.approve) {
      // Duyet la thoi diem chung tu bat dau tinh vao so du → ky phai con mo
      try { assertPeriodOpen(await lockedPeriods(tx), cur.happenedAt); }
      catch (e) { throw jsonError(400, (e as Error).message); }
      // Cam am quy tai thoi diem duyet dong tien ra
      if (signOf(cur.kind) < 0) {
        const bal = await accountBalance(tx, cur.accountId);
        if (bal < cur.amount) {
          throw jsonError(400, `Quỹ chỉ còn ${bal.toLocaleString('vi-VN')}đ — không đủ để duyệt phiếu chi ${cur.amount.toLocaleString('vi-VN')}đ.`);
        }
      }
    }
    await tx.cashTransaction.update({ where: { id: cur.id },
      data: { status: b.data.approve ? 'APPROVED' : 'REJECTED',
        approvedById: actor.id, approvedAt: new Date(),
        note: b.data.note ? [cur.note, b.data.note].filter(Boolean).join(' | ') : cur.note } });
    return cur.code;
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name,
    action: b.data.approve ? 'cash_tx_approve' : 'cash_tx_reject',
    entity: 'cash_tx', entityId: code, after: { note: b.data.note }, ip, ua });
  return Response.json({ ok: true });
});
