import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError } from '@/lib/auth';
import { inScope } from '@/lib/scope';
import { audit } from '@/lib/audit';

/** Bat/tat nhan VIP cho 1 khach (chi nguoi co quyen quan ly doi tac). */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('partner.manage');
  const b = z.object({ id: z.number().int(), vip: z.boolean() }).safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu không hợp lệ');
  const p = await prisma.partner.findFirst({ where: { id: b.data.id, deletedAt: null } });
  if (!p || !inScope(actor, p)) throw jsonError(404, 'Không tìm thấy khách trong phạm vi của bạn.');
  await prisma.partner.update({ where: { id: p.id }, data: { isVip: b.data.vip } });
  await audit({ actorId: actor.id, actorName: actor.name, action: b.data.vip ? 'partner_vip_on' : 'partner_vip_off',
    entity: 'partner', entityId: p.code });
  return Response.json({ ok: true, isVip: b.data.vip });
});
