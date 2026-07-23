// E2E GD3: doi tac/CRM — trung lap, data scope (chong ro ri), cham soc, file. Chay: node e2e/partners.e2e.mjs (server :3000)
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
const phoneA = '09' + String(tag).padStart(8, '1');

// ===== 1. ADMIN tao khach A =====
let [ctxA, pgA] = await login(b, 'admin');
let r = await post(pgA, '/api/partners', { name: `Khách E2E A ${tag}`, phone: phoneA, creditLimit: 5000000, creditDays: 15 });
const pA = JSON.parse(r.body);
check('Admin tạo khách A (mã KH…)', r.status === 200 && /^KH\d+/.test(pA.code ?? ''));

// 2. Trung SDT (viet +84) → 409 canh bao, forceDupe=true thi luu duoc
r = await post(pgA, '/api/partners', { name: `Khách E2E A2 ${tag}`, phone: '+84' + phoneA.slice(1) });
check('Trùng SĐT (+84 vs 0) bị chặn 409 kèm danh sách trùng', r.status === 409 && JSON.parse(r.body).dupes?.length >= 1);
r = await post(pgA, '/api/partners', { name: `Khách E2E A2 ${tag}`, phone: '+84' + phoneA.slice(1), forceDupe: true });
check('Xác nhận "vẫn lưu" thì tạo được', r.status === 200);
const pA2 = JSON.parse(r.body);

// 3. Cham soc: tao nhiem vu co han → hien trong lich nhac; danh dau xong
r = await post(pgA, '/api/partners/care', { partnerId: pA.id, kind: 'TASK',
  content: 'Gọi chốt đơn E2E', dueAt: new Date(Date.now() + 3600e3).toISOString() });
const careId = JSON.parse(r.body).id;
check('Tạo nhiệm vụ chăm sóc có hạn', r.status === 200 && !!careId);
r = await api(pgA, '/api/partners/care?due=1');
check('Nhiệm vụ hiện trong lịch nhắc của tôi', JSON.parse(r.body).rows?.some((x) => x.id === careId));
r = await api(pgA, '/api/partners/care', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: careId, done: true }) });
check('Đánh dấu xong OK', r.status === 200);

// 4. File: upload PNG + tai lai duoc qua API co quyen
const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
r = await pgA.evaluate(async ({ id, b64 }) => {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const fd = new FormData();
  fd.set('file', new File([bin], 'logo-e2e.png', { type: 'image/png' }));
  fd.set('partnerId', String(id));
  const res = await fetch('/api/files', { method: 'POST', body: fd });
  return { status: res.status, body: await res.text() };
}, { id: pA.id, b64: pngB64 });
const fileId = JSON.parse(r.body).id;
check('Upload file cho khách A', r.status === 200 && !!fileId);
r = await api(pgA, `/api/files/${fileId}`);
check('Admin tải lại được file', r.status === 200);
// dinh dang cam (vd .exe) bi tu choi
r = await pgA.evaluate(async ({ id }) => {
  const fd = new FormData();
  fd.set('file', new File([new Uint8Array([77, 90])], 'virus.exe', { type: 'application/x-msdownload' }));
  fd.set('partnerId', String(id));
  const res = await fetch('/api/files', { method: 'POST', body: fd });
  return { status: res.status };
}, { id: pA.id });
check('File .exe bị từ chối', r.status === 400);

// ===== 5. SALE1 (scope OWN): khong duoc thay khach cua admin =====
const [ctxS, pgS] = await login(b, 'sale1');
r = await post(pgS, '/api/partners', { name: `Khách của Sale ${tag}`, phone: '093' + String(tag).padStart(7, '2') });
const pS = JSON.parse(r.body);
check('Sale tạo được khách của mình', r.status === 200);
r = await api(pgS, '/api/partners?q=&page=1');
let rows = JSON.parse(r.body).rows ?? [];
check('Danh sách của sale KHÔNG chứa khách của admin', !rows.some((x) => x.id === pA.id) && rows.some((x) => x.id === pS.id));
r = await api(pgS, `/api/partners?q=${encodeURIComponent(phoneA)}&page=1`);
rows = JSON.parse(r.body).rows ?? [];
check('Tìm kiếm theo SĐT khách admin cũng không ra (chống rò rỉ qua search)', rows.length === 0);
r = await api(pgS, `/api/partners/detail?id=${pA.id}`);
check('Gọi thẳng API chi tiết khách admin bị 404', r.status === 404);
r = await api(pgS, '/api/partners/export');
check('Export của sale không chứa khách admin', r.status === 200 && !r.body.includes(`Khách E2E A ${tag}`) && r.body.includes(`Khách của Sale ${tag}`));
r = await api(pgS, `/api/files/${fileId}`);
check('Sale tải file của khách admin bị 404 (bảo vệ file)', r.status === 404);
r = await post(pgS, '/api/partners/care', { partnerId: pA.id, kind: 'NOTE', content: 'xâm nhập' });
check('Sale ghi chăm sóc lên khách admin bị 404', r.status === 404);
await ctxS.close();

// ===== 6. KHO: khong co partner.view → bi chan =====
const [ctxK, pgK] = await login(b, 'kho1');
r = await api(pgK, '/api/partners?page=1');
check('Kho không có quyền partner.view bị 403', r.status === 403);
await ctxK.close();

// ===== 7. Gop khach: A2 vao A, kiem tra het trong danh sach =====
r = await post(pgA, '/api/partners/merge', { keepId: pA.id, mergeId: pA2.id });
check('Gộp A2 vào A OK', r.status === 200);
r = await api(pgA, `/api/partners?q=${encodeURIComponent(`Khách E2E A2 ${tag}`)}&page=1`);
check('Bản bị gộp biến mất khỏi danh sách', (JSON.parse(r.body).rows ?? []).length === 0);
// audit co ghi partner_merge
await pgA.goto(BASE + '/audit'); await pgA.waitForTimeout(1500);
const auditBody = await pgA.locator('body').innerText();
check('Nhật ký ghi thao tác gộp (partner_merge)', auditBody.includes('partner_merge'));

// 8. Trang UI chi tiet khach A hien thong tin + timeline
await pgA.goto(`${BASE}/partners/${pA.id}`); await pgA.waitForTimeout(2000);
const detailBody = await pgA.locator('body').innerText();
check('Trang chi tiết hiện tên khách + lịch sử chăm sóc', detailBody.includes(`Khách E2E A ${tag}`) && detailBody.includes('Gọi chốt đơn E2E'));
await ctxA.close();

await b.close();
const fail = results.filter(([, ok]) => !ok).length;
console.log(fail === 0 ? 'E2E GD3: TAT CA PASS' : `E2E GD3: ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
