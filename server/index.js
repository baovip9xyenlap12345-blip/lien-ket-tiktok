// May chu "App Cua Bao Gau Bong" - chuyen video/ghi am thanh van ban bang OpenAI API
// Chay: OPENAI_API_KEY=sk-... JWT_SECRET=chuoi-bi-mat node index.js
import express from 'express';
import multer from 'multer';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ====== Cau hinh ======
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'doi-chuoi-nay-khi-trien-khai';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
// Thong tin chuyen khoan hien cho khach (sua qua bien moi truong)
const BANK_INFO = process.env.BANK_INFO || 'Ngan hang: (dien ten) | So TK: (dien so) | Chu TK: (dien ten) | Noi dung: GOI + email cua ban';

// Cac goi thang: phut la han muc moi thang
const PLANS = {
  free:  { name: 'Mien phi',  minutes: 10,   price: 0 },
  basic: { name: 'Co ban',    minutes: 300,  price: 199000 },
  pro:   { name: 'Chuyen nghiep', minutes: 1000, price: 499000 },
};

// ====== CSDL ======
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = new Database(path.join(__dirname, 'data', 'app.db'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  plan_expires INTEGER,          -- epoch ms; null = khong het han (free)
  used_seconds INTEGER NOT NULL DEFAULT 0,
  month_key TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  seconds INTEGER NOT NULL,
  kind TEXT NOT NULL,
  created_at INTEGER NOT NULL
);`);

const monthKey = () => new Date().toISOString().slice(0, 7); // "2026-07"

function getUser(id) {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  if (!u) return null;
  // sang thang moi -> dat lai han muc
  if (u.month_key !== monthKey()) {
    db.prepare('UPDATE users SET used_seconds=0, month_key=? WHERE id=?').run(monthKey(), u.id);
    u.used_seconds = 0; u.month_key = monthKey();
  }
  // goi tra phi het han -> ve free
  if (u.plan !== 'free' && u.plan_expires && Date.now() > u.plan_expires) {
    db.prepare("UPDATE users SET plan='free', plan_expires=NULL WHERE id=?").run(u.id);
    u.plan = 'free'; u.plan_expires = null;
  }
  return u;
}
const quotaSeconds = u => (PLANS[u.plan] || PLANS.free).minutes * 60;

// ====== App ======
const app = express();
app.use(express.json());
// Cho phep goi tu trang GitHub Pages
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: path.join(__dirname, 'data', 'uploads'), limits: { fileSize: 300 * 1024 * 1024 } });

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Chua dang nhap' });
  try {
    req.userId = jwt.verify(token, JWT_SECRET).uid;
    const u = getUser(req.userId);
    if (!u) return res.status(401).json({ error: 'Tai khoan khong ton tai' });
    req.user = u;
    next();
  } catch {
    return res.status(401).json({ error: 'Phien dang nhap het han, hay dang nhap lai' });
  }
}

// ---- Tai khoan ----
app.post('/api/register', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Email khong hop le' });
  if (password.length < 6) return res.status(400).json({ error: 'Mat khau toi thieu 6 ky tu' });
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) return res.status(400).json({ error: 'Email da dang ky' });
  const id = randomUUID();
  db.prepare('INSERT INTO users (id,email,pass_hash,month_key,created_at) VALUES (?,?,?,?,?)')
    .run(id, email, bcrypt.hashSync(password, 10), monthKey(), Date.now());
  res.json({ token: jwt.sign({ uid: id }, JWT_SECRET, { expiresIn: '30d' }) });
});

app.post('/api/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!u || !bcrypt.compareSync(String(req.body.password || ''), u.pass_hash)) {
    return res.status(400).json({ error: 'Sai email hoac mat khau' });
  }
  res.json({ token: jwt.sign({ uid: u.id }, JWT_SECRET, { expiresIn: '30d' }) });
});

app.get('/api/me', auth, (req, res) => {
  const u = req.user;
  res.json({
    email: u.email,
    plan: u.plan,
    planName: (PLANS[u.plan] || PLANS.free).name,
    planExpires: u.plan_expires,
    usedMinutes: Math.round(u.used_seconds / 60 * 10) / 10,
    quotaMinutes: (PLANS[u.plan] || PLANS.free).minutes,
    isAdmin: ADMIN_EMAIL && u.email === ADMIN_EMAIL,
  });
});

app.get('/api/plans', (req, res) => res.json({ plans: PLANS, bank: BANK_INFO }));

// ---- Admin kich hoat goi sau khi khach chuyen khoan ----
app.post('/api/admin/set-plan', auth, (req, res) => {
  if (!ADMIN_EMAIL || req.user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Khong co quyen' });
  const email = String(req.body.email || '').trim().toLowerCase();
  const plan = String(req.body.plan || '');
  if (!PLANS[plan]) return res.status(400).json({ error: 'Goi khong ton tai' });
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!u) return res.status(404).json({ error: 'Khong tim thay nguoi dung' });
  const expires = plan === 'free' ? null : Date.now() + 31 * 24 * 3600 * 1000;
  db.prepare('UPDATE users SET plan=?, plan_expires=? WHERE id=?').run(plan, expires, u.id);
  res.json({ ok: true, email, plan, expires });
});

// ---- Chuyen doi ----
async function ffprobeDuration(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Math.ceil(parseFloat(stdout.trim()) || 0);
}

app.post('/api/transcribe', auth, upload.single('file'), async (req, res) => {
  const tmpFiles = [];
  try {
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'May chu chua cau hinh OPENAI_API_KEY' });
    if (!req.file) return res.status(400).json({ error: 'Chua chon file' });
    tmpFiles.push(req.file.path);

    const format = req.body.format === 'srt' ? 'srt' : 'txt';
    const language = /^[a-z]{2}$/.test(req.body.language || '') ? req.body.language : 'vi';

    // do dai file de tru han muc
    const duration = await ffprobeDuration(req.file.path);
    if (!duration) return res.status(400).json({ error: 'Khong doc duoc am thanh tu file nay' });
    const u = req.user;
    const remain = quotaSeconds(u) - u.used_seconds;
    if (duration > remain) {
      return res.status(402).json({
        error: `Het han muc: file dai ${Math.ceil(duration / 60)} phut, ban con ${Math.max(0, Math.floor(remain / 60))} phut trong thang. Hay nang goi.`,
      });
    }

    // tach am thanh: mp3 mono 16kHz de gui len OpenAI (nhe va nhanh)
    const audioPath = req.file.path + '.mp3';
    tmpFiles.push(audioPath);
    await run('ffmpeg', ['-y', '-i', req.file.path, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '48k', audioPath]);

    // goi OpenAI: srt can moc thoi gian -> whisper-1; van ban thuan -> gpt-4o-mini-transcribe re + chuan
    const model = format === 'srt' ? 'whisper-1' : 'gpt-4o-mini-transcribe';
    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync(audioPath)], { type: 'audio/mpeg' }), 'audio.mp3');
    form.append('model', model);
    form.append('language', language);
    if (format === 'srt') form.append('response_format', 'srt');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error('OpenAI loi:', resp.status, errText.slice(0, 500));
      return res.status(502).json({ error: 'AI dang ban, vui long thu lai sau it phut' });
    }
    const result = format === 'srt' ? await resp.text() : (await resp.json()).text;

    // tru han muc + ghi log
    db.prepare('UPDATE users SET used_seconds = used_seconds + ? WHERE id=?').run(duration, u.id);
    db.prepare('INSERT INTO logs (id,user_id,seconds,kind,created_at) VALUES (?,?,?,?,?)')
      .run(randomUUID(), u.id, duration, format, Date.now());

    res.json({ format, durationSeconds: duration, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Loi xu ly, vui long thu lai' });
  } finally {
    for (const f of tmpFiles) fs.promises.unlink(f).catch(() => {});
  }
});

app.listen(PORT, () => console.log(`May chu chay tai cong ${PORT}`));
