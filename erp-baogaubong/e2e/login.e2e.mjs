// E2E GD1: dang nhap + chan sai quyen. Chay: node e2e/login.e2e.mjs (server dev phai dang chay o :3000)
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const results = [];
function check(name, ok) { results.push([name, ok]); console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); }

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
// 1. sai mat khau
let ctx = await b.newContext(); let pg = await ctx.newPage();
await pg.goto(BASE + '/login');
await pg.fill('input[name=u]', 'admin'); await pg.fill('input[name=p]', 'sai-mat-khau');
await pg.click('button'); await pg.waitForTimeout(700);
check('Sai mật khẩu bị chặn', pg.url().includes('/login'));
// 2. chua dang nhap -> chuyen ve login
await pg.goto(BASE + '/settings'); await pg.waitForTimeout(300);
check('Chưa đăng nhập bị đưa về /login', pg.url().includes('/login'));
// 3. admin dang nhap ok, vao duoc cai dat
await pg.fill('input[name=u]', 'admin'); await pg.fill('input[name=p]', 'Baobao@2026');
const [loginResp] = await Promise.all([
  pg.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 10000 }),
  pg.click('button'),
]);
console.log('   [login api status]', loginResp.status());
await pg.waitForURL((u) => new URL(u).pathname === '/', { timeout: 10000 });
check('Admin đăng nhập thành công', true);
await pg.goto(BASE + '/settings'); await pg.waitForTimeout(2000);
const bodyAdmin = await pg.locator('body').innerText();
check('Admin xem được Cài đặt', bodyAdmin.includes('VAT mặc định'));
if (!bodyAdmin.includes('VAT mặc định')) console.log('   [DEBUG url]', pg.url(), '\n   [DEBUG body]', bodyAdmin.slice(0,200).replace(/\n/g,' | '));
await ctx.close();
// 4. sale bi chan admin/users + API
ctx = await b.newContext(); pg = await ctx.newPage();
await pg.goto(BASE + '/login');
await pg.fill('input[name=u]', 'sale1'); await pg.fill('input[name=p]', 'Baobao@2026');
await pg.click('button');
await pg.waitForURL((u) => new URL(u).pathname === '/', { timeout: 10000 });
await pg.goto(BASE + '/admin/users'); await pg.waitForTimeout(2000);
const bodySale = await pg.locator('body').innerText();
check('Sale bị chặn trang Tài khoản', bodySale.includes('quyền truy cập') && !bodySale.includes('Thêm tài khoản'));
const resp = await pg.evaluate(async () => {
  const r = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'hack', name: 'x', password: 'xxxxxx', roleId: 1, scope: 'ALL', active: true }) });
  return r.status;
});
check('Sale gọi thẳng API tạo user bị 403', resp === 403);
await b.close();
const fail = results.filter(([, ok]) => !ok).length;
console.log(fail === 0 ? 'E2E: TAT CA PASS' : `E2E: ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
