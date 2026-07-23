import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { nextCode } from '@/lib/seq';
import { shippableQty, assertShipQty } from '@/modules/inventory/domain';
import { applyMovements, releaseReserved } from '@/modules/inventory/server';
import { logStatus } from '@/modules/sales/server';
import { createCashTx } from '@/modules/finance/server';
import { paymentStatusOf } from '@/modules/sales/domain';

export const GET = guarded(async (req) => {
  await requirePerm('inventory.view');
  const url = new URL(req.url);
  const orderId = Number(url.searchParams.get('orderId')) || 0;
  const status = url.searchParams.get('status') ?? '';
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const take = 20;
  const where: Prisma.ShipmentWhereInput = {
    ...(orderId ? { orderId } : {}), ...(status ? { status: status as never } : {}) };
  const [rows, total] = await Promise.all([
    prisma.shipment.findMany({ where, include: { lines: true }, orderBy: { id: 'desc' },
      skip: (page - 1) * take, take }),
    prisma.shipment.count({ where }),
  ]);
  const orders = await prisma.salesOrder.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.orderId))] } },
    select: { id: true, code: true, partnerName: true } });
  const oMap = new Map(orders.map((o) => [o.id, o]));
  return Response.json({ ok: true, total, page, take,
    rows: rows.map((r) => ({ ...r, order: oMap.get(r.orderId) ?? null })) });
});

const In = z.object({
  orderId: z.number().int(),
  warehouseId: z.number().int(),
  lines: z.array(z.object({ variantId: z.number().int(), qty: z.number().int().positive() })).min(1, 'Chọn hàng để giao'),
  carrier: z.string().trim().optional().nullable(),
  trackingNo: z.string().trim().optional().nullable(),
  shipFee: z.number().int().min(0).default(0),
  codAmount: z.number().int().min(0).default(0),
  note: z.string().optional().nullable(),
  override: z.boolean().default(false),   // giao vuot so con lai — can quyen duyet
});

/** Tao dot giao (1 don giao nhieu dot). Xuat kho ngay khi soan hang (SALE movements). */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('inventory.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu giao hàng không hợp lệ');
  const d = b.data;
  if (d.override && !actor.perms.includes('sales.approve')) {
    throw jsonError(403, 'Giao vượt số lượng đơn cần quyền duyệt (sales.approve).');
  }
  const order = await prisma.salesOrder.findFirst({
    where: { id: d.orderId, deletedAt: null }, include: { lines: true } });
  if (!order) throw jsonError(404, 'Không tìm thấy đơn.');
  if (order.orderStatus !== 'CONFIRMED') throw jsonError(400, 'Chỉ giao hàng cho đơn Đã xác nhận.');
  // Da giao bao nhieu (cac dot chua huy/tra)
  const prev = await prisma.shipmentLine.groupBy({ by: ['variantId'], _sum: { qty: true },
    where: { shipment: { orderId: d.orderId, status: { notIn: ['CANCELLED', 'RETURNED'] } } } });
  const shippedMap = new Map(prev.map((p) => [p.variantId, p._sum.qty ?? 0]));
  const orderedMap = new Map<number, { qty: number; sku: string; name: string }>();
  for (const l of order.lines) {
    if (l.variantId) orderedMap.set(l.variantId, { qty: l.qty, sku: l.sku, name: l.name });
  }
  const checkLines = d.lines.map((l) => {
    const ord = orderedMap.get(l.variantId);
    if (!ord) throw jsonError(400, `Biến thể #${l.variantId} không nằm trong đơn.`);
    return { sku: ord.sku, name: ord.name, qty: l.qty,
      shippable: shippableQty(ord.qty, shippedMap.get(l.variantId) ?? 0) };
  });
  try { assertShipQty(checkLines, d.override); }
  catch (e) { throw jsonError(400, (e as Error).message); }

  const result = await prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, 'GH-');
    const sh = await tx.shipment.create({ data: {
      code, orderId: d.orderId, warehouseId: d.warehouseId,
      carrier: d.carrier ?? null, trackingNo: d.trackingNo ?? null,
      shipFee: d.shipFee, codAmount: d.codAmount,
      codStatus: d.codAmount > 0 ? 'PENDING' : 'NONE',
      note: d.note ?? null, createdById: actor.id, createdByName: actor.name,
      lines: { create: d.lines.map((l, i) => ({ variantId: l.variantId, qty: l.qty,
        sku: checkLines[i].sku, name: checkLines[i].name })) } } });
    // Xuat kho — don co giu cho thi tru theo ton thuc te + giai phong giu cho
    const hasReservation = await tx.stockReservation.findFirst({
      where: { orderId: d.orderId, released: false } });
    await applyMovements(tx, { actor, warehouseId: d.warehouseId, kind: 'SALE',
      lines: d.lines, refType: 'shipment', refId: code,
      note: `Giao đơn ${order.code}`, guard: hasReservation ? 'physical' : 'available' });
    if (hasReservation) {
      // Tieu thu giu cho theo dung so giao — phan chua giao van giu cho dot sau
      for (const l of d.lines) {
        let remaining = l.qty;
        const resRows = await tx.stockReservation.findMany({
          where: { orderId: d.orderId, variantId: l.variantId, released: false }, orderBy: { id: 'asc' } });
        for (const row of resRows) {
          if (remaining <= 0) break;
          const take = Math.min(row.qty, remaining);
          remaining -= take;
          if (take >= row.qty) {
            await tx.stockReservation.update({ where: { id: row.id }, data: { released: true } });
          } else {
            await tx.stockReservation.update({ where: { id: row.id }, data: { qty: row.qty - take } });
          }
          await releaseReserved(tx, d.warehouseId, l.variantId, take);
        }
      }
    }
    if (order.shippingStatus === 'NONE') {
      await tx.salesOrder.update({ where: { id: order.id }, data: { shippingStatus: 'PREPARING' } });
      await logStatus(tx, 'order', order.id, 'shipping', 'NONE', 'PREPARING', actor, `Soạn hàng ${code}`);
    }
    return sh;
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'shipment_create', entity: 'shipment',
    entityId: result.code, after: { order: order.code, lines: d.lines.length, cod: d.codAmount, override: d.override }, ip, ua });
  return Response.json({ ok: true, id: result.id, code: result.code });
});

const StatusIn = z.object({
  id: z.number().int(),
  to: z.enum(['SHIPPING', 'DELIVERED', 'RETURNED', 'CANCELLED']),
  restock: z.boolean().default(true),   // tra/huy dot giao: nhap lai kho hay huy hang
});
const SHIP_FLOW: Record<string, string[]> = {
  PREPARING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  RETURNED: [], CANCELLED: [],
};

/** Chuyen trang thai dot giao; DELIVERED ghi COD vao quy "COD cho doi soat"; RETURNED nhap lai/huy hang. */
export const PATCH = guarded(async (req) => {
  const actor = await requirePerm('inventory.manage');
  const b = StatusIn.safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu không hợp lệ');
  const d = b.data;
  const sh = await prisma.shipment.findFirst({ where: { id: d.id }, include: { lines: true } });
  if (!sh) throw jsonError(404, 'Không tìm thấy đợt giao.');
  if (!SHIP_FLOW[sh.status]?.includes(d.to)) {
    throw jsonError(400, `Không thể chuyển đợt giao từ ${sh.status} sang ${d.to}.`);
  }
  const order = await prisma.salesOrder.findUnique({ where: { id: sh.orderId }, include: { lines: true } });
  if (!order) throw jsonError(404, 'Không tìm thấy đơn của đợt giao.');

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({ where: { id: sh.id }, data: { status: d.to,
      ...(d.to === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
      ...(d.to === 'RETURNED' || d.to === 'CANCELLED' ? { restock: d.restock, codStatus: 'NONE' } : {}) } });
    await logStatus(tx, 'order', order.id, 'shipping', sh.status, d.to, actor, sh.code);

    // Tra/huy don DA THU tien COD → phai DAO tien: khong de quy COD va cong no lech
    if ((d.to === 'RETURNED' || d.to === 'CANCELLED') && sh.codTxId) {
      const codTx = await tx.cashTransaction.findUnique({ where: { id: sh.codTxId } });
      if (codTx && codTx.status === 'APPROVED') {
        const refunded = await tx.cashTransaction.findFirst({
          where: { refundOfId: codTx.id, status: 'APPROVED' } });
        if (!refunded) {
          // Chi dao tien khi CHUA doi soat (tien con o quy COD). Da doi soat → ke toan hoan qua ngan hang.
          if (sh.codStatus === 'PENDING') {
            const code = await nextCode(tx, 'HT-');
            const cash = await createCashTx(tx, { actor, kind: 'REFUND', code,
              accountId: codTx.accountId, amount: codTx.amount,
              partnerId: order.partnerId, partnerName: order.partnerName, orderId: order.id,
              reason: `Hoàn COD do ${d.to === 'RETURNED' ? 'trả hàng' : 'hủy giao'} ${sh.code}`,
              refundOfId: codTx.id, forceApproved: true });
            await tx.payment.create({ data: { code, orderId: order.id, partnerId: order.partnerId,
              amount: -codTx.amount, method: 'CASH', note: `Đảo COD ${sh.code}`,
              cashTxId: cash.tx.id, createdById: actor.id } });
          }
          const paidAmt = order.paidAmt - codTx.amount;
          await tx.salesOrder.update({ where: { id: order.id },
            data: { paidAmt, paymentStatus: paidAmt <= 0 ? 'UNPAID' : 'PARTIAL' } });
        }
      }
    }

    if (d.to === 'SHIPPING' && order.shippingStatus !== 'SHIPPING') {
      await tx.salesOrder.update({ where: { id: order.id }, data: { shippingStatus: 'SHIPPING' } });
    }
    if (d.to === 'DELIVERED') {
      // COD: khach da dua tien cho shipper — tien nam o don vi van chuyen, KHONG phai ngan hang.
      // Ghi thu vao quy "COD cho doi soat"; chi khi doi soat moi chuyen sang ngan hang.
      if (sh.codAmount > 0 && !sh.codTxId) {
        const codAcc = await tx.cashAccount.findFirst({ where: { kind: 'COD', active: true } });
        if (!codAcc) throw jsonError(400, 'Chưa có quỹ COD — tạo trong Giao dịch & quỹ.');
        const remaining = order.total - order.paidAmt;
        const amount = Math.min(sh.codAmount, Math.max(0, remaining));
        if (amount > 0) {
          const code = await nextCode(tx, 'PT-');
          const cash = await createCashTx(tx, { actor, kind: 'RECEIPT', code,
            accountId: codAcc.id, amount, partnerId: order.partnerId, partnerName: order.partnerName,
            orderId: order.id, reason: `COD ${sh.code} (${sh.carrier ?? 'shipper'} thu hộ)` });
          await tx.payment.create({ data: { code, orderId: order.id, partnerId: order.partnerId,
            amount, method: 'CASH', note: `COD ${sh.code}`, cashTxId: cash.tx.id, createdById: actor.id } });
          const paidAmt = order.paidAmt + amount;
          await tx.salesOrder.update({ where: { id: order.id },
            data: { paidAmt, paymentStatus: paymentStatusOf(order.total, paidAmt) } });
          // Luu SO TIEN THUC THU vao codAmount de doi soat rut dung so (khong dung codAmount khai bao)
          await tx.shipment.update({ where: { id: sh.id }, data: { codTxId: cash.tx.id, codAmount: amount } });
        } else {
          // Don da tra du truoc do → shipper khong thu COD → khong co gi doi soat
          await tx.shipment.update({ where: { id: sh.id }, data: { codStatus: 'NONE' } });
        }
      }
      // Neu tong da giao du so dat → don DELIVERED, nguoc lai giu SHIPPING (giao nhieu dot)
      const shipped = await tx.shipmentLine.groupBy({ by: ['variantId'], _sum: { qty: true },
        where: { shipment: { orderId: order.id, status: { in: ['DELIVERED'] } } } });
      const shippedMap = new Map(shipped.map((p) => [p.variantId, p._sum.qty ?? 0]));
      const fullyDelivered = order.lines.every((l) =>
        !l.variantId || (shippedMap.get(l.variantId) ?? 0) >= l.qty);
      await tx.salesOrder.update({ where: { id: order.id },
        data: { shippingStatus: fullyDelivered ? 'DELIVERED' : 'SHIPPING' } });
    }
    if (d.to === 'RETURNED' || d.to === 'CANCELLED') {
      // Nhap lai kho (RETURN) hoac huy hang (SCRAP → khong lam tang ton ban duoc)
      if (d.restock) {
        await applyMovements(tx, { actor, warehouseId: sh.warehouseId, kind: 'RETURN',
          lines: sh.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          refType: 'shipment', refId: sh.code, note: `${d.to === 'RETURNED' ? 'Hoàn hàng' : 'Hủy đợt giao'} ${sh.code}` });
      } else {
        // Hang hong: ghi nhan SCRAP de co dau vet (khong qua RETURN)
        await applyMovements(tx, { actor, warehouseId: sh.warehouseId, kind: 'RETURN',
          lines: sh.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          refType: 'shipment', refId: sh.code, note: `Nhận lại hàng ${sh.code} (hỏng)` });
        await applyMovements(tx, { actor, warehouseId: sh.warehouseId, kind: 'SCRAP',
          lines: sh.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          refType: 'shipment', refId: sh.code, note: `Hủy hàng hỏng ${sh.code}`, guard: 'physical' });
      }
      if (d.to === 'RETURNED') {
        await tx.salesOrder.update({ where: { id: order.id }, data: { shippingStatus: 'RETURNED' } });
      }
    }
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: `shipment_${d.to.toLowerCase()}`,
    entity: 'shipment', entityId: sh.code, after: { restock: d.restock }, ip, ua });
  return Response.json({ ok: true });
});
