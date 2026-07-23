import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta, getSessionUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

/** KPI sale theo ky: chi tieu vs THUC TE tu don hang (khong nhap tay so thuc te). */
export const GET = guarded(async (req) => {
  const user = await getSessionUser();
  if (!user) throw jsonError(401, 'Chưa đăng nhập.');
  const period = new URL(req.url).searchParams.get('period') ?? '';
  if (!/^\d{4}-\d{2}$/.test(period)) throw jsonError(400, 'Thiếu kỳ (YYYY-MM).');
  const all = user.perms.includes('hr.view') || user.perms.includes('hr.manage');
  const from = new Date(`${period}-01T00:00:00Z`);
  const to = new Date(from); to.setUTCMonth(to.getUTCMonth() + 1);
  const users = all
    ? await prisma.user.findMany({ where: { deletedAt: null, active: true },
        select: { id: true, name: true }, orderBy: { id: 'asc' } })
    : [{ id: user.id, name: user.name }];
  const [targets, actualRevenue, actualCollected] = await Promise.all([
    prisma.kpiTarget.findMany({ where: { period, userId: { in: users.map((u) => u.id) } } }),
    prisma.salesOrder.groupBy({ by: ['assignedToId'], _sum: { total: true },
      where: { deletedAt: null, orderStatus: { in: ['CONFIRMED', 'DONE'] },
        createdAt: { gte: from, lt: to }, assignedToId: { in: users.map((u) => u.id) } } }),
    prisma.payment.groupBy({ by: ['createdById'], _sum: { amount: true },
      where: { createdAt: { gte: from, lt: to }, createdById: { in: users.map((u) => u.id) } } }),
  ]);
  const tMap = new Map(targets.map((t) => [t.userId, t.targetRevenue]));
  const rMap = new Map(actualRevenue.map((r) => [r.assignedToId, r._sum.total ?? 0]));
  const cMap = new Map(actualCollected.map((r) => [r.createdById, r._sum.amount ?? 0]));
  return Response.json({ ok: true, rows: users.map((u) => {
    const target = tMap.get(u.id) ?? 0;
    const revenue = rMap.get(u.id) ?? 0;
    return { userId: u.id, name: u.name, target, revenue,
      collected: cMap.get(u.id) ?? 0,
      pct: target > 0 ? Math.round(revenue / target * 100) : null };
  }) });
});

const In = z.object({ userId: z.number().int(), period: z.string().regex(/^\d{4}-\d{2}$/),
  targetRevenue: z.number().int().min(0), note: z.string().optional().nullable() });

export const POST = guarded(async (req) => {
  const actor = await requirePerm('hr.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu KPI không hợp lệ');
  const d = b.data;
  const before = await prisma.kpiTarget.findUnique({
    where: { userId_period: { userId: d.userId, period: d.period } } });
  await prisma.kpiTarget.upsert({
    where: { userId_period: { userId: d.userId, period: d.period } },
    update: { targetRevenue: d.targetRevenue, note: d.note ?? null },
    create: { userId: d.userId, period: d.period, targetRevenue: d.targetRevenue, note: d.note ?? null } });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'kpi_set', entity: 'kpi',
    entityId: `${d.userId}/${d.period}`,
    before: before ? { target: before.targetRevenue } : null,
    after: { target: d.targetRevenue }, ip, ua });
  return Response.json({ ok: true });
});
