import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { ensureBalance, releaseReserved } from '@/modules/inventory/server';

/** Giu cho ton kho cho 1 don da xac nhan (theo phan chua giao). */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('inventory.manage');
  const b = z.object({ orderId: z.number().int(), warehouseId: z.number().int() }).safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Thiếu orderId/warehouseId');
  const order = await prisma.salesOrder.findFirst({
    where: { id: b.data.orderId, deletedAt: null }, include: { lines: true } });
  if (!order) throw jsonError(404, 'Không tìm thấy đơn.');
  if (order.orderStatus !== 'CONFIRMED') throw jsonError(400, 'Chỉ giữ chỗ cho đơn Đã xác nhận.');
  const existing = await prisma.stockReservation.findMany({ where: { orderId: order.id, released: false } });
  if (existing.length) throw jsonError(400, 'Đơn này đã giữ chỗ rồi.');
  let reserved = 0;
  await prisma.$transaction(async (tx) => {
    for (const l of order.lines) {
      if (!l.variantId) continue;
      await ensureBalance(tx, b.data.warehouseId, l.variantId);
      // Chi giu duoc trong pham vi kha dung — dieu kien nam trong UPDATE (an toan concurrency)
      const n = await tx.$executeRaw`UPDATE "InventoryBalance" SET "reserved" = "reserved" + ${l.qty}
        WHERE "warehouseId" = ${b.data.warehouseId} AND "variantId" = ${l.variantId}
          AND "onHand" - "reserved" >= ${l.qty}`;
      if (Number(n) === 0) throw jsonError(400, `${l.sku}: không đủ hàng khả dụng để giữ chỗ ${l.qty}.`);
      await tx.stockReservation.create({ data: { orderId: order.id,
        warehouseId: b.data.warehouseId, variantId: l.variantId, qty: l.qty } });
      reserved++;
    }
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'stock_reserve', entity: 'order',
    entityId: order.code, after: { lines: reserved }, ip, ua });
  return Response.json({ ok: true });
});

/** Huy giu cho cua don. */
export const DELETE = guarded(async (req) => {
  const actor = await requirePerm('inventory.manage');
  const orderId = Number(new URL(req.url).searchParams.get('orderId'));
  if (!orderId) throw jsonError(400, 'Thiếu orderId');
  const rows = await prisma.stockReservation.findMany({ where: { orderId, released: false } });
  if (!rows.length) throw jsonError(404, 'Đơn không có giữ chỗ nào.');
  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      await releaseReserved(tx, r.warehouseId, r.variantId, r.qty);
      await tx.stockReservation.update({ where: { id: r.id }, data: { released: true } });
    }
  });
  await audit({ actorId: actor.id, actorName: actor.name, action: 'stock_unreserve', entity: 'order', entityId: String(orderId) });
  return Response.json({ ok: true });
});
