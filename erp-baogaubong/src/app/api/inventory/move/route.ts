import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { applyMovements } from '@/modules/inventory/server';

/** Lich su chung tu kho (bat bien — chi xem). */
export const GET = guarded(async (req) => {
  await requirePerm('inventory.view');
  const url = new URL(req.url);
  const warehouseId = Number(url.searchParams.get('warehouseId')) || 0;
  const variantId = Number(url.searchParams.get('variantId')) || 0;
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const take = 30;
  const where: Prisma.StockMovementWhereInput = {
    ...(warehouseId ? { warehouseId } : {}), ...(variantId ? { variantId } : {}) };
  const [rows, total] = await Promise.all([
    prisma.stockMovement.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * take, take }),
    prisma.stockMovement.count({ where }),
  ]);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.variantId))] } },
    select: { id: true, sku: true } });
  const skuMap = Object.fromEntries(variants.map((v) => [v.id, v.sku]));
  return Response.json({ ok: true, rows: rows.map((r) => ({ ...r, sku: skuMap[r.variantId] ?? r.variantId })), total, page, take });
});

const In = z.object({
  kind: z.enum(['RECEIPT', 'ISSUE', 'ADJUST', 'RETURN', 'SCRAP']),
  warehouseId: z.number().int(),
  lines: z.array(z.object({ variantId: z.number().int(), qty: z.number().int() })).min(1, 'Cần ít nhất 1 dòng'),
  note: z.string().trim().min(1, 'Nhập lý do / nội dung chứng từ'),
});

/** Nhap / xuat / dieu chinh / nhap lai / huy hang. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('inventory.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  await prisma.$transaction(async (tx) => {
    await applyMovements(tx, { actor, warehouseId: d.warehouseId, kind: d.kind,
      lines: d.lines, refType: 'manual', note: d.note });
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: `stock_${d.kind.toLowerCase()}`,
    entity: 'stock', entityId: String(d.warehouseId),
    after: { lines: d.lines.length, note: d.note }, ip, ua });
  return Response.json({ ok: true });
});
