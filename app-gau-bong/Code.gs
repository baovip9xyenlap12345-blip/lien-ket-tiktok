/**********************************************************************
 * MÁY CHỦ ĐỒNG BỘ — APP QUẢN LÝ XƯỞNG GẤU BẢO BẢO
 * Cách cài (làm 1 lần, ~3 phút):
 *  1. Vào https://script.google.com → "Dự án mới" (New project)
 *  2. Xóa code mẫu, dán TOÀN BỘ file này vào
 *  3. Sửa dòng ADMIN_PASS bên dưới thành mật khẩu của anh
 *  4. Bấm "Triển khai" (Deploy) → "Tùy chọn triển khai mới" (New deployment)
 *     → biểu tượng bánh răng chọn "Ứng dụng web" (Web app)
 *     → "Người thực thi": Tôi (Me) · "Ai có quyền truy cập": Bất kỳ ai (Anyone)
 *     → Deploy → cấp quyền cho tài khoản Google → COPY đường link /exec
 *  5. Mở app gấu bông → ⚙️ Cài đặt → dán link vào "Địa chỉ máy chủ" → Lưu
 *     → đăng nhập: tài khoản admin / mật khẩu ở dòng dưới
 **********************************************************************/
const ADMIN_PASS = 'baobao2026';   // ⚠️ ĐỔI MẬT KHẨU NÀY TRƯỚC KHI DEPLOY!

const DB_FILENAME = 'baobao-db.json';

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, err: 'bad_request' }); }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (req.action) {
      case 'login':  return out(login(req));
      case 'pull':   return out(auth(req, () => ({ ok: true, db: readDB() })));
      case 'push':   return out(auth(req, () => {
        const merged = mergeDB(readDB(), req.db || null);
        writeDB(merged);
        return { ok: true, db: merged };
      }));
      case 'users_list': return out(adminOnly(req, () => {
        const us = getUsers();
        return { ok: true, users: Object.keys(us).map(k => ({ u: k, name: us[k].name, role: us[k].role })) };
      }));
      case 'user_set': return out(adminOnly(req, () => {
        const us = getUsers();
        const cur = us[req.u] || {};
        us[req.u] = { p: req.p ? String(req.p) : cur.p, role: req.role || cur.role || 'sale', name: req.name || cur.name || req.u };
        if (!us[req.u].p) return { ok: false, err: 'need_password' };
        setUsers(us); return { ok: true };
      }));
      case 'user_del': return out(adminOnly(req, () => {
        if (req.u === 'admin') return { ok: false, err: 'cannot_delete_admin' };
        const us = getUsers(); delete us[req.u]; setUsers(us); return { ok: true };
      }));
      default: return out({ ok: false, err: 'unknown_action' });
    }
  } finally { lock.releaseLock(); }
}
function doGet() { return out({ ok: true, msg: 'May chu Bao Bao dang chay. Dan duong link nay vao app (o Cai dat).' }); }

/* ---------- tai khoan & phien dang nhap ---------- */
function getUsers() {
  const p = PropertiesService.getScriptProperties();
  let us = null; try { us = JSON.parse(p.getProperty('users')); } catch (e) {}
  if (!us) { us = { admin: { p: ADMIN_PASS, role: 'admin', name: 'Chủ xưởng' } }; setUsers(us); }
  return us;
}
function setUsers(us) { PropertiesService.getScriptProperties().setProperty('users', JSON.stringify(us)); }
function getTokens() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('tokens')) || {}; } catch (e) { return {}; }
}
function setTokens(t) { PropertiesService.getScriptProperties().setProperty('tokens', JSON.stringify(t)); }
function login(req) {
  const us = getUsers();
  const u = us[String(req.u || '').trim()];
  if (!u || u.p !== String(req.p || '')) return { ok: false, err: 'wrong_login' };
  const tokens = getTokens();
  const keys = Object.keys(tokens);
  if (keys.length > 30) keys.slice(0, keys.length - 30).forEach(k => delete tokens[k]);
  const tk = Utilities.getUuid();
  tokens[tk] = { u: String(req.u).trim(), role: u.role, t: Date.now() };
  setTokens(tokens);
  return { ok: true, token: tk, role: u.role, name: u.name };
}
function auth(req, fn) {
  const t = getTokens()[req.token];
  if (!t) return { ok: false, err: 'need_login' };
  return fn(t);
}
function adminOnly(req, fn) {
  const t = getTokens()[req.token];
  if (!t) return { ok: false, err: 'need_login' };
  if (t.role !== 'admin') return { ok: false, err: 'not_admin' };
  return fn(t);
}

/* ---------- luu tru (file JSON trong Google Drive cua chu xuong) ---------- */
function dbFile() {
  const it = DriveApp.getFilesByName(DB_FILENAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFile(DB_FILENAME, 'null', 'application/json');
}
function readDB() {
  try { return JSON.parse(dbFile().getBlob().getDataAsString()) || null; } catch (e) { return null; }
}
function writeDB(db) { dbFile().setContent(JSON.stringify(db)); }

/* ---------- gop du lieu 2 may (id + ts: ban moi hon thang) ---------- */
function mergeDB(a, b) {
  if (!a) return b; if (!b) return a;
  const COLS = ['products', 'customers', 'suppliers', 'invoices', 'purchases', 'fund', 'salaries'];
  const o = {};
  COLS.forEach(k => {
    const map = {};
    (a[k] || []).forEach(x => { if (x && x.id != null) map[x.id] = x; });
    (b[k] || []).forEach(x => {
      if (!x || x.id == null) return;
      const cur = map[x.id];
      if (!cur || (x.ts || 0) >= (cur.ts || 0)) map[x.id] = x;
    });
    o[k] = Object.keys(map).map(id => map[id]);
  });
  o.settings = ((b.settings && (b.settings.ts || 0)) >= ((a.settings && a.settings.ts) || 0)) ? b.settings : a.settings;
  o.seq = {};
  const sa = a.seq || {}, sb = b.seq || {};
  ['hd', 'pn', 'pt', 'pc'].forEach(k => o.seq[k] = Math.max(sa[k] || 0, sb[k] || 0));
  return o;
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
