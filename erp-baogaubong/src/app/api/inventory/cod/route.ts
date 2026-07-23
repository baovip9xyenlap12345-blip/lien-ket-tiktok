import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { createCashTx } from '@/modules/finance/server';

/** COD cho doi soat: da giao xong nhung tien con nam o don vi van chuyen. */
export const GET = guarded(async () => {
  await requirePerm('finance.view');
  const rows = await prisma.shipment.findMany({
    where: { status: 'DELIVERED', codStatus: 'PENDING', codAmount: { gt: 0 } },
    orderBy: { deliveredAt: 'asc' } });
  const orders = await prisma.salesOrder.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.orderId))] } },
    select: { id: true, code: true, partnerName: true } });
  const oMap = new Map(orders.map((o) => [o.id, o]));
  return Response.json({ ok: true,
    rows: rows.map((r) => ({ ...r, order: oMap.get(r.orderId) ?? null })),
    total: rows.reduce((a, r) => a + r.codAmount, 0) });
});

const In = z.object({
  shipmentIds: z.array(z.number().int()).min(1, 'Chọn ít nhất 1 vận đơn'),
  toAccountId: z.number().int(),
  note: z.string().optional(),
});

/** Doi soat COD: ngan hang bao co → chuyen tien tu quy COD sang quy dich, danh dau RECONCILED. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('finance.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const shipments = await prisma.shipment.findMany({
    where: { id: { in: d.shipmentIds }, status: 'DELIVERED', codStatus: 'PENDING' } });
  if (shipments.length !== d.shipmentIds.length) {
    throw jsonError(400, 'Có vận đơn không hợp lệ (chưa giao xong hoặc đã đối soát).');
  }
  const total = shipments.reduce((a, s) => a + s.codAmount, 0);
  const codAcc = await prisma.cashAccount.findFirst({ where: { kind: 'COD', active: true } });
  if (!codAcc) throw jsonError(400, 'Chưa có quỹ COD.');
  if (codAcc.id === d.toAccountId) throw jsonError(400, 'Quỹ nhận phải khác quỹ COD.');
  const group = `DS${Date.now().toString(36)}`;
  await prisma.$transaction(async (tx) => {
    await createCashTx(tx, { actor, kind: 'TRANSFER_OUT', accountId: codAcc.id, amount: total,
      reason: `Đối soát COD ${shipments.length} vận đơn`, note: d.note ?? null,
      transferGroup: group, forceApproved: true });
    await createCashTx(tx, { actor, kind: 'TRANSFER_IN', accountId: d.toAccountId, amount: total,
      reason: `Đối soát COD ${shipments.length} vận đơn`, note: d.note ?? null,
      transferGroup: group, forceApproved: true });
    await tx.shipment.updateMany({ where: { id: { in: d.shipmentIds } },
      data: { codStatus: 'RECONCILED' } });
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'cod_reconcile', entity: 'shipment',
    entityId: shipments.map((s) => s.code).join(','), after: { total, to: d.toAccountId }, ip, ua });
  return Response.json({ ok: true, total });
});
