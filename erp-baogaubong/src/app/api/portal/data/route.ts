import { prisma } from '@/lib/db';
import { guarded } from '@/lib/auth';
import { requirePortal } from '@/modules/portal/server';
import { resolvePrice } from '@/modules/catalog/domain';
import { dueDateOf, agingBucket } from '@/modules/finance/domain';

/** Du lieu cong khach — MOI truy van deu khoa theo partnerId cua phien (chong IDOR). */
export const GET = guarded(async (req) => {
  const me = await requirePortal();
  const url = new URL(req.url);
  const view = url.searchParams.get('view') ?? 'home';

  // Danh muc + GIA DUOC CAP (bang gia rieng cua khach; khong co thi gia le)
  if (view === 'catalog') {
    const q = url.searchParams.get('q')?.trim() ?? '';
    const products = await prisma.product.findMany({
      where: { deletedAt: null, status: 'ACTIVE', type: { in: ['FINISHED', 'COMBO', 'AI_BEAR'] },
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      include: { variants: { where: { deletedAt: null },
        include: { priceRules: { include: { priceList: true } } } }, unit: true },
      orderBy: { id: 'asc' }, take: 100 });
    return Response.json({ ok: true, rows: products.map((p) => ({
      id: p.id, name: p.name, desc: p.desc, unit: p.unit.name,
      variants: p.variants.map((v) => {
        const lists = new Map<number, { id: number; kind: string; priority: number; active: boolean;
          validFrom: Date | null; validTo: Date | null; rules: { minQty: number; price: number }[] }>();
        for (const r of v.priceRules) {
          if (r.priceList.deletedAt) continue;
          if (!lists.has(r.priceListId)) {
            lists.set(r.priceListId, { id: r.priceListId, kind: r.priceList.kind,
              priority: r.priceList.priority, active: r.priceList.active,
              validFrom: r.priceList.validFrom, validTo: r.priceList.validTo, rules: [] });
          }
          lists.get(r.priceListId)!.rules.push({ minQty: r.minQty, price: r.price });
        }
        const price = resolvePrice({ lists: [...lists.values()],
          preferListId: me.priceListId, qty: 1 });
        return { id: v.id, sku: v.sku, size: v.size, color: v.color, price: price?.price ?? null };
      }).filter((v) => v.price !== null) })).filter((p) => p.variants.length > 0) });
  }

  // Don hang + giao hang + san xuat CUA TOI
  if (view === 'orders') {
    const orders = await prisma.salesOrder.findMany({
      where: { partnerId: me.partnerId, deletedAt: null },
      include: { lines: true }, orderBy: { id: 'desc' }, take: 50 });
    const ids = orders.map((o) => o.id);
    const [shipments, prods] = await Promise.all([
      prisma.shipment.findMany({ where: { orderId: { in: ids } },
        select: { orderId: true, code: true, status: true, carrier: true, trackingNo: true } }),
      prisma.productionOrder.findMany({ where: { orderId: { in: ids }, deletedAt: null },
        select: { orderId: true, code: true, status: true, qtyPlanned: true, qtyGood: true } }),
    ]);
    return Response.json({ ok: true, rows: orders.map((o) => ({
      id: o.id, code: o.code, createdAt: o.createdAt, orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus, shippingStatus: o.shippingStatus,
      total: o.total, paidAmt: o.paidAmt, vatEnabled: o.vatEnabled,
      lines: o.lines.map((l) => ({ name: l.name, qty: l.qty, unitPrice: l.unitPrice, lineTotal: l.lineTotal })),
      shipments: shipments.filter((s) => s.orderId === o.id),
      production: prods.filter((p) => p.orderId === o.id) })) });
  }

  // Bao gia CUA TOI
  if (view === 'quotes') {
    const rows = await prisma.quote.findMany({ where: { partnerId: me.partnerId, deletedAt: null },
      include: { lines: true, order: { select: { code: true } } }, orderBy: { id: 'desc' }, take: 50 });
    return Response.json({ ok: true, rows });
  }

  // Thiet ke CUA TOI (xem + trang thai duyet)
  if (view === 'designs') {
    const rows = await prisma.designRequest.findMany({
      where: { partnerId: me.partnerId, deletedAt: null },
      include: { versions: { orderBy: { no: 'desc' },
        include: { comments: { orderBy: { id: 'asc' } } } } },
      orderBy: { id: 'desc' } });
    return Response.json({ ok: true, rows });
  }

  // Cong no + thanh toan CUA TOI
  if (view === 'debt') {
    const partner = await prisma.partner.findUnique({ where: { id: me.partnerId },
      select: { creditLimit: true, creditDays: true } });
    const orders = await prisma.salesOrder.findMany({
      where: { partnerId: me.partnerId, deletedAt: null, orderStatus: { not: 'CANCELLED' } },
      select: { id: true, code: true, total: true, paidAmt: true, createdAt: true },
      orderBy: { createdAt: 'desc' }, take: 100 });
    const payments = await prisma.payment.findMany({ where: { partnerId: me.partnerId },
      select: { code: true, amount: true, createdAt: true, note: true },
      orderBy: { id: 'desc' }, take: 50 });
    const now = new Date();
    const debts = orders.filter((o) => o.total > o.paidAmt).map((o) => ({
      code: o.code, remaining: o.total - o.paidAmt,
      dueDate: dueDateOf(o.createdAt, partner?.creditDays ?? 0).toISOString(),
      bucket: agingBucket(dueDateOf(o.createdAt, partner?.creditDays ?? 0), now) }));
    return Response.json({ ok: true, creditLimit: partner?.creditLimit ?? 0,
      totalDebt: debts.reduce((a, d) => a + d.remaining, 0), debts, payments });
  }

  // Trang chu portal
  const [openOrders, debtAgg] = await Promise.all([
    prisma.salesOrder.count({ where: { partnerId: me.partnerId, deletedAt: null,
      orderStatus: { in: ['NEW', 'CONFIRMED'] } } }),
    prisma.salesOrder.aggregate({ _sum: { total: true, paidAmt: true },
      where: { partnerId: me.partnerId, deletedAt: null, orderStatus: { not: 'CANCELLED' } } }),
  ]);
  return Response.json({ ok: true, me,
    openOrders, totalDebt: (debtAgg._sum.total ?? 0) - (debtAgg._sum.paidAmt ?? 0) });
});
