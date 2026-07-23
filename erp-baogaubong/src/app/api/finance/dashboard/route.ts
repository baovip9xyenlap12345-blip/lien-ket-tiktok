import { prisma } from '@/lib/db';
import { requirePerm, guarded } from '@/lib/auth';
import { balanceOf, signOf, periodOf } from '@/modules/finance/domain';

/** Dashboard dong tien + cong no — so lieu that tu chung tu. */
export const GET = guarded(async () => {
  await requirePerm('finance.view');
  const period = periodOf(new Date());
  const [accounts, monthTx, pending] = await Promise.all([
    prisma.cashAccount.findMany({ where: { active: true }, orderBy: { id: 'asc' },
      include: { txs: { select: { kind: true, status: true, amount: true } } } }),
    prisma.cashTransaction.findMany({ where: { period, status: 'APPROVED' },
      select: { kind: true, amount: true } }),
    prisma.cashTransaction.count({ where: { status: 'PENDING' } }),
  ]);
  let thu = 0, chi = 0;
  for (const t of monthTx) { if (signOf(t.kind) > 0) thu += t.amount; else chi += t.amount; }
  return Response.json({ ok: true, period,
    funds: accounts.map((a) => ({ id: a.id, code: a.code, name: a.name, kind: a.kind,
      balance: balanceOf(a.openingBalance, a.txs) })),
    month: { thu, chi, net: thu - chi }, pending });
});
