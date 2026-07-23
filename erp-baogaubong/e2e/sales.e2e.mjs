// E2E GD4: bao gia → duyet → don hang → thu tien → POS. Chay: node e2e/sales.e2e.mjs (server :3000)
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
const patch = (pg, path, data) => api(pg, path, { method: 'PATCH',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const tag = String(Math.floor(performance.now() * 1000) % 10_000_000);

// Chuan bi: admin tao khach co han muc no 500k
let [ctxA, pgA] = await login(b, 'admin');
let r = await post(pgA, '/api/partners', { name: `Khách GD4 ${tag}`, phone: '098' + String(tag).padStart(7, '3'), creditLimit: 300000, creditDays: 7 });
const partner = JSON.parse(r.body);
// Lay 1 bien the co gia (SP001-1M: le 198k, si 120k)
r = await api(pgA, '/api/catalog/products?q=SP001&page=1');
const variant = JSON.parse(r.body).rows[0].variants[0];

// ===== 1. SALE tao bao gia binh thuong =====
const [ctxS, pgS] = await login(b, 'sale1');
r = await post(pgS, '/api/sales/quotes', { partnerName: `Khách GD4 ${tag}`, partnerId: partner.id,
  lines: [{ variantId: variant.id, qty: 2, unitPrice: 198000 }], vatEnabled: true, vatPercent: 8 });
const q1 = JSON.parse(r.body);
check('Sale tạo báo giá (mã BG-…)', r.status === 200 && /^BG-\d+/.test(q1.code ?? ''));
check('Báo giá thường KHÔNG cần duyệt', q1.approvalNeeded === false);
// Tien: 2x198000=396000, VAT 8% = 31680, tong 427680
r = await api(pgS, `/api/sales/quotes?id=${q1.id}`);
let qd = JSON.parse(r.body).quote;
check('Tiền đúng: 396.000 + VAT 31.680 = 427.680', qd.subtotal === 396000 && qd.taxAmt === 31680 && qd.total === 427680);

// 2. DRAFT khong chuyen don duoc; gui roi moi chuyen
r = await post(pgS, '/api/sales/convert', { quoteId: q1.id });
check('Báo giá Nháp chưa chuyển đơn được', r.status === 400);
r = await patch(pgS, '/api/sales/quotes', { id: q1.id, to: 'SENT' });
check('Gửi báo giá OK', r.status === 200);
r = await post(pgS, '/api/sales/convert', { quoteId: q1.id });
const ord1 = JSON.parse(r.body);
check('Chuyển thành đơn (mã DH-…)', r.status === 200 && /^DH-\d+/.test(ord1.orderCode ?? ''));
check('Đơn cần duyệt vì vượt hạn mức nợ 300k', ord1.approvalNeeded === true);
// 3. Chong chuyen trung
r = await post(pgS, '/api/sales/convert', { quoteId: q1.id });
check('Chuyển lần 2 bị chặn 409 (chống trùng)', r.status === 409);
// 4. Chua duyet thi khong CONFIRMED duoc
r = await patch(pgS, '/api/sales/orders', { id: ord1.orderId, axis: 'order', to: 'CONFIRMED' });
check('Đơn chờ duyệt không xác nhận được', r.status === 400);
// 5. Sale khong tu duyet duoc; admin duyet
r = await post(pgS, '/api/sales/approve', { entity: 'order', id: ord1.orderId, approve: true });
check('Sale không có quyền duyệt (403)', r.status === 403);
r = await post(pgA, '/api/sales/approve', { entity: 'order', id: ord1.orderId, approve: true });
check('Admin duyệt đơn OK', r.status === 200);
r = await patch(pgS, '/api/sales/orders', { id: ord1.orderId, axis: 'order', to: 'CONFIRMED' });
check('Sau duyệt: xác nhận đơn OK', r.status === 200);
// 6. Thu tien 2 lan: 200k + het → PARTIAL roi PAID
r = await post(pgS, '/api/sales/pay', { orderId: ord1.orderId, amount: 200000, method: 'CASH' });
check('Thu 200k → PARTIAL', r.status === 200 && JSON.parse(r.body).paymentStatus === 'PARTIAL');
r = await post(pgS, '/api/sales/pay', { orderId: ord1.orderId, amount: 999999999, method: 'TRANSFER' });
let pr = JSON.parse(r.body);
check('Thu nốt (đưa thừa bị kẹp) → PAID', r.status === 200 && pr.paymentStatus === 'PAID' && pr.paidAmt === 427680);
// 7. May trang thai: DONE roi khong CANCELLED duoc
r = await patch(pgS, '/api/sales/orders', { id: ord1.orderId, axis: 'shipping', to: 'PREPARING' });
check('Trục giao hàng: NONE→PREPARING OK', r.status === 200);
r = await patch(pgS, '/api/sales/orders', { id: ord1.orderId, axis: 'order', to: 'DONE' });
r = await patch(pgS, '/api/sales/orders', { id: ord1.orderId, axis: 'order', to: 'CANCELLED' });
check('DONE là trạng thái cuối — không hủy được', r.status === 400);
// 8. Lich su trang thai co du cac buoc
r = await api(pgS, `/api/sales/orders?id=${ord1.orderId}`);
const hist = JSON.parse(r.body).history;
check('Lịch sử ghi đủ (≥5 bước: tạo, duyệt, xác nhận, thu tiền, giao, xong)', hist.length >= 5);

// ===== 9. Chiet khau vuot nguong → bao gia cho duyet, khong gui duoc =====
r = await post(pgS, '/api/sales/quotes', { partnerName: 'Khách lẻ CK cao',
  lines: [{ variantId: variant.id, qty: 1, unitPrice: 198000 }], discountPct: 25, vatEnabled: false });
const q2 = JSON.parse(r.body);
check('CK 25% (> 10%) → báo giá chờ duyệt', q2.approvalNeeded === true);
r = await patch(pgS, '/api/sales/quotes', { id: q2.id, to: 'SENT' });
check('Báo giá chờ duyệt không gửi được', r.status === 400);
r = await post(pgA, '/api/sales/approve', { entity: 'quote', id: q2.id, approve: true });
r = await patch(pgS, '/api/sales/quotes', { id: q2.id, to: 'SENT' });
check('Admin duyệt xong thì gửi được', r.status === 200);

// ===== 10. Ban duoi gia bang gia cung bi bat (go gia tay thap) =====
r = await post(pgS, '/api/sales/quotes', { partnerName: 'Khách lẻ giá thấp',
  lines: [{ variantId: variant.id, qty: 1, unitPrice: 100000 }], vatEnabled: false }); // gia si 120k, le 198k
const q3 = JSON.parse(r.body);
check('Gõ giá 100k (< giá sỉ 120k, lệch >10%) → cần duyệt', q3.approvalNeeded === true);

// ===== 11. POS: admin ban nhanh + thu du =====
r = await post(pgA, '/api/sales/pos', { lines: [{ variantId: variant.id, qty: 1, unitPrice: 198000 }],
  paidAmt: 200000, method: 'CASH' });
const pos = JSON.parse(r.body);
check('POS bán nhanh OK, trả lại 2k', r.status === 200 && pos.total === 198000 && pos.change === 2000);
r = await api(pgA, `/api/sales/orders?id=${pos.orderId}`);
const posOrder = JSON.parse(r.body).order;
check('Đơn POS: CONFIRMED + PAID ngay', posOrder.orderStatus === 'CONFIRMED' && posOrder.paymentStatus === 'PAID');
// POS sale giam gia sau → bi chan
r = await post(pgS, '/api/sales/pos', { lines: [{ variantId: variant.id, qty: 1, unitPrice: 198000 }],
  discountAmt: 100000, paidAmt: 98000 });
check('POS sale giảm 50% bị chặn, báo cần duyệt', r.status === 400 && JSON.parse(r.body).error.includes('duyệt'));
// Tra cuu barcode/SKU
r = await api(pgA, `/api/sales/pos?barcode=${encodeURIComponent(variant.sku)}`);
check('Quét SKU ra đúng biến thể + giá lẻ', JSON.parse(r.body).variant?.price === 198000);

// ===== 12. Pham vi du lieu: sale2? (khong co) — dung kho1: khong sales.manage
const [ctxK, pgK] = await login(b, 'kho1');
r = await post(pgK, '/api/sales/quotes', { partnerName: 'x', lines: [{ variantId: variant.id, qty: 1, unitPrice: 1000 }] });
check('Kho không tạo được báo giá (403)', r.status === 403);
r = await api(pgK, '/api/sales/orders?page=1');
check('Kho xem đơn: danh sách theo phạm vi (không lỗi 500)', r.status === 200 || r.status === 403);
await ctxK.close();
// Admin (ALL) thay bao gia cua sale; sale chi thay cua minh
r = await api(pgA, `/api/sales/quotes?q=${q1.code}&page=1`);
check('Admin (ALL) thấy báo giá của sale', JSON.parse(r.body).rows.length >= 1);

// ===== 13. Trang in =====
await pgS.goto(`${BASE}/print/quote/${q1.id}`); await pgS.waitForTimeout(1200);
let body = await pgS.locator('body').innerText();
check('Trang in báo giá đủ thông tin (mã + tổng)', body.includes(q1.code) && body.includes('427.680'));
await pgS.goto(`${BASE}/print/order/${ord1.orderId}?k80=1`); await pgS.waitForTimeout(1200);
body = await pgS.locator('body').innerText();
check('Phiếu K80 hiện PHIẾU BÁN HÀNG + tổng', body.includes('PHIẾU BÁN HÀNG') && body.includes('427.680'));

// 14. Dashboard co doanh thu that
r = await api(pgA, '/api/sales/dashboard');
const dash = JSON.parse(r.body);
check('Dashboard: doanh thu hôm nay > 0, có đơn gần nhất', dash.today.revenue > 0 && dash.recent.length > 0);

await ctxS.close(); await ctxA.close();
await b.close();
const fail = results.filter(([, ok]) => !ok).length;
console.log(fail === 0 ? 'E2E GD4: TAT CA PASS' : `E2E GD4: ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
