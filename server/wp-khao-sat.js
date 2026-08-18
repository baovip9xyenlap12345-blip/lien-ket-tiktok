// Khao sat website: co nhung gi, dung plugin nao, tai khoan lam duoc gi.
// Chay:  node wp-khao-sat.js
// Ket qua in ra man hinh + luu vao file khao-sat.txt de gui lai cho nguoi ho tro.
import './load-env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as wp from './wordpress.js';

const thuMucGoc = path.dirname(fileURLToPath(import.meta.url));
const dong = [];
const ghi = s => { console.log(s); dong.push(s); };

ghi('\n=== KHAO SAT WEBSITE ===');
ghi(`Dia chi  : ${wp.wpStatus().url || '(chua cau hinh WP_URL)'}`);
ghi(`Tai khoan: ${wp.wpStatus().username || '(chua cau hinh)'}`);

let tk, ks;
try {
  tk = await wp.getAccount();
  ghi(`Vai tro  : ${(tk.roles || []).join(', ') || '(khong ro)'}`);
} catch (err) {
  console.error(`\n❌ Khong dang nhap duoc: ${err.message}\n`);
  process.exit(1);
}

try {
  ks = await wp.khaoSat();
} catch (err) {
  console.error(`\n❌ Khong khao sat duoc: ${err.message}\n`);
  process.exit(1);
}

ghi('\n--- Website ---');
ghi(`Ten site  : ${ks.site.ten || '(khong ten)'}`);
ghi(`Khau hieu : ${ks.site.moTa || '(trong)'}`);
ghi(`Giao dien : ${ks.giaoDien ? ks.giaoDien.ten + ' ' + (ks.giaoDien.phienBan || '') : '(khong doc duoc)'}`);

ghi('\n--- Dang co bao nhieu ---');
const nhan = { baiViet: 'Bai viet (blog)', trang: 'Trang', anh: 'Anh trong Thu vien', sanPham: 'San pham' };
for (const [k, v] of Object.entries(ks.dem)) {
  ghi(`${(nhan[k] || k).padEnd(20)}: ${v === null ? '(khong doc duoc)' : v}`);
}

ghi('\n--- Cong cu dang cai ---');
const ten = {
  wooCommerce: 'WooCommerce (ban hang)', yoastSeo: 'Yoast SEO', rankMath: 'Rank Math SEO',
  elementor: 'Elementor (dung trang)', jetpack: 'Jetpack', contactForm7: 'Contact Form 7',
};
for (const [k, v] of Object.entries(ks.nhanDien)) ghi(`${(ten[k] || k).padEnd(26)}: ${v ? '✅ CO' : '— khong'}`);

ghi('\n--- Cac loai noi dung dang tao duoc ---');
for (const t of ks.loaiNoiDung) ghi(`  ${t.slug.padEnd(16)} ${typeof t.ten === 'string' ? t.ten : ''}`);

if (ks.chuyenMuc.length) {
  ghi('\n--- Chuyen muc blog (nhieu bai nhat truoc) ---');
  for (const c of ks.chuyenMuc.slice(0, 15)) ghi(`  ${String(c.soBai).padStart(4)} bai  ${c.ten}  (slug: ${c.slug})`);
} else {
  ghi('\n--- Chuyen muc blog: chua co cai nao ---');
}

if (ks.the.length) {
  ghi('\n--- The (tag) dang dung ---');
  ghi('  ' + ks.the.slice(0, 25).map(t => t.ten).join(', '));
}

// ---- Ket luan de biet lam gi tiep ----
ghi('\n=== KET LUAN ===');
if (!tk.canEditPosts) {
  ghi('❌ Tai khoan nay KHONG dang duoc bai. Can tai khoan vai tro Author tro len.');
} else {
  ghi('✅ Dang duoc bai viet blog.');
}
if (ks.nhanDien.wooCommerce) {
  ghi('✅ Site co WooCommerce -> dang san pham bang API san pham chuan.');
} else {
  const coLoaiSanPham = ks.loaiNoiDung.find(t => /product|san.?pham|shop/i.test(t.slug));
  ghi(coLoaiSanPham
    ? `⚠️  Khong co WooCommerce, nhung co loai noi dung "${coLoaiSanPham.slug}" — co the dung de dang san pham.`
    : '⚠️  Khong co WooCommerce va khong thay loai noi dung nao danh cho san pham.');
}

// ---- Luu file de gui lai ----
const fileRa = path.join(thuMucGoc, 'khao-sat.txt');
fs.writeFileSync(fileRa, dong.join('\n') + '\n\n--- DU LIEU THO ---\n' + JSON.stringify(ks, null, 1));
ghi(`\n📄 Da luu vao: ${fileRa}`);
ghi('   Gui file nay cho nguoi ho tro de ho biet site cua ban co gi.\n');
