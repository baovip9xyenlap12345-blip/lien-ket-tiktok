// REST API cho Livestream AI: san pham, video clip, kenh phat, phien live
import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { encryptSecret, hasSecretKey } from './crypto.js';

const run = promisify(execFile);

const MAX_CLIP_MB = 200;
const MAX_STORAGE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB / shop
const MAX_CLIPS_PER_SESSION = 20;

export function mountLiveRoutes(app, ctx) {
  const { db, auth, adminOnly, rateLimit, dataDir, remainingStreamSeconds } = ctx;
  const assetsDir = path.join(dataDir, 'live', 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  const upload = multer({ dest: path.join(dataDir, 'uploads'), limits: { fileSize: MAX_CLIP_MB * 1024 * 1024 } });
  const r = express.Router();
  r.use(auth);

  const now = () => Date.now();
  const own = (table, id, userId) => db.prepare(`SELECT * FROM ${table} WHERE id=? AND user_id=?`).get(id, userId);
  const parseIds = (v, max = 50) => {
    if (Array.isArray(v)) return v.slice(0, max).map(String);
    try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a.slice(0, max).map(String) : []; } catch { return []; }
  };

  // ---------- San pham ----------
  r.get('/products', (req, res) => {
    res.json({ products: db.prepare('SELECT * FROM products WHERE user_id=? ORDER BY sort_order, created_at').all(req.userId) });
  });

  function productBody(req) {
    return {
      name: String(req.body.name || '').trim().slice(0, 200),
      price: Number.isFinite(+req.body.price) ? Math.max(0, Math.round(+req.body.price)) : null,
      promo_price: Number.isFinite(+req.body.promo_price) && req.body.promo_price !== '' && req.body.promo_price != null ? Math.max(0, Math.round(+req.body.promo_price)) : null,
      description: String(req.body.description || '').slice(0, 2000),
      selling_points: String(req.body.selling_points || '').slice(0, 2000),
      active: req.body.active === undefined ? 1 : (req.body.active ? 1 : 0),
      sort_order: Number.isFinite(+req.body.sort_order) ? Math.round(+req.body.sort_order) : 0,
    };
  }

  r.post('/products', (req, res) => {
    const b = productBody(req);
    if (!b.name) return res.status(400).json({ error: 'Thieu ten san pham' });
    const id = randomUUID();
    db.prepare(`INSERT INTO products (id,user_id,name,price,promo_price,description,selling_points,active,sort_order,created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(id, req.userId, b.name, b.price, b.promo_price, b.description, b.selling_points, b.active, b.sort_order, now());
    res.json({ ok: true, id });
  });

  r.put('/products/:id', (req, res) => {
    if (!own('products', req.params.id, req.userId)) return res.status(404).json({ error: 'Khong tim thay san pham' });
    const b = productBody(req);
    if (!b.name) return res.status(400).json({ error: 'Thieu ten san pham' });
    db.prepare(`UPDATE products SET name=?, price=?, promo_price=?, description=?, selling_points=?, active=?, sort_order=? WHERE id=?`)
      .run(b.name, b.price, b.promo_price, b.description, b.selling_points, b.active, b.sort_order, req.params.id);
    res.json({ ok: true });
  });

  r.delete('/products/:id', (req, res) => {
    if (!own('products', req.params.id, req.userId)) return res.status(404).json({ error: 'Khong tim thay san pham' });
    db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  });

  // ---------- Video clip ----------
  r.get('/assets', (req, res) => {
    const assets = db.prepare('SELECT id,kind,orig_name,duration_s,size_bytes,normalized,created_at FROM stream_assets WHERE user_id=? ORDER BY created_at DESC').all(req.userId);
    const used = assets.reduce((s, a) => s + (a.size_bytes || 0), 0);
    res.json({ assets, storageUsed: used, storageMax: MAX_STORAGE_BYTES });
  });

  // Upload clip -> chuan hoa 1 lan ve 720x1280@30fps H.264, bo tieng (de loop + concat re)
  r.post('/assets', rateLimit(30, 10 * 60 * 1000), upload.single('file'), async (req, res) => {
    const tmp = [];
    try {
      if (!req.file) return res.status(400).json({ error: 'Chua chon file video' });
      tmp.push(req.file.path);
      const used = db.prepare('SELECT COALESCE(SUM(size_bytes),0) s FROM stream_assets WHERE user_id=?').get(req.userId).s;
      if (used >= MAX_STORAGE_BYTES) return res.status(400).json({ error: 'Het dung luong luu tru (2GB). Hay xoa bot clip cu.' });

      const id = randomUUID();
      const userDir = path.join(assetsDir, req.userId);
      fs.mkdirSync(userDir, { recursive: true });
      const outPath = path.join(userDir, id + '.mp4');

      try {
        await run('ffmpeg', ['-y', '-i', req.file.path,
          '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black,fps=30,format=yuv420p',
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-g', '60', '-an', '-movflags', '+faststart', outPath,
        ], { timeout: 10 * 60 * 1000, maxBuffer: 16 * 1024 * 1024 });
      } catch {
        fs.promises.unlink(outPath).catch(() => {});
        return res.status(400).json({ error: 'Khong doc duoc video nay. Hay thu MP4/MOV quay doc (9:16).' });
      }

      const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outPath]);
      const duration = Math.ceil(parseFloat(stdout.trim()) || 0);
      if (duration < 3) {
        fs.promises.unlink(outPath).catch(() => {});
        return res.status(400).json({ error: 'Clip qua ngan (toi thieu 3 giay)' });
      }
      const size = fs.statSync(outPath).size;
      db.prepare(`INSERT INTO stream_assets (id,user_id,kind,orig_name,file_path,duration_s,size_bytes,normalized,created_at)
                  VALUES (?,?,?,?,?,?,?,1,?)`)
        .run(id, req.userId, 'clip', String(req.file.originalname || '').slice(0, 200), outPath, duration, size, now());
      res.json({ ok: true, id, duration_s: duration });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Loi xu ly video, vui long thu lai' });
    } finally {
      for (const f of tmp) fs.promises.unlink(f).catch(() => {});
    }
  });

  r.delete('/assets/:id', (req, res) => {
    const a = own('stream_assets', req.params.id, req.userId);
    if (!a) return res.status(404).json({ error: 'Khong tim thay clip' });
    db.prepare('DELETE FROM stream_assets WHERE id=?').run(a.id);
    fs.promises.unlink(a.file_path).catch(() => {});
    res.json({ ok: true });
  });

  // ---------- Kenh phat (RTMP target) ----------
  r.get('/targets', (req, res) => {
    const targets = db.prepare('SELECT id,platform,rtmp_url,key_last4,tiktok_username,status,updated_at FROM stream_targets WHERE user_id=? ORDER BY updated_at DESC').all(req.userId)
      .map(t => ({ ...t, stream_key_masked: '••••••••' + (t.key_last4 || '') }));
    res.json({ targets });
  });

  r.post('/targets', (req, res) => {
    if (!hasSecretKey()) return res.status(500).json({ error: 'May chu chua cau hinh SECRET_KEY_BASE (lien he quan tri)' });
    const platform = ['tiktok', 'shopee', 'custom'].includes(req.body.platform) ? req.body.platform : null;
    const rtmpUrl = String(req.body.rtmp_url || '').trim();
    const streamKey = String(req.body.stream_key || '').trim();
    const tiktokUsername = String(req.body.tiktok_username || '').trim().replace(/^@/, '').slice(0, 100) || null;
    if (!platform) return res.status(400).json({ error: 'Chon nen tang: tiktok / shopee / custom' });
    if (!/^rtmps?:\/\/\S+$/.test(rtmpUrl) || rtmpUrl.length > 500) return res.status(400).json({ error: 'URL RTMP khong hop le (phai bat dau bang rtmp:// hoac rtmps://)' });
    if (!streamKey || streamKey.length > 500) return res.status(400).json({ error: 'Thieu stream key' });
    const id = randomUUID();
    db.prepare(`INSERT INTO stream_targets (id,user_id,platform,rtmp_url,stream_key_enc,key_last4,tiktok_username,status,updated_at)
                VALUES (?,?,?,?,?,?,?,'ok',?)`)
      .run(id, req.userId, platform, rtmpUrl, encryptSecret(streamKey), streamKey.slice(-4), tiktokUsername, now());
    res.json({ ok: true, id });
  });

  r.delete('/targets/:id', (req, res) => {
    if (!own('stream_targets', req.params.id, req.userId)) return res.status(404).json({ error: 'Khong tim thay kenh phat' });
    db.prepare('DELETE FROM stream_targets WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  });

  // ---------- Phien live ----------
  const RUNNING = ['starting', 'live', 'stopping'];

  function sessionBody(req, userId) {
    const productIds = parseIds(req.body.product_ids).filter(id => own('products', id, userId));
    const assetIds = parseIds(req.body.asset_ids, MAX_CLIPS_PER_SESSION).filter(id => own('stream_assets', id, userId));
    const targetIds = parseIds(req.body.target_ids, 4).filter(id => own('stream_targets', id, userId));
    const toMs = v => { const n = +v; return Number.isFinite(n) && n > 0 ? Math.round(n) : null; };
    return {
      title: String(req.body.title || '').trim().slice(0, 200) || 'Phien live',
      product_ids: productIds, asset_ids: assetIds, target_ids: targetIds,
      comments_ai: req.body.comments_ai ? 1 : 0,
      schedule_start: toMs(req.body.schedule_start),
      schedule_end: toMs(req.body.schedule_end),
    };
  }

  function validateSession(b) {
    if (!b.product_ids.length) return 'Chon it nhat 1 san pham';
    if (!b.asset_ids.length) return 'Chon it nhat 1 video clip';
    if (!b.target_ids.length) return 'Chon it nhat 1 kenh phat';
    if (b.schedule_start && b.schedule_end && b.schedule_end <= b.schedule_start) return 'Gio ket thuc phai sau gio bat dau';
    return null;
  }

  r.get('/sessions', (req, res) => {
    const sessions = db.prepare('SELECT * FROM stream_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(req.userId);
    res.json({ sessions, remainingStreamSeconds: remainingStreamSeconds(req.user) });
  });

  r.post('/sessions', (req, res) => {
    const b = sessionBody(req, req.userId);
    const bad = validateSession(b);
    if (bad) return res.status(400).json({ error: bad });
    const id = randomUUID();
    const state = b.schedule_start ? 'scheduled' : 'stopped';
    db.prepare(`INSERT INTO stream_sessions (id,user_id,title,state,product_ids,asset_ids,target_ids,comments_ai,schedule_start,schedule_end,created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, req.userId, b.title, state, JSON.stringify(b.product_ids), JSON.stringify(b.asset_ids), JSON.stringify(b.target_ids),
        b.comments_ai, b.schedule_start, b.schedule_end, now());
    res.json({ ok: true, id });
  });

  r.put('/sessions/:id', (req, res) => {
    const s = own('stream_sessions', req.params.id, req.userId);
    if (!s) return res.status(404).json({ error: 'Khong tim thay phien live' });
    if (RUNNING.includes(s.state)) return res.status(400).json({ error: 'Phien dang chay — dung phien truoc khi sua' });
    const b = sessionBody(req, req.userId);
    const bad = validateSession(b);
    if (bad) return res.status(400).json({ error: bad });
    const state = b.schedule_start ? 'scheduled' : 'stopped';
    db.prepare(`UPDATE stream_sessions SET title=?, state=?, product_ids=?, asset_ids=?, target_ids=?, comments_ai=?, schedule_start=?, schedule_end=? WHERE id=?`)
      .run(b.title, state, JSON.stringify(b.product_ids), JSON.stringify(b.asset_ids), JSON.stringify(b.target_ids),
        b.comments_ai, b.schedule_start, b.schedule_end, s.id);
    res.json({ ok: true });
  });

  r.delete('/sessions/:id', (req, res) => {
    const s = own('stream_sessions', req.params.id, req.userId);
    if (!s) return res.status(404).json({ error: 'Khong tim thay phien live' });
    if (RUNNING.includes(s.state)) return res.status(400).json({ error: 'Phien dang chay — dung phien truoc khi xoa' });
    db.prepare('DELETE FROM stream_sessions WHERE id=?').run(s.id);
    res.json({ ok: true });
  });

  r.get('/sessions/:id', (req, res) => {
    const s = own('stream_sessions', req.params.id, req.userId);
    if (!s) return res.status(404).json({ error: 'Khong tim thay phien live' });
    const scripts = db.prepare('SELECT kind,text,product_id,created_at FROM script_log WHERE session_id=? ORDER BY created_at DESC LIMIT 30').all(s.id);
    const comments = db.prepare('SELECT platform,username,comment,answer,answered,created_at FROM comment_log WHERE session_id=? ORDER BY created_at DESC LIMIT 30').all(s.id);
    res.json({ session: s, scripts, comments, remainingStreamSeconds: remainingStreamSeconds(req.user) });
  });

  r.post('/sessions/:id/start', rateLimit(20, 10 * 60 * 1000), async (req, res) => {
    const s = own('stream_sessions', req.params.id, req.userId);
    if (!s) return res.status(404).json({ error: 'Khong tim thay phien live' });
    if (!ctx.manager) return res.status(503).json({ error: 'May chu chua bat tinh nang phat live' });
    if (RUNNING.includes(s.state)) return res.status(400).json({ error: 'Phien nay dang chay roi' });
    if (remainingStreamSeconds(req.user) < 60) {
      return res.status(402).json({ error: 'Ban da het gio live cua goi. Hay mua/gia han goi de tiep tuc.', upgrade: true });
    }
    const err = await ctx.manager.startSession(s.id);
    if (err) return res.status(400).json({ error: err });
    res.json({ ok: true });
  });

  r.post('/sessions/:id/stop', (req, res) => {
    const s = own('stream_sessions', req.params.id, req.userId);
    if (!s) return res.status(404).json({ error: 'Khong tim thay phien live' });
    if (!ctx.manager) return res.status(503).json({ error: 'May chu chua bat tinh nang phat live' });
    ctx.manager.stopSession(s.id, 'user');
    res.json({ ok: true });
  });

  app.use('/api/live', r);

  // ---------- Quan tri ----------
  const ra = express.Router();
  ra.use(auth, adminOnly);
  ra.get('/sessions', (req, res) => {
    const sessions = db.prepare(`
      SELECT s.*, u.email FROM stream_sessions s JOIN users u ON u.id = s.user_id
      ORDER BY (s.state IN ('starting','live','stopping')) DESC, s.created_at DESC LIMIT 200`).all();
    res.json({ sessions });
  });
  ra.post('/sessions/:id/stop', (req, res) => {
    const s = db.prepare('SELECT * FROM stream_sessions WHERE id=?').get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Khong tim thay phien' });
    if (!ctx.manager) return res.status(503).json({ error: 'Tinh nang live chua bat' });
    ctx.manager.stopSession(s.id, 'admin');
    res.json({ ok: true });
  });
  // Kiem thu: bom 1 binh luan gia vao phien dang chay (di qua dung duong xu ly that)
  ra.post('/sessions/:id/test-comment', (req, res) => {
    if (!ctx.manager) return res.status(503).json({ error: 'Tinh nang live chua bat' });
    const err = ctx.manager.injectComment(req.params.id, String(req.body.username || 'khach_test'), String(req.body.comment || ''));
    if (err) return res.status(400).json({ error: err });
    res.json({ ok: true });
  });
  app.use('/api/admin/live', ra);
}
