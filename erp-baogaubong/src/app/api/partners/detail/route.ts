import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError } from '@/lib/auth';
import { inScope } from '@/lib/scope';

/** Chi tiet 1 doi tac + timeline cham soc + lien he/dia chi/file. Kiem pham vi du lieu. */
export const GET = guarded(async (req) => {
  const user = await requirePerm('partner.view');
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) throw jsonError(400, 'Thiếu id');
  const p = await prisma.partner.findFirst({
    where: { id, deletedAt: null },
    include: {
      group: true,
      assignedTo: { select: { id: true, name: true } },
      contacts: { where: { deletedAt: null } },
      addresses: { where: { deletedAt: null } },
      activities: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 100,
        include: { createdBy: { select: { name: true } }, assignee: { select: { name: true } } } },
      attachments: { where: { deletedAt: null }, orderBy: { id: 'desc' },
        select: { id: true, fileName: true, mime: true, size: true, createdAt: true,
          uploadedBy: { select: { name: true } } } },
    },
  });
  if (!p || !inScope(user, p)) throw jsonError(404, 'Không tìm thấy đối tác trong phạm vi của bạn.');
  // Lich su don hang cua khach (de xem 1 khach da mua nhung don nao).
  const orders = await prisma.salesOrder.findMany({
    where: { partnerId: id, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 100,
    select: { id: true, code: true, total: true, paidAmt: true, orderStatus: true, paymentStatus: true, createdAt: true } });
  const spent = orders.filter((o) => o.orderStatus !== 'CANCELLED').reduce((s, o) => s + o.total, 0);
  return Response.json({ ok: true, partner: p, orders, summary: { orderCount: orders.length, spent } });
});
