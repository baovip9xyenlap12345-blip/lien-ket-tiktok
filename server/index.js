// May chu "App Cua Bao Gau Bong" - chuyen video/ghi am thanh van ban bang OpenAI API
// Tinh phi theo GOI (so video), moi video toi da MAX_VIDEO_MINUTES phut
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
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'doi-chuoi-nay-khi-trien-khai';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
const BANK_INFO = process.env.BANK_INFO || 'Ngan hang: (dien ten) | So TK: (dien so) | Chu TK: (dien ten) | Noi dung: TEN GOI + email cua ban';
// Lien he ho tro hien cho khach (vd: Zalo 09xxx)
const CONTACT_INFO = process.env.CONTACT_INFO || '';
// Moi video toi da bao nhieu phut (ap dung moi goi)
const MAX_VIDEO_MINUTES = parseInt(process.env.MAX_VIDEO_MINUTES || '5', 10);
// Link ban mien phi chay tren trinh duyet (GitHub Pages)
const FREE_APP_URL = process.env.FREE_APP_URL || 'https://baovip9xyenlap12345-blip.github.io/lien-ket-tiktok/app.html';

if (JWT_SECRET === 'doi-chuoi-nay-khi-trien-khai') {
  console.warn('CANH BAO: JWT_SECRET dang dung gia tri mac dinh — hay dat chuoi bi mat rieng khi trien khai that!');
}

// Cac goi: videos = so luot chuyen doi trong ky; days = so ngay hieu luc
const PLANS = {
  trial: { name: 'Dung thu',       videos: 1,    price: 0,      days: null },
  week:  { name: 'Goi tuan',       videos: 10,   price: 59000,  days: 7 },
  month: { name: 'Goi thang',      videos: 30,   price: 199000, days: 30 },
  pro:   { name: 'Chuyen nghiep',  videos: 1000, price: 499000, days: 30 },
};

// ====== CSDL ======
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = new Database(path.join(__dirname, 'data', 'app.db'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'trial',
  plan_expires INTEGER,           -- epoch ms; null = khong het han
  used_videos INTEGER NOT NULL DEFAULT 0,
  trial_used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  seconds INTEGER NOT NULL,
  kind TEXT NOT NULL,
  created_at INTEGER NOT NULL
);`);

function getUser(id) {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  if (!u) return null;
  // goi tra phi het han -> ve trang thai dung thu (da dung het neu trial_used)
  if (u.plan !== 'trial' && u.plan_expires && Date.now() > u.plan_expires) {
    db.prepare("UPDATE users SET plan='trial', plan_expires=NULL, used_videos=0 WHERE id=?").run(u.id);
    u.plan = 'trial'; u.plan_expires = null; u.used_videos = 0;
  }
  return u;
}
// So video con lai trong ky cua nguoi dung
function remainingVideos(u) {
  if (u.plan === 'trial') return u.trial_used ? 0 : PLANS.trial.videos;
  return Math.max(0, (PLANS[u.plan] || PLANS.trial).videos - u.used_videos);
}

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
function adminOnly(req, res, next) {
  if (!ADMIN_EMAIL || req.user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Khong co quyen quan tri' });
  next();
}

// Chan do mat khau: gioi han so lan goi dang nhap/dang ky theo IP (trong bo nho)
const rlBuckets = new Map();
function rateLimit(maxHits, windowMs) {
  return (req, res, next) => {
    const key = req.path + '|' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');
    const now = Date.now();
    let b = rlBuckets.get(key);
    if (!b || now > b.reset) { b = { count: 0, reset: now + windowMs }; rlBuckets.set(key, b); }
    b.count++;
    if (rlBuckets.size > 10000) rlBuckets.clear(); // tranh phinh bo nho
    if (b.count > maxHits) return res.status(429).json({ error: 'Thao tac qua nhieu lan, vui long thu lai sau it phut' });
    next();
  };
}

// ---- Tai khoan ----
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/register', rateLimit(20, 10 * 60 * 1000), (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (email.length > 200 || !/^[^\s<>"']+@[^\s<>"']+\.[^\s<>"']+$/.test(email)) return res.status(400).json({ error: 'Email khong hop le' });
  if (password.length < 6 || password.length > 100) return res.status(400).json({ error: 'Mat khau toi thieu 6 ky tu (toi da 100)' });
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) return res.status(400).json({ error: 'Email da dang ky' });
  const id = randomUUID();
  db.prepare('INSERT INTO users (id,email,pass_hash,created_at) VALUES (?,?,?,?)')
    .run(id, email, bcrypt.hashSync(password, 10), Date.now());
  res.json({ token: jwt.sign({ uid: id }, JWT_SECRET, { expiresIn: '30d' }) });
});

app.post('/api/login', rateLimit(30, 10 * 60 * 1000), (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!u || !bcrypt.compareSync(String(req.body.password || ''), u.pass_hash)) {
    return res.status(400).json({ error: 'Sai email hoac mat khau' });
  }
  res.json({ token: jwt.sign({ uid: u.id }, JWT_SECRET, { expiresIn: '30d' }) });
});

app.get('/api/me', auth, (req, res) => {
  const u = req.user;
  const p = PLANS[u.plan] || PLANS.trial;
  res.json({
    email: u.email,
    plan: u.plan,
    planName: p.name,
    planExpires: u.plan_expires,
    remainingVideos: remainingVideos(u),
    quotaVideos: p.videos,
    trialUsed: !!u.trial_used,
    maxVideoMinutes: MAX_VIDEO_MINUTES,
    freeAppUrl: FREE_APP_URL,
    isAdmin: !!(ADMIN_EMAIL && u.email === ADMIN_EMAIL),
  });
});

app.get('/api/plans', (req, res) => res.json({ plans: PLANS, bank: BANK_INFO, contact: CONTACT_INFO, maxVideoMinutes: MAX_VIDEO_MINUTES, freeAppUrl: FREE_APP_URL }));

// ---- Quan tri vien ----
// Danh sach khach hang: email, goi, da dung, con lai, ngay dang ky, lan dung gan nhat
app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  let rows = db.prepare(`
    SELECT u.*, COUNT(l.id) AS total_jobs, COALESCE(SUM(l.seconds),0) AS total_seconds, MAX(l.created_at) AS last_used
    FROM users u LEFT JOIN logs l ON l.user_id = u.id
    ${q ? 'WHERE u.email LIKE ?' : ''}
    GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500
  `).all(...(q ? ['%' + q + '%'] : []));
  res.json({
    users: rows.map(u => ({
      email: u.email,
      plan: u.plan,
      planName: (PLANS[u.plan] || PLANS.trial).name,
      planExpires: u.plan_expires,
      usedVideos: u.plan === 'trial' ? (u.trial_used ? 1 : 0) : u.used_videos,
      remainingVideos: remainingVideos(u),
      trialUsed: !!u.trial_used,
      totalJobs: u.total_jobs,
      totalMinutes: Math.round(u.total_seconds / 60),
      lastUsed: u.last_used,
      createdAt: u.created_at,
    })),
  });
});

// Kich hoat / doi goi cho khach (sau khi nhan chuyen khoan)
app.post('/api/admin/set-plan', auth, adminOnly, (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const plan = String(req.body.plan || '');
  if (!PLANS[plan]) return res.status(400).json({ error: 'Goi khong ton tai' });
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!u) return res.status(404).json({ error: 'Khong tim thay nguoi dung' });
  const expires = PLANS[plan].days ? Date.now() + PLANS[plan].days * 24 * 3600 * 1000 : null;
  // kich hoat goi moi: dat lai so video da dung trong ky
  db.prepare('UPDATE users SET plan=?, plan_expires=?, used_videos=0 WHERE id=?').run(plan, expires, u.id);
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
    const u = req.user;

    // con luot khong?
    if (remainingVideos(u) < 1) {
      return res.status(402).json({
        error: u.plan === 'trial'
          ? `Ban da dung het luot mien phi. Co the dung ban mien phi tren web (cham hon) tai ${FREE_APP_URL} hoac mua goi de xu ly nhanh va chuan hon.`
          : 'Ban da dung het so video cua goi. Hay gia han hoac nang goi de tiep tuc.',
        upgrade: true,
      });
    }

    // do dai video
    const duration = await ffprobeDuration(req.file.path);
    if (!duration) return res.status(400).json({ error: 'Khong doc duoc am thanh tu file nay' });
    if (duration > MAX_VIDEO_MINUTES * 60) {
      return res.status(400).json({ error: `Video dai ${Math.ceil(duration / 60)} phut — toi da ${MAX_VIDEO_MINUTES} phut/video. Hay cat ngan video roi thu lai.` });
    }

    // tach am thanh: mp3 mono 16kHz de gui len OpenAI
    const audioPath = req.file.path + '.mp3';
    tmpFiles.push(audioPath);
    try {
      await run('ffmpeg', ['-y', '-i', req.file.path, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '48k', audioPath]);
    } catch {
      return res.status(400).json({ error: 'File nay khong co am thanh hoac dinh dang khong ho tro. Hay thu MP4, MOV, MP3, WAV...' });
    }

    // srt can moc thoi gian -> whisper-1; van ban thuan -> gpt-4o-mini-transcribe
    const model = format === 'srt' ? 'whisper-1' : 'gpt-4o-mini-transcribe';
    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync(audioPath)], { type: 'audio/mpeg' }), 'audio.mp3');
    form.append('model', model);
    form.append('language', language);
    if (format === 'srt') form.append('response_format', 'srt');

    // timeout 5 phut de khong treo yeu cau
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 5 * 60 * 1000);
    let resp;
    try {
      resp = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: form,
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) {
      const errText = await resp.text();
      console.error('OpenAI loi:', resp.status, errText.slice(0, 500));
      return res.status(502).json({ error: 'AI dang ban, vui long thu lai sau it phut' });
    }
    const result = format === 'srt' ? await resp.text() : (await resp.json()).text;

    // tru luot + ghi log
    if (u.plan === 'trial') db.prepare('UPDATE users SET trial_used=1 WHERE id=?').run(u.id);
    else db.prepare('UPDATE users SET used_videos = used_videos + 1 WHERE id=?').run(u.id);
    db.prepare('INSERT INTO logs (id,user_id,seconds,kind,created_at) VALUES (?,?,?,?,?)')
      .run(randomUUID(), u.id, duration, format, Date.now());

    const after = getUser(u.id);
    res.json({ format, durationSeconds: duration, result, remainingVideos: remainingVideos(after) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Loi xu ly, vui long thu lai' });
  } finally {
    for (const f of tmpFiles) fs.promises.unlink(f).catch(() => {});
  }
});

// Bat loi upload (vd file qua lon) tra ve JSON de hieu thay vi loi ky thuat
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File qua lon (toi da 300MB). Hay nen hoac cat ngan video.' });
  console.error(err);
  res.status(500).json({ error: 'Loi may chu, vui long thu lai' });
});

app.listen(PORT, () => console.log(`May chu chay tai cong ${PORT}`));
