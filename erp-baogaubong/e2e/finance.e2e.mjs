// E2E GD5: quy, phieu thu/chi, idempotency, hoan tien, chuyen quy, tuoi no, khoa ky, doi chieu so du.
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const results = [];
function check(name, ok) { results.push([name, ok]); console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); }

async function login(b, u) {
  const ctx = await b.newContext(); const pg = await ctx.newPage();
  await pg.goto(BASE + '/login');
  await pg.fill('input[name=u]', u); await pg.fill('input[name=p]', 'Baobao@2026');
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

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const tag = String(Math.floor(performance.now() * 1000) % 10_000_000);
const period = new Date().toISOString().slice(0, 7);

// ===== Chuan bi: admin + ke toan =====
const [ctxA, pgA] = await login(b, 'admin');
const [ctxKT, pgKT] = await login(b, 'ketoan1');
let r = await api(pgA, '/api/finance/accounts');
const accounts = JSON.parse(r.body).accounts;
const qtm = accounts.find((a) => a.code === 'QTM'); const nh1 = accounts.find((a) => a.code === 'NH1');
check('Có sẵn 3 quỹ mặc định (QTM/NH1/COD)', accounts.length >= 3 && !!qtm && !!nh1);
const bal0 = qtm.balance;

// ===== 1. So du = dau ky + chung tu; thu 500k =====
r = await post(pgKT, '/api/finance/tx', { kind: 'RECEIPT', accountId: qtm.id, amount: 500000,
  partnerName: 'Khách test ' + tag, reason: 'Thu test ' + tag, idempotencyKey: `k1-${tag}` });
const pt1 = JSON.parse(r.body);
check('Kế toán lập phiếu thu 500k (PT-…)', r.status === 200 && /^PT-/.test(pt1.code) && pt1.status === 'APPROVED');

// 2. IDEMPOTENCY: gui lai y het → tra ve phieu cu, khong ghi doi
r = await post(pgKT, '/api/finance/tx', { kind: 'RECEIPT', accountId: qtm.id, amount: 500000,
  partnerName: 'Khách test ' + tag, reason: 'Thu test ' + tag, idempotencyKey: `k1-${tag}` });
const dup = JSON.parse(r.body);
check('Request lặp (cùng idempotency key) trả phiếu cũ, không ghi đôi', dup.duplicated === true && dup.code === pt1.code);
r = await api(pgA, '/api/finance/accounts');
let qtmNow = JSON.parse(r.body).accounts.find((a) => a.code === 'QTM');
check('Số dư chỉ tăng đúng 500k (không x2)', qtmNow.balance === bal0 + 500000);

// ===== 3. Phieu chi cua ke toan → PENDING, chua tru quy; admin duyet → tru =====
r = await post(pgKT, '/api/finance/tx', { kind: 'PAYMENT', accountId: qtm.id, amount: 200000,
  reason: 'Chi mua bông test ' + tag, idempotencyKey: `k2-${tag}` });
const pc1 = JSON.parse(r.body);
check('Phiếu chi kế toán lập → PC-… CHỜ DUYỆT', pc1.status === 'PENDING' && /^PC-/.test(pc1.code));
r = await api(pgA, '/api/finance/accounts');
qtmNow = JSON.parse(r.body).accounts.find((a) => a.code === 'QTM');
check('Chưa duyệt → quỹ CHƯA bị trừ', qtmNow.balance === bal0 + 500000);
r = await api(pgKT, '/api/finance/approve');
check('Kế toán không có quyền duyệt (403)', r.status === 403);
r = await post(pgA, '/api/finance/approve', { id: pc1.id, approve: true });
check('Admin duyệt phiếu chi OK', r.status === 200);
r = await api(pgA, '/api/finance/accounts');
qtmNow = JSON.parse(r.body).accounts.find((a) => a.code === 'QTM');
check('Duyệt xong quỹ trừ 200k', qtmNow.balance === bal0 + 300000);

// ===== 4. Chuyen quy: QTM → NH1 100k; khong du tien bi chan =====
const nhBal0 = nh1.balance;
r = await post(pgKT, '/api/finance/transfer', { fromId: qtm.id, toId: nh1.id, amount: 100000,
  note: 'nop ngan hang', idempotencyKey: `k3-${tag}` });
check('Chuyển quỹ 100k OK (CQ-…)', r.status === 200 && /^CQ-/.test(JSON.parse(r.body).code));
r = await api(pgA, '/api/finance/accounts');
const accs = JSON.parse(r.body).accounts;
check('QTM -100k, NH1 +100k (cặp chứng từ khớp nhau)',
  accs.find((a) => a.code === 'QTM').balance === bal0 + 200000 &&
  accs.find((a) => a.code === 'NH1').balance === nhBal0 + 100000);
r = await post(pgKT, '/api/finance/transfer', { fromId: qtm.id, toId: nh1.id, amount: 999999999999 });
check('Chuyển quá số dư bị chặn', r.status === 400 && JSON.parse(r.body).error.includes('không đủ'));
r = await post(pgA, '/api/finance/tx', { kind: 'PAYMENT', accountId: qtm.id, amount: 999999999999,
  reason: 'chi quá số dư', idempotencyKey: `kover-${tag}` });
check('Phiếu chi vượt số dư bị chặn (quỹ không âm)', r.status === 400 && JSON.parse(r.body).error.includes('không đủ'));

// ===== 5. Ban hang thu tien → tu dong vao so quy; hoan tien lien ket =====
r = await api(pgA, '/api/catalog/products?q=SP001&page=1');
const variant = JSON.parse(r.body).rows[0].variants[0];
r = await post(pgA, '/api/sales/pos', { lines: [{ variantId: variant.id, qty: 1, unitPrice: 198000 }],
  paidAmt: 198000, method: 'CASH' });
const pos = JSON.parse(r.body);
check('POS bán 198k', r.status === 200);
r = await api(pgA, `/api/finance/tx?q=${pos.orderCode}&page=1`);
const posTx = JSON.parse(r.body).rows.find((t) => t.kind === 'RECEIPT' && t.orderId === pos.orderId);
check('Phiếu thu POS tự vào sổ quỹ (gắn đơn)', !!posTx && posTx.amount === 198000);
// Hoan tien = tien RA cho khach → CAN quyen duyet: ke toan (finance.manage) bi chan, admin duoc
r = await post(pgKT, '/api/finance/refund', { txId: posTx.id, amount: 50000, reason: 'thử' });
check('Kế toán (không có finance.approve) hoàn tiền bị chặn 403', r.status === 403);
r = await post(pgA, '/api/finance/refund', { txId: posTx.id, amount: 50000,
  reason: 'Khách trả 1 gấu lỗi', idempotencyKey: `k4-${tag}` });
const ht = JSON.parse(r.body);
check('Admin hoàn 50k → chứng từ HT- liên kết phiếu gốc', r.status === 200 && /^HT-/.test(ht.code));
r = await api(pgA, `/api/sales/orders?id=${pos.orderId}`);
const ordAfter = JSON.parse(r.body).order;
check('Đơn sau hoàn: đã thu 148k, trạng thái PARTIAL', ordAfter.paidAmt === 148000 && ordAfter.paymentStatus === 'PARTIAL');
r = await post(pgA, '/api/finance/refund', { txId: posTx.id, amount: 999000, reason: 'x' });
check('Hoàn vượt số thu gốc bị chặn', r.status === 400 && JSON.parse(r.body).error.includes('vượt'));

// ===== 6. So quy: doi chieu dau ky + thu - chi = cuoi ky =====
r = await api(pgA, `/api/finance/ledger?accountId=${qtm.id}&period=${period}`);
const led = JSON.parse(r.body);
check('Sổ quỹ: cuối kỳ = đầu kỳ + thu − chi (đối chiếu đúng)', led.closing === led.opening + led.thu - led.chi);
check('Drill-down: sổ quỹ liệt kê từng chứng từ', Array.isArray(led.rows) && led.rows.some((t) => t.code === pt1.code));

// ===== 7. Khoa ky: chan ghi; mo khoa can ly do =====
r = await post(pgA, '/api/finance/lock', { period, lock: true });
check('Admin khóa kỳ hiện tại', r.status === 200);
r = await post(pgKT, '/api/finance/tx', { kind: 'RECEIPT', accountId: qtm.id, amount: 10000,
  reason: 'thu sau khóa', idempotencyKey: `k5-${tag}` });
check('Kỳ khóa → không lập được chứng từ', r.status === 400 && JSON.parse(r.body).error.includes('khóa sổ'));
r = await post(pgKT, '/api/finance/lock', { period, lock: false, note: 'test' });
check('Kế toán không mở khóa được (403)', r.status === 403);
r = await post(pgA, '/api/finance/lock', { period, lock: false });
check('Mở khóa thiếu lý do bị chặn', r.status === 400);
r = await post(pgA, '/api/finance/lock', { period, lock: false, note: 'Bổ sung chứng từ cuối tháng' });
check('Mở khóa có lý do OK', r.status === 200);
r = await post(pgKT, '/api/finance/tx', { kind: 'RECEIPT', accountId: qtm.id, amount: 10000,
  reason: 'thu sau mở khóa', idempotencyKey: `k6-${tag}` });
check('Mở khóa xong ghi lại được', r.status === 200);
await pgA.goto(BASE + '/audit'); await pgA.waitForTimeout(1500);
const auditBody = await pgA.locator('body').innerText();
check('Nhật ký ghi khóa/mở kỳ (period_lock/unlock)', auditBody.includes('period_lock') && auditBody.includes('period_unlock'));

// ===== 8. Tuoi no: don no qua han hien dung gio =====
r = await api(pgA, '/api/finance/debt');
const debt = JSON.parse(r.body);
check('Công nợ tính từ chứng từ, có tổng > 0', debt.ok && debt.total > 0);
check('Đơn POS hoàn tiền còn nợ 50k nằm trong công nợ',
  debt.rows.some((row) => row.orders.some((o) => o.code === pos.orderCode && o.remaining === 50000)));

// ===== 9. Phan quyen: kho khong xem tai chinh; sale khong xem =====
const [ctxK, pgK] = await login(b, 'kho1');
r = await api(pgK, '/api/finance/accounts');
check('Kho bị chặn xem quỹ (403)', r.status === 403);
await ctxK.close();
const [ctxS, pgS] = await login(b, 'sale1');
r = await api(pgS, '/api/finance/dashboard');
check('Sale bị chặn dashboard tài chính (403)', r.status === 403);
await ctxS.close();

// ===== 10. Export + trang in =====
r = await api(pgKT, `/api/finance/export?period=${period}`);
check('Kế toán xuất CSV sổ quỹ', r.status === 200 && r.body.includes(pt1.code));
await pgA.goto(`${BASE}/print/cash/${pt1.id}`); await pgA.waitForTimeout(1200);
const printBody = await pgA.locator('body').innerText();
check('Trang in PHIẾU THU đủ mã + số tiền', printBody.includes('PHIẾU THU') && printBody.includes(pt1.code) && printBody.includes('500.000'));

await ctxKT.close(); await ctxA.close();
await b.close();
const fail = results.filter(([, ok]) => !ok).length;
console.log(fail === 0 ? 'E2E GD5: TAT CA PASS' : `E2E GD5: ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
