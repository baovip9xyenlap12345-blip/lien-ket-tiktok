// E2E GD7: thiet ke/duyet mau, lenh SX theo BOM, giu cho + cap phat NL, cong doan, QC,
// nhap thanh pham dung 1 lan, tien do & cham han. Chay: node e2e/production.e2e.mjs
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
const whId = 1;

// ===== Chuan bi: san pham + nguyen lieu + BOM ACTIVE rieng cho test =====
const [ctxA, pgA] = await login(b, 'admin');
let r = await post(pgA, '/api/catalog/products', { code: `SX${tag}`, name: `Gấu SX ${tag}`,
  type: 'CUSTOM', unitId: 1, variants: [{ costPrice: 0, size: '40cm' }] });
check('Tạo sản phẩm CUSTOM test', r.status === 200);
r = await api(pgA, `/api/catalog/products?q=SX${tag}&page=1`);
const fin = JSON.parse(r.body).rows[0];
const finVar = fin.variants[0];
r = await post(pgA, '/api/catalog/products', { code: `NLSX${tag}`, name: `Vải SX ${tag}`,
  type: 'MATERIAL', unitId: 1, variants: [{ costPrice: 40000, sku: `NLSX${tag}` }] });
r = await api(pgA, `/api/catalog/products?q=NLSX${tag}&page=1`);
const matVar = JSON.parse(r.body).rows[0].variants[0];
// BOM: 2 vai/con, hao hut 10% → 10 con can 22
r = await post(pgA, '/api/catalog/bom', { productId: fin.id, name: `BOM ${tag}`, wastePct: 10,
  activate: true, items: [{ materialVariantId: matVar.id, qtyPerUnit: 2 }] });
check('Tạo BOM ACTIVE (2 vải/con, hao hụt 10%)', r.status === 200);

// ===== 1. Thiet ke: tao yeu cau + 2 ban demo + gop y + duyet =====
const [ctxK, pgK] = await login(b, 'kho1');   // kho co production.manage
r = await post(pgK, '/api/production/designs', { action: 'create', title: `Gấu in logo ${tag}` });
const design = JSON.parse(r.body);
check('Kho tạo yêu cầu thiết kế (TK-…)', r.status === 200 && /^TK-/.test(design.code));
r = await post(pgK, '/api/production/designs', { action: 'version', designId: design.id, note: 'Bản 1' });
const v1 = JSON.parse(r.body);
r = await post(pgK, '/api/production/designs', { action: 'comment', versionId: v1.id, content: 'Logo hơi nhỏ' });
check('Thêm bản demo + bình luận', r.status === 200);
r = await post(pgK, '/api/production/designs', { action: 'decide', versionId: v1.id, approve: false, note: 'Phóng to logo' });
check('Kho KHÔNG có quyền duyệt mẫu (403)', r.status === 403);
r = await post(pgA, '/api/production/designs', { action: 'decide', versionId: v1.id, approve: false, note: 'Phóng to logo' });
check('Admin yêu cầu sửa bản 1', r.status === 200);
r = await post(pgK, '/api/production/designs', { action: 'version', designId: design.id, note: 'Bản 2 đã phóng to' });
const v2 = JSON.parse(r.body);
r = await post(pgA, '/api/production/designs', { action: 'decide', versionId: v2.id, approve: true });
check('Admin duyệt bản 2 (ghi người + thời gian)', r.status === 200);
r = await api(pgA, `/api/production/designs?id=${design.id}`);
const dz = JSON.parse(r.body).design;
check('Trạng thái lưu đúng: bản 1 REJECTED, bản 2 APPROVED có người duyệt',
  dz.versions.find((x) => x.no === 1)?.status === 'REJECTED' &&
  dz.versions.find((x) => x.no === 2)?.status === 'APPROVED' &&
  !!dz.versions.find((x) => x.no === 2)?.decidedByName);

// ===== 2. Chan san xuat bang mau chua duyet =====
r = await post(pgK, '/api/production/orders', { variantId: finVar.id, qtyPlanned: 10,
  warehouseId: whId, designVersionId: v1.id });
check('Kho tạo lệnh với mẫu CHƯA duyệt bị chặn', r.status === 400 && JSON.parse(r.body).error.includes('CHƯA ĐƯỢC DUYỆT'));
r = await post(pgA, '/api/production/orders', { variantId: finVar.id, qtyPlanned: 10,
  warehouseId: whId, designVersionId: v1.id });
check('Admin dùng ngoại lệ nhưng thiếu lý do cũng bị chặn', r.status === 400 && JSON.parse(r.body).error.includes('LÝ DO'));
r = await post(pgK, '/api/production/orders', { variantId: finVar.id, qtyPlanned: 10, warehouseId: whId });
check('Hàng CUSTOM không gắn mẫu bị chặn', r.status === 400);

// ===== 3. Tao lenh voi mau da duyet + chi phi du kien =====
const due = new Date(Date.now() + 5 * 86400000).toISOString();
r = await post(pgK, '/api/production/orders', { variantId: finVar.id, qtyPlanned: 10,
  warehouseId: whId, designVersionId: v2.id, dueDate: due });
const prod = JSON.parse(r.body);
check('Tạo lệnh SX-… với mẫu đã duyệt', r.status === 200 && /^SX-/.test(prod.code));
check('Chi phí NL dự kiến = 22 x 40k = 880k (2/con + 10% hao hụt)', prod.costEstimate === 880000);

// 4. Phat lenh khi chua co nguyen lieu → bao thieu
r = await patch(pgK, '/api/production/orders', { action: 'release', id: prod.id });
check('Phát lệnh khi kho trống báo thiếu nguyên liệu', r.status === 400 && JSON.parse(r.body).error.includes('thiếu nguyên liệu'));
// Nhap 30 vai roi phat lenh → giu cho 22
r = await post(pgK, '/api/inventory/move', { kind: 'RECEIPT', warehouseId: whId,
  lines: [{ variantId: matVar.id, qty: 30 }], note: 'Nhập vải test SX' });
r = await patch(pgK, '/api/production/orders', { action: 'release', id: prod.id });
check('Phát lệnh OK sau khi nhập vải', r.status === 200);
const matBal = async () => {
  const j = JSON.parse((await api(pgK, `/api/inventory/balances?q=NLSX${tag}`)).body);
  return j.rows.find((x) => x.variantId === matVar.id);
};
let mb = await matBal();
check('Giữ chỗ nguyên liệu 22, khả dụng 8', mb.reserved === 22 && mb.available === 8);

// 5. Bat dau → cap phat (xuat kho NL) + chi phi thuc te
r = await patch(pgK, '/api/production/orders', { action: 'start', id: prod.id });
const started = JSON.parse(r.body);
mb = await matBal();
check('Cấp phát: tồn vải 30→8, giữ chỗ 0, chi phí thực tế 880k',
  r.status === 200 && mb.onHand === 8 && mb.reserved === 0 && started.costActual === 880000);

// 6. Ghi cong doan + tien do
await patch(pgK, '/api/production/orders', { action: 'step', id: prod.id, stage: 'CUT', qtyGood: 10 });
await patch(pgK, '/api/production/orders', { action: 'step', id: prod.id, stage: 'SEW', qtyGood: 9, qtyDefect: 1 });
r = await patch(pgK, '/api/production/orders', { action: 'step', id: prod.id, stage: 'STUFF', qtyGood: 9 });
check('Ghi 3 công đoạn cắt/may/nhồi', r.status === 200);
r = await patch(pgK, '/api/production/orders', { action: 'step', id: prod.id, stage: 'XYZ', qtyGood: 1 });
check('Công đoạn không hợp lệ bị chặn', r.status === 400);
r = await api(pgK, `/api/production/orders?id=${prod.id}`);
let pd = JSON.parse(r.body);
check('Tiến độ theo công đoạn sau cùng: 90% (9/10 nhồi)', pd.progress === 90);
check('Chưa quá hạn → không cảnh báo chậm', pd.late === false);

// 7. QC: so khong khop bi chan; 8 dat 1 loi 1 hong
r = await patch(pgK, '/api/production/orders', { action: 'qc', id: prod.id,
  inspected: 10, pass: 8, fail: 1, scrap: 0 });
check('QC 8+1+0 ≠ 10 bị chặn (số phải khớp)', r.status === 400 && JSON.parse(r.body).error.includes('bằng số kiểm'));
r = await patch(pgK, '/api/production/orders', { action: 'qc', id: prod.id,
  inspected: 10, pass: 8, fail: 1, scrap: 1,
  checklist: { 'Đúng thiết kế đã duyệt (logo, màu)': true } });
check('QC hợp lệ: 8 đạt, 1 làm lại, 1 hỏng', r.status === 200);

// 8. Nhap thanh pham = so QC dat, dung 1 lan
const finBal = async () => {
  const j = JSON.parse((await api(pgK, `/api/inventory/balances?q=SX${tag}`)).body);
  return j.rows.find((x) => x.variantId === finVar.id) ?? { onHand: 0 };
};
r = await patch(pgK, '/api/production/orders', { action: 'finish', id: prod.id });
const fb = await finBal();
check('Nhập kho thành phẩm đúng 8 con QC đạt', r.status === 200 && JSON.parse(r.body).qty === 8 && fb.onHand === 8);
r = await patch(pgK, '/api/production/orders', { action: 'finish', id: prod.id });
check('Nhập thành phẩm lần 2 bị chặn (đúng một lần)', r.status === 400);

// 9. Canh bao cham tien do: lenh qua han
r = await post(pgK, '/api/production/orders', { variantId: finVar.id, qtyPlanned: 5,
  warehouseId: whId, designVersionId: v2.id, dueDate: new Date(Date.now() - 86400000).toISOString() });
const prodLate = JSON.parse(r.body);
r = await api(pgK, `/api/production/orders?id=${prodLate.id}`);
check('Lệnh quá hạn chưa xong → cảnh báo CHẬM', JSON.parse(r.body).late === true);
// Huy lenh nhap (dang DRAFT, chua giu NL)
r = await patch(pgK, '/api/production/orders', { action: 'cancel', id: prodLate.id, note: 'test xong' });
check('Hủy lệnh nháp OK', r.status === 200);

// 10. Phan quyen: sale khong vao duoc san xuat
const [ctxS, pgS] = await login(b, 'sale1');
r = await api(pgS, '/api/production/orders');
check('Sale bị chặn xem sản xuất (403)', r.status === 403);
await ctxS.close();

await ctxK.close(); await ctxA.close();
await b.close();
const fail = results.filter(([, ok]) => !ok).length;
console.log(fail === 0 ? 'E2E GD7: TAT CA PASS' : `E2E GD7: ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
