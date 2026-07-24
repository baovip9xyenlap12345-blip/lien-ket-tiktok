import { prisma } from '@/lib/db';
import { requirePerm, guarded } from '@/lib/auth';

/** Gio hang khach da them nhung CHUA mua (converted=false) — gom theo khach de sale goi cham soc.
 *  Chi quan tri/sale xem duoc. */
export const GET = guarded(async () => {
  await requirePerm('sales.view');
  const rows = await prisma.shopCartActivity.findMany({
    where: { converted: false }, orderBy: { updatedAt: 'desc' }, take: 500 });

  // Gom theo khach (partnerId hoac ten) — moi khach 1 the voi cac mon dang giu trong gio.
  const groups = new Map<string, {
    partnerId: number | null; partnerName: string; phone: string | null;
    lastAt: string; itemCount: number; total: number;
    items: { productName: string; optLabel: string | null; qty: number; unitPrice: number; at: string }[];
  }>();
  for (const r of rows) {
    const key = r.partnerId != null ? `p${r.partnerId}` : `n${r.partnerName}`;
    let g = groups.get(key);
    if (!g) {
      g = { partnerId: r.partnerId, partnerName: r.partnerName, phone: r.phone,
        lastAt: r.updatedAt.toISOString(), itemCount: 0, total: 0, items: [] };
      groups.set(key, g);
    }
    g.itemCount += 1;
    g.total += r.qty * r.unitPrice;
    g.items.push({ productName: r.productName, optLabel: r.optLabel, qty: r.qty, unitPrice: r.unitPrice, at: r.updatedAt.toISOString() });
  }
  const list = Array.from(groups.values()).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  const totalValue = list.reduce((s, g) => s + g.total, 0);
  return Response.json({ ok: true, groups: list, customers: list.length, totalValue });
});
