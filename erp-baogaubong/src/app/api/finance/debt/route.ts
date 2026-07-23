import { prisma } from '@/lib/db';
import { requirePerm, guarded } from '@/lib/auth';
import { scopeWhere } from '@/lib/scope';
import { dueDateOf, agingBucket, type AgingBucket } from '@/modules/finance/domain';

/** Cong no phai thu theo khach: tinh TU CHUNG TU (don - phieu thu), khong co so nhap tay. */
export const GET = guarded(async (req) => {
  const user = await requirePerm('finance.view');
  const overdueOnly = new URL(req.url).searchParams.get('overdue') === '1';
  const now = new Date();
  const orders = await prisma.salesOrder.findMany({
    where: { deletedAt: null, orderStatus: { not: 'CANCELLED' },
      paymentStatus: { in: ['UNPAID', 'PARTIAL'] }, ...scopeWhere(user) },
    select: { id: true, code: true, partnerId: true, partnerName: true, total: true,
      paidAmt: true, createdAt: true },
    orderBy: { createdAt: 'asc' } });
  const partnerIds = [...new Set(orders.map((o) => o.partnerId).filter((x): x is number => x != null))];
  const partners = await prisma.partner.findMany({ where: { id: { in: partnerIds } },
    select: { id: true, code: true, creditLimit: true, creditDays: true, phone: true } });
  const pMap = new Map(partners.map((p) => [p.id, p]));
  type Row = { partnerId: number | null; partnerName: string; code: string | null; phone: string | null;
    debt: number; creditLimit: number; overLimit: boolean;
    orders: { id: number; code: string; remaining: number; dueDate: string; bucket: AgingBucket }[] };
  const byPartner = new Map<string, Row>();
  const summary: Record<AgingBucket, number> = { not_due: 0, d1_7: 0, d8_30: 0, d31_60: 0, d60_plus: 0 };
  for (const o of orders) {
    const p = o.partnerId != null ? pMap.get(o.partnerId) : undefined;
    const remaining = o.total - o.paidAmt;
    if (remaining <= 0) continue;
    const due = dueDateOf(o.createdAt, p?.creditDays ?? 0);
    const bucket = agingBucket(due, now);
    if (overdueOnly && bucket === 'not_due') continue;
    summary[bucket] += remaining;
    const key = o.partnerId != null ? `p${o.partnerId}` : `n${o.partnerName}`;
    if (!byPartner.has(key)) {
      byPartner.set(key, { partnerId: o.partnerId, partnerName: o.partnerName,
        code: p?.code ?? null, phone: p?.phone ?? null, debt: 0,
        creditLimit: p?.creditLimit ?? 0, overLimit: false, orders: [] });
    }
    const row = byPartner.get(key)!;
    row.debt += remaining;
    row.orders.push({ id: o.id, code: o.code, remaining,
      dueDate: due.toISOString(), bucket });
  }
  const rows = [...byPartner.values()]
    .map((r) => ({ ...r, overLimit: r.creditLimit > 0 && r.debt > r.creditLimit }))
    .sort((a, b) => b.debt - a.debt);
  return Response.json({ ok: true, rows, summary,
    total: rows.reduce((a, r) => a + r.debt, 0) });
});
