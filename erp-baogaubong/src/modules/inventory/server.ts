// Phan cham DB cua Kho. MOI thay doi ton kho di qua applyMovements:
// - StockMovement bat bien (khong co API sua/xoa) + tham chieu chung tu nguon
// - InventoryBalance cap nhat CUNG transaction, dieu kien onHand >= xuat
//   nam ngay trong UPDATE (khoa dong PostgreSQL) → 2 nguoi cung xuat khong the am kho.
import { Prisma } from '@prisma/client';
import { jsonError, type SessionUser } from '@/lib/auth';
import { directionOf } from './domain';

type Tx = Prisma.TransactionClient;

export type MoveLine = { variantId: number; qty: number };  // qty duong; ADJUST cho phep am

export async function ensureBalance(tx: Tx, warehouseId: number, variantId: number) {
  await tx.inventoryBalance.upsert({
    where: { warehouseId_variantId: { warehouseId, variantId } },
    update: {}, create: { warehouseId, variantId } });
}

export async function applyMovements(tx: Tx, opts: {
  actor: SessionUser;
  warehouseId: number;
  kind: 'RECEIPT' | 'ISSUE' | 'SALE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUST' | 'RETURN' | 'SCRAP';
  lines: MoveLine[];
  refType?: string; refId?: string; note?: string;
  guard?: 'available' | 'physical';   // xuat thuong: 'available' (ton - giu cho); giao don co giu cho: 'physical'
}) {
  if (!opts.lines.length) throw jsonError(400, 'Cần ít nhất 1 dòng hàng.');
  const dir = directionOf(opts.kind);
  for (const l of opts.lines) {
    if (!Number.isInteger(l.qty) || l.qty === 0) throw jsonError(400, 'Số lượng phải là số nguyên khác 0.');
    if (dir !== 0 && l.qty < 0) throw jsonError(400, 'Số lượng phải dương (hướng do loại chứng từ quyết định).');
    const signed = dir === 0 ? l.qty : dir * l.qty;
    await ensureBalance(tx, opts.warehouseId, l.variantId);
    if (signed >= 0) {
      await tx.inventoryBalance.update({
        where: { warehouseId_variantId: { warehouseId: opts.warehouseId, variantId: l.variantId } },
        data: { onHand: { increment: signed } } });
    } else {
      const need = -signed;
      // Dieu kien trong WHERE — chay tren khoa dong nen concurrency-safe, cam am kho
      const guard = opts.guard ?? 'available';
      const res = guard === 'physical'
        ? await tx.inventoryBalance.updateMany({
            where: { warehouseId: opts.warehouseId, variantId: l.variantId, onHand: { gte: need } },
            data: { onHand: { decrement: need } } })
        : await tx.$executeRaw`UPDATE "InventoryBalance" SET "onHand" = "onHand" - ${need}
            WHERE "warehouseId" = ${opts.warehouseId} AND "variantId" = ${l.variantId}
              AND "onHand" - "reserved" >= ${need}`.then((n) => ({ count: Number(n) }));
      if (res.count === 0) {
        const bal = await tx.inventoryBalance.findUnique({
          where: { warehouseId_variantId: { warehouseId: opts.warehouseId, variantId: l.variantId } } });
        throw jsonError(400,
          `Không đủ tồn kho để xuất ${need} (tồn ${bal?.onHand ?? 0}, giữ chỗ ${bal?.reserved ?? 0}). Hệ thống cấm âm kho.`);
      }
    }
    await tx.stockMovement.create({ data: {
      warehouseId: opts.warehouseId, variantId: l.variantId, kind: opts.kind, qty: signed,
      refType: opts.refType ?? null, refId: opts.refId ?? null, note: opts.note ?? null,
      byId: opts.actor.id, byName: opts.actor.name } });
  }
}

/** Giam giu cho (khong am) sau khi giao hang / huy giu cho. */
export async function releaseReserved(tx: Tx, warehouseId: number, variantId: number, qty: number) {
  await tx.$executeRaw`UPDATE "InventoryBalance" SET "reserved" = GREATEST("reserved" - ${qty}, 0)
    WHERE "warehouseId" = ${warehouseId} AND "variantId" = ${variantId}`;
}
