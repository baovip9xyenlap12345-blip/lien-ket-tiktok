// Kiem tra ket noi WordPress ngay tren may - chay: npm run wp:check
// Doc tai khoan tu file .env (hoac bien moi truong dang co).
import './load-env.js';
import { testConnection } from './wordpress.js';

const tick = ok => (ok ? '✅' : '❌');

const r = await testConnection();

console.log('\n=== KIEM TRA KET NOI WORDPRESS ===');
console.log(`Dia chi   : ${r.status.url || '(chua dien WP_URL)'}`);
console.log(`Tai khoan : ${r.status.username || '(chua dien WP_USERNAME)'}`);
console.log(`Mat khau  : ${r.status.appPasswordLength ? `${r.status.appPasswordMasked} (${r.status.appPasswordLength} ky tu)` : '(chua dien WP_APP_PASSWORD)'}`);
console.log('');

for (const s of r.steps) console.log(`${tick(s.ok)} ${s.step}: ${s.detail}`);

if (!r.ok) {
  console.log(`\n❌ KHONG KET NOI DUOC: ${r.error}\n`);
  process.exit(1);
}

console.log('\n--- Tai khoan ---');
console.log(`Ten hien thi : ${r.account.name}`);
console.log(`Email        : ${r.account.email}`);
console.log(`Vai tro      : ${(r.account.roles || []).join(', ')}`);
console.log(`Quyen cau hinh site: ${r.account.canManageOptions ? 'co' : 'khong'}`);

if (r.settings) {
  console.log('\n--- Cau hinh site ---');
  console.log(`Ten site   : ${r.settings.title}`);
  console.log(`Mo ta      : ${r.settings.description}`);
  console.log(`Email admin: ${r.settings.email}`);
  console.log(`Mui gio    : ${r.settings.timezone || '(theo UTC offset)'}`);
  console.log(`Ngon ngu   : ${r.settings.language || '(mac dinh)'}`);
}

console.log('\n✅ KET NOI THANH CONG — mo trang /wordpress.html de sua tai khoan va cau hinh.\n');
