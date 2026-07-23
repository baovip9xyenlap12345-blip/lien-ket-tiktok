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
  const codAcc = await prisma.cashAccount.findFirst({ where: { kind: 'COD', active: true } });
  if (!codAcc) throw jsonError(400, 'Chưa có quỹ COD.');
  if (codAcc.id === d.toAccountId) throw jsonError(400, 'Quỹ nhận phải khác quỹ COD.');
  const group = `DS${Date.now().toString(36)}`;
  const out = await prisma.$transaction(async (tx) => {
    // CHONG DOI SOAT TRUNG: dieu kien codStatus='PENDING' nam TRONG updateMany.
    // So ban ghi doi duoc = so ban thuc su chuyen tu PENDING → neu khac ky vong la co race, huy.
    const flagged = await tx.shipment.updateMany({
      where: { id: { in: d.shipmentIds }, status: 'DELIVERED', codStatus: 'PENDING' },
      data: { codStatus: 'RECONCILED' } });
    if (flagged.count !== d.shipmentIds.length) {
      throw jsonError(400, 'Có vận đơn không hợp lệ hoặc vừa được đối soát bởi người khác — thử lại.');
    }
    // Chuyen dung SO TIEN THUC THU (codAmount da luu = so shipper thu that khi giao)
    const shipments = await tx.shipment.findMany({ where: { id: { in: d.shipmentIds } } });
    const total = shipments.reduce((a, s) => a + s.codAmount, 0);
    if (total <= 0) throw jsonError(400, 'Không có tiền COD thực thu để đối soát.');
    await createCashTx(tx, { actor, kind: 'TRANSFER_OUT', accountId: codAcc.id, amount: total,
      reason: `Đối soát COD ${shipments.length} vận đơn`, note: d.note ?? null,
      transferGroup: group, forceApproved: true });
    await createCashTx(tx, { actor, kind: 'TRANSFER_IN', accountId: d.toAccountId, amount: total,
      reason: `Đối soát COD ${shipments.length} vận đơn`, note: d.note ?? null,
      transferGroup: group, forceApproved: true });
    return { total, codes: shipments.map((s) => s.code).join(',') };
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'cod_reconcile', entity: 'shipment',
    entityId: out.codes, after: { total: out.total, to: d.toAccountId }, ip, ua });
  return Response.json({ ok: true, total: out.total });
});
