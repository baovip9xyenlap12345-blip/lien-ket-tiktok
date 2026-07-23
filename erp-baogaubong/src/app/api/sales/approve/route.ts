import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { scopeWhere, inScope } from '@/lib/scope';
import { logStatus } from '@/modules/sales/server';

/** Danh sach cho duyet + duyet/tu choi. CHI nguoi co quyen sales.approve, TRONG pham vi du lieu. */
export const GET = guarded(async () => {
  const user = await requirePerm('sales.approve');
  const scope = scopeWhere(user);
  const [quotes, orders] = await Promise.all([
    prisma.quote.findMany({ where: { deletedAt: null, approvalStatus: 'PENDING', ...scope },
      select: { id: true, code: true, partnerName: true, total: true, approvalReason: true, createdAt: true } }),
    prisma.salesOrder.findMany({ where: { deletedAt: null, approvalStatus: 'PENDING', ...scope },
      select: { id: true, code: true, partnerName: true, total: true, approvalReason: true, createdAt: true } }),
  ]);
  return Response.json({ ok: true, quotes, orders });
});

const In = z.object({ entity: z.enum(['quote', 'order']), id: z.number().int(), approve: z.boolean(),
  note: z.string().optional() });

export const POST = guarded(async (req) => {
  const actor = await requirePerm('sales.approve');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu không hợp lệ');
  const d = b.data;
  const to = d.approve ? 'APPROVED' : 'REJECTED';
  const code = await prisma.$transaction(async (tx) => {
    if (d.entity === 'quote') {
      const cur = await tx.quote.findFirst({ where: { id: d.id, deletedAt: null } });
      if (!cur || !inScope(actor, cur)) throw jsonError(404, 'Không tìm thấy báo giá trong phạm vi của bạn.');
      if (cur.approvalStatus !== 'PENDING') throw jsonError(400, 'Báo giá này không ở trạng thái chờ duyệt.');
      await tx.quote.update({ where: { id: d.id },
        data: { approvalStatus: to, approvedById: actor.id, approvedAt: new Date() } });
      await logStatus(tx, 'quote', d.id, 'approval', 'PENDING', to, actor, d.note);
      return cur.code;
    }
    const cur = await tx.salesOrder.findFirst({ where: { id: d.id, deletedAt: null } });
    if (!cur || !inScope(actor, cur)) throw jsonError(404, 'Không tìm thấy đơn hàng trong phạm vi của bạn.');
    if (cur.approvalStatus !== 'PENDING') throw jsonError(400, 'Đơn này không ở trạng thái chờ duyệt.');
    await tx.salesOrder.update({ where: { id: d.id },
      data: { approvalStatus: to, approvedById: actor.id, approvedAt: new Date() } });
    await logStatus(tx, 'order', d.id, 'approval', 'PENDING', to, actor, d.note);
    return cur.code;
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: d.approve ? 'sales_approve' : 'sales_reject',
    entity: d.entity, entityId: code, after: { note: d.note }, ip, ua });
  return Response.json({ ok: true });
});
