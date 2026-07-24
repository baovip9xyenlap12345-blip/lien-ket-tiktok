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

  // ==== BIEU DO + CHI SO NANG CAO ====
  // Doanh thu 7 ngay gan nhat (bieu do cot).
  const days: { ds: Date; de: Date; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const ds = new Date(dayStart); ds.setDate(ds.getDate() - i);
    const de = new Date(ds); de.setDate(de.getDate() + 1);
    days.push({ ds, de, label: `${ds.getDate()}/${ds.getMonth() + 1}` });
  }
  const dailyAgg = await Promise.all(days.map((d) =>
    prisma.salesOrder.aggregate({ _sum: { total: true }, _count: true,
      where: { ...base, createdAt: { gte: d.ds, lt: d.de } } })));
  const daily = days.map((d, i) => ({ label: d.label, revenue: dailyAgg[i]._sum.total ?? 0, orders: dailyAgg[i]._count }));

  // Co cau don theo trang thai thang nay (bieu do tron).
  const statusAgg = await prisma.salesOrder.groupBy({ by: ['orderStatus'], _count: true,
    where: { deletedAt: null, ...scope, createdAt: { gte: monthStart } } });
  const statusPie = statusAgg.map((s) => ({ status: s.orderStatus, count: s._count }));

  // Loi nhuan gop uoc tinh thang nay = doanh thu dong hang - gia von (theo gia von hien tai).
  const monthLines = await prisma.orderLine.findMany({
    where: { order: { ...base, createdAt: { gte: monthStart } }, variantId: { not: null } },
    select: { variantId: true, qty: true, lineTotal: true } });
  const varIds = [...new Set(monthLines.map((l) => l.variantId as number))];
  const vs = varIds.length ? await prisma.productVariant.findMany({ where: { id: { in: varIds } }, select: { id: true, costPrice: true } }) : [];
  const cm = new Map(vs.map((v) => [v.id, v.costPrice]));
  let lineRev = 0, cost = 0;
  for (const l of monthLines) { lineRev += l.lineTotal; cost += (cm.get(l.variantId as number) ?? 0) * l.qty; }
  const profit = lineRev - cost;

  // Don moi chua xu ly (don nhan duoc) + so giao dich thu tien thang nay.
  const [newOrders, txCount] = await Promise.all([
    prisma.salesOrder.count({ where: { deletedAt: null, ...scope, orderStatus: 'NEW' } }),
    prisma.payment.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  return Response.json({ ok: true,
    today: { revenue: today._sum.total ?? 0, orders: today._count },
    month: { revenue: month._sum.total ?? 0, orders: month._count, profit },
    debt: { amount: debt, orders: unpaid._count },
    newOrders, transactions: txCount,
    daily, statusPie,
    pendingQuotes, pendingApprovals,
    top: topLines.map((t) => ({ sku: t.sku, name: t.name, qty: t._sum.qty ?? 0, amount: t._sum.lineTotal ?? 0 })),
    recent });
});
