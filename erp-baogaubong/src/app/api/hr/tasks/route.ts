import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guarded, jsonError, getSessionUser } from '@/lib/auth';

/** Giao viec noi bo: ai cung xem viec cua minh; hr.view/hr.manage xem het. */
export const GET = guarded(async () => {
  const user = await getSessionUser();
  if (!user) throw jsonError(401, 'Chưa đăng nhập.');
  const all = user.perms.includes('hr.view') || user.perms.includes('hr.manage');
  const rows = await prisma.hrTask.findMany({
    where: all ? {} : { OR: [{ assigneeId: user.id }, { createdById: user.id }] },
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }], take: 100 });
  const users = await prisma.user.findMany({ where: { deletedAt: null, active: true },
    select: { id: true, name: true }, orderBy: { id: 'asc' } });
  return Response.json({ ok: true, rows, users });
});

const In = z.object({
  title: z.string().trim().min(1, 'Nhập tên việc'),
  desc: z.string().optional().nullable(),
  assigneeId: z.number().int(),
  dueAt: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).default('NORMAL'),
});

/** Ai co hr.manage giao viec cho bat ky ai; nguoi thuong tu giao viec cho minh. */
export const POST = guarded(async (req) => {
  const user = await getSessionUser();
  if (!user) throw jsonError(401, 'Chưa đăng nhập.');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  if (d.assigneeId !== user.id && !user.perms.includes('hr.manage')) {
    throw jsonError(403, 'Giao việc cho người khác cần quyền quản lý nhân sự.');
  }
  const row = await prisma.hrTask.create({ data: { title: d.title, desc: d.desc ?? null,
    assigneeId: d.assigneeId, dueAt: d.dueAt ? new Date(d.dueAt) : null, priority: d.priority,
    createdById: user.id, createdByName: user.name } });
  return Response.json({ ok: true, id: row.id });
});

/** Doi trang thai viec: nguoi duoc giao / nguoi giao / hr.manage. */
export const PATCH = guarded(async (req) => {
  const user = await getSessionUser();
  if (!user) throw jsonError(401, 'Chưa đăng nhập.');
  const b = z.object({ id: z.number().int(), status: z.enum(['OPEN', 'DOING', 'DONE', 'CANCELLED']) })
    .safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu không hợp lệ');
  const task = await prisma.hrTask.findUnique({ where: { id: b.data.id } });
  if (!task) throw jsonError(404, 'Không tìm thấy việc.');
  if (task.assigneeId !== user.id && task.createdById !== user.id && !user.perms.includes('hr.manage')) {
    throw jsonError(403, 'Không phải việc của bạn.');
  }
  await prisma.hrTask.update({ where: { id: task.id },
    data: { status: b.data.status, doneAt: b.data.status === 'DONE' ? new Date() : null } });
  return Response.json({ ok: true });
});
