import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, hashPassword, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';

const Create = z.object({
  username: z.string().min(3), name: z.string().min(1), phone: z.string().optional().nullable(),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'), roleId: z.number().int(),
  branchId: z.number().int().nullable().optional(), scope: z.enum(['OWN','TEAM','BRANCH','ALL']), active: z.boolean(),
});
const Patch = Create.partial().extend({ id: z.number().int(), password: z.string().min(6).optional().or(z.literal('')) });

export const POST = guarded(async (req) => {
  const actor = await requirePerm('user.manage');
  const b = Create.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const exists = await prisma.user.findUnique({ where: { username: b.data.username } });
  if (exists) throw jsonError(400, 'Tài khoản đã tồn tại.');
  const u = await prisma.user.create({ data: {
    username: b.data.username, name: b.data.name, phone: b.data.phone ?? null,
    passwordHash: await hashPassword(b.data.password), roleId: b.data.roleId,
    branchId: b.data.branchId ?? null, scope: b.data.scope, active: b.data.active } });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'user_create', entity: 'user',
    entityId: String(u.id), after: { username: u.username, roleId: u.roleId }, ip, ua });
  return Response.json({ ok: true, id: u.id });
});

export const PATCH = guarded(async (req) => {
  const actor = await requirePerm('user.manage');
  const b = Patch.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const before = await prisma.user.findUnique({ where: { id: b.data.id } });
  if (!before || before.deletedAt) throw jsonError(404, 'Không tìm thấy tài khoản.');
  const data: Record<string, unknown> = {};
  for (const k of ['name','phone','roleId','branchId','scope','active'] as const) {
    if (b.data[k] !== undefined) data[k] = b.data[k];
  }
  if (b.data.password) data.passwordHash = await hashPassword(b.data.password);
  const u = await prisma.user.update({ where: { id: b.data.id }, data });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'user_update', entity: 'user',
    entityId: String(u.id),
    before: { roleId: before.roleId, active: before.active, scope: before.scope },
    after: { roleId: u.roleId, active: u.active, scope: u.scope }, ip, ua });
  return Response.json({ ok: true });
});
