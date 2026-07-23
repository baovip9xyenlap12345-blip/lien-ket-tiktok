// E2E GD2: danh muc san pham + bang gia + phan quyen gia von. Chay: node e2e/catalog.e2e.mjs (server :3000)
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

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// 1. Admin: trang catalog hien du lieu that
let [ctx, pg] = await login(b, 'admin');
await pg.goto(BASE + '/catalog'); await pg.waitForTimeout(2500);
const body = await pg.locator('body').innerText();
check('Trang Sản phẩm hiện dữ liệu thật (Capybara)', body.includes('Capybara'));
// CSS .th viet hoa chu → so sanh khong phan biet hoa thuong
check('Admin thấy cột Giá vốn (cost.view)', body.toLowerCase().includes('giá vốn'));

// 2. Tim kiem theo SKU
let r = await api(pg, '/api/catalog/products?q=SP001&page=1');
check('Tìm theo mã SP001 ra kết quả', r.status === 200 && JSON.parse(r.body).rows.length >= 1);

// 3. Tao san pham moi qua API + SKU trung bi chan
const uniq = 'E2E' + String(Math.floor(performance.now())).slice(-6);
r = await api(pg, '/api/catalog/products', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: uniq, name: 'Gấu test E2E', type: 'FINISHED', unitId: 1,
    variants: [{ costPrice: 50000, size: '30cm' }] }) });
check('Tạo sản phẩm mới OK', r.status === 200 && JSON.parse(r.body).ok);
r = await api(pg, '/api/catalog/products', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: uniq + 'B', name: 'Gấu test E2E 2', type: 'FINISHED', unitId: 1,
    variants: [{ costPrice: 0, sku: uniq + '-30CM' }] }) });
check('SKU trùng sản phẩm khác bị chặn 400', r.status === 400);

// 4. Gia bac thang + resolve
const found = JSON.parse((await api(pg, `/api/catalog/products?q=${uniq}&page=1`)).body);
const vid = found.rows[0].variants[0].id;
const lists = JSON.parse((await api(pg, '/api/catalog/meta')).body).priceLists;
const retail = lists.find((l) => l.kind === 'RETAIL'); const ws = lists.find((l) => l.kind === 'WHOLESALE');
for (const [listId, minQty, price] of [[retail.id, 1, 150000], [ws.id, 1, 100000], [ws.id, 10, 90000]]) {
  await api(pg, '/api/catalog/prices', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceListId: listId, variantId: vid, minQty, price }) });
}
const rp = async (qs) => JSON.parse((await api(pg, `/api/catalog/resolve-price?variantId=${vid}&${qs}`)).body).result;
check('Giá mặc định ưu tiên sỉ (100k)', (await rp('qty=1'))?.price === 100000);
check('Mua 10 con áp bậc sỉ ≥10 (90k)', (await rp('qty=10'))?.price === 90000);
check('Chỉ định bảng lẻ ra 150k', (await rp(`qty=1&listId=${retail.id}`))?.price === 150000);

// 5. Xuat CSV cua admin co cot cost
r = await api(pg, '/api/catalog/export');
check('Export của admin có cột cost', r.status === 200 && r.body.split('\n')[0].includes('cost'));
await ctx.close();

// 6. Kho: xem duoc, khong thay gia von, khong sua duoc
[ctx, pg] = await login(b, 'kho1');
await pg.goto(BASE + '/catalog'); await pg.waitForTimeout(2500);
const bodyKho = await pg.locator('body').innerText();
check('Kho xem được danh sách sản phẩm', bodyKho.includes('Capybara'));
check('Kho KHÔNG thấy cột Giá vốn', !bodyKho.toLowerCase().includes('giá vốn'));
check('Kho không có nút Thêm sản phẩm', !bodyKho.includes('Thêm sản phẩm'));
r = await api(pg, '/api/catalog/products', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: 'HACK01', name: 'x', type: 'FINISHED', unitId: 1, variants: [{ costPrice: 0 }] }) });
check('Kho gọi API tạo sản phẩm bị 403', r.status === 403);
r = await api(pg, '/api/catalog/export');
check('Export của kho KHÔNG có cột cost', r.status === 200 && !r.body.split('\n')[0].includes('cost'));
await ctx.close();

await b.close();
const fail = results.filter(([, ok]) => !ok).length;
console.log(fail === 0 ? 'E2E GD2: TAT CA PASS' : `E2E GD2: ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
