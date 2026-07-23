import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { nextCode } from '@/lib/seq';
import { stocktakeDiffs } from '@/modules/inventory/domain';
import { applyMovements } from '@/modules/inventory/server';

export const GET = guarded(async () => {
  await requirePerm('inventory.view');
  const rows = await prisma.stocktake.findMany({ include: { lines: true },
    orderBy: { id: 'desc' }, take: 30 });
  return Response.json({ ok: true, rows });
});

const In = z.object({
  warehouseId: z.number().int(),
  note: z.string().optional(),
  lines: z.array(z.object({ variantId: z.number().int(), countedQty: z.number().int().min(0) })).min(1, 'Cần ít nhất 1 dòng đếm'),
});

/** Kiem kho: ghi so dem thuc te → chot ngay, sinh chung tu DIEU CHINH cho phan lech. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('inventory.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu kiểm kho không hợp lệ');
  const d = b.data;
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: d.lines.map((l) => l.variantId) } }, select: { id: true, sku: true } });
  const skuMap = new Map(variants.map((v) => [v.id, v.sku]));
  const result = await prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, 'KK-');
    const balances = await tx.inventoryBalance.findMany({
      where: { warehouseId: d.warehouseId, variantId: { in: d.lines.map((l) => l.variantId) } } });
    const balMap = new Map(balances.map((x) => [x.variantId, x.onHand]));
    const fullLines = d.lines.map((l) => ({ variantId: l.variantId,
      systemQty: balMap.get(l.variantId) ?? 0, countedQty: l.countedQty }));
    const st = await tx.stocktake.create({ data: {
      code, warehouseId: d.warehouseId, status: 'DONE', note: d.note ?? null,
      doneAt: new Date(), createdById: actor.id, createdByName: actor.name,
      lines: { create: fullLines.map((l) => ({ variantId: l.variantId,
        sku: skuMap.get(l.variantId) ?? String(l.variantId),
        systemQty: l.systemQty, countedQty: l.countedQty })) } } });
    const diffs = stocktakeDiffs(fullLines);
    if (diffs.length) {
      // Kiem kho la su that vat ly → dieu chinh theo ton thuc te, khong vuong giu cho
      await applyMovements(tx, { actor, warehouseId: d.warehouseId, kind: 'ADJUST',
        lines: diffs.map((x) => ({ variantId: x.variantId, qty: x.diff })),
        refType: 'stocktake', refId: code, note: `Kiểm kho ${code}`, guard: 'physical' });
    }
    return { st, diffs: diffs.length };
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'stocktake_done', entity: 'stocktake',
    entityId: result.st.code, after: { lines: d.lines.length, diffs: result.diffs }, ip, ua });
  return Response.json({ ok: true, code: result.st.code, diffs: result.diffs });
});
