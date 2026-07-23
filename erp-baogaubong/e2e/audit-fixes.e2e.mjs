// REGRESSION cho các lỗi kiểm toán độc lập tìm ra (GĐ kiểm toán):
//  H1 lost-update paidAmt (thu tiền đồng thời)  · H2 âm quỹ khi 2 chi đồng thời
//  H3 COD reconcile: dùng số thực thu + chống đối soát trùng  · H4 trả hàng COD đảo tiền
//  M refund cần quyền duyệt  · L convert double-submit → 409
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const results = [];
function check(name, ok) { results.push([name, ok]); console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); }
async function login(b, u) {
  const ctx = await b.newContext(); const pg = await ctx.newPage();
  await pg.goto(BASE + '/login');
  await pg.fill('input[name=u]', u); await pg.fill('input[name=p]', 'Baobao@2026');
  await pg.click('button'); await pg.waitForURL((x) => new URL(x).pathname === '/', { timeout: 10000 });
  return [ctx, pg];
}
const api = (pg, path, opts) => pg.evaluate(async ({ path, opts }) => {
  const r = await fetch(path, opts); return { status: r.status, body: await r.text() };
}, { path, opts });
const post = (pg, path, data) => api(pg, path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const patch = (pg, path, data) => api(pg, path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
// gui 2 request SONG SONG trong cùng 1 trang
const twin = (pg, path, dataA, dataB) => pg.evaluate(async ({ path, dataA, dataB }) => {
  const call = (d) => fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
    .then(async (r) => ({ status: r.status, body: await r.text() }));
  return Promise.all([call(dataA), call(dataB)]);
}, { path, dataA, dataB });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const tag = String(Math.floor(performance.now() * 1000) % 10_000_000);
const [ctxA, pgA] = await login(b, 'admin');

// Chuan bi: khach + bien the co gia
let r = await post(pgA, '/api/partners', { name: `KH audit ${tag}`, phone: '099' + String(tag).padStart(7, '8'), creditLimit: 99000000, creditDays: 30 });
const partner = JSON.parse(r.body);
r = await api(pgA, '/api/catalog/products?q=SP001&page=1');
const variant = JSON.parse(r.body).rows[0].variants[0];
async function makeOrder(qty, price) {
  let x = await post(pgA, '/api/sales/quotes', { partnerId: partner.id, partnerName: `KH audit ${tag}`,
    lines: [{ variantId: variant.id, qty, unitPrice: price }], vatEnabled: false });
  const q = JSON.parse(x.body);
  await patch(pgA, '/api/sales/quotes', { id: q.id, to: 'SENT' });
  x = await post(pgA, '/api/sales/convert', { quoteId: q.id });
  const o = JSON.parse(x.body);
  await patch(pgA, '/api/sales/orders', { id: o.orderId, axis: 'order', to: 'CONFIRMED' });
  if (o.approvalNeeded) await post(pgA, '/api/sales/approve', { entity: 'order', id: o.orderId, approve: true });
  return o;
}
const orderPaid = async (id) => JSON.parse((await api(pgA, `/api/sales/orders?id=${id}`)).body).order.paidAmt;
const fundBal = async (code) => JSON.parse((await api(pgA, '/api/finance/accounts')).body).accounts.find((a) => a.code === code).balance;

// ===== H1: THU TIỀN ĐỒNG THỜI không được nuốt mất (lost-update) =====
const o1 = await makeOrder(10, 100000); // tổng 1.000.000
const qtmBefore = await fundBal('QTM');
const [t1, t2] = await twin(pgA, '/api/sales/pay',
  { orderId: o1.orderId, amount: 300000, method: 'CASH' },
  { orderId: o1.orderId, amount: 400000, method: 'CASH' });
const paidAfter = await orderPaid(o1.orderId);
const qtmAfter = await fundBal('QTM');
check('H1: thu 300k + 400k đồng thời → đơn ghi đúng 700k (không nuốt)', paidAfter === 700000);
check('H1: quỹ tăng đúng bằng phần đơn ghi nhận (khớp sổ quỹ)', qtmAfter - qtmBefore === 700000);
check('H1: cả 2 request đều thành công', t1.status === 200 && t2.status === 200);

// ===== H1b: IDEMPOTENCY thu tiền — gửi lặp cùng key không nhân đôi =====
const o1b = await makeOrder(2, 100000); // 200k
const key = `paykey-${tag}`;
await post(pgA, '/api/sales/pay', { orderId: o1b.orderId, amount: 150000, method: 'CASH', idempotencyKey: key });
r = await post(pgA, '/api/sales/pay', { orderId: o1b.orderId, amount: 150000, method: 'CASH', idempotencyKey: key });
check('H1b: thu lặp cùng idempotencyKey → duplicated, không cộng đôi',
  JSON.parse(r.body).duplicated === true && (await orderPaid(o1b.orderId)) === 150000);

// ===== H2: hai lệnh CHI đồng thời không làm âm quỹ =====
// tạo quỹ test nạp đúng 100k rồi chi 2 lệnh 80k đồng thời
r = await post(pgA, '/api/finance/accounts', { code: `AUD${tag}`.slice(0, 10), name: `Quỹ audit ${tag}`, kind: 'CASH', openingBalance: 0 });
r = await api(pgA, '/api/finance/accounts');
const testAcc = JSON.parse(r.body).accounts.find((a) => a.name === `Quỹ audit ${tag}`);
await post(pgA, '/api/finance/tx', { kind: 'RECEIPT', accountId: testAcc.id, amount: 100000, reason: 'nạp', idempotencyKey: `nap-${tag}` });
const [c1, c2] = await twin(pgA, '/api/finance/tx',
  { kind: 'PAYMENT', accountId: testAcc.id, amount: 80000, reason: 'chi A', idempotencyKey: `ca-${tag}` },
  { kind: 'PAYMENT', accountId: testAcc.id, amount: 80000, reason: 'chi B', idempotencyKey: `cb-${tag}` });
const okChi = [c1, c2].filter((x) => x.status === 200).length;
const testBal = JSON.parse((await api(pgA, '/api/finance/accounts')).body).accounts.find((a) => a.id === testAcc.id).balance;
check('H2: 2 chi 80k đồng thời trên quỹ 100k → chỉ 1 lệnh qua, quỹ không âm', okChi === 1 && testBal === 20000);

// ===== M: hoàn tiền cần quyền duyệt (đã kiểm ở finance.e2e — xác nhận lại nhanh) =====
const [ctxKT, pgKT] = await login(b, 'ketoan1');
r = await api(pgKT, '/api/finance/tx?page=1');
const anyReceipt = JSON.parse(r.body).rows.find((t) => t.kind === 'RECEIPT');
r = await post(pgKT, '/api/finance/refund', { txId: anyReceipt?.id ?? 1, amount: 1000, reason: 'x' });
check('M: kế toán hoàn tiền bị chặn 403 (cần finance.approve)', r.status === 403);
await ctxKT.close();

// Nhập đủ tồn kho cho các đợt giao COD bên dưới (5+3+2 = 10, nhập dư)
await post(pgA, '/api/inventory/move', { kind: 'RECEIPT', warehouseId: 1,
  lines: [{ variantId: variant.id, qty: 30 }], note: `Nhập test audit ${tag}` });

// ===== H3+H4: COD dùng số THỰC THU + trả hàng đảo tiền =====
// Đơn 500k, khách CỌC trước 500k (đã trả đủ), rồi giao với codAmount khai 500k
const o2 = await makeOrder(5, 100000); // 500k
await post(pgA, '/api/sales/pay', { orderId: o2.orderId, amount: 500000, method: 'CASH' }); // trả đủ trước
r = await post(pgA, '/api/inventory/shipments', { orderId: o2.orderId, warehouseId: 1,
  lines: [{ variantId: variant.id, qty: 5 }], carrier: 'GHTK', codAmount: 500000 });
const sh2 = JSON.parse(r.body);
await patch(pgA, '/api/inventory/shipments', { id: sh2.id, to: 'SHIPPING' });
const codBefore = await fundBal('COD');
await patch(pgA, '/api/inventory/shipments', { id: sh2.id, to: 'DELIVERED' });
const codAfter = await fundBal('COD');
r = await api(pgA, '/api/inventory/cod');
const inList = JSON.parse(r.body).rows.some((x) => x.id === sh2.id);
check('H3: đơn đã trả đủ → giao COD KHÔNG nạp tiền ảo vào quỹ COD', codAfter === codBefore);
check('H3: vận đơn không có tiền thực thu KHÔNG lọt vào danh sách đối soát', inList === false);

// Đơn 2 thực sự thu COD: đơn 300k chưa trả, giao COD 300k
const o3 = await makeOrder(3, 100000); // 300k chưa trả
r = await post(pgA, '/api/inventory/shipments', { orderId: o3.orderId, warehouseId: 1,
  lines: [{ variantId: variant.id, qty: 3 }], carrier: 'GHN', codAmount: 300000 });
const sh3 = JSON.parse(r.body);
await patch(pgA, '/api/inventory/shipments', { id: sh3.id, to: 'SHIPPING' });
const codB2 = await fundBal('COD');
await patch(pgA, '/api/inventory/shipments', { id: sh3.id, to: 'DELIVERED' });
check('H4a: giao COD thật → quỹ COD +300k, đơn đã thu 300k',
  (await fundBal('COD')) === codB2 + 300000 && (await orderPaid(o3.orderId)) === 300000);
// Khách trả hàng → phải ĐẢO tiền COD + công nợ
r = await patch(pgA, '/api/inventory/shipments', { id: sh3.id, to: 'RETURNED', restock: true });
check('H4b: trả hàng COD → quỹ COD về mức cũ (đảo tiền), đơn về chưa thu',
  r.status === 200 && (await fundBal('COD')) === codB2 && (await orderPaid(o3.orderId)) === 0);

// ===== H3 race: 2 đối soát cùng vận đơn chỉ 1 thành công =====
const o4 = await makeOrder(2, 100000);
r = await post(pgA, '/api/inventory/shipments', { orderId: o4.orderId, warehouseId: 1,
  lines: [{ variantId: variant.id, qty: 2 }], carrier: 'GHN', codAmount: 200000 });
const sh4 = JSON.parse(r.body);
await patch(pgA, '/api/inventory/shipments', { id: sh4.id, to: 'SHIPPING' });
await patch(pgA, '/api/inventory/shipments', { id: sh4.id, to: 'DELIVERED' });
const nh1 = JSON.parse((await api(pgA, '/api/finance/accounts')).body).accounts.find((a) => a.code === 'NH1');
const codPre = await fundBal('COD');
const [d1, d2] = await twin(pgA, '/api/inventory/cod',
  { shipmentIds: [sh4.id], toAccountId: nh1.id },
  { shipmentIds: [sh4.id], toAccountId: nh1.id });
const okReco = [d1, d2].filter((x) => x.status === 200).length;
check('H3race: 2 đối soát cùng vận đơn → đúng 1 thành công (không chuyển tiền 2 lần)',
  okReco === 1 && (await fundBal('COD')) === codPre - 200000);

// ===== L: convert double-submit → 409 (không 500) =====
let x = await post(pgA, '/api/sales/quotes', { partnerId: partner.id, partnerName: `KH audit ${tag}`,
  lines: [{ variantId: variant.id, qty: 1, unitPrice: 100000 }], vatEnabled: false });
const q5 = JSON.parse(x.body);
await patch(pgA, '/api/sales/quotes', { id: q5.id, to: 'SENT' });
const [cv1, cv2] = await twin(pgA, '/api/sales/convert', { quoteId: q5.id }, { quoteId: q5.id });
const okConv = [cv1, cv2].filter((c) => c.status === 200).length;
const conflict = [cv1, cv2].filter((c) => c.status === 409).length;
check('L: convert 2 lần đồng thời → 1 thành công + 1 báo 409 (không 500)',
  okConv === 1 && conflict === 1 && ![cv1, cv2].some((c) => c.status === 500));

await ctxA.close();
await b.close();
const fail = results.filter(([, ok]) => !ok).length;
console.log(fail === 0 ? 'E2E AUDIT-FIXES: TAT CA PASS' : `E2E AUDIT-FIXES: ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
