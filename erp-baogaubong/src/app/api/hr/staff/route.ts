import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';

/** Ho so nhan su (user + profile luong). */
export const GET = guarded(async () => {
  await requirePerm('hr.view');
  const users = await prisma.user.findMany({ where: { deletedAt: null },
    select: { id: true, username: true, name: true, active: true,
      role: { select: { id: true, code: true, name: true } } }, orderBy: { id: 'asc' } });
  const profiles = await prisma.employeeProfile.findMany();
  const pMap = new Map(profiles.map((p) => [p.userId, p]));
  return Response.json({ ok: true, rows: users.map((u) => ({ ...u, profile: pMap.get(u.id) ?? null })) });
});

const In = z.object({
  userId: z.number().int(),
  position: z.string().trim().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  baseSalary: z.number().int().min(0).default(0),
  allowance: z.number().int().min(0).default(0),
  bankAccount: z.string().trim().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const POST = guarded(async (req) => {
  const actor = await requirePerm('hr.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const user = await prisma.user.findFirst({ where: { id: d.userId, deletedAt: null } });
  if (!user) throw jsonError(404, 'Không tìm thấy nhân viên.');
  const before = await prisma.employeeProfile.findUnique({ where: { userId: d.userId } });
  const data = { position: d.position ?? null, joinDate: d.joinDate ? new Date(d.joinDate) : null,
    baseSalary: d.baseSalary, allowance: d.allowance,
    bankAccount: d.bankAccount ?? null, note: d.note ?? null };
  await prisma.employeeProfile.upsert({ where: { userId: d.userId },
    update: data, create: { userId: d.userId, ...data } });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'hr_profile_set',
    entity: 'employee', entityId: user.username,
    before: before ? { baseSalary: before.baseSalary, allowance: before.allowance } : null,
    after: { baseSalary: d.baseSalary, allowance: d.allowance }, ip, ua });
  return Response.json({ ok: true });
});
