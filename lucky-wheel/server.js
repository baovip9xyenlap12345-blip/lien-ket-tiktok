/**
 * VÒNG QUAY MAY MẮN - Nền tảng khuyến mãi giảm giá đa cửa hàng (SaaS)
 *
 * 3 cấp tài khoản:
 *  - Quản trị viên (admin): quản lý toàn bộ chủ cửa hàng + toàn bộ dữ liệu khách hàng
 *  - Chủ cửa hàng (owner): cài đặt vòng quay, phần quà, tỷ lệ trúng, quản lý khách của mình
 *  - Khách hàng: nhập tên/SĐT/email tại trang public để quay và nhận mã giảm giá
 */
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const express = require('express');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ------------------------------------------------------------------ Database
const db = new DatabaseSync(path.join(DATA_DIR, 'app.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    role          TEXT NOT NULL DEFAULT 'owner',      -- 'admin' | 'owner'
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    phone         TEXT,
    password_hash TEXT NOT NULL,
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS shops (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id           INTEGER NOT NULL REFERENCES users(id),
    name               TEXT NOT NULL,
    slug               TEXT NOT NULL UNIQUE,
    description        TEXT DEFAULT '',
    spin_limit_per_day INTEGER NOT NULL DEFAULT 1,
    require_email      INTEGER NOT NULL DEFAULT 1,
    active             INTEGER NOT NULL DEFAULT 1,
    created_at         TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS prizes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id     INTEGER NOT NULL REFERENCES shops(id),
    label       TEXT NOT NULL,                        -- ví dụ: "Giảm 10%", "1 ly cà phê miễn phí"
    coupon_code TEXT DEFAULT '',                      -- mã giảm giá khách nhận được
    win_rate    REAL NOT NULL DEFAULT 10,             -- tỷ lệ trúng (%)
    quantity    INTEGER NOT NULL DEFAULT -1,          -- -1 = không giới hạn
    remaining   INTEGER NOT NULL DEFAULT -1,
    color       TEXT DEFAULT '',
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS customers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id    INTEGER NOT NULL REFERENCES shops(id),
    name       TEXT NOT NULL,
    phone      TEXT DEFAULT '',                       -- khách chỉ cần SĐT HOẶC email
    email      TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS spins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id     INTEGER NOT NULL REFERENCES shops(id),
    customer_id INTEGER,                              -- NULL = quay xong chưa nhận mã
    prize_id    INTEGER,                              -- NULL = không trúng
    prize_label TEXT NOT NULL,
    coupon_code TEXT DEFAULT '',
    claim_token TEXT DEFAULT '',                      -- phiếu nhận mã dùng 1 lần
    claimed     INTEGER NOT NULL DEFAULT 0,           -- 1 = khách đã nhập thông tin nhận mã
    device_id   TEXT DEFAULT '',                      -- giới hạn lượt quay theo thiết bị
    email_sent  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// Nâng cấp CSDL phiên bản cũ (khách bắt buộc SĐT, quay sau khi nhập thông tin) lên luồng mới
const custSql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='customers'`).get();
if (custSql && custSql.sql.includes('UNIQUE(shop_id, phone)')) {
  db.exec(`
    CREATE TABLE customers_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    INSERT INTO customers_new (id,shop_id,name,phone,email,created_at)
      SELECT id,shop_id,name,phone,email,created_at FROM customers;
    DROP TABLE customers;
    ALTER TABLE customers_new RENAME TO customers;
  `);
  console.log('>> Đã nâng cấp bảng customers lên luồng mới (SĐT hoặc email).');
}
const spinSql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='spins'`).get();
if (spinSql && spinSql.sql.includes('customer_id INTEGER NOT NULL')) {
  const hasEmailSent = db.prepare(`SELECT COUNT(*) n FROM pragma_table_info('spins') WHERE name='email_sent'`).get().n > 0;
  db.exec(`
    CREATE TABLE spins_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      customer_id INTEGER,
      prize_id INTEGER,
      prize_label TEXT NOT NULL,
      coupon_code TEXT DEFAULT '',
      claim_token TEXT DEFAULT '',
      claimed INTEGER NOT NULL DEFAULT 0,
      device_id TEXT DEFAULT '',
      email_sent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    INSERT INTO spins_new (id,shop_id,customer_id,prize_id,prize_label,coupon_code,claimed,email_sent,created_at)
      SELECT id,shop_id,customer_id,prize_id,prize_label,coupon_code,1,${hasEmailSent ? 'email_sent' : '0'},created_at FROM spins;
    DROP TABLE spins;
    ALTER TABLE spins_new RENAME TO spins;
  `);
  console.log('>> Đã nâng cấp bảng spins lên luồng mới (quay trước, nhận mã sau).');
}

// Tạo tài khoản quản trị viên lần đầu (đổi mật khẩu qua biến môi trường!)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@vongquay.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
if (!db.prepare(`SELECT id FROM users WHERE role='admin' LIMIT 1`).get()) {
  db.prepare(`INSERT INTO users (role,name,email,password_hash) VALUES ('admin','Quản trị viên',?,?)`)
    .run(ADMIN_EMAIL, bcrypt.hashSync(ADMIN_PASSWORD, 10));
  console.log(`>> Đã tạo tài khoản QUẢN TRỊ VIÊN: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log('>> CẢNH BÁO: đang dùng mật khẩu mặc định. Hãy đặt biến môi trường ADMIN_EMAIL, ADMIN_PASSWORD!');
  }
}

// Nâng cấp CSDL: mã giảm giá dùng 1 lần (đánh dấu đã sử dụng khi khách mua)
try { db.exec(`ALTER TABLE spins ADD COLUMN redeemed INTEGER NOT NULL DEFAULT 0`); } catch (e) { /* cột đã tồn tại */ }
try { db.exec(`ALTER TABLE spins ADD COLUMN redeemed_at TEXT DEFAULT ''`); } catch (e) { /* cột đã tồn tại */ }

// Chế độ quay: 'free' = ai vào cũng quay được (giới hạn lượt/ngày), 'order' = phải có mã quay theo đơn hàng
try { db.exec(`ALTER TABLE shops ADD COLUMN spin_mode TEXT NOT NULL DEFAULT 'free'`); } catch (e) { /* cột đã tồn tại */ }

// Màu chủ đạo trang vòng quay — mỗi quán tự chọn cho hợp thương hiệu
try { db.exec(`ALTER TABLE shops ADD COLUMN theme_color TEXT NOT NULL DEFAULT '#f59e0b'`); } catch (e) { /* cột đã tồn tại */ }

// Link nhóm Zalo riêng của từng quán — hiện sau khi khách quay để kéo thành viên vào nhóm
try { db.exec(`ALTER TABLE shops ADD COLUMN zalo_link TEXT NOT NULL DEFAULT ''`); } catch (e) { /* cột đã tồn tại */ }

// Mã đơn hàng của shop: mỗi mã đơn tương ứng đúng 1 mã quay thưởng (app tự sinh)
db.exec(`
  CREATE TABLE IF NOT EXISTS order_codes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id    INTEGER NOT NULL REFERENCES shops(id),
    order_code TEXT NOT NULL,                        -- mã đơn hàng do shop nhập
    spin_code  TEXT NOT NULL,                        -- mã quay thưởng app tự sinh
    used       INTEGER NOT NULL DEFAULT 0,           -- 1 = khách đã dùng để quay
    used_at    TEXT DEFAULT '',
    spin_id    INTEGER,                              -- lượt quay tương ứng
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE(shop_id, order_code)
  );
`);

// Sinh mã giảm giá RIÊNG cho từng lượt trúng (VD: GIAM10-X7K2P) — nhờ vậy mỗi mã chỉ dùng được 1 lần.
// Bỏ các ký tự dễ nhầm lẫn (O/0, I/1/L) để nhân viên nhập lại không sai.
function genUniqueCode(shopId, prefix) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (;;) {
    let s = '';
    for (let i = 0; i < 5; i++) s += chars[crypto.randomInt(chars.length)];
    const code = (String(prefix || '').trim() ? String(prefix).trim().toUpperCase() : 'QUA') + '-' + s;
    if (!db.prepare(`SELECT id FROM spins WHERE shop_id=? AND coupon_code=?`).get(shopId, code)) return code;
  }
}

// Sinh mã quay thưởng cho từng mã đơn hàng (6 ký tự, không trùng trong shop)
function genSpinCode(shopId) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (;;) {
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[crypto.randomInt(chars.length)];
    if (!db.prepare(`SELECT id FROM order_codes WHERE shop_id=? AND spin_code=?`).get(shopId, s)) return s;
  }
}

// ------------------------------------------------------------------ Gửi email mã giảm giá
// Cấu hình SMTP qua biến môi trường. Không cấu hình = tính năng email tắt, app vẫn chạy bình thường.
// Gmail: SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_USER=ban@gmail.com SMTP_PASS=<mật khẩu ứng dụng>
let mailer = null;
if (process.env.SMTP_JSON === '1') {
  mailer = nodemailer.createTransport({ jsonTransport: true }); // chế độ thử nghiệm: chỉ in email ra log
  console.log('>> Email: đang chạy chế độ THỬ NGHIỆM (SMTP_JSON=1), email chỉ in ra log.');
} else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    secure: process.env.SMTP_SECURE !== 'false', // cổng 465 = true; cổng 587 đặt SMTP_SECURE=false
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  console.log(`>> Email: đã bật gửi mã giảm giá tự động qua ${process.env.SMTP_HOST}`);
} else {
  console.log('>> Email: chưa cấu hình SMTP nên tính năng gửi mã qua email đang TẮT. Xem README để bật.');
}
const MAIL_FROM = process.env.SMTP_FROM || (process.env.SMTP_USER ? `"Vòng Quay May Mắn" <${process.env.SMTP_USER}>` : 'vongquay@localhost');

function couponEmailHtml({ shopName, customerName, prize, code, spinLimit, zaloLink }) {
  const zaloBtn = zaloLink && /^https:\/\/\S+$/i.test(zaloLink)
    ? `<div style="margin-top:18px;"><a href="${esc(zaloLink)}" style="display:inline-block;background:#0068ff;color:#fff;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;">💬 Tham gia nhóm Zalo của ${esc(shopName)} — nhận thêm quà tặng!</a></div>`
    : '';
  return `
  <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:14px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:26px;text-align:center;">
      <div style="font-size:2.4rem;">🎉</div>
      <h1 style="margin:6px 0 0;color:#fff;font-size:1.4rem;">Chúc mừng ${esc(customerName)}!</h1>
    </div>
    <div style="padding:26px;text-align:center;">
      <p style="margin:0 0 6px;color:#94a3b8;">Bạn vừa trúng thưởng tại</p>
      <p style="margin:0;font-size:1.2rem;font-weight:700;color:#fbbf24;">${esc(shopName)}</p>
      <p style="font-size:1.25rem;font-weight:800;margin:18px 0 6px;">${esc(prize)}</p>
      <p style="margin:14px 0 6px;color:#94a3b8;">Mã giảm giá của bạn:</p>
      <div style="display:inline-block;border:2px dashed #f59e0b;border-radius:10px;padding:12px 26px;font-size:1.5rem;letter-spacing:3px;font-weight:800;color:#fbbf24;background:#1e293b;">${esc(code)}</div>
      <p style="color:#94a3b8;font-size:.9rem;margin-top:18px;">Hãy đưa mã này cho nhân viên khi thanh toán để nhận ưu đãi.<br>Mỗi số điện thoại được quay tối đa ${spinLimit} lượt/ngày — hẹn gặp lại bạn!</p>
      ${zaloBtn}
    </div>
    <div style="background:#1e293b;padding:14px;text-align:center;color:#64748b;font-size:.78rem;">
      Email được gửi tự động từ hệ thống Vòng Quay May Mắn của ${esc(shopName)}.
    </div>
  </div>`;
}

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function sendCouponEmail(spinId, { to, shopName, customerName, prize, code, spinLimit, zaloLink }) {
  if (!mailer || !to || !code) return;
  mailer.sendMail({
    from: MAIL_FROM,
    to,
    subject: `🎁 ${shopName}: Bạn trúng "${prize}" - Mã giảm giá ${code}`,
    html: couponEmailHtml({ shopName, customerName, prize, code, spinLimit, zaloLink }),
    text: `Chúc mừng ${customerName}! Bạn trúng "${prize}" tại ${shopName}. Mã giảm giá: ${code}. Đưa mã này cho nhân viên khi thanh toán để nhận ưu đãi.`,
  }).then((info) => {
    db.prepare(`UPDATE spins SET email_sent=1 WHERE id=?`).run(spinId);
    if (process.env.SMTP_JSON === '1') console.log('>> [Email thử nghiệm]', info.message);
  }).catch((e) => {
    console.error(`>> Lỗi gửi email tới ${to}:`, e.message);
  });
}

// ------------------------------------------------------------------ App setup
const secretFile = path.join(DATA_DIR, '.session-secret');
let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex'));
  SESSION_SECRET = fs.readFileSync(secretFile, 'utf8').trim();
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '25mb' })); // đủ chỗ cho file sao lưu/phục hồi dữ liệu
app.use(cookieSession({
  name: 'vqmm',
  secret: SESSION_SECRET,
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 30 * 24 * 3600 * 1000,
}));
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------------ Helpers
const q = {
  userById: db.prepare(`SELECT * FROM users WHERE id=?`),
  userByEmail: db.prepare(`SELECT * FROM users WHERE email=?`),
  shopByOwner: db.prepare(`SELECT * FROM shops WHERE owner_id=?`),
  shopBySlug: db.prepare(`SELECT * FROM shops WHERE slug=?`),
  shopById: db.prepare(`SELECT * FROM shops WHERE id=?`),
  prizesByShop: db.prepare(`SELECT * FROM prizes WHERE shop_id=? ORDER BY id`),
  activePrizes: db.prepare(`SELECT * FROM prizes WHERE shop_id=? AND active=1 ORDER BY id`),
};

function currentUser(req) {
  if (!req.session || !req.session.uid) return null;
  const u = q.userById.get(req.session.uid);
  return u && u.active ? u : null;
}
function requireAuth(role) {
  return (req, res, next) => {
    const u = currentUser(req);
    if (!u) return res.status(401).json({ error: 'Vui lòng đăng nhập.' });
    if (role && u.role !== role) return res.status(403).json({ error: 'Không có quyền truy cập.' });
    req.user = u;
    if (u.role === 'owner') {
      req.shop = q.shopByOwner.get(u.id);
      if (!req.shop) return res.status(400).json({ error: 'Tài khoản chưa có cửa hàng.' });
    }
    next();
  };
}
function slugify(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'shop';
}
function validPhone(p) { return /^0\d{8,10}$/.test(String(p || '').replace(/[\s.-]/g, '')); }
function normPhone(p) { return String(p || '').replace(/[\s.-]/g, ''); }
function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function sendCsv(res, filename, header, rows) {
  const lines = [header.join(',')].concat(rows.map(r => r.map(csvEscape).join(',')));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + lines.join('\r\n')); // BOM để Excel hiển thị tiếng Việt đúng
}

// ------------------------------------------------------------------ Auth
app.post('/api/register', (req, res) => {
  const { name, email, phone, password, shopName } = req.body || {};
  if (!name || !email || !password || !shopName)
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ họ tên, email, mật khẩu và tên cửa hàng.' });
  if (String(password).length < 6)
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  if (q.userByEmail.get(String(email).toLowerCase().trim()))
    return res.status(400).json({ error: 'Email này đã được đăng ký.' });

  const info = db.prepare(`INSERT INTO users (role,name,email,phone,password_hash) VALUES ('owner',?,?,?,?)`)
    .run(String(name).trim(), String(email).toLowerCase().trim(), normPhone(phone), bcrypt.hashSync(String(password), 10));
  const ownerId = Number(info.lastInsertRowid);

  let slug = slugify(shopName);
  while (q.shopBySlug.get(slug)) slug = slugify(shopName) + '-' + crypto.randomInt(1000, 9999);
  db.prepare(`INSERT INTO shops (owner_id,name,slug) VALUES (?,?,?)`).run(ownerId, String(shopName).trim(), slug);

  // Tặng sẵn bộ phần quà mẫu để chủ quán chỉnh sửa
  const shopId = Number(q.shopByOwner.get(ownerId).id);
  const samples = [
    ['Giảm 10%', 'GIAM10', 25, '#f59e0b'],
    ['Giảm 20%', 'GIAM20', 10, '#ef4444'],
    ['Quà tặng bất ngờ', 'QUATANG', 5, '#8b5cf6'],
  ];
  const ins = db.prepare(`INSERT INTO prizes (shop_id,label,coupon_code,win_rate,color) VALUES (?,?,?,?,?)`);
  for (const [label, code, rate, color] of samples) ins.run(shopId, label, code, rate, color);

  req.session.uid = ownerId;
  res.json({ ok: true, role: 'owner' });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = q.userByEmail.get(String(email || '').toLowerCase().trim());
  if (!u || !bcrypt.compareSync(String(password || ''), u.password_hash))
    return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng.' });
  if (!u.active) return res.status(403).json({ error: 'Tài khoản đã bị khóa. Liên hệ quản trị viên.' });
  req.session.uid = u.id;
  res.json({ ok: true, role: u.role });
});

app.post('/api/logout', (req, res) => { req.session = null; res.json({ ok: true }); });

app.get('/api/me', (req, res) => {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: 'Chưa đăng nhập.' });
  const out = { id: u.id, role: u.role, name: u.name, email: u.email };
  if (u.role === 'owner') out.shop = q.shopByOwner.get(u.id);
  res.json(out);
});

app.post('/api/change-password', requireAuth(), (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!bcrypt.compareSync(String(oldPassword || ''), req.user.password_hash))
    return res.status(400).json({ error: 'Mật khẩu cũ không đúng.' });
  if (String(newPassword || '').length < 6)
    return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
  db.prepare(`UPDATE users SET password_hash=? WHERE id=?`).run(bcrypt.hashSync(String(newPassword), 10), req.user.id);
  res.json({ ok: true });
});

// ------------------------------------------------------------------ Chủ cửa hàng
app.get('/api/shop', requireAuth('owner'), (req, res) => res.json(req.shop));

app.put('/api/shop', requireAuth('owner'), (req, res) => {
  const { name, description, spin_limit_per_day, spin_mode, theme_color, zalo_link } = req.body || {};
  const mode = ['free', 'order'].includes(spin_mode) ? spin_mode : req.shop.spin_mode;
  const color = /^#[0-9a-fA-F]{6}$/.test(String(theme_color || '')) ? theme_color : (req.shop.theme_color || '#f59e0b');
  // Link nhóm Zalo: bắt buộc https:// để an toàn; để trống = tắt tính năng
  let zl = zalo_link === undefined ? (req.shop.zalo_link || '') : String(zalo_link).trim();
  if (zl && (!/^https:\/\/\S+$/i.test(zl) || zl.length > 300))
    return res.status(400).json({ error: 'Link nhóm Zalo không hợp lệ — phải bắt đầu bằng https:// (VD: https://zalo.me/g/abcxyz).' });
  db.prepare(`UPDATE shops SET name=?, description=?, spin_limit_per_day=?, spin_mode=?, theme_color=?, zalo_link=? WHERE id=?`)
    .run(
      String(name || req.shop.name).trim(),
      String(description ?? req.shop.description),
      Math.max(1, parseInt(spin_limit_per_day, 10) || 1),
      mode,
      color,
      zl,
      req.shop.id
    );
  res.json(q.shopById.get(req.shop.id));
});

app.get('/api/prizes', requireAuth('owner'), (req, res) => res.json(q.prizesByShop.all(req.shop.id)));

// Tổng tỷ lệ trúng của các phần quà đang bật không được vượt 100%
// (phần còn thiếu tới 100% chính là tỷ lệ "không trúng")
function totalOtherRates(shopId, excludeId) {
  return db.prepare(`SELECT COALESCE(SUM(win_rate),0) s FROM prizes WHERE shop_id=? AND active=1 AND id<>?`)
    .get(shopId, excludeId || 0).s;
}

app.post('/api/prizes', requireAuth('owner'), (req, res) => {
  const { label, coupon_code, win_rate, quantity, color } = req.body || {};
  if (!label) return res.status(400).json({ error: 'Vui lòng nhập tên phần quà.' });
  const rate = Math.min(100, Math.max(0, parseFloat(win_rate) || 0));
  const others = totalOtherRates(req.shop.id, 0);
  if (others + rate > 100.0001)
    return res.status(400).json({ error: `Tổng tỷ lệ trúng sẽ là ${Math.round((others + rate) * 10) / 10}% — vượt quá 100%. Hãy giảm tỷ lệ (các phần quà hiện có đã chiếm ${Math.round(others * 10) / 10}%).` });
  const qty = parseInt(quantity, 10);
  const qv = Number.isFinite(qty) && qty >= 0 ? qty : -1;
  db.prepare(`INSERT INTO prizes (shop_id,label,coupon_code,win_rate,quantity,remaining,color) VALUES (?,?,?,?,?,?,?)`)
    .run(req.shop.id, String(label).trim(), String(coupon_code || '').trim(), rate, qv, qv, String(color || ''));
  res.json({ ok: true });
});

app.put('/api/prizes/:id', requireAuth('owner'), (req, res) => {
  const p = db.prepare(`SELECT * FROM prizes WHERE id=? AND shop_id=?`).get(req.params.id, req.shop.id);
  if (!p) return res.status(404).json({ error: 'Không tìm thấy phần quà.' });
  const { label, coupon_code, win_rate, quantity, color, active } = req.body || {};
  const rate = Math.min(100, Math.max(0, parseFloat(win_rate ?? p.win_rate) || 0));
  const willBeActive = active === undefined ? p.active : (active ? 1 : 0);
  if (willBeActive) {
    const others = totalOtherRates(req.shop.id, p.id);
    if (others + rate > 100.0001)
      return res.status(400).json({ error: `Tổng tỷ lệ trúng sẽ là ${Math.round((others + rate) * 10) / 10}% — vượt quá 100%. Hãy giảm tỷ lệ (các phần quà khác đã chiếm ${Math.round(others * 10) / 10}%).` });
  }
  let qv = p.quantity, remaining = p.remaining;
  if (quantity !== undefined) {
    const qty = parseInt(quantity, 10);
    qv = Number.isFinite(qty) && qty >= 0 ? qty : -1;
    if (qv !== p.quantity) remaining = qv; // đặt lại số lượng còn lại khi đổi tổng số lượng
  }
  db.prepare(`UPDATE prizes SET label=?, coupon_code=?, win_rate=?, quantity=?, remaining=?, color=?, active=? WHERE id=?`)
    .run(
      String(label ?? p.label).trim(), String(coupon_code ?? p.coupon_code).trim(),
      rate, qv, remaining, String(color ?? p.color),
      active === undefined ? p.active : (active ? 1 : 0), p.id
    );
  res.json({ ok: true });
});

app.delete('/api/prizes/:id', requireAuth('owner'), (req, res) => {
  db.prepare(`UPDATE spins SET prize_id=NULL WHERE prize_id=? AND shop_id=?`).run(req.params.id, req.shop.id);
  db.prepare(`DELETE FROM prizes WHERE id=? AND shop_id=?`).run(req.params.id, req.shop.id);
  res.json({ ok: true });
});

app.get('/api/customers', requireAuth('owner'), (req, res) => {
  res.json(db.prepare(`
    SELECT c.*, COUNT(s.id) AS spin_count, COALESCE(SUM(CASE WHEN s.prize_id IS NOT NULL THEN 1 ELSE 0 END),0) AS win_count
    FROM customers c LEFT JOIN spins s ON s.customer_id=c.id
    WHERE c.shop_id=? GROUP BY c.id ORDER BY c.created_at DESC
  `).all(req.shop.id));
});

app.get('/api/spins', requireAuth('owner'), (req, res) => {
  res.json(db.prepare(`
    SELECT s.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
    FROM spins s LEFT JOIN customers c ON c.id=s.customer_id
    WHERE s.shop_id=? ORDER BY s.created_at DESC LIMIT 500
  `).all(req.shop.id));
});

// ---- Mã đơn hàng → mã quay thưởng (chế độ quay theo đơn) ----
// Chủ shop dán danh sách mã đơn, app tự sinh mã quay tương ứng cho từng đơn.
app.get('/api/order-codes', requireAuth('owner'), (req, res) => {
  res.json(db.prepare(`
    SELECT oc.*, s.prize_label, s.claimed
    FROM order_codes oc LEFT JOIN spins s ON s.id=oc.spin_id
    WHERE oc.shop_id=? ORDER BY oc.id DESC LIMIT 2000
  `).all(req.shop.id));
});

app.post('/api/order-codes', requireAuth('owner'), (req, res) => {
  const raw = String((req.body || {}).codes || '');
  // Nhận danh sách dán vào: mỗi dòng 1 mã, hoặc cách nhau bằng dấu phẩy / chấm phẩy / khoảng trắng
  const list = [...new Set(raw.split(/[\n,;\t ]+/).map(s => s.trim().toUpperCase()).filter(Boolean))];
  if (!list.length) return res.status(400).json({ error: 'Vui lòng dán danh sách mã đơn hàng (mỗi dòng 1 mã).' });
  if (list.length > 1000) return res.status(400).json({ error: 'Tối đa 1000 mã mỗi lần nhập.' });

  const ins = db.prepare(`INSERT INTO order_codes (shop_id,order_code,spin_code) VALUES (?,?,?)`);
  const exists = db.prepare(`SELECT id FROM order_codes WHERE shop_id=? AND order_code=?`);
  let added = 0, skipped = 0;
  for (const oc of list) {
    if (oc.length > 50) { skipped++; continue; }
    if (exists.get(req.shop.id, oc)) { skipped++; continue; } // mã đơn đã nhập rồi thì bỏ qua
    ins.run(req.shop.id, oc, genSpinCode(req.shop.id));
    added++;
  }
  res.json({ ok: true, added, skipped });
});

app.delete('/api/order-codes/:id', requireAuth('owner'), (req, res) => {
  const row = db.prepare(`SELECT * FROM order_codes WHERE id=? AND shop_id=?`).get(req.params.id, req.shop.id);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy mã đơn.' });
  if (row.used) return res.status(400).json({ error: 'Mã này khách đã quay rồi, không xóa được.' });
  db.prepare(`DELETE FROM order_codes WHERE id=?`).run(row.id);
  res.json({ ok: true });
});

app.get('/api/export/order-codes.csv', requireAuth('owner'), (req, res) => {
  const rows = db.prepare(`
    SELECT oc.order_code, oc.spin_code,
           CASE WHEN oc.used=1 THEN 'Đã quay' ELSE 'Chưa quay' END,
           oc.used_at, COALESCE(s.prize_label,''), oc.created_at
    FROM order_codes oc LEFT JOIN spins s ON s.id=oc.spin_id
    WHERE oc.shop_id=? ORDER BY oc.id DESC
  `).all(req.shop.id).map(r => Object.values(r));
  sendCsv(res, 'ma-don-hang-ma-quay.csv',
    ['Mã đơn hàng', 'Mã quay thưởng', 'Trạng thái', 'Thời gian quay', 'Kết quả', 'Ngày tạo'], rows);
});

// ---- Xác nhận mã tại quầy: mỗi mã chỉ sử dụng được 1 LẦN ----
function findCouponSpin(shopId, rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { error: 'Vui lòng nhập mã giảm giá.' };
  const spin = db.prepare(`
    SELECT s.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
    FROM spins s LEFT JOIN customers c ON c.id=s.customer_id
    WHERE s.shop_id=? AND s.coupon_code=? AND s.prize_id IS NOT NULL
  `).get(shopId, code);
  if (!spin) return { error: 'Không tìm thấy mã này. Kiểm tra lại xem khách nhập đúng chưa.' };
  if (!spin.claimed) return { error: 'Mã này chưa được khách xác nhận nhận thưởng — không hợp lệ.' };
  return { spin };
}

app.post('/api/redeem/check', requireAuth('owner'), (req, res) => {
  const r = findCouponSpin(req.shop.id, (req.body || {}).code);
  if (r.error) return res.status(400).json({ error: r.error });
  const s = r.spin;
  res.json({
    coupon_code: s.coupon_code,
    prize: s.prize_label,
    customer_name: s.customer_name,
    customer_contact: s.customer_phone || s.customer_email || '',
    won_at: s.created_at,
    redeemed: !!s.redeemed,
    redeemed_at: s.redeemed_at || '',
  });
});

app.post('/api/redeem/confirm', requireAuth('owner'), (req, res) => {
  const r = findCouponSpin(req.shop.id, (req.body || {}).code);
  if (r.error) return res.status(400).json({ error: r.error });
  const s = r.spin;
  if (s.redeemed)
    return res.status(400).json({ error: `Mã này ĐÃ ĐƯỢC SỬ DỤNG lúc ${s.redeemed_at}. Mỗi mã chỉ dùng được 1 lần!` });
  db.prepare(`UPDATE spins SET redeemed=1, redeemed_at=datetime('now','localtime') WHERE id=?`).run(s.id);
  res.json({ ok: true, prize: s.prize_label, customer_name: s.customer_name });
});

app.get('/api/export/customers.csv', requireAuth('owner'), (req, res) => {
  const rows = db.prepare(`
    SELECT c.name, c.phone, c.email, c.created_at, COUNT(s.id),
           COALESCE(SUM(CASE WHEN s.prize_id IS NOT NULL THEN 1 ELSE 0 END),0)
    FROM customers c LEFT JOIN spins s ON s.customer_id=c.id
    WHERE c.shop_id=? GROUP BY c.id ORDER BY c.created_at DESC
  `).all(req.shop.id).map(r => Object.values(r));
  sendCsv(res, 'khach-hang.csv', ['Họ tên', 'Số điện thoại', 'Email', 'Ngày đăng ký', 'Số lượt quay', 'Số lần trúng'], rows);
});

// ------------------------------------------------------------------ Quản trị viên
app.get('/api/admin/overview', requireAuth('admin'), (req, res) => {
  res.json({
    shops: db.prepare(`SELECT COUNT(*) n FROM shops`).get().n,
    owners: db.prepare(`SELECT COUNT(*) n FROM users WHERE role='owner'`).get().n,
    customers: db.prepare(`SELECT COUNT(*) n FROM customers`).get().n,
    spins: db.prepare(`SELECT COUNT(*) n FROM spins`).get().n,
    wins: db.prepare(`SELECT COUNT(*) n FROM spins WHERE prize_id IS NOT NULL`).get().n,
  });
});

app.get('/api/admin/shops', requireAuth('admin'), (req, res) => {
  res.json(db.prepare(`
    SELECT sh.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone, u.active AS owner_active,
      (SELECT COUNT(*) FROM customers c WHERE c.shop_id=sh.id) AS customer_count,
      (SELECT COUNT(*) FROM spins s WHERE s.shop_id=sh.id) AS spin_count
    FROM shops sh JOIN users u ON u.id=sh.owner_id ORDER BY sh.created_at DESC
  `).all());
});

app.put('/api/admin/shops/:id', requireAuth('admin'), (req, res) => {
  const sh = q.shopById.get(req.params.id);
  if (!sh) return res.status(404).json({ error: 'Không tìm thấy cửa hàng.' });
  const { active } = req.body || {};
  db.prepare(`UPDATE shops SET active=? WHERE id=?`).run(active ? 1 : 0, sh.id);
  db.prepare(`UPDATE users SET active=? WHERE id=? AND role='owner'`).run(active ? 1 : 0, sh.owner_id);
  res.json({ ok: true });
});

app.get('/api/admin/shops/:id/customers', requireAuth('admin'), (req, res) => {
  res.json(db.prepare(`
    SELECT c.*, COUNT(s.id) AS spin_count, COALESCE(SUM(CASE WHEN s.prize_id IS NOT NULL THEN 1 ELSE 0 END),0) AS win_count
    FROM customers c LEFT JOIN spins s ON s.customer_id=c.id
    WHERE c.shop_id=? GROUP BY c.id ORDER BY c.created_at DESC
  `).all(req.params.id));
});

app.get('/api/admin/shops/:id/spins', requireAuth('admin'), (req, res) => {
  res.json(db.prepare(`
    SELECT s.*, c.name AS customer_name, c.phone AS customer_phone
    FROM spins s LEFT JOIN customers c ON c.id=s.customer_id
    WHERE s.shop_id=? ORDER BY s.created_at DESC LIMIT 500
  `).all(req.params.id));
});

// ---- Sao lưu & phục hồi TOÀN BỘ dữ liệu (chỉ quản trị viên) ----
// Tải file JSON về cất giữ (Google Drive, máy tính...). Khi dữ liệu bị reset
// (gói miễn phí không có ổ cứng), tải file lên là khôi phục nguyên trạng.
const BACKUP_TABLES = ['users', 'shops', 'prizes', 'customers', 'spins', 'order_codes'];

app.get('/api/admin/backup', requireAuth('admin'), (req, res) => {
  const dump = { app: 'vong-quay-may-man', version: 1, exported_at: new Date().toISOString(), tables: {} };
  for (const t of BACKUP_TABLES) dump.tables[t] = db.prepare(`SELECT * FROM ${t}`).all();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  res.setHeader('Content-Disposition', `attachment; filename="vongquay-saoluu-${stamp}.json"`);
  res.json(dump);
});

app.post('/api/admin/restore', requireAuth('admin'), (req, res) => {
  const dump = req.body || {};
  if (dump.app !== 'vong-quay-may-man' || !dump.tables)
    return res.status(400).json({ error: 'File không đúng định dạng sao lưu của Vòng Quay May Mắn.' });

  // Chỉ nhận các cột có thật trong từng bảng (an toàn khi phục hồi bản cũ lên bản mới)
  const colsOf = {};
  for (const t of BACKUP_TABLES) {
    colsOf[t] = new Set(db.prepare(`SELECT name FROM pragma_table_info('${t}')`).all().map(r => r.name));
  }

  db.exec('BEGIN');
  try {
    for (const t of [...BACKUP_TABLES].reverse()) db.exec(`DELETE FROM ${t}`);
    const counts = {};
    for (const t of BACKUP_TABLES) {
      const rows = Array.isArray(dump.tables[t]) ? dump.tables[t] : [];
      for (const row of rows) {
        const cols = Object.keys(row).filter(c => colsOf[t].has(c));
        if (!cols.length) continue;
        db.prepare(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
          .run(...cols.map(c => row[c]));
      }
      counts[t] = rows.length;
    }
    db.exec('COMMIT');
    res.json({ ok: true, counts });
  } catch (e) {
    db.exec('ROLLBACK');
    res.status(400).json({ error: 'Phục hồi thất bại, dữ liệu hiện tại được giữ nguyên. Chi tiết: ' + e.message });
  }
});

app.get('/api/admin/export.csv', requireAuth('admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT sh.name AS shop_name, c.name AS customer_name, c.phone, c.email, c.created_at,
           (SELECT COUNT(*) FROM spins s WHERE s.customer_id=c.id) AS spin_count,
           (SELECT COUNT(*) FROM spins s WHERE s.customer_id=c.id AND s.prize_id IS NOT NULL) AS win_count
    FROM customers c JOIN shops sh ON sh.id=c.shop_id ORDER BY sh.id, c.created_at DESC
  `).all().map(r => Object.values(r));
  sendCsv(res, 'toan-bo-khach-hang.csv',
    ['Cửa hàng', 'Họ tên', 'Số điện thoại', 'Email', 'Ngày đăng ký', 'Số lượt quay', 'Số lần trúng'], rows);
});

// ------------------------------------------------------------------ Trang public: khách hàng quay
app.get('/api/public/shop/:slug', (req, res) => {
  const sh = q.shopBySlug.get(req.params.slug);
  if (!sh || !sh.active) return res.status(404).json({ error: 'Chương trình không tồn tại hoặc đã kết thúc.' });
  const prizes = q.activePrizes.all(sh.id).map(p => ({ id: p.id, label: p.label, color: p.color }));
  // Không bao giờ trả tỷ lệ trúng / mã giảm giá ra public
  res.json({
    name: sh.name, description: sh.description,
    spin_limit_per_day: sh.spin_limit_per_day,
    spin_mode: sh.spin_mode || 'free',
    theme_color: sh.theme_color || '#f59e0b',
    zalo_link: sh.zalo_link || '',
    // Quán có nhập mã đơn hàng → chế độ tự do hiện thêm ô "nhập mã đơn để quay thêm"
    order_bonus: db.prepare(`SELECT COUNT(*) n FROM order_codes WHERE shop_id=?`).get(sh.id).n > 0,
    segments: prizes.concat([{ id: 0, label: 'Chúc bạn may mắn lần sau', color: '#94a3b8' }]),
  });
});

// Bước 1: khách quét QR/bấm link và QUAY NGAY, chưa cần nhập thông tin.
// Giới hạn lượt quay theo thiết bị (cookie) mỗi ngày.
app.post('/api/public/spin/:slug', (req, res) => {
  const sh = q.shopBySlug.get(req.params.slug);
  if (!sh || !sh.active) return res.status(404).json({ error: 'Chương trình không tồn tại hoặc đã kết thúc.' });

  if (!req.session.dev) req.session.dev = crypto.randomBytes(12).toString('hex');
  const dev = req.session.dev;

  // Chế độ 'order': phải nhập mã quay thưởng theo đơn hàng, mỗi mã quay đúng 1 lần.
  // Chế độ 'free': ai vào cũng quay được, giới hạn lượt/thiết bị/ngày —
  //   NHƯNG khách mua hàng nhập đúng mã đơn thì được QUAY THÊM (mỗi mã 1 lượt, không tính vào lượt miễn phí).
  const codeIn = String((req.body || {}).code || '').trim().toUpperCase();
  let orderRow = null;
  let today = 0;
  const lookupOrder = (c) => db.prepare(`SELECT * FROM order_codes WHERE shop_id=? AND (spin_code=? OR order_code=?)`)
    .get(sh.id, c, c);

  if ((sh.spin_mode || 'free') === 'order') {
    if (!codeIn) return res.status(400).json({ error: 'Vui lòng nhập mã quay thưởng in trên đơn hàng của bạn.' });
    orderRow = lookupOrder(codeIn); // chấp nhận cả mã quay thưởng lẫn chính mã đơn hàng
    if (!orderRow) return res.status(400).json({ error: 'Mã quay không đúng. Kiểm tra lại mã trên đơn hàng nhé!' });
    if (orderRow.used) return res.status(400).json({ error: 'Mã quay này đã được sử dụng rồi. Mỗi đơn hàng chỉ được quay 1 lần!' });
  } else if (codeIn) {
    // Quay thêm bằng mã đơn hàng trong chế độ tự do
    orderRow = lookupOrder(codeIn);
    if (!orderRow) return res.status(400).json({ error: 'Mã đơn hàng không đúng. Kiểm tra lại mã trên đơn/vận đơn của bạn nhé!' });
    if (orderRow.used) return res.status(400).json({ error: 'Mã đơn này đã được dùng để quay rồi. Mỗi đơn hàng chỉ được quay thêm 1 lần!' });
  } else {
    today = db.prepare(`
      SELECT COUNT(*) n FROM spins WHERE shop_id=? AND device_id=? AND date(created_at)=date('now','localtime')
    `).get(sh.id, dev).n;
    if (today >= sh.spin_limit_per_day) {
      const hasCodes = db.prepare(`SELECT COUNT(*) n FROM order_codes WHERE shop_id=?`).get(sh.id).n > 0;
      return res.status(429).json({
        error: hasCodes
          ? `Bạn đã hết ${sh.spin_limit_per_day} lượt miễn phí hôm nay. 🛒 Đã mua hàng? Nhập mã đơn hàng bên dưới để quay thêm ngay!`
          : `Bạn đã hết ${sh.spin_limit_per_day} lượt quay hôm nay. Hẹn gặp lại ngày mai!`,
        orderBonus: hasCodes,
      });
    }
  }

  // Quay số phía máy chủ theo tỷ lệ % từng phần quà (phần còn lại = không trúng)
  const prizes = q.activePrizes.all(sh.id);
  const r = Math.random() * 100;
  let cum = 0, won = null;
  for (const p of prizes) {
    if (p.quantity !== -1 && p.remaining <= 0) { continue; } // hết quà → phần đó tính là trượt
    cum += p.win_rate;
    if (r < cum) { won = p; break; }
  }
  if (won && won.quantity !== -1) {
    db.prepare(`UPDATE prizes SET remaining=remaining-1 WHERE id=?`).run(won.id);
  }
  // Phiếu nhận mã dùng 1 lần: khách phải nhập thông tin ở bước 2 mới thấy mã giảm giá.
  // Mỗi lượt trúng được sinh MÃ RIÊNG (dùng 1 lần) từ tiền tố mã của phần quà.
  const claimToken = won ? crypto.randomBytes(16).toString('hex') : '';
  const uniqueCode = won ? genUniqueCode(sh.id, won.coupon_code) : '';
  const spinInfo = db.prepare(`INSERT INTO spins (shop_id,customer_id,prize_id,prize_label,coupon_code,claim_token,claimed,device_id) VALUES (?,NULL,?,?,?,?,0,?)`)
    .run(sh.id, won ? won.id : null, won ? won.label : 'Chúc bạn may mắn lần sau', uniqueCode, claimToken, dev);

  // Đánh dấu mã đơn hàng đã dùng, gắn với lượt quay vừa tạo
  if (orderRow) {
    db.prepare(`UPDATE order_codes SET used=1, used_at=datetime('now','localtime'), spin_id=? WHERE id=?`)
      .run(Number(spinInfo.lastInsertRowid), orderRow.id);
  }

  // segmentIndex: vị trí ô trên vòng quay hiển thị phía khách (ô cuối = trượt)
  const segIdx = won ? prizes.findIndex(p => p.id === won.id) : prizes.length;
  res.json({
    win: !!won,
    prize: won ? won.label : 'Chúc bạn may mắn lần sau',
    claimToken,
    segmentIndex: segIdx,
    spinsLeftToday: orderRow ? null : sh.spin_limit_per_day - today - 1,
  });
});

// Bước 2: khách bấm "Nhận mã giảm giá" → nhập HỌ TÊN (bắt buộc) + SĐT hoặc EMAIL (ít nhất 1)
// → nhận mã (ảnh chụp màn hình / tải ảnh / Zalo), có email thì gửi thêm qua email.
app.post('/api/public/claim/:slug', (req, res) => {
  const sh = q.shopBySlug.get(req.params.slug);
  if (!sh || !sh.active) return res.status(404).json({ error: 'Chương trình không tồn tại hoặc đã kết thúc.' });

  const token = String((req.body || {}).claimToken || '');
  const name = String((req.body || {}).name || '').trim();
  const phone = normPhone((req.body || {}).phone);
  const email = String((req.body || {}).email || '').trim().toLowerCase();

  if (!name) return res.status(400).json({ error: 'Vui lòng nhập họ tên.' });
  if (!phone && !email) return res.status(400).json({ error: 'Vui lòng nhập số điện thoại hoặc email (ít nhất 1 trong 2).' });
  if (phone && !validPhone(phone)) return res.status(400).json({ error: 'Số điện thoại không hợp lệ (VD: 0912345678).' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email không hợp lệ.' });

  const spin = db.prepare(`
    SELECT * FROM spins WHERE claim_token=? AND shop_id=? AND claimed=0 AND prize_id IS NOT NULL
      AND date(created_at)=date('now','localtime')
  `).get(token, sh.id);
  if (!token || !spin) return res.status(400).json({ error: 'Lượt trúng thưởng không hợp lệ, đã nhận rồi hoặc đã hết hạn. Hãy quay lại nhé!' });

  // Chống lạm dụng (chỉ áp dụng chế độ quay tự do): mỗi SĐT/email nhận tối đa số mã bằng số lượt quay/ngày.
  // Không tính các lượt quay bằng MÃ ĐƠN HÀNG — khách mua nhiều đơn được nhận nhiều quà.
  const isOrderSpin = !!db.prepare(`SELECT id FROM order_codes WHERE shop_id=? AND spin_id=?`).get(sh.id, spin.id);
  if ((sh.spin_mode || 'free') !== 'order' && !isOrderSpin) {
    const claimedToday = db.prepare(`
      SELECT COUNT(*) n FROM spins s JOIN customers c ON c.id=s.customer_id
      WHERE s.shop_id=? AND s.claimed=1 AND date(s.created_at)=date('now','localtime')
        AND ((?<>'' AND c.phone=?) OR (?<>'' AND c.email=?))
        AND s.id NOT IN (SELECT spin_id FROM order_codes WHERE shop_id=? AND spin_id IS NOT NULL)
    `).get(sh.id, phone, phone, email, email, sh.id).n;
    if (claimedToday >= sh.spin_limit_per_day)
      return res.status(429).json({ error: 'Số điện thoại/email này đã nhận đủ mã hôm nay. Hẹn gặp lại ngày mai!' });
  }

  // Tìm hoặc tạo khách hàng theo SĐT (ưu tiên) hoặc email
  let cust = null;
  if (phone) cust = db.prepare(`SELECT * FROM customers WHERE shop_id=? AND phone=? AND phone<>''`).get(sh.id, phone);
  if (!cust && email) cust = db.prepare(`SELECT * FROM customers WHERE shop_id=? AND email=? AND email<>''`).get(sh.id, email);
  if (!cust) {
    const info = db.prepare(`INSERT INTO customers (shop_id,name,phone,email) VALUES (?,?,?,?)`).run(sh.id, name, phone, email);
    cust = db.prepare(`SELECT * FROM customers WHERE id=?`).get(Number(info.lastInsertRowid));
  } else {
    // Bổ sung thông tin còn thiếu cho khách cũ
    db.prepare(`UPDATE customers SET name=?, phone=CASE WHEN phone='' THEN ? ELSE phone END, email=CASE WHEN email='' THEN ? ELSE email END WHERE id=?`)
      .run(name, phone, email, cust.id);
    cust = db.prepare(`SELECT * FROM customers WHERE id=?`).get(cust.id);
  }

  db.prepare(`UPDATE spins SET customer_id=?, claimed=1, claim_token='' WHERE id=?`).run(cust.id, spin.id);

  // Có email → tự động gửi mã vào hộp thư (chạy ngầm, không chặn phản hồi)
  const willEmail = !!(mailer && spin.coupon_code && cust.email);
  if (willEmail) {
    sendCouponEmail(spin.id, {
      to: cust.email, shopName: sh.name, customerName: cust.name,
      prize: spin.prize_label, code: spin.coupon_code, spinLimit: sh.spin_limit_per_day,
      zaloLink: sh.zalo_link || '',
    });
  }

  res.json({
    ok: true,
    shopName: sh.name,
    customerName: cust.name,
    prize: spin.prize_label,
    coupon_code: spin.coupon_code,
    emailed: willEmail,
    zalo_link: sh.zalo_link || '',
  });
});

// Trang vòng quay của từng cửa hàng: /w/ten-quan
app.get('/w/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'wheel.html')));

app.listen(PORT, () => console.log(`Vòng Quay May Mắn chạy tại http://localhost:${PORT}`));
