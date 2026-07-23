import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta, getSessionUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { nextCode } from '@/lib/seq';
import { payrollTotal } from '@/modules/hr/domain';
import { createCashTx } from '@/modules/finance/server';
import { getSettingNum } from '@/modules/sales/server';

/** Phieu luong: nhan vien CHI thay cua minh; hr.view/hr.manage thay het. */
export const GET = guarded(async (req) => {
  const user = await getSessionUser();
  if (!user) throw jsonError(401, 'Chưa đăng nhập.');
  const url = new URL(req.url);
  const period = url.searchParams.get('period') ?? '';
  const mine = url.searchParams.get('mine') === '1';
  const all = !mine && (user.perms.includes('hr.view') || user.perms.includes('hr.manage'));
  if (!mine && !all) throw jsonError(403, 'Bạn chỉ xem được phiếu lương của mình (thêm ?mine=1).');
  const rows = await prisma.payrollSlip.findMany({
    where: { ...(period ? { period } : {}), ...(all ? {} : { userId: user.id }) },
    orderBy: [{ period: 'desc' }, { userId: 'asc' }] });
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.userId))] } },
    select: { id: true, name: true } });
  const uMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
  return Response.json({ ok: true, rows: rows.map((r) => ({ ...r, name: uMap[r.userId] ?? r.userId })) });
});

/** Sinh phieu luong NHAP cho ca xuong theo ky (tu cong + ho so + hoa hong da chot). */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('hr.manage');
  const b = z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }).safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Thiếu kỳ (YYYY-MM).');
  const period = b.data.period;
  const from = new Date(`${period}-01T00:00:00Z`);
  const to = new Date(from); to.setUTCMonth(to.getUTCMonth() + 1);
  const standardDays = await getSettingNum('standard_work_days', 26);
  const [users, profiles, sheets, comm] = await Promise.all([
    prisma.user.findMany({ where: { deletedAt: null, active: true }, select: { id: true, name: true } }),
    prisma.employeeProfile.findMany(),
    prisma.timesheetEntry.groupBy({ by: ['userId'], _sum: { day: true },
      where: { date: { gte: from, lt: to } } }),
    prisma.commissionPeriod.findUnique({ where: { period }, include: { lines: true } }),
  ]);
  const pMap = new Map(profiles.map((p) => [p.userId, p]));
  const tMap = new Map(sheets.map((s) => [s.userId, Number(s._sum.day ?? 0)]));
  const cMap = new Map((comm?.lines ?? []).map((l) => [l.userId, l.amount]));
  let created = 0, skipped = 0;
  await prisma.$transaction(async (tx) => {
    for (const u of users) {
      const existed = await tx.payrollSlip.findUnique({
        where: { userId_period: { userId: u.id, period } } });
      if (existed) { skipped++; continue; }   // khong ghi de phieu da co
      const prof = pMap.get(u.id);
      const workDays = tMap.get(u.id) ?? 0;
      const commission = cMap.get(u.id) ?? 0;
      if (!prof && workDays === 0 && commission === 0) continue; // khong co gi de tra
      const calc = payrollTotal({ baseSalary: prof?.baseSalary ?? 0, workDays,
        standardDays, allowance: prof?.allowance ?? 0, commission,
        bonus: 0, penalty: 0, advance: 0 });
      const code = await nextCode(tx, 'LP-');
      await tx.payrollSlip.create({ data: { code, userId: u.id, period,
        baseSalary: prof?.baseSalary ?? 0, workDays, standardDays,
        salaryByDays: calc.salaryByDays, allowance: prof?.allowance ?? 0,
        commission, total: calc.total } });
      created++;
    }
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'payroll_generate',
    entity: 'payroll', entityId: period, after: { created, skipped, standardDays }, ip, ua });
  return Response.json({ ok: true, created, skipped });
});

const ActIn = z.discriminatedUnion('action', [
  z.object({ action: z.literal('update'), id: z.number().int(),
    bonus: z.number().int().min(0).default(0), penalty: z.number().int().min(0).default(0),
    advance: z.number().int().min(0).default(0), note: z.string().optional().nullable() }),
  z.object({ action: z.literal('approve'), id: z.number().int() }),
  z.object({ action: z.literal('pay'), id: z.number().int(), accountId: z.number().int() }),
]);

export const PATCH = guarded(async (req) => {
  const actor = await requirePerm('hr.manage');
  const b = ActIn.safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu không hợp lệ');
  const d = b.data;
  const slip = await prisma.payrollSlip.findUnique({ where: { id: d.id } });
  if (!slip) throw jsonError(404, 'Không tìm thấy phiếu lương.');
  const { ip, ua } = reqMeta();

  if (d.action === 'update') {
    if (slip.status !== 'DRAFT') throw jsonError(400, 'Chỉ sửa được phiếu Nháp.');
    const calc = payrollTotal({ baseSalary: slip.baseSalary, workDays: Number(slip.workDays),
      standardDays: slip.standardDays, allowance: slip.allowance, commission: slip.commission,
      bonus: d.bonus, penalty: d.penalty, advance: d.advance });
    await prisma.payrollSlip.update({ where: { id: slip.id },
      data: { bonus: d.bonus, penalty: d.penalty, advance: d.advance,
        total: calc.total, note: d.note ?? slip.note } });
    await audit({ actorId: actor.id, actorName: actor.name, action: 'payroll_update',
      entity: 'payroll', entityId: slip.code,
      before: { bonus: slip.bonus, penalty: slip.penalty, advance: slip.advance, total: slip.total },
      after: { bonus: d.bonus, penalty: d.penalty, advance: d.advance, total: calc.total }, ip, ua });
    return Response.json({ ok: true, total: calc.total });
  }

  if (d.action === 'approve') {
    if (slip.status !== 'DRAFT') throw jsonError(400, 'Chỉ duyệt phiếu Nháp.');
    await prisma.payrollSlip.update({ where: { id: slip.id },
      data: { status: 'APPROVED', approvedById: actor.id, approvedByName: actor.name, approvedAt: new Date() } });
    await audit({ actorId: actor.id, actorName: actor.name, action: 'payroll_approve',
      entity: 'payroll', entityId: slip.code, after: { total: slip.total }, ip, ua });
    return Response.json({ ok: true });
  }

  // pay: tao PHIEU CHI lien ket (neu bat cau hinh payroll_create_pc, mac dinh co)
  if (slip.status !== 'APPROVED') throw jsonError(400, 'Duyệt phiếu trước khi chi.');
  if (slip.total <= 0) throw jsonError(400, 'Thực lĩnh ≤ 0 — kiểm tra lại tạm ứng/phạt.');
  const createPc = await getSettingNum('payroll_create_pc', 1);
  const emp = await prisma.user.findUnique({ where: { id: slip.userId }, select: { name: true } });
  const result = await prisma.$transaction(async (tx) => {
    let cashTxId: number | null = null;
    let pcCode: string | null = null;
    if (createPc) {
      const { tx: cash } = await createCashTx(tx, { actor, kind: 'PAYMENT',
        accountId: d.accountId, amount: slip.total,
        partnerName: emp?.name ?? String(slip.userId),
        reason: `Chi lương ${slip.code} kỳ ${slip.period}`,
        idempotencyKey: `payroll-${slip.code}` });
      cashTxId = cash.id; pcCode = cash.code;
    }
    await tx.payrollSlip.update({ where: { id: slip.id },
      data: { status: 'PAID', paidAt: new Date(), cashTxId } });
    return { pcCode };
  });
  await audit({ actorId: actor.id, actorName: actor.name, action: 'payroll_pay',
    entity: 'payroll', entityId: slip.code, after: { total: slip.total, pc: result.pcCode }, ip, ua });
  return Response.json({ ok: true, pcCode: result.pcCode });
});
