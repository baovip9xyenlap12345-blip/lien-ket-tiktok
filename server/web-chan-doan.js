// Chan doan trang web tu may cua ban: tai trang ve, soi menu, kiem tra file CSS/JS
// co tai duoc khong, so sanh ban dien thoai voi ban may tinh.
// KHONG can mat khau WordPress - chi doc trang cong khai.
//
//   node web-chan-doan.js
//   node web-chan-doan.js --url https://buihuubao.vn
import './load-env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const thuMucGoc = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const tham = (t, m) => { const i = argv.indexOf('--' + t); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : m; };

const url = (tham('url', process.env.WP_URL) || '').trim().replace(/\/+$/, '');
if (!url) {
  console.error('\n❌ Chua biet dia chi web. Dung:  node web-chan-doan.js --url https://ten-mien.com\n');
  process.exit(1);
}

const UA_DT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const UA_MT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const bao = [];
const ghi = s => { console.log(s); bao.push(s); };

async function tai(u, ua, chiHeader = false) {
  const ac = new AbortController();
  const h = setTimeout(() => ac.abort(), 30000);
  try {
    const r = await fetch(u, { headers: { 'User-Agent': ua, Accept: '*/*' }, signal: ac.signal, redirect: 'follow' });
    const noiDung = chiHeader ? '' : await r.text();
    return { ok: r.ok, ma: r.status, noiDung, co: chiHeader ? +(r.headers.get('content-length') || 0) : noiDung.length };
  } catch (e) {
    return { ok: false, ma: 0, loi: e.name === 'AbortError' ? 'qua lau khong phan hoi' : (e.cause?.code || e.message), noiDung: '', co: 0 };
  } finally { clearTimeout(h); }
}

ghi('\n=== CHAN DOAN GIAO DIEN DIEN THOAI ===');
ghi(`Dia chi: ${url}\n`);

// ---- 1. Tai trang bang 2 kieu may ----
ghi('--- 1. Tai trang chu ---');
const [dt, mt] = await Promise.all([tai(url, UA_DT), tai(url, UA_MT)]);

if (!dt.ok) {
  ghi(`❌ Khong tai duoc trang (${dt.ma || dt.loi}). Kiem tra lai dia chi.`);
  process.exit(1);
}
ghi(`✅ Ban DIEN THOAI: ${dt.noiDung.length.toLocaleString('vi-VN')} ky tu`);
ghi(`✅ Ban MAY TINH  : ${mt.noiDung.length.toLocaleString('vi-VN')} ky tu`);

const chenh = Math.abs(dt.noiDung.length - mt.noiDung.length);
const tyLe = chenh / Math.max(dt.noiDung.length, 1);
if (tyLe > 0.02) {
  ghi(`⚠️  Hai ban KHAC NHAU ${(tyLe * 100).toFixed(1)}% — may chu dang tra ma khac nhau cho dien thoai.`);
  ghi('   Thuong do plugin cache luu rieng ban mobile. Neu ban mobile hong thi XOA CACHE la het.');
} else {
  ghi('   Hai ban gan nhu giong nhau — khong phai do cache rieng cho mobile.');
}

const html = dt.noiDung;

// ---- 2. Kiem tra file CSS/JS co tai duoc khong ----
ghi('\n--- 2. Kiem tra file CSS / JS ---');
const tuyetDoi = u => { try { return new URL(u, url).href; } catch { return null; } };

const css = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)]
  .map(m => (m[0].match(/href=["']([^"']+)["']/i) || [])[1]).filter(Boolean).map(tuyetDoi).filter(Boolean);
const js = [...html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(m => tuyetDoi(m[1])).filter(Boolean);

ghi(`Trang nap ${css.length} file CSS va ${js.length} file JS.`);

const hong = [];
for (const [nhan, ds] of [['CSS', css], ['JS', js]]) {
  for (const u of ds) {
    const r = await tai(u, UA_DT);
    const ten = u.split('/').pop().split('?')[0];
    if (!r.ok) { hong.push({ nhan, u, ma: r.ma || r.loi }); ghi(`  ❌ ${nhan} HONG (${r.ma || r.loi}): ${ten}`); }
    else if (r.co < 10) { hong.push({ nhan, u, ma: 'file rong' }); ghi(`  ⚠️  ${nhan} RONG: ${ten}`); }
  }
}
if (!hong.length) ghi('  ✅ Tat ca file CSS/JS deu tai duoc binh thuong.');
else ghi(`\n  🔴 CO ${hong.length} FILE HONG — rat co the day chinh la nguyen nhan.`);

// ---- 3. Soi nut menu ----
ghi('\n--- 3. Nut menu tren dien thoai ---');
const MAU_NUT = /<(button|a|div|span)[^>]*(menu-toggle|nav-toggle|hamburger|menu-btn|toggle-menu|mobile-menu|navbar-toggle|menu-icon|offcanvas)[^>]*>/gi;
const nut = [...html.matchAll(MAU_NUT)].map(m => m[0]);

if (!nut.length) {
  ghi('⚠️  Khong tim thay nut menu nao trong ma trang.');
  ghi('   Co the menu duoc tao bang JavaScript sau khi trang tai xong — truong hop nay');
  ghi('   neu file JS hong thi nut se khong bao gio xuat hien / khong bam duoc.');
} else {
  ghi(`Tim thay ${nut.length} phan tu lien quan den nut menu:`);
  for (const n of nut.slice(0, 6)) {
    ghi('  ' + n.replace(/\s+/g, ' ').slice(0, 150));
    if (/aria-expanded=["']true["']/i.test(n)) {
      ghi('    🔴 aria-expanded="true" — nut dang o trang thai DA MO ngay khi vua tai trang.');
      ghi('       Day dung la trieu chung "hien dau X thay vi 3 gach".');
    }
    if (/aria-hidden=["']true["']/i.test(n)) ghi('    ⚠️  aria-hidden="true" — bi an khoi trinh doc man hinh.');
  }
}

// ---- 4. Lop phu chan tay bam ----
ghi('\n--- 4. Tim lop phu co the chan tay bam ---');
const MAU_PHU = /<(div|nav|aside)[^>]*(overlay|backdrop|offcanvas|off-canvas|drawer|menu-wrap|nav-wrap|modal)[^>]*>/gi;
const phu = [...html.matchAll(MAU_PHU)].map(m => m[0]);
if (phu.length) {
  ghi(`Co ${phu.length} lop kieu overlay/offcanvas. Neu lop nay khong duoc an dung cach,`);
  ghi('no phu len ca trang va nuot moi cu bam — dung trieu chung "bam khong duoc".');
  for (const p of phu.slice(0, 5)) ghi('  ' + p.replace(/\s+/g, ' ').slice(0, 150));
} else {
  ghi('  Khong thay lop overlay/offcanvas ro rang trong ma trang.');
}

// ---- 5. Nhan dien plugin cache / toi uu ----
ghi('\n--- 5. Plugin dang can thiep vao CSS/JS ---');
const dauHieu = {
  'LiteSpeed Cache': /litespeed|lscache/i, 'WP Rocket': /wp-rocket|rocket-loader/i,
  'Autoptimize': /autoptimize/i, 'W3 Total Cache': /w3tc|w3-total/i,
  'WP Super Cache': /wp-super-cache/i, 'Jetpack Boost': /jetpack-boost/i,
  'Cloudflare': /cloudflare|cdn-cgi/i, 'Elementor': /elementor/i, 'WPBakery': /js_composer/i,
};
const thay = Object.entries(dauHieu).filter(([, re]) => re.test(html)).map(([t]) => t);
if (thay.length) {
  ghi('  ' + thay.join(', '));
  if (thay.some(t => /Cache|Rocket|Autoptimize|Boost/i.test(t))) {
    ghi('  👉 Co plugin gop/nen file. Viec DAU TIEN nen lam la XOA TOAN BO CACHE,');
    ghi('     va tam TAT muc "gop CSS/JS" (Combine/Minify) roi thu lai.');
  }
} else ghi('  Khong nhan ra plugin cache/toi uu nao.');

// ---- 6. Luu lai de gui di ----
const thuMuc = path.join(thuMucGoc, 'chan-doan');
fs.mkdirSync(thuMuc, { recursive: true });
fs.writeFileSync(path.join(thuMuc, 'trang-dien-thoai.html'), dt.noiDung);
fs.writeFileSync(path.join(thuMuc, 'trang-may-tinh.html'), mt.noiDung);
fs.writeFileSync(path.join(thuMuc, 'bao-cao.txt'), bao.join('\n'));

ghi('\n=== DA LUU ===');
ghi(`  ${path.join(thuMuc, 'bao-cao.txt')}`);
ghi(`  ${path.join(thuMuc, 'trang-dien-thoai.html')}`);
ghi(`  ${path.join(thuMuc, 'trang-may-tinh.html')}`);
ghi('\nGui 3 file nay cho nguoi ho tro de ho chi dung dong code dang hong.\n');
