import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta, getSessionUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { assertDayValue } from '@/modules/hr/domain';

/** Bang cong thang: ?period=YYYY-MM. hr.view xem het; nhan vien thuong chi xem minh. */
export const GET = guarded(async (req) => {
  const user = await getSessionUser();
  if (!user) throw jsonError(401, 'Chưa đăng nhập.');
  const period = new URL(req.url).searchParams.get('period') ?? '';
  if (!/^\d{4}-\d{2}$/.test(period)) throw jsonError(400, 'Thiếu kỳ (YYYY-MM).');
  const all = user.perms.includes('hr.view') || user.perms.includes('hr.manage');
  const from = new Date(`${period}-01T00:00:00Z`);
  const to = new Date(from); to.setUTCMonth(to.getUTCMonth() + 1);
  const rows = await prisma.timesheetEntry.findMany({
    where: { date: { gte: from, lt: to }, ...(all ? {} : { userId: user.id }) },
    orderBy: [{ userId: 'asc' }, { date: 'asc' }] });
  const users = all
    ? await prisma.user.findMany({ where: { deletedAt: null, active: true },
        select: { id: true, name: true }, orderBy: { id: 'asc' } })
    : [{ id: user.id, name: user.name }];
  return Response.json({ ok: true, users, rows: rows.map((r) => ({
    userId: r.userId, date: r.date.toISOString().slice(0, 10), day: Number(r.day), note: r.note })) });
});

const In = z.object({
  userId: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày dạng YYYY-MM-DD'),
  day: z.number(),
  note: z.string().optional().nullable(),
});

/** Cham cong 1 nguoi 1 ngay (0 / 0.5 / 1) — sua cong ghi audit truoc/sau. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('hr.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  try { assertDayValue(d.day); } catch (e) { throw jsonError(400, (e as Error).message); }
  const date = new Date(`${d.date}T00:00:00Z`);
  const before = await prisma.timesheetEntry.findUnique({
    where: { userId_date: { userId: d.userId, date } } });
  await prisma.timesheetEntry.upsert({
    where: { userId_date: { userId: d.userId, date } },
    update: { day: d.day, note: d.note ?? null, byId: actor.id, byName: actor.name },
    create: { userId: d.userId, date, day: d.day, note: d.note ?? null, byId: actor.id, byName: actor.name } });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'timesheet_set',
    entity: 'timesheet', entityId: `${d.userId}/${d.date}`,
    before: before ? { day: Number(before.day) } : null, after: { day: d.day }, ip, ua });
  return Response.json({ ok: true });
});
