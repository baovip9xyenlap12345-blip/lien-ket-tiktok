import { prisma } from '@/lib/db';
import { requirePerm, guarded } from '@/lib/auth';
import { availableQty, stockAlert } from '@/modules/inventory/domain';

/** Ton kho: thuc te / giu cho / kha dung theo kho + bien the, kem canh bao min-max. */
export const GET = guarded(async (req) => {
  await requirePerm('inventory.view');
  const url = new URL(req.url);
  const warehouseId = Number(url.searchParams.get('warehouseId')) || 0;
  const q = url.searchParams.get('q')?.trim() ?? '';
  const onlyAlert = url.searchParams.get('alert') === '1';
  const [warehouses, balances] = await Promise.all([
    prisma.warehouse.findMany({ where: { deletedAt: null }, orderBy: { id: 'asc' } }),
    prisma.inventoryBalance.findMany({ where: { ...(warehouseId ? { warehouseId } : {}) } }),
  ]);
  const variantIds = [...new Set(balances.map((b) => b.variantId))];
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds }, deletedAt: null,
      ...(q ? { OR: [
        { sku: { contains: q, mode: 'insensitive' } },
        { product: { name: { contains: q, mode: 'insensitive' } } },
      ] } : {}) },
    include: { product: { select: { name: true, type: true } } } });
  const vMap = new Map(variants.map((v) => [v.id, v]));
  const rows = balances
    .filter((b) => vMap.has(b.variantId))
    .map((b) => {
      const v = vMap.get(b.variantId)!;
      return { warehouseId: b.warehouseId, variantId: b.variantId, sku: v.sku,
        name: [v.product.name, v.size, v.color].filter(Boolean).join(' - '),
        type: v.product.type,
        onHand: b.onHand, reserved: b.reserved, available: availableQty(b.onHand, b.reserved),
        minStock: v.minStock, maxStock: v.maxStock,
        alert: stockAlert(b.onHand, v.minStock, v.maxStock) };
    })
    .filter((r) => !onlyAlert || r.alert)
    .sort((a, b) => a.sku.localeCompare(b.sku));
  return Response.json({ ok: true, warehouses, rows });
});
