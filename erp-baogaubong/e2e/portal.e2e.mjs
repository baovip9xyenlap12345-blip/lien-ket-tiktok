// E2E GD9: bao cao doi chieu tinh tay (VAT/khong VAT, doanh thu vs tien thu) +
// portal dai ly (dang nhap rieng, gia duoc cap, yeu cau bao gia, duyet mau, cong no)
// + IDOR: 2 khach tuyet doi khong thay du lieu nhau. Idempotent.
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const results = [];
function check(name, ok) { results.push([name, ok]); console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); }

async function staffLogin(b, u) {
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
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

// ===== Chuan bi: NV moi + 2 khach A/B co tai khoan cong =====
const [ctxA, pgA] = await staffLogin(b, 'admin');
let r = await api(pgA, '/api/hr/staff');
const saleRoleId = JSON.parse(r.body).rows.find((x) => x.username === 'sale1').role.id;
r = await post(pgA, '/api/admin/users', { username: `rp${tag}`, name: `NV BC ${tag}`,
  password: 'Baobao@2026', roleId: saleRoleId, scope: 'OWN', active: true });
check('Tạo NV riêng cho bài đối chiếu báo cáo', r.status === 200);
r = await post(pgA, '/api/partners', { name: `Đại lý A ${tag}`, phone: '091' + String(tag).padStart(7, '5'), creditLimit: 99000000, creditDays: 10 });
const pA = JSON.parse(r.body);
r = await post(pgA, '/api/partners', { name: `Đại lý B ${tag}`, phone: '092' + String(tag).padStart(7, '6'), creditLimit: 99000000 });
const pB = JSON.parse(r.body);
r = await post(pgA, '/api/partners/portal', { partnerId: pA.id, username: `dla${tag}`, password: 'Khach@123' });
check('Cấp tài khoản cổng cho đại lý A', r.status === 200);
await post(pgA, '/api/partners/portal', { partnerId: pB.id, username: `dlb${tag}`, password: 'Khach@123' });

// ===== 1. BAO CAO — doi chieu tinh tay =====
// NV moi ban: don1 CO VAT 2x150k+8%=324k (thu 100k), don2 KHONG VAT 1x120k (thu du 120k)
const [ctxN, pgN] = await staffLogin(b, `rp${tag}`);
r = await api(pgN, '/api/catalog/products?q=SP001&page=1');
const variant = JSON.parse(r.body).rows[0].variants[0];
r = await post(pgN, '/api/sales/quotes', { partnerId: pA.id, partnerName: `Đại lý A ${tag}`,
  lines: [{ variantId: variant.id, qty: 2, unitPrice: 150000 }], vatEnabled: true, vatPercent: 8 });
const q1 = JSON.parse(r.body);
await api(pgN, '/api/sales/quotes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: q1.id, to: 'SENT' }) });
r = await post(pgN, '/api/sales/convert', { quoteId: q1.id });
const o1 = JSON.parse(r.body);
await api(pgN, '/api/sales/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: o1.orderId, axis: 'order', to: 'CONFIRMED' }) });
await post(pgN, '/api/sales/pay', { orderId: o1.orderId, amount: 100000, method: 'CASH' });
r = await post(pgN, '/api/sales/pos', { partnerId: pB.id, partnerName: `Đại lý B ${tag}`,
  lines: [{ variantId: variant.id, qty: 1, unitPrice: 120000 }], vatEnabled: false, paidAmt: 120000 });
const o2 = JSON.parse(r.body);
check('Tạo 2 đơn đối chiếu (VAT 324k thu 100k · không VAT 120k thu đủ)', o1.orderCode && o2.orderCode);
// Bao cao loc theo NV moi + hom nay → so khop TUYET DOI voi tinh tay
r = await api(pgA, `/api/reports/sales?from=${today}&to=${today}&userId=${JSON.parse((await api(pgA, '/api/hr/staff')).body).rows.find((x) => x.username === `rp${tag}`).id}`);
const rep = JSON.parse(r.body);
check('Doanh thu CÓ VAT = 324.000 (2×150k +8%)', rep.sum.revenueVat === 324000);
check('Thuế tách riêng = 24.000', rep.sum.tax === 24000);
check('Doanh thu KHÔNG VAT = 120.000', rep.sum.revenueNoVat === 120000);
check('TIỀN ĐÃ THU = 220.000 ≠ doanh thu 444.000 (tách đúng)', rep.sum.collected === 220000);
check('Còn phải thu của kỳ = 224.000', rep.sum.debt === 224000);
check('Drill-down có đủ 2 chứng từ', rep.orders.some((x) => x.code === o1.orderCode) && rep.orders.some((x) => x.code === o2.orderCode));
check('Báo cáo theo NV đúng người', rep.byUser.length === 1 && rep.byUser[0].revenue === 444000);
await ctxN.close();

// ===== 2. PORTAL dai ly A =====
const ctxP = await b.newContext(); const pgP = await ctxP.newPage();
await pgP.goto(BASE + '/portal');
r = await post(pgP, '/api/portal/auth', { u: `dla${tag}`, p: 'SaiMatKhau' });
check('Portal: sai mật khẩu bị chặn', r.status === 401);
r = await post(pgP, '/api/portal/auth', { u: `dla${tag}`, p: 'Khach@123' });
check('Đại lý A đăng nhập portal', r.status === 200);
r = await api(pgP, '/api/portal/data?view=catalog');
const cat = JSON.parse(r.body);
check('Portal thấy danh mục + giá được cấp', cat.rows.length > 0 && cat.rows[0].variants[0].price > 0);
r = await post(pgP, '/api/portal/actions', { action: 'quote_request',
  lines: [{ variantId: variant.id, qty: 5 }], note: 'Đại lý A đặt thử' });
const qr = JSON.parse(r.body);
check('Đại lý gửi yêu cầu báo giá (BG-… gắn sale phụ trách)', r.status === 200 && /^BG-/.test(qr.code));
r = await api(pgP, '/api/portal/data?view=orders');
const myOrders = JSON.parse(r.body).rows;
check('Đại lý A thấy đơn của mình (kèm trạng thái giao/sản xuất)', myOrders.some((o) => o.code === o1.orderCode));
r = await api(pgP, '/api/portal/data?view=debt');
const myDebt = JSON.parse(r.body);
check('Đại lý A thấy đúng công nợ 224.000 của mình', myDebt.totalDebt === 224000);
r = await post(pgP, '/api/portal/actions', { action: 'support', content: 'Cần xuất hóa đơn đỏ' });
check('Gửi hỗ trợ → thành việc CSKH trong CRM', r.status === 200);
// Duyet mau: admin tao thiet ke cho A, dai ly tu duyet
r = await post(pgA, '/api/production/designs', { action: 'create', title: `Mẫu đại lý A ${tag}` });
const dz = JSON.parse(r.body);
await api(pgA, '/api/production/designs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'version', designId: dz.id, note: 'demo cho khách duyệt' }) });
// gan partnerId cho design (tao qua API co partnerId)
r = await post(pgA, '/api/production/designs', { action: 'create', title: `Mẫu gắn khách A ${tag}`, partnerId: pA.id, partnerName: `Đại lý A ${tag}` });
const dzA = JSON.parse(r.body);
r = await post(pgA, '/api/production/designs', { action: 'version', designId: dzA.id, note: 'bản 1 cho khách' });
const dzAv = JSON.parse(r.body);
r = await api(pgP, '/api/portal/data?view=designs');
check('Đại lý A thấy mẫu CỦA MÌNH (không thấy mẫu không gắn khách)',
  JSON.parse(r.body).rows.some((x) => x.id === dzA.id) && !JSON.parse(r.body).rows.some((x) => x.id === dz.id));
r = await post(pgP, '/api/portal/actions', { action: 'design_decide', versionId: dzAv.id, approve: true });
check('Đại lý A tự DUYỆT bản demo (ghi người duyệt là khách)', r.status === 200);
r = await api(pgA, `/api/production/designs?id=${dzA.id}`);
check('Hệ thống ghi đúng: bản APPROVED bởi "Khách: Đại lý A"',
  JSON.parse(r.body).design.versions[0].status === 'APPROVED' &&
  JSON.parse(r.body).design.versions[0].decidedByName.includes('Khách'));

// ===== 3. IDOR: dai ly B khong thay gi cua A =====
const ctxP2 = await b.newContext(); const pgP2 = await ctxP2.newPage();
await pgP2.goto(BASE + '/portal');
await post(pgP2, '/api/portal/auth', { u: `dlb${tag}`, p: 'Khach@123' });
r = await api(pgP2, '/api/portal/data?view=orders');
check('IDOR: B không thấy đơn của A', !JSON.parse(r.body).rows.some((o) => o.code === o1.orderCode));
r = await api(pgP2, '/api/portal/data?view=designs');
check('IDOR: B không thấy mẫu của A', !JSON.parse(r.body).rows.some((x) => x.id === dzA.id));
r = await post(pgP2, '/api/portal/actions', { action: 'reorder', orderId: o1.orderId });
check('IDOR: B đặt lại đơn của A → 404', r.status === 404);
r = await post(pgP2, '/api/portal/actions', { action: 'design_decide', versionId: dzAv.id, approve: false });
check('IDOR: B duyệt mẫu của A → 404', r.status === 404);
r = await api(pgP2, '/api/portal/data?view=debt');
check('IDOR: công nợ của B = 0 (không dính của A)', JSON.parse(r.body).totalDebt === 0);
// Portal khong goi duoc API noi bo
r = await api(pgP2, '/api/partners?page=1');
check('Phiên portal KHÔNG gọi được API nội bộ (401)', r.status === 401);
await ctxP2.close(); await ctxP.close();

// ===== 4. Hieu nang co ban: dashboard + bao cao < 3s =====
const t1 = Date.now();
await api(pgA, '/api/sales/dashboard');
const dashMs = Date.now() - t1;
const t2 = Date.now();
await api(pgA, `/api/reports/sales?from=${today.slice(0, 8)}01&to=${today}`);
const repMs = Date.now() - t2;
console.log(`   [hieu nang] dashboard ${dashMs}ms · bao cao thang ${repMs}ms`);
check('Hiệu năng: dashboard < 3s và báo cáo tháng < 3s', dashMs < 3000 && repMs < 3000);

await ctxA.close();
await b.close();
const fail = results.filter(([, ok]) => !ok).length;
console.log(fail === 0 ? 'E2E GD9: TAT CA PASS' : `E2E GD9: ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
