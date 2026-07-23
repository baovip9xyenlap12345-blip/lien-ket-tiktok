import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError } from '@/lib/auth';

/** Xuat CSV: ?type=timesheet|payroll&period=YYYY-MM (quyen hr.view). */
export const GET = guarded(async (req) => {
  await requirePerm('hr.view');
  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? 'payroll';
  const period = url.searchParams.get('period') ?? '';
  if (!/^\d{4}-\d{2}$/.test(period)) throw jsonError(400, 'Thiếu kỳ (YYYY-MM).');
  const users = await prisma.user.findMany({ where: { deletedAt: null },
    select: { id: true, name: true, username: true } });
  const uMap = new Map(users.map((u) => [u.id, u]));
  let csv = '';
  if (type === 'timesheet') {
    const from = new Date(`${period}-01T00:00:00Z`);
    const to = new Date(from); to.setUTCMonth(to.getUTCMonth() + 1);
    const rows = await prisma.timesheetEntry.findMany({
      where: { date: { gte: from, lt: to } }, orderBy: [{ userId: 'asc' }, { date: 'asc' }] });
    csv = 'username,name,date,day,note\n';
    for (const r of rows) {
      const u = uMap.get(r.userId);
      csv += [u?.username ?? r.userId, JSON.stringify(u?.name ?? ''), r.date.toISOString().slice(0, 10),
        Number(r.day), JSON.stringify(r.note ?? '')].join(',') + '\n';
    }
  } else {
    const rows = await prisma.payrollSlip.findMany({ where: { period }, orderBy: { userId: 'asc' } });
    csv = 'code,username,name,period,base_salary,work_days,standard_days,salary_by_days,allowance,commission,bonus,penalty,advance,total,status\n';
    for (const r of rows) {
      const u = uMap.get(r.userId);
      csv += [r.code, u?.username ?? r.userId, JSON.stringify(u?.name ?? ''), r.period,
        r.baseSalary, Number(r.workDays), r.standardDays, r.salaryByDays, r.allowance,
        r.commission, r.bonus, r.penalty, r.advance, r.total, r.status].join(',') + '\n';
    }
  }
  return new Response('\uFEFF' + csv, { headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${type}-${period}.csv"` } });
});
