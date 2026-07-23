// E2E GD10: health/ready, webhook (xac minh secret + idempotent + race), tich hop sandbox
// ghi ro "chua gui that", thung rac khoi phuc. Can server chay voi WEBHOOK_SECRET=test-secret-123.
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

// ===== 1. Health/ready cong khai =====
let res = await fetch(BASE + '/api/health');
check('GET /api/health công khai → ok', res.status === 200 && (await res.json()).ok);
res = await fetch(BASE + '/api/ready');
check('GET /api/ready kiểm tra DB → ok', res.status === 200 && (await res.json()).db);

// ===== 2. Webhook: xac minh + idempotency + race =====
const hook = (secret, eventId) => fetch(`${BASE}/api/webhooks/shipping`, { method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(secret ? { 'x-webhook-secret': secret } : {}) },
  body: JSON.stringify({ eventId, status: 'delivered', trackingNo: 'VD' + eventId }) });
res = await hook(null, `ev-${tag}-1`);
check('Webhook thiếu secret bị 401', res.status === 401);
res = await hook('sai-secret', `ev-${tag}-1`);
check('Webhook sai secret bị 401', res.status === 401);
res = await hook('test-secret-123', `ev-${tag}-1`);
let j = await res.json();
check('Webhook đúng secret nhận OK', res.status === 200 && j.ok && j.duplicated === false);
res = await hook('test-secret-123', `ev-${tag}-1`);
j = await res.json();
check('Webhook gửi lặp cùng eventId → duplicated, không xử lý lại', j.duplicated === true);
const [r1, r2] = await Promise.all([hook('test-secret-123', `ev-${tag}-race`), hook('test-secret-123', `ev-${tag}-race`)]);
const [j1, j2] = [await r1.json(), await r2.json()];
check('2 webhook đồng thời cùng eventId → đúng 1 bản ghi',
  [j1.duplicated, j2.duplicated].filter((x) => x === false).length <= 1 && j1.id === j2.id);

// ===== 3. Tich hop sandbox: ghi ro CHUA GUI THAT =====
const [ctxA, pgA] = await login(b, 'admin');
let r = await api(pgA, '/api/integrations');
const integ = JSON.parse(r.body);
check('Màn tích hợp liệt kê 9 kênh, tất cả chưa cấu hình = sandbox',
  integ.channels.length === 9 && integ.channels.every((c) => !c.ready));
r = await post(pgA, '/api/integrations', { action: 'test', channel: 'zalo' });
check('Gửi thử Zalo → chạy sandbox (không giả vờ đã gửi)', JSON.parse(r.body).sandbox === true);
r = await api(pgA, '/api/integrations');
check('Nhật ký ghi rõ "CHƯA GỬI THẬT"',
  JSON.parse(r.body).logs.some((l) => l.channel === 'zalo' && l.summary.includes('CHƯA GỬI THẬT')));
// khong co quyen thi bi chan
const [ctxS, pgS] = await login(b, 'sale1');
r = await api(pgS, '/api/integrations');
check('Sale không xem được màn tích hợp (403)', r.status === 403);
await ctxS.close();

// ===== 4. Thung rac: xoa mem → khoi phuc =====
r = await post(pgA, '/api/partners', { name: `Khách xóa nhầm ${tag}`, phone: '096' + String(tag).padStart(7, '7') });
const pDel = JSON.parse(r.body);
await api(pgA, `/api/partners?id=${pDel.id}`, { method: 'DELETE' });
r = await api(pgA, '/api/admin/trash');
check('Thùng rác liệt kê khách vừa xóa', JSON.parse(r.body).partners.some((x) => x.id === pDel.id));
r = await post(pgA, '/api/admin/trash', { entity: 'partner', id: pDel.id });
check('Khôi phục từ thùng rác OK', r.status === 200);
r = await api(pgA, `/api/partners/detail?id=${pDel.id}`);
check('Khách trở lại bình thường sau khôi phục', r.status === 200);

await ctxA.close();
await b.close();
const fail = results.filter(([, ok]) => !ok).length;
console.log(fail === 0 ? 'E2E GD10: TAT CA PASS' : `E2E GD10: ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
