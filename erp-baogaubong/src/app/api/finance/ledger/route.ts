import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError } from '@/lib/auth';
import { signOf } from '@/modules/finance/domain';

/** So quy 1 thang cua 1 quy: dau ky, thu, chi, cuoi ky + tung chung tu (drill-down). */
export const GET = guarded(async (req) => {
  await requirePerm('finance.view');
  const url = new URL(req.url);
  const accountId = Number(url.searchParams.get('accountId'));
  const period = url.searchParams.get('period') ?? '';
  if (!accountId || !/^\d{4}-\d{2}$/.test(period)) throw jsonError(400, 'Thiếu accountId hoặc kỳ (YYYY-MM).');
  const acc = await prisma.cashAccount.findUnique({ where: { id: accountId } });
  if (!acc) throw jsonError(404, 'Không tìm thấy quỹ.');
  const [before, inPeriod] = await Promise.all([
    prisma.cashTransaction.findMany({
      where: { accountId, status: 'APPROVED', period: { lt: period } },
      select: { kind: true, amount: true } }),
    prisma.cashTransaction.findMany({
      where: { accountId, period },
      orderBy: [{ happenedAt: 'asc' }, { id: 'asc' }] }),
  ]);
  const opening = before.reduce((a, t) => a + signOf(t.kind) * t.amount, acc.openingBalance);
  let thu = 0, chi = 0;
  for (const t of inPeriod) {
    if (t.status !== 'APPROVED') continue;
    if (signOf(t.kind) > 0) thu += t.amount; else chi += t.amount;
  }
  const lock = await prisma.periodLock.findUnique({ where: { period } });
  return Response.json({ ok: true,
    account: { id: acc.id, code: acc.code, name: acc.name, kind: acc.kind },
    period, opening, thu, chi, closing: opening + thu - chi,
    locked: lock?.locked ?? false, rows: inPeriod });
});
