import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError } from '@/lib/auth';
import { scopeWhere } from '@/lib/scope';

/** Bao cao ban hang tu du lieu THAT.
 *  Dinh nghia chi so (ghi ro de khong hieu nham):
 *  - DOANH THU = tong tien (total) cac don CONFIRMED/DONE, tinh theo ngay TAO don.
 *  - TACH VAT: don vatEnabled=true vs false (gia tri total da gom thue neu co).
 *  - TIEN DA THU = tong phieu thu (Payment, gom ca am khi hoan) theo ngay THU — khac doanh thu.
 *  Loc: from/to (bat buoc), userId (NV phu trach), groupId (nhom khach), channel (kenh cua khach). */
export const GET = guarded(async (req) => {
  const user = await requirePerm('report.view');
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (!from || !to) throw jsonError(400, 'Thiếu khoảng thời gian from/to (YYYY-MM-DD).');
  const fromD = new Date(`${from}T00:00:00+07:00`);
  const toD = new Date(`${to}T23:59:59.999+07:00`);
  const userId = Number(url.searchParams.get('userId')) || 0;
  const groupId = Number(url.searchParams.get('groupId')) || 0;
  const channel = url.searchParams.get('channel')?.trim() || '';

  let partnerFilterIds: number[] | null = null;
  if (groupId || channel) {
    const ps = await prisma.partner.findMany({
      where: { deletedAt: null, ...(groupId ? { groupId } : {}),
        ...(channel ? { channel: { contains: channel, mode: 'insensitive' } } : {}) },
      select: { id: true } });
    partnerFilterIds = ps.map((p) => p.id);
  }
  const orderWhere = {
    deletedAt: null, orderStatus: { in: ['CONFIRMED', 'DONE'] as never[] },
    createdAt: { gte: fromD, lte: toD },
    ...scopeWhere(user),
    ...(userId ? { assignedToId: userId } : {}),
    ...(partnerFilterIds ? { partnerId: { in: partnerFilterIds } } : {}),
  };
  const [orders, payments, users] = await Promise.all([
    prisma.salesOrder.findMany({ where: orderWhere,
      select: { id: true, code: true, createdAt: true, total: true, taxAmt: true,
        vatEnabled: true, paidAmt: true, assignedToId: true, partnerName: true } }),
    prisma.payment.findMany({
      where: { createdAt: { gte: fromD, lte: toD },
        ...(userId ? { createdById: userId } : {}) },
      select: { amount: true, createdAt: true } }),
    prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
  ]);
  const uMap = new Map(users.map((u) => [u.id, u.name]));

  const byDay = new Map<string, { revenueVat: number; revenueNoVat: number; tax: number; collected: number; orders: number }>();
  const day = (d: Date) => new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
    .toISOString().slice(0, 10);
  const ensure = (k: string) => {
    if (!byDay.has(k)) byDay.set(k, { revenueVat: 0, revenueNoVat: 0, tax: 0, collected: 0, orders: 0 });
    return byDay.get(k)!;
  };
  const byUser = new Map<number, { revenue: number; orders: number }>();
  for (const o of orders) {
    const r = ensure(day(o.createdAt));
    if (o.vatEnabled) { r.revenueVat += o.total; r.tax += o.taxAmt; } else { r.revenueNoVat += o.total; }
    r.orders++;
    const bu = byUser.get(o.assignedToId ?? 0) ?? { revenue: 0, orders: 0 };
    bu.revenue += o.total; bu.orders++;
    byUser.set(o.assignedToId ?? 0, bu);
  }
  for (const p of payments) ensure(day(p.createdAt)).collected += p.amount;

  // Ban chay theo san pham (tu dong don trong khoang loc)
  const topProducts = await prisma.orderLine.groupBy({ by: ['sku', 'name'],
    _sum: { qty: true, lineTotal: true },
    where: { order: orderWhere },
    orderBy: { _sum: { lineTotal: 'desc' } }, take: 10 });

  const sum = { revenueVat: 0, revenueNoVat: 0, tax: 0, collected: 0, orders: orders.length,
    debt: orders.reduce((a, o) => a + Math.max(0, o.total - o.paidAmt), 0) };
  for (const r of byDay.values()) {
    sum.revenueVat += r.revenueVat; sum.revenueNoVat += r.revenueNoVat;
    sum.tax += r.tax; sum.collected += r.collected;
  }
  return Response.json({ ok: true, sum,
    byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v })),
    byUser: [...byUser.entries()].map(([id, v]) => ({ userId: id, name: uMap.get(id) ?? '—', ...v }))
      .sort((a, b) => b.revenue - a.revenue),
    topProducts: topProducts.map((t) => ({ sku: t.sku, name: t.name,
      qty: t._sum.qty ?? 0, amount: t._sum.lineTotal ?? 0 })),
    // drill-down: danh sach don trong bo loc
    orders: orders.sort((a, b) => b.id - a.id).slice(0, 100).map((o) => ({
      id: o.id, code: o.code, partnerName: o.partnerName, total: o.total,
      vatEnabled: o.vatEnabled, paidAmt: o.paidAmt, createdAt: o.createdAt,
      user: uMap.get(o.assignedToId ?? 0) ?? '—' })) });
});
