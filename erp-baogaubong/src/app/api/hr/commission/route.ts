import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { commissionOf } from '@/modules/hr/domain';

/** Quy tac hoa hong (phien ban) + cac ky da chot. */
export const GET = guarded(async () => {
  await requirePerm('hr.view');
  const [rules, periods] = await Promise.all([
    prisma.commissionRule.findMany({ orderBy: { version: 'desc' } }),
    prisma.commissionPeriod.findMany({ include: { lines: true }, orderBy: { period: 'desc' } }),
  ]);
  const userIds = [...new Set(periods.flatMap((p) => p.lines.map((l) => l.userId)))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } },
    select: { id: true, name: true } });
  const uMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
  return Response.json({ ok: true, rules,
    periods: periods.map((p) => ({ ...p,
      lines: p.lines.map((l) => ({ ...l, name: uMap[l.userId] ?? l.userId })) })) });
});

const RuleIn = z.object({ action: z.literal('rule'),
  basis: z.enum(['REVENUE', 'COLLECTED']), pct: z.number().min(0).max(100),
  note: z.string().optional().nullable() });
const CloseIn = z.object({ action: z.literal('close'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Kỳ dạng YYYY-MM') });
const In = z.discriminatedUnion('action', [RuleIn, CloseIn]);

export const POST = guarded(async (req) => {
  const actor = await requirePerm('hr.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const { ip, ua } = reqMeta();

  // Quy tac moi = PHIEN BAN moi (khong sua ban cu)
  if (b.data.action === 'rule') {
    const last = await prisma.commissionRule.findFirst({ orderBy: { version: 'desc' } });
    const rule = await prisma.commissionRule.create({ data: {
      version: (last?.version ?? 0) + 1, basis: b.data.basis, pct: b.data.pct,
      note: b.data.note ?? null, createdById: actor.id, createdByName: actor.name } });
    await audit({ actorId: actor.id, actorName: actor.name, action: 'commission_rule',
      entity: 'commission', entityId: `v${rule.version}`,
      after: { basis: b.data.basis, pct: b.data.pct }, ip, ua });
    return Response.json({ ok: true, version: rule.version });
  }

  // Chot ky: tinh theo quy tac hien hanh, luu SNAPSHOT — quy tac moi khong doi lich su
  const period = b.data.period;
  const existed = await prisma.commissionPeriod.findUnique({ where: { period } });
  if (existed) throw jsonError(400, `Kỳ ${period} đã chốt hoa hồng rồi — không tính lại được.`);
  const rule = await prisma.commissionRule.findFirst({ orderBy: { version: 'desc' } });
  if (!rule) throw jsonError(400, 'Chưa có quy tắc hoa hồng — tạo quy tắc trước.');
  const from = new Date(`${period}-01T00:00:00Z`);
  const to = new Date(from); to.setUTCMonth(to.getUTCMonth() + 1);
  const bases = rule.basis === 'REVENUE'
    ? await prisma.salesOrder.groupBy({ by: ['assignedToId'], _sum: { total: true },
        where: { deletedAt: null, orderStatus: { in: ['CONFIRMED', 'DONE'] },
          createdAt: { gte: from, lt: to }, assignedToId: { not: null } } })
        .then((rows) => rows.map((r) => ({ userId: r.assignedToId!, base: r._sum.total ?? 0 })))
    : await prisma.payment.groupBy({ by: ['createdById'], _sum: { amount: true },
        where: { createdAt: { gte: from, lt: to } } })
        .then((rows) => rows.map((r) => ({ userId: r.createdById, base: r._sum.amount ?? 0 })));
  const result = await prisma.$transaction(async (tx) => {
    return tx.commissionPeriod.create({ data: {
      period, ruleVersion: rule.version, basis: rule.basis, pct: rule.pct,
      lockedById: actor.id, lockedByName: actor.name,
      lines: { create: bases.filter((x) => x.base > 0).map((x) => ({
        userId: x.userId, base: x.base, amount: commissionOf(x.base, Number(rule.pct)) })) } },
      include: { lines: true } });
  });
  await audit({ actorId: actor.id, actorName: actor.name, action: 'commission_close',
    entity: 'commission', entityId: period,
    after: { rule: `v${rule.version}`, lines: result.lines.length }, ip, ua });
  return Response.json({ ok: true, lines: result.lines.length });
});
