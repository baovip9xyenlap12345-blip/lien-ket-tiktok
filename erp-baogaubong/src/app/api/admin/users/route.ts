import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, hashPassword, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';

// roleIds: 1 nhan vien co the kiem NHIEU vai tro. Phan tu dau = vai tro chinh, con lai = kiem nhiem.
const Create = z.object({
  username: z.string().min(3), name: z.string().min(1), phone: z.string().optional().nullable(),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  roleIds: z.array(z.number().int()).min(1, 'Chọn ít nhất 1 vai trò'),
  branchId: z.number().int().nullable().optional(), scope: z.enum(['OWN','TEAM','BRANCH','ALL']), active: z.boolean(),
});
const Patch = Create.partial().extend({ id: z.number().int(), password: z.string().min(6).optional().or(z.literal('')) });

/** Tach danh sach vai tro thanh: vai tro chinh (roleId) + cac vai tro kiem nhiem (extra). */
function splitRoles(roleIds: number[]) {
  const uniq = Array.from(new Set(roleIds));
  return { primary: uniq[0], extra: uniq.slice(1) };
}

export const POST = guarded(async (req) => {
  const actor = await requirePerm('user.manage');
  const b = Create.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const exists = await prisma.user.findUnique({ where: { username: b.data.username } });
  if (exists) throw jsonError(400, 'Tài khoản đã tồn tại.');
  const { primary, extra } = splitRoles(b.data.roleIds);
  const u = await prisma.user.create({ data: {
    username: b.data.username, name: b.data.name, phone: b.data.phone ?? null,
    passwordHash: await hashPassword(b.data.password), roleId: primary,
    extraRoles: { connect: extra.map((id) => ({ id })) },
    branchId: b.data.branchId ?? null, scope: b.data.scope, active: b.data.active } });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'user_create', entity: 'user',
    entityId: String(u.id), after: { username: u.username, roleIds: b.data.roleIds }, ip, ua });
  return Response.json({ ok: true, id: u.id });
});

export const PATCH = guarded(async (req) => {
  const actor = await requirePerm('user.manage');
  const b = Patch.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const before = await prisma.user.findUnique({ where: { id: b.data.id }, include: { extraRoles: { select: { id: true } } } });
  if (!before || before.deletedAt) throw jsonError(404, 'Không tìm thấy tài khoản.');
  const data: Record<string, unknown> = {};
  for (const k of ['name','phone','branchId','scope','active'] as const) {
    if (b.data[k] !== undefined) data[k] = b.data[k];
  }
  if (b.data.roleIds) {
    const { primary, extra } = splitRoles(b.data.roleIds);
    data.roleId = primary;
    data.extraRoles = { set: extra.map((id) => ({ id })) };   // set = thay toan bo danh sach kiem nhiem
  }
  if (b.data.password) data.passwordHash = await hashPassword(b.data.password);
  const u = await prisma.user.update({ where: { id: b.data.id }, data });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'user_update', entity: 'user',
    entityId: String(u.id),
    before: { roleId: before.roleId, extraRoleIds: before.extraRoles.map((r) => r.id), active: before.active, scope: before.scope },
    after: { roleIds: b.data.roleIds, active: u.active, scope: u.scope }, ip, ua });
  return Response.json({ ok: true });
});
