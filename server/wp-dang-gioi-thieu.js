// Tai anh tu mot thu muc tren may len WordPress roi tao/cap nhat trang gioi thieu.
//
// Chay tren MAY CUA BAN (may co thu muc anh va vao duoc website):
//   node wp-dang-gioi-thieu.js --anh "F:\Anh cua toi"
//
// Cac lua chon:
//   --anh <thu-muc>   Thu muc chua anh (bo qua neu khong muon dang anh)
//   --bai <file>      File noi dung, mac dinh gioi-thieu.md
//   --slug <ten>      Duong dan trang, mac dinh toi-la-ai
//   --tieu-de <chu>   Tieu de trang (mac dinh lay dong "# " dau tien trong file bai)
//   --dang            Dang cong khai luon. KHONG co thi luu NHAP de ban xem truoc.
//   --thu             Chi xem se lam gi, khong dong den website
import './load-env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as wp from './wordpress.js';
import { docSangKhoi, khoiThuVienAnh } from './noi-dung.js';

// Windows: phai dung fileURLToPath, khong duoc lay .pathname (se ra "/C:/..." sai duong dan)
const thuMucGoc = path.dirname(fileURLToPath(import.meta.url));

// ---- Doc tham so dong lenh ----
const argv = process.argv.slice(2);
function tham(ten, mac) {
  const i = argv.indexOf('--' + ten);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : mac;
}
const co = ten => argv.includes('--' + ten);

const thuMucAnh = tham('anh', '');
const fileBai = tham('bai', path.join(thuMucGoc, 'gioi-thieu.md'));
const slug = tham('slug', 'toi-la-ai');
const dangCongKhai = co('dang');
const chayThu = co('thu');

const thoat = msg => { console.error('\n❌ ' + msg + '\n'); process.exit(1); };

// ---- Doc noi dung bai ----
if (!fs.existsSync(fileBai)) thoat(`Khong tim thay file noi dung: ${fileBai}`);
let vanBan = fs.readFileSync(fileBai, 'utf8');

// Canh bao neu con cho trong chua dien
const conTrong = vanBan.match(/\{\{[^}]+\}\}/g);
if (conTrong) {
  console.error('\n⚠️  File noi dung con ' + conTrong.length + ' cho trong chua dien:');
  for (const c of [...new Set(conTrong)]) console.error('   ' + c);
  console.error('\nHay mo ' + fileBai + ' dien vao roi chay lai.');
  console.error('(Neu co tinh de trong, them --bo-qua-cho-trong)\n');
  // Chay thu thi cu cho xem ke hoach, chua dong den website nen khong hai gi
  if (!co('bo-qua-cho-trong') && !chayThu) process.exit(1);
}

// Tieu de: lay tu tham so, hoac dong "# " dau tien
let tieuDe = tham('tieu-de', '');
if (!tieuDe) {
  const m = vanBan.match(/^#\s+(.+)$/m);
  tieuDe = m ? m[1].trim() : 'Tôi là ai';
}
vanBan = vanBan.replace(/^#\s+.+$/m, '').trim(); // bo dong tieu de khoi than bai

// ---- Tim anh trong thu muc ----
let dsAnh = [];
if (thuMucAnh) {
  if (!fs.existsSync(thuMucAnh)) {
    thoat(`Khong tim thay thu muc anh: ${thuMucAnh}\n   Tren Windows nho boc trong dau nhay: --anh "F:\\Anh cua toi"`);
  }
  if (!fs.statSync(thuMucAnh).isDirectory()) thoat(`"${thuMucAnh}" khong phai thu muc.`);
  dsAnh = fs.readdirSync(thuMucAnh)
    .filter(f => wp.ANH_HOP_LE.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }))
    .map(f => ({ ten: f, duong: path.join(thuMucAnh, f), co: fs.statSync(path.join(thuMucAnh, f)).size }));

  if (!dsAnh.length) {
    console.error(`\n⚠️  Thu muc "${thuMucAnh}" khong co anh nao hop le.`);
    console.error(`   Chi nhan: ${wp.ANH_HOP_LE.join(', ')}\n`);
  }
}

const mb = n => (n / 1024 / 1024).toFixed(1) + ' MB';

console.log('\n=== DANG TRANG GIOI THIEU LEN WORDPRESS ===');
console.log(`Website   : ${wp.wpStatus().url || '(chua cau hinh WP_URL)'}`);
console.log(`Tieu de   : ${tieuDe}`);
console.log(`Duong dan : /${slug}`);
console.log(`Noi dung  : ${fileBai} (${vanBan.length} ky tu)`);
console.log(`Anh       : ${dsAnh.length ? dsAnh.length + ' tam (' + mb(dsAnh.reduce((s, a) => s + a.co, 0)) + ')' : 'khong dang anh'}`);
console.log(`Trang thai: ${dangCongKhai ? '🔴 DANG CONG KHAI ngay' : '🟢 luu NHAP de ban xem truoc'}`);

if (chayThu) {
  console.log('\n--- CHAY THU, khong dong den website ---');
  for (const a of dsAnh) console.log(`  se tai: ${a.ten} (${mb(a.co)}) -> ${wp.tenFileAscii(a.ten)}`);
  console.log('');
  process.exit(0);
}

// ---- Tai anh len ----
const daTai = [];
if (dsAnh.length) {
  console.log('\n--- Dang tai anh len Thu vien ---');
  for (const [i, a] of dsAnh.entries()) {
    const nhan = `[${i + 1}/${dsAnh.length}] ${a.ten}`;
    try {
      const alt = `${tieuDe} — ảnh ${i + 1}`;
      const r = await wp.uploadMedia(fs.readFileSync(a.duong), a.ten, { title: `${tieuDe} ${i + 1}`, alt });
      daTai.push({ ...r, alt });
      console.log(`  ✅ ${nhan} (${mb(a.co)})`);
    } catch (err) {
      console.log(`  ❌ ${nhan}: ${err.message}`);
    }
  }
  if (!daTai.length && dsAnh.length) {
    thoat('Khong tai duoc tam anh nao. Xem loi ben tren roi thu lai.');
  }
}

// ---- Dung noi dung trang theo dinh dang khoi cua WordPress ----
const { noiDung, soAnhDaDung } = docSangKhoi(vanBan, daTai);
// Anh chua duoc [ANH] goi toi thi gom thanh thu vien anh cuoi trang
const noiDungTrang = [noiDung, khoiThuVienAnh(daTai.slice(soAnhDaDung))].filter(Boolean).join('\n\n');

// ---- Tao / cap nhat trang ----
console.log('\n--- Dang tao trang ---');
let trang;
try {
  trang = await wp.taoHoacSuaTrang({
    slug,
    title: tieuDe,
    content: noiDungTrang,
    status: dangCongKhai ? 'publish' : 'draft',
  });
} catch (err) {
  thoat(err.message);
}

console.log(`  ✅ ${trang.daCo ? 'Da cap nhat trang co san' : 'Da tao trang moi'} (ID ${trang.id}, trang thai: ${trang.status})`);
console.log(`\n📄 Xem truoc : ${trang.linkXem}`);
console.log(`✏️  Sua trang  : ${trang.linkSua}`);

if (!dangCongKhai) {
  console.log('\n⚠️  Trang dang o dang NHAP — khach chua thay duoc.');
  console.log('   Xem thay on roi thi bam Dang (Publish) trong WordPress,');
  console.log('   hoac chay lai lenh nay kem --dang\n');
} else {
  console.log('\n✅ Trang da cong khai.');
  console.log('   Nho them vao menu: Giao dien > Menu > them trang nay vao menu chinh.\n');
}
