import { prisma } from '@/lib/db';
import { requirePerm, guarded } from '@/lib/auth';
import { signOf } from '@/modules/finance/domain';
import { fmtDate } from '@/lib/format';

/** Xuat CSV chung tu thu chi (theo quyen finance.view). ?period=YYYY-MM de loc. */
export const GET = guarded(async (req) => {
  await requirePerm('finance.view');
  const period = new URL(req.url).searchParams.get('period') ?? '';
  const rows = await prisma.cashTransaction.findMany({
    where: { ...(period ? { period } : {}) },
    include: { account: { select: { code: true } } },
    orderBy: [{ happenedAt: 'asc' }, { id: 'asc' }], take: 10000 });
  const esc = (s: unknown) => JSON.stringify(String(s ?? ''));
  let csv = 'code,date,kind,account,amount,sign,status,partner,order_id,reason,note,created_by\n';
  for (const t of rows) {
    csv += [t.code, fmtDate(t.happenedAt), t.kind, t.account.code, t.amount,
      signOf(t.kind), t.status, esc(t.partnerName ?? ''), t.orderId ?? '',
      esc(t.reason ?? ''), esc(t.note ?? ''), esc(t.createdByName)].join(',') + '\n';
  }
  return new Response('\uFEFF' + csv, { headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="so-quy${period ? '-' + period : ''}.csv"` } });
});
