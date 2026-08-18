// Dang bai viet blog len WordPress tu file .md tren may.
//
//   node wp-dang-bai.js --bai bai-viet\qua-tet-2026.md
//   node wp-dang-bai.js --thu-muc bai-viet          (dang ca thu muc, moi file 1 bai)
//
// Cac lua chon:
//   --bai <file>        Mot file .md
//   --thu-muc <duong>   Ca thu muc .md, moi file thanh 1 bai
//   --anh <thu-muc>     Thu muc anh de dung cho [ANH] va "Anh bia:"
//   --dang              Dang cong khai ngay. KHONG co thi luu NHAP.
//   --lich "2026-09-01 08:00"   Hen gio dang (tu dong bat che do hen gio)
//   --thu               Chi xem se lam gi, khong dong den website
import './load-env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as wp from './wordpress.js';
import { docSangKhoi, khoiThuVienAnh } from './noi-dung.js';

const thuMucGoc = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const tham = (t, m) => { const i = argv.indexOf('--' + t); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : m; };
const co = t => argv.includes('--' + t);
const thoat = m => { console.error('\n❌ ' + m + '\n'); process.exit(1); };

const fileBai = tham('bai', '');
const thuMucBai = tham('thu-muc', '');
const thuMucAnh = tham('anh', '');
const dangCongKhai = co('dang');
const lich = tham('lich', '');
const chayThu = co('thu');

if (!fileBai && !thuMucBai) thoat('Can chi ro bai viet:\n   node wp-dang-bai.js --bai duong-dan.md\n   node wp-dang-bai.js --thu-muc thu-muc-chua-bai');

// ---- Gom danh sach bai can dang ----
let dsBai = [];
if (fileBai) {
  if (!fs.existsSync(fileBai)) thoat(`Khong tim thay file: ${fileBai}`);
  dsBai = [fileBai];
} else {
  if (!fs.existsSync(thuMucBai)) thoat(`Khong tim thay thu muc: ${thuMucBai}`);
  dsBai = fs.readdirSync(thuMucBai)
    .filter(f => f.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }))
    .map(f => path.join(thuMucBai, f));
  if (!dsBai.length) thoat(`Thu muc "${thuMucBai}" khong co file .md nao.`);
}

// ---- Doc 1 file bai: tach tieu de, thong tin, than bai ----
const KHOA = { 'chuyên mục': 'chuyenMuc', 'chuyen muc': 'chuyenMuc', 'thẻ': 'the', 'the': 'the',
  'mô tả': 'moTa', 'mo ta': 'moTa', 'ảnh bìa': 'anhBia', 'anh bia': 'anhBia', 'đường dẫn': 'slug', 'duong dan': 'slug', 'ảnh': 'anh', 'anh': 'anh' };

function docBai(duong) {
  let v = fs.readFileSync(duong, 'utf8');
  const mTieuDe = v.match(/^#\s+(.+)$/m);
  const tieuDe = mTieuDe ? mTieuDe[1].trim() : path.basename(duong, '.md');
  v = v.replace(/^#\s+.+$/m, '').trim();

  // Khoi thong tin = doan dau tien ma MOI dong deu dang "Khoa: gia tri"
  const doan = v.split(/\n\s*\n/);
  const tt = {};
  if (doan.length) {
    const dong = doan[0].split('\n').map(s => s.trim()).filter(Boolean);
    const hop = dong.length && dong.every(l => {
      const m = l.match(/^([^:]{1,20}):\s*(.+)$/);
      return m && KHOA[m[1].trim().toLowerCase()];
    });
    if (hop) {
      for (const l of dong) {
        const m = l.match(/^([^:]{1,20}):\s*(.+)$/);
        tt[KHOA[m[1].trim().toLowerCase()]] = m[2].trim();
      }
      doan.shift();
    }
  }
  return { tieuDe, than: doan.join('\n\n').trim(), tt };
}

// Bo dau tieng Viet -> duong dan than thien
function taoSlug(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

// ---- Trang thai dang ----
let trangThai = dangCongKhai ? 'publish' : 'draft';
let ngayDang;
if (lich) {
  const d = new Date(lich.replace(' ', 'T'));
  if (isNaN(d.getTime())) thoat(`Gio hen khong hop le: "${lich}". Dung dang: --lich "2026-09-01 08:00"`);
  ngayDang = lich.replace(' ', 'T').slice(0, 19);
  trangThai = 'future';
}

console.log('\n=== DANG BAI VIET LEN WORDPRESS ===');
console.log(`Website   : ${wp.wpStatus().url || '(chua cau hinh WP_URL)'}`);
console.log(`So bai    : ${dsBai.length}`);
console.log(`Trang thai: ${trangThai === 'publish' ? '🔴 CONG KHAI ngay' : trangThai === 'future' ? `🕐 HEN GIO ${lich}` : '🟢 luu NHAP'}`);

// ---- Anh dung chung ----
let anhTrongThuMuc = [];
if (thuMucAnh) {
  if (!fs.existsSync(thuMucAnh)) thoat(`Khong tim thay thu muc anh: ${thuMucAnh}`);
  anhTrongThuMuc = fs.readdirSync(thuMucAnh)
    .filter(f => wp.ANH_HOP_LE.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  console.log(`Anh       : ${anhTrongThuMuc.length} tam trong "${thuMucAnh}"`);
}

if (chayThu) {
  console.log('\n--- CHAY THU, khong dong den website ---');
  for (const d of dsBai) {
    const { tieuDe, than, tt } = docBai(d);
    console.log(`\n  ${path.basename(d)}`);
    console.log(`    Tieu de   : ${tieuDe}`);
    console.log(`    Duong dan : /${tt.slug || taoSlug(tieuDe)}`);
    console.log(`    Chuyen muc: ${tt.chuyenMuc || '(khong)'}`);
    console.log(`    The       : ${tt.the || '(khong)'}`);
    console.log(`    Anh bia   : ${tt.anhBia || '(khong)'}`);
    console.log(`    Do dai    : ${than.length} ky tu`);
    const conTrong = than.match(/\{\{[^}]+\}\}/g);
    if (conTrong) console.log(`    ⚠️  con ${conTrong.length} cho trong chua dien`);
  }
  console.log('');
  process.exit(0);
}

// ---- Tai anh (chi tai 1 lan, dung lai cho moi bai) ----
const kho = new Map();
async function layAnh(ten) {
  if (kho.has(ten)) return kho.get(ten);
  const duong = path.join(thuMucAnh, ten);
  if (!thuMucAnh || !fs.existsSync(duong)) return null;
  try {
    const r = await wp.uploadMedia(fs.readFileSync(duong), ten, { alt: path.basename(ten, path.extname(ten)) });
    kho.set(ten, r);
    console.log(`  ⬆️  da tai anh: ${ten}`);
    return r;
  } catch (err) {
    console.log(`  ❌ khong tai duoc anh ${ten}: ${err.message}`);
    return null;
  }
}

// ---- Dang tung bai ----
let thanhCong = 0, thatBai = 0;

for (const [i, duong] of dsBai.entries()) {
  const { tieuDe, than, tt } = docBai(duong);
  const slug = tt.slug || taoSlug(tieuDe);
  console.log(`\n[${i + 1}/${dsBai.length}] ${tieuDe}`);

  const conTrong = than.match(/\{\{[^}]+\}\}/g);
  if (conTrong && !co('bo-qua-cho-trong')) {
    console.log(`  ⏭️  BO QUA — con ${conTrong.length} cho trong chua dien ({{...}})`);
    thatBai++;
    continue;
  }

  // Chon anh cho than bai, theo thu tu uu tien:
  //   1. Dong "Anh: a.jpg, b.jpg" trong bai   2. Ten file bat dau bang duong dan bai
  //   3. Neu chi dang 1 bai thi dung ca thu muc anh
  let tenAnhBai = [];
  if (tt.anh) {
    tenAnhBai = tt.anh.split(',').map(x => x.trim()).filter(Boolean);
    const thieu = tenAnhBai.filter(x => !anhTrongThuMuc.includes(x));
    if (thieu.length) console.log(`  ⚠️  khong thay trong thu muc anh: ${thieu.join(', ')}`);
    tenAnhBai = tenAnhBai.filter(x => anhTrongThuMuc.includes(x));
  } else {
    const theoTen = anhTrongThuMuc.filter(a => a.toLowerCase().startsWith(slug.slice(0, 12)));
    tenAnhBai = theoTen.length ? theoTen : (dsBai.length === 1 ? anhTrongThuMuc : []);
  }

  const soCho = (than.match(/^\[ANH\]$/gm) || []).length;
  if (soCho > tenAnhBai.length) {
    console.log(`  ⚠️  bai co ${soCho} cho [ANH] nhung chi co ${tenAnhBai.length} anh — cho thua se bi bo trong.`);
    if (!tt.anh) console.log('     Them dong "Anh: ten-file.jpg" vao dau bai de chi ro anh can dung.');
  }

  const anhBai = [];
  for (const t of tenAnhBai) {
    const r = await layAnh(t);
    if (r) anhBai.push({ ...r, alt: tieuDe });
  }

  let idAnhBia;
  if (tt.anhBia) {
    const r = await layAnh(tt.anhBia);
    if (r) idAnhBia = r.id;
    else console.log(`  ⚠️  khong thay anh bia "${tt.anhBia}" trong thu muc anh`);
  }

  const { noiDung, soAnhDaDung } = docSangKhoi(than, anhBai);
  const noiDungBai = [noiDung, khoiThuVienAnh(anhBai.slice(soAnhDaDung))].filter(Boolean).join('\n\n');

  try {
    const b = await wp.taoHoacSuaBaiViet({
      slug, title: tieuDe, content: noiDungBai,
      excerpt: tt.moTa,
      status: trangThai, ngayDang,
      chuyenMuc: tt.chuyenMuc ? tt.chuyenMuc.split(',').map(s => s.trim()).filter(Boolean) : [],
      the: tt.the ? tt.the.split(',').map(s => s.trim()).filter(Boolean) : [],
      anhBia: idAnhBia,
    });
    console.log(`  ✅ ${b.daCo ? 'da cap nhat' : 'da tao moi'} (ID ${b.id}, ${b.status})`);
    console.log(`     ${b.linkXem}`);
    thanhCong++;
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
    thatBai++;
  }
}

console.log(`\n=== XONG: ${thanhCong} bai thanh cong, ${thatBai} bai khong dang duoc ===`);
if (trangThai === 'draft') console.log('Bai dang o dang NHAP — vao WordPress xem roi bam Dang (Publish).');
console.log('');
process.exit(thatBai ? 1 : 0);
