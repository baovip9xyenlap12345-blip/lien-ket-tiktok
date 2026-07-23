// E2E GD6: ton kho, cam am, concurrency 2 nguoi cung xuat, giu cho, giao nhieu dot,
// COD doi soat, hoan hang, kiem kho. Chay: node e2e/inventory.e2e.mjs (server :3000)
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

// Chuan bi: admin tao san pham rieng cho test (tranh dung tag cac lan chay khac)
const [ctxA, pgA] = await login(b, 'admin');
let r = await post(pgA, '/api/catalog/products', { code: `KHO${tag}`, name: `Gấu test kho ${tag}`,
  type: 'FINISHED', unitId: 1, variants: [{ costPrice: 50000, size: '50cm' }] });
check('Tạo sản phẩm test', r.status === 200);
r = await api(pgA, `/api/catalog/products?q=KHO${tag}&page=1`);
const variant = JSON.parse(r.body).rows[0].variants[0];
const whId = 1; // K1 tu seed GD1
const bal = async (pg) => {
  const j = JSON.parse((await api(pg, `/api/inventory/balances?q=KHO${tag}`)).body);
  return j.rows.find((x) => x.variantId === variant.id) ?? { onHand: 0, reserved: 0, available: 0 };
};

// ===== 1. KHO nhap 10 → ton 10; xuat 3 → 7; cam am =====
const [ctxK, pgK] = await login(b, 'kho1');
r = await post(pgK, '/api/inventory/move', { kind: 'RECEIPT', warehouseId: whId,
  lines: [{ variantId: variant.id, qty: 10 }], note: 'Nhập lô test' });
check('Kho nhập 10 con', r.status === 200);
let bl = await bal(pgK);
check('Tồn = 10, khả dụng = 10', bl.onHand === 10 && bl.available === 10);
r = await post(pgK, '/api/inventory/move', { kind: 'ISSUE', warehouseId: whId,
  lines: [{ variantId: variant.id, qty: 3 }], note: 'Xuất test' });
bl = await bal(pgK);
check('Xuất 3 → tồn 7', r.status === 200 && bl.onHand === 7);
r = await post(pgK, '/api/inventory/move', { kind: 'ISSUE', warehouseId: whId,
  lines: [{ variantId: variant.id, qty: 100 }], note: 'Xuất quá' });
check('Xuất 100 khi tồn 7 bị CẤM ÂM KHO', r.status === 400 && JSON.parse(r.body).error.includes('cấm âm'));

// ===== 2. CONCURRENCY: 2 nguoi cung xuat 5 khi ton 7 → dung 1 nguoi duoc =====
const [both1, both2] = await Promise.all([
  post(pgK, '/api/inventory/move', { kind: 'ISSUE', warehouseId: whId,
    lines: [{ variantId: variant.id, qty: 5 }], note: 'Xuất đồng thời A' }),
  post(pgA, '/api/inventory/move', { kind: 'ISSUE', warehouseId: whId,
    lines: [{ variantId: variant.id, qty: 5 }], note: 'Xuất đồng thời B' }),
]);
const okCount = [both1, both2].filter((x) => x.status === 200).length;
bl = await bal(pgK);
check('2 người cùng xuất 5 (tồn 7): đúng 1 người được, tồn = 2', okCount === 1 && bl.onHand === 2);

// ===== 3. Giu cho: don CONFIRMED giu 2 → kha dung 0; xuat thuong bi chan =====
r = await post(pgA, '/api/partners', { name: `Khách kho ${tag}`, phone: '097' + String(tag).padStart(7, '4'),
  creditLimit: 99000000, creditDays: 30 });
const partner = JSON.parse(r.body);
r = await post(pgA, '/api/sales/quotes', { partnerId: partner.id, partnerName: `Khách kho ${tag}`,
  lines: [{ variantId: variant.id, qty: 2, unitPrice: 150000 }], vatEnabled: false });
const quote = JSON.parse(r.body);
await patch(pgA, '/api/sales/quotes', { id: quote.id, to: 'SENT' });
r = await post(pgA, '/api/sales/convert', { quoteId: quote.id });
const order = JSON.parse(r.body);
await patch(pgA, '/api/sales/orders', { id: order.orderId, axis: 'order', to: 'CONFIRMED' });
r = await post(pgK, '/api/inventory/reserve', { orderId: order.orderId, warehouseId: whId });
bl = await bal(pgK);
check('Giữ chỗ 2 cho đơn → giữ chỗ 2, khả dụng 0', r.status === 200 && bl.reserved === 2 && bl.available === 0);
r = await post(pgK, '/api/inventory/move', { kind: 'ISSUE', warehouseId: whId,
  lines: [{ variantId: variant.id, qty: 1 }], note: 'Xuất chạm giữ chỗ' });
check('Xuất thường bị chặn vì hàng đã giữ chỗ', r.status === 400);

// ===== 4. Giao nhieu dot + khong vuot so duoc giao =====
r = await post(pgK, '/api/inventory/shipments', { orderId: order.orderId, warehouseId: whId,
  lines: [{ variantId: variant.id, qty: 1 }], carrier: 'GHTK', trackingNo: `VD${tag}A`, codAmount: 0 });
const ship1 = JSON.parse(r.body);
check('Giao đợt 1 (1/2 con) OK', r.status === 200 && /^GH-/.test(ship1.code));
bl = await bal(pgK);
check('Sau đợt 1: tồn 1, giữ chỗ còn 1 (phần chưa giao vẫn giữ)', bl.onHand === 1 && bl.reserved === 1);
r = await post(pgK, '/api/inventory/shipments', { orderId: order.orderId, warehouseId: whId,
  lines: [{ variantId: variant.id, qty: 2 }], carrier: 'GHTK' });
check('Giao đợt 2 vượt (2 > còn 1 được giao) bị chặn', r.status === 400 && JSON.parse(r.body).error.includes('vượt'));
r = await post(pgK, '/api/inventory/shipments', { orderId: order.orderId, warehouseId: whId,
  lines: [{ variantId: variant.id, qty: 1 }], carrier: 'GHTK', trackingNo: `VD${tag}B`, codAmount: 300000 });
const ship2 = JSON.parse(r.body);
check('Giao đợt 2 đúng phần còn lại (1 con, COD 300k)', r.status === 200);
bl = await bal(pgK);
check('Giao hết: tồn 0, giữ chỗ 0', bl.onHand === 0 && bl.reserved === 0);

// ===== 5. COD: DELIVERED → tien vao quy COD, chua vao ngan hang; doi soat → chuyen NH =====
await patch(pgK, '/api/inventory/shipments', { id: ship2.id, to: 'SHIPPING' });
r = await patch(pgK, '/api/inventory/shipments', { id: ship2.id, to: 'DELIVERED' });
check('Đợt COD chuyển Đã giao', r.status === 200);
r = await api(pgA, `/api/sales/orders?id=${order.orderId}`);
const ordAfterCod = JSON.parse(r.body).order;
check('Đơn nhận đủ tiền COD (paid 300k = tổng)', ordAfterCod.paidAmt === 300000 && ordAfterCod.paymentStatus === 'PAID');
r = await api(pgA, '/api/finance/accounts');
let accs = JSON.parse(r.body).accounts;
const codBal = accs.find((a) => a.code === 'COD').balance;
check('Tiền nằm ở quỹ COD (chưa phải ngân hàng)', codBal >= 300000);
r = await api(pgA, '/api/inventory/cod');
const codList = JSON.parse(r.body);
check('Vận đơn nằm trong danh sách chờ đối soát', codList.rows.some((x) => x.id === ship2.id));
const nh1 = accs.find((a) => a.code === 'NH1');
r = await post(pgA, '/api/inventory/cod', { shipmentIds: [ship2.id], toAccountId: nh1.id });
check('Đối soát COD OK', r.status === 200 && JSON.parse(r.body).total === 300000);
r = await api(pgA, '/api/finance/accounts');
accs = JSON.parse(r.body).accounts;
check('Sau đối soát: quỹ COD giảm 300k, NH1 tăng 300k',
  accs.find((a) => a.code === 'COD').balance === codBal - 300000 &&
  accs.find((a) => a.code === 'NH1').balance === nh1.balance + 300000);
r = await api(pgA, '/api/inventory/cod');
check('Vận đơn biến mất khỏi danh sách chờ đối soát', !JSON.parse(r.body).rows.some((x) => x.id === ship2.id));

// ===== 6. Hoan hang: dot 1 dang soan → SHIPPING → RETURNED nhap lai kho =====
await patch(pgK, '/api/inventory/shipments', { id: ship1.id, to: 'SHIPPING' });
r = await patch(pgK, '/api/inventory/shipments', { id: ship1.id, to: 'RETURNED', restock: true });
bl = await bal(pgK);
check('Hoàn hàng nhập lại kho: tồn 0 → 1', r.status === 200 && bl.onHand === 1);

// ===== 7. Kiem kho: dem thuc te 5 (he thong 2) → tu dieu chinh +3 =====
r = await post(pgK, '/api/inventory/stocktake', { warehouseId: whId, note: 'Kiểm test',
  lines: [{ variantId: variant.id, countedQty: 5 }] });
const st = JSON.parse(r.body);
bl = await bal(pgK);
check('Kiểm kho: lệch +3 tự điều chỉnh, tồn = 5', r.status === 200 && st.diffs === 1 && bl.onHand === 5);

// ===== 8. The kho bat bien co du dau vet =====
r = await api(pgK, `/api/inventory/move?variantId=${variant.id}`);
const moves = JSON.parse(r.body).rows;
check('Thẻ kho ghi đủ các loại chứng từ (nhập/xuất/giao/hoàn/điều chỉnh)',
  ['RECEIPT', 'ISSUE', 'SALE', 'RETURN', 'ADJUST'].every((k) => moves.some((m) => m.kind === k)));
check('Chứng từ giao tham chiếu mã GH-', moves.some((m) => m.kind === 'SALE' && /^GH-/.test(m.refId ?? '')));

// ===== 9. Phan quyen =====
const [ctxS, pgS] = await login(b, 'sale1');
r = await post(pgS, '/api/inventory/move', { kind: 'RECEIPT', warehouseId: whId,
  lines: [{ variantId: variant.id, qty: 1 }], note: 'hack' });
check('Sale không được ghi kho (403)', r.status === 403);
r = await api(pgS, `/api/inventory/balances?q=KHO${tag}`);
check('Sale xem được tồn kho (inventory.view? không có → 403)', r.status === 403);
r = await api(pgK, '/api/inventory/cod');
check('Kho không xem được COD/tài chính (403)', r.status === 403);
await ctxS.close();

await ctxK.close(); await ctxA.close();
await b.close();
const fail = results.filter(([, ok]) => !ok).length;
console.log(fail === 0 ? 'E2E GD6: TAT CA PASS' : `E2E GD6: ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
