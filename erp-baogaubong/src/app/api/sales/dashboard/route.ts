import { prisma } from '@/lib/db';
import { requirePerm, guarded } from '@/lib/auth';
import { scopeWhere } from '@/lib/scope';

/** Dashboard ban hang — CHI so lieu that, theo pham vi du lieu nguoi xem. */
export const GET = guarded(async () => {
  const user = await requirePerm('sales.view');
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const scope = scopeWhere(user);
  const base = { deletedAt: null, orderStatus: { in: ['CONFIRMED', 'DONE'] as never[] }, ...scope };
  const [today, month, unpaid, pendingQuotes, pendingApprovals, topLines, recent] = await Promise.all([
    prisma.salesOrder.aggregate({ _sum: { total: true }, _count: true,
      where: { ...base, createdAt: { gte: dayStart } } }),
    prisma.salesOrder.aggregate({ _sum: { total: true }, _count: true,
      where: { ...base, createdAt: { gte: monthStart } } }),
    prisma.salesOrder.aggregate({ _sum: { total: true, paidAmt: true }, _count: true,
      where: { ...base, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } } }),
    prisma.quote.count({ where: { deletedAt: null, status: { in: ['DRAFT', 'SENT'] }, ...scope } }),
    prisma.salesOrder.count({ where: { deletedAt: null, approvalStatus: 'PENDING', ...scope } })
      .then(async (n) => n + await prisma.quote.count({ where: { deletedAt: null, approvalStatus: 'PENDING', ...scope } })),
    prisma.orderLine.groupBy({ by: ['sku', 'name'], _sum: { qty: true, lineTotal: true },
      where: { order: { ...base, createdAt: { gte: monthStart } } },
      orderBy: { _sum: { lineTotal: 'desc' } }, take: 5 }),
    prisma.salesOrder.findMany({ where: { deletedAt: null, ...scope },
      orderBy: { id: 'desc' }, take: 8,
      select: { id: true, code: true, partnerName: true, total: true, paidAmt: true,
        orderStatus: true, paymentStatus: true, createdAt: true, isPos: true } }),
  ]);
  const debt = (unpaid._sum.total ?? 0) - (unpaid._sum.paidAmt ?? 0);
  return Response.json({ ok: true,
    today: { revenue: today._sum.total ?? 0, orders: today._count },
    month: { revenue: month._sum.total ?? 0, orders: month._count },
    debt: { amount: debt, orders: unpaid._count },
    pendingQuotes, pendingApprovals,
    top: topLines.map((t) => ({ sku: t.sku, name: t.name, qty: t._sum.qty ?? 0, amount: t._sum.lineTotal ?? 0 })),
    recent });
});
