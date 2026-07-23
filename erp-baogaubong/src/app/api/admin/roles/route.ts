import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';

const Body = z.object({ roleId: z.number().int(), permIds: z.array(z.number().int()) });

export const PATCH = guarded(async (req) => {
  const actor = await requirePerm('role.manage');
  const b = Body.safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu không hợp lệ');
  const role = await prisma.role.findUnique({ where: { id: b.data.roleId }, include: { perms: true } });
  if (!role) throw jsonError(404, 'Không tìm thấy vai trò.');
  if (role.code === 'admin') throw jsonError(400, 'Không được sửa quyền Super Admin.');
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
    prisma.rolePermission.createMany({ data: b.data.permIds.map((permissionId) => ({ roleId: role.id, permissionId })) }),
  ]);
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'role_perms_update', entity: 'role',
    entityId: role.code, before: { permIds: role.perms.map((p) => p.permissionId) },
    after: { permIds: b.data.permIds }, ip, ua });
  return Response.json({ ok: true });
});
