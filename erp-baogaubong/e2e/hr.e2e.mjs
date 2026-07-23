// E2E GD8 (idempotent — chay lai bao nhieu lan cung PASS): moi lan tao 1 nhan vien moi.
// Phu: ho so, cham cong + audit, giao viec, KPI, hoa hong phien ban + chot ky bat bien,
// luong nhap→duyet→chi (phieu chi lien ket), quyen xem luong.
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const results = [];
function check(name, ok) { results.push([name, ok]); console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); }

async function login(b, u, p = 'Baobao@2026') {
  const ctx = await b.newContext(); const pg = await ctx.newPage();
  await pg.goto(BASE + '/login');
  await pg.fill('input[name=u]', u); await pg.fill('input[name=p]', p);
  await pg.click('button');
  await pg.waitForURL((x) => new URL(x).pathname === '/', { timeout: 10000 });
  return [ctx, pg];
}
const api = (pg, path, opts) => pg.evaluate(async ({ path, opts }) => {
  const r = await fetch(path, opts);
  return { status: r.status, body: await r.text() };
}, { path, opts });
const post = (pg, path, data) => api(pg, path, { method: 'POST',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const patch = (pg, path, data) => api(pg, path, { method: 'PATCH',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const tag = String(Math.floor(performance.now() * 1000) % 10_000_000);
const period = new Date().toISOString().slice(0, 7);

const [ctxA, pgA] = await login(b, 'admin');
const [ctxS, pgS] = await login(b, 'sale1');

// ===== 0. Tao nhan vien MOI cho lan chay nay (idempotent) =====
let r = await api(pgA, '/api/hr/staff');
let staff = JSON.parse(r.body).rows;
const saleRoleId = staff.find((x) => x.username === 'sale1').role.id;
r = await post(pgA, '/api/admin/users', { username: `nv${tag}`, name: `NV Test ${tag}`,
  password: 'Baobao@2026', roleId: saleRoleId, scope: 'OWN', active: true });
check('Tạo nhân viên mới nv' + tag, r.status === 200);
r = await api(pgA, '/api/hr/staff');
staff = JSON.parse(r.body).rows;
const nv = staff.find((x) => x.username === `nv${tag}`);
const sale1 = staff.find((x) => x.username === 'sale1');
check('Danh sách nhân sự có nhân viên mới', !!nv && !!sale1);

// ===== 1. Ho so luong =====
r = await post(pgA, '/api/hr/staff', { userId: nv.id, position: 'NV thử việc',
  baseSalary: 5200000, allowance: 400000, bankAccount: '0011002233' });
check('Admin lưu hồ sơ lương (5.2tr + 400k)', r.status === 200);
r = await post(pgS, '/api/hr/staff', { userId: sale1.id, baseSalary: 99000000 });
check('Sale không tự sửa được lương (403)', r.status === 403);

// ===== 2. Cham cong: 13 cong + nua cong ngay 14 → sua thanh 1 (audit) =====
let okDays = true;
for (let d = 1; d <= 13; d++) {
  r = await post(pgA, '/api/hr/timesheet', { userId: nv.id,
    date: `${period}-${String(d).padStart(2, '0')}`, day: 1 });
  if (r.status !== 200) okDays = false;
}
r = await post(pgA, '/api/hr/timesheet', { userId: nv.id, date: `${period}-14`, day: 0.5 });
check('Chấm 13 công + nửa công ngày 14', okDays && r.status === 200);
r = await post(pgA, '/api/hr/timesheet', { userId: nv.id, date: `${period}-14`, day: 1 });
check('Sửa công ngày 14 → 1 (ghi audit)', r.status === 200);
r = await post(pgA, '/api/hr/timesheet', { userId: nv.id, date: `${period}-15`, day: 0.75 });
check('Công 0.75 không hợp lệ bị chặn', r.status === 400);
r = await api(pgS, `/api/hr/timesheet?period=${period}`);
let ts = JSON.parse(r.body);
check('Sale chỉ thấy bảng công của mình', ts.users.length === 1 && ts.users[0].id === sale1.id);

// ===== 3. Giao viec =====
r = await post(pgA, '/api/hr/tasks', { title: `Gọi lại 5 khách sỉ ${tag}`, assigneeId: sale1.id,
  dueAt: new Date(Date.now() + 86400000).toISOString(), priority: 'HIGH' });
const task = JSON.parse(r.body);
check('Admin giao việc cho sale', r.status === 200);
r = await api(pgS, '/api/hr/tasks');
check('Sale thấy việc được giao', JSON.parse(r.body).rows.some((t) => t.id === task.id));
r = await patch(pgS, '/api/hr/tasks', { id: task.id, status: 'DONE' });
check('Sale đánh dấu xong việc', r.status === 200);
r = await post(pgS, '/api/hr/tasks', { title: 'hack', assigneeId: 1 });
check('Sale không giao việc cho người khác (403)', r.status === 403);

// ===== 4. KPI: chi tieu vs thuc te tu don that (sale1 co doanh thu tu GD4) =====
r = await post(pgA, '/api/hr/kpi', { userId: sale1.id, period, targetRevenue: 10000000 });
check('Đặt KPI 10tr cho sale1', r.status === 200);
r = await api(pgA, `/api/hr/kpi?period=${period}`);
const kpiRow = JSON.parse(r.body).rows.find((x) => x.userId === sale1.id);
check('KPI hiện thực tế từ đơn thật', kpiRow.revenue > 0 && kpiRow.pct !== null);

// ===== 5. Hoa hong: quy tac phien ban + ky da chot BAT BIEN =====
r = await post(pgA, '/api/hr/commission', { action: 'rule', basis: 'REVENUE', pct: 10 });
const vNew = JSON.parse(r.body).version;
check(`Tạo quy tắc hoa hồng v${vNew} (10%)`, r.status === 200);
r = await post(pgA, '/api/hr/commission', { action: 'close', period });
const closedNow = r.status === 200;
const closeMsg = JSON.parse(r.body).error ?? '';
check('Chốt kỳ: lần đầu OK / đã chốt thì bị chặn đúng',
  closedNow || closeMsg.includes('đã chốt'));
r = await post(pgA, '/api/hr/commission', { action: 'close', period });
check('Chốt lại kỳ đã chốt luôn bị chặn (bất biến)', r.status === 400);
r = await api(pgA, '/api/hr/commission');
let comm = JSON.parse(r.body);
const lockedPeriod = comm.periods.find((p) => p.period === period);
const saleLine = lockedPeriod?.lines.find((l) => l.userId === sale1.id);
const lockedPct = Number(lockedPeriod?.pct ?? 0);
check('Kỳ chốt: hoa hồng = căn cứ × % đã khóa (snapshot)',
  !!saleLine && saleLine.amount === Math.round(saleLine.base * lockedPct / 100));
const beforeAmount = saleLine?.amount;
r = await post(pgA, '/api/hr/commission', { action: 'rule', basis: 'REVENUE', pct: 3 });
r = await api(pgA, '/api/hr/commission');
comm = JSON.parse(r.body);
const afterLine = comm.periods.find((p) => p.period === period)?.lines.find((l) => l.userId === sale1.id);
check('Quy tắc mới (3%) KHÔNG làm đổi kỳ đã chốt',
  afterLine?.amount === beforeAmount && Number(comm.periods.find((p) => p.period === period).pct) === lockedPct);

// ===== 6. Luong nhan vien MOI: sinh → cong thuc → thuong/phat/ung → duyet → chi =====
r = await post(pgA, '/api/hr/payroll', { period });
const gen = JSON.parse(r.body);
check('Sinh phiếu lương kỳ (nhân viên mới có phiếu)', r.status === 200 && gen.created >= 1);
r = await api(pgA, `/api/hr/payroll?period=${period}`);
let slips = JSON.parse(r.body).rows;
const slip = slips.find((s) => s.userId === nv.id);
const expectByDays = Math.round(5200000 * 14 / 26);   // 2.8tr
check(`Công thức đúng: 14 công → ${expectByDays.toLocaleString('vi-VN')}đ + phụ cấp 400k`,
  !!slip && Number(slip.workDays) === 14 && slip.salaryByDays === expectByDays &&
  slip.total === expectByDays + 400000 + slip.commission);
r = await patch(pgA, '/api/hr/payroll', { action: 'update', id: slip.id, bonus: 200000, penalty: 50000, advance: 500000 });
const upd = JSON.parse(r.body);
check('Thưởng/phạt/ứng tính lại tổng đúng',
  upd.total === expectByDays + 400000 + slip.commission + 200000 - 50000 - 500000);
// quyen xem
r = await api(pgS, `/api/hr/payroll?period=${period}`);
check('Sale xem toàn bảng lương bị chặn (403)', r.status === 403);
const [ctxN, pgN] = await login(b, `nv${tag}`);
r = await api(pgN, '/api/hr/payroll?mine=1');
const mine = JSON.parse(r.body).rows;
check('Nhân viên mới xem được CHỈ phiếu của mình', mine.length === 1 && mine[0].userId === nv.id);
await ctxN.close();
// chi truoc duyet bi chan; duyet → chi tao PC- lien ket vao so quy
r = await api(pgA, '/api/finance/accounts');
const qtm = JSON.parse(r.body).accounts.find((a) => a.code === 'QTM');
// Nap quy du chi luong (quy cam am) — phieu thu that, co dau vet
await post(pgA, '/api/finance/tx', { kind: 'RECEIPT', accountId: qtm.id, amount: 5000000,
  reason: `Nạp quỹ test lương ${tag}`, idempotencyKey: `hrfund-${tag}` });
r = await patch(pgA, '/api/hr/payroll', { action: 'pay', id: slip.id, accountId: qtm.id });
check('Chi lương khi chưa duyệt bị chặn', r.status === 400);
r = await patch(pgA, '/api/hr/payroll', { action: 'approve', id: slip.id });
check('Duyệt phiếu lương', r.status === 200);
r = await patch(pgA, '/api/hr/payroll', { action: 'pay', id: slip.id, accountId: qtm.id });
const paid = JSON.parse(r.body);
check('Chi lương tạo phiếu chi PC- liên kết', r.status === 200 && /^PC-/.test(paid.pcCode ?? ''));
r = await api(pgA, `/api/finance/tx?q=${slip.code}&page=1`);
check('Phiếu chi lương nằm trong sổ quỹ', JSON.parse(r.body).rows.some((t) => t.code === paid.pcCode));

// 7. Export CSV theo quyen
r = await api(pgA, `/api/hr/export?type=payroll&period=${period}`);
check('Xuất bảng lương CSV', r.status === 200 && r.body.includes(slip.code));
r = await api(pgS, `/api/hr/export?type=payroll&period=${period}`);
check('Sale không xuất được bảng lương (403)', r.status === 403);

// 8. Audit du dau vet
await pgA.goto(BASE + '/audit'); await pgA.waitForTimeout(1500);
const auditBody = await pgA.locator('body').innerText();
check('Audit ghi: sửa công, KPI, hoa hồng, duyệt lương',
  ['timesheet_set', 'kpi_set', 'payroll_approve'].every((k) => auditBody.includes(k)));

await ctxS.close(); await ctxA.close();
await b.close();
const fail = results.filter(([, ok]) => !ok).length;
console.log(fail === 0 ? 'E2E GD8: TAT CA PASS' : `E2E GD8: ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
