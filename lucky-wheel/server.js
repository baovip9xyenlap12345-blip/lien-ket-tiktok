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
    phone      TEXT NOT NULL,
    email      TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE(shop_id, phone)
  );
  CREATE TABLE IF NOT EXISTS spins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id     INTEGER NOT NULL REFERENCES shops(id),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    prize_id    INTEGER,                              -- NULL = không trúng
    prize_label TEXT NOT NULL,
    coupon_code TEXT DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

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

// ------------------------------------------------------------------ App setup
const secretFile = path.join(DATA_DIR, '.session-secret');
let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex'));
  SESSION_SECRET = fs.readFileSync(secretFile, 'utf8').trim();
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
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
  const { name, description, spin_limit_per_day, require_email } = req.body || {};
  db.prepare(`UPDATE shops SET name=?, description=?, spin_limit_per_day=?, require_email=? WHERE id=?`)
    .run(
      String(name || req.shop.name).trim(),
      String(description ?? req.shop.description),
      Math.max(1, parseInt(spin_limit_per_day, 10) || 1),
      require_email ? 1 : 0,
      req.shop.id
    );
  res.json(q.shopById.get(req.shop.id));
});

app.get('/api/prizes', requireAuth('owner'), (req, res) => res.json(q.prizesByShop.all(req.shop.id)));

app.post('/api/prizes', requireAuth('owner'), (req, res) => {
  const { label, coupon_code, win_rate, quantity, color } = req.body || {};
  if (!label) return res.status(400).json({ error: 'Vui lòng nhập tên phần quà.' });
  const rate = Math.min(100, Math.max(0, parseFloat(win_rate) || 0));
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
    FROM spins s JOIN customers c ON c.id=s.customer_id
    WHERE s.shop_id=? ORDER BY s.created_at DESC LIMIT 500
  `).all(req.shop.id));
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
    FROM spins s JOIN customers c ON c.id=s.customer_id
    WHERE s.shop_id=? ORDER BY s.created_at DESC LIMIT 500
  `).all(req.params.id));
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
    name: sh.name, description: sh.description, require_email: !!sh.require_email,
    spin_limit_per_day: sh.spin_limit_per_day,
    segments: prizes.concat([{ id: 0, label: 'Chúc bạn may mắn lần sau', color: '#94a3b8' }]),
  });
});

app.post('/api/public/spin/:slug', (req, res) => {
  const sh = q.shopBySlug.get(req.params.slug);
  if (!sh || !sh.active) return res.status(404).json({ error: 'Chương trình không tồn tại hoặc đã kết thúc.' });

  const name = String((req.body || {}).name || '').trim();
  const phone = normPhone((req.body || {}).phone);
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  if (!name) return res.status(400).json({ error: 'Vui lòng nhập họ tên.' });
  if (!validPhone(phone)) return res.status(400).json({ error: 'Số điện thoại không hợp lệ (VD: 0912345678).' });
  if (sh.require_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Vui lòng nhập email hợp lệ.' });

  // Tạo/tìm khách hàng của cửa hàng này
  let cust = db.prepare(`SELECT * FROM customers WHERE shop_id=? AND phone=?`).get(sh.id, phone);
  if (!cust) {
    db.prepare(`INSERT INTO customers (shop_id,name,phone,email) VALUES (?,?,?,?)`).run(sh.id, name, phone, email);
    cust = db.prepare(`SELECT * FROM customers WHERE shop_id=? AND phone=?`).get(sh.id, phone);
  } else if (email && email !== cust.email) {
    db.prepare(`UPDATE customers SET email=?, name=? WHERE id=?`).run(email, name, cust.id);
  }

  // Giới hạn lượt quay trong ngày
  const today = db.prepare(`
    SELECT COUNT(*) n FROM spins WHERE customer_id=? AND date(created_at)=date('now','localtime')
  `).get(cust.id).n;
  if (today >= sh.spin_limit_per_day)
    return res.status(429).json({ error: `Bạn đã hết ${sh.spin_limit_per_day} lượt quay hôm nay. Hẹn gặp lại ngày mai!` });

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
  db.prepare(`INSERT INTO spins (shop_id,customer_id,prize_id,prize_label,coupon_code) VALUES (?,?,?,?,?)`)
    .run(sh.id, cust.id, won ? won.id : null, won ? won.label : 'Chúc bạn may mắn lần sau', won ? won.coupon_code : '');

  // segmentIndex: vị trí ô trên vòng quay hiển thị phía khách (ô cuối = trượt)
  const segIdx = won ? prizes.findIndex(p => p.id === won.id) : prizes.length;
  res.json({
    win: !!won,
    prize: won ? won.label : 'Chúc bạn may mắn lần sau',
    coupon_code: won ? won.coupon_code : '',
    segmentIndex: segIdx,
    spinsLeftToday: sh.spin_limit_per_day - today - 1,
  });
});

// Trang vòng quay của từng cửa hàng: /w/ten-quan
app.get('/w/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'wheel.html')));

app.listen(PORT, () => console.log(`Vòng Quay May Mắn chạy tại http://localhost:${PORT}`));
