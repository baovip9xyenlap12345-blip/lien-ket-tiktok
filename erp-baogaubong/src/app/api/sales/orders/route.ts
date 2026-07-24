import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError } from '@/lib/auth';
import { scopeWhere, inScope } from '@/lib/scope';
import { assertTransition } from '@/modules/sales/domain';
import { logStatus } from '@/modules/sales/server';
import { releaseReserved } from '@/modules/inventory/server';

export const GET = guarded(async (req) => {
  const user = await requirePerm('sales.view');
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const status = url.searchParams.get('status') ?? '';
  const pay = url.searchParams.get('pay') ?? '';
  const id = Number(url.searchParams.get('id')) || 0;
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const take = 20;
  if (id) {
    const order = await prisma.salesOrder.findFirst({ where: { id, deletedAt: null },
      include: { lines: true, payments: { orderBy: { id: 'asc' } },
        quote: { select: { code: true } } } });
    if (!order || !inScope(user, order)) throw jsonError(404, 'Không tìm thấy đơn trong phạm vi của bạn.');
    // SalesOrder khong co quan he partner truc tiep → lay lien he khach theo partnerId.
    const partner = order.partnerId ? await prisma.partner.findUnique({ where: { id: order.partnerId },
      select: { code: true, name: true, phone: true, email: true,
        addresses: { where: { deletedAt: null }, select: { address: true } } } }) : null;
    const history = await prisma.statusHistory.findMany({
      where: { entity: 'order', entityId: id }, orderBy: { id: 'asc' } });
    return Response.json({ ok: true, order: { ...order, partner }, history });
  }
  const where: Prisma.SalesOrderWhereInput = {
    deletedAt: null, ...scopeWhere(user),
    ...(status ? { orderStatus: status as never } : {}),
    ...(pay ? { paymentStatus: pay as never } : {}),
    ...(q ? { OR: [
      { code: { contains: q, mode: 'insensitive' } },
      { partnerName: { contains: q, mode: 'insensitive' } },
    ] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.salesOrder.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * take, take }),
    prisma.salesOrder.count({ where }),
  ]);
  // SDT khach theo partnerId (SalesOrder khong co quan he partner truc tiep).
  const pids = [...new Set(rows.map((r) => r.partnerId).filter((x): x is number => x != null))];
  const partners = pids.length ? await prisma.partner.findMany({ where: { id: { in: pids } }, select: { id: true, phone: true } }) : [];
  const phoneMap = new Map(partners.map((p) => [p.id, p.phone]));
  const outRows = rows.map((o) => ({ ...o, partnerPhone: o.partnerId ? phoneMap.get(o.partnerId) ?? null : null }));
  return Response.json({ ok: true, rows: outRows, total, page, take });
});

/** Chuyen trang thai 1 truc cua don (order/production/shipping). */
export const PATCH = guarded(async (req) => {
  const actor = await requirePerm('sales.manage');
  const b = z.object({ id: z.number().int(),
    axis: z.enum(['order', 'production', 'shipping']), to: z.string() }).safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu không hợp lệ');
  const cur = await prisma.salesOrder.findFirst({ where: { id: b.data.id, deletedAt: null } });
  if (!cur || !inScope(actor, cur)) throw jsonError(404, 'Không tìm thấy đơn trong phạm vi của bạn.');
  const fromVal = b.data.axis === 'order' ? cur.orderStatus
    : b.data.axis === 'production' ? cur.productionStatus : cur.shippingStatus;
  try { assertTransition(b.data.axis, fromVal, b.data.to); }
  catch (e) { throw jsonError(400, (e as Error).message); }
  if (b.data.axis === 'order' && b.data.to === 'CONFIRMED') {
    if (cur.approvalStatus === 'PENDING') throw jsonError(400, 'Đơn đang chờ duyệt (chiết khấu/công nợ) — chưa xác nhận được.');
    if (cur.approvalStatus === 'REJECTED') throw jsonError(400, 'Đơn bị từ chối duyệt.');
  }
  const field = b.data.axis === 'order' ? 'orderStatus'
    : b.data.axis === 'production' ? 'productionStatus' : 'shippingStatus';
  await prisma.$transaction(async (tx) => {
    await tx.salesOrder.update({ where: { id: cur.id }, data: { [field]: b.data.to } });
    await logStatus(tx, 'order', cur.id, b.data.axis, fromVal, b.data.to, actor);
    // Huy don → nha het giu cho kho (tra lai ton kha dung) de kho khong bi ket.
    if (b.data.axis === 'order' && b.data.to === 'CANCELLED') {
      const rows = await tx.stockReservation.findMany({ where: { orderId: cur.id, released: false } });
      for (const r of rows) {
        await releaseReserved(tx, r.warehouseId, r.variantId, r.qty);
        await tx.stockReservation.update({ where: { id: r.id }, data: { released: true } });
      }
    }
  });
  return Response.json({ ok: true });
});
