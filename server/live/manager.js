// Quan ly phien live: fork 1 worker/phien, giam sat, restart co backoff,
// nhan IPC (heartbeat/log/binh luan/loi) va la NGUOI DUY NHAT ghi CSDL cho live.
// Lich tu dong (schedule_start/schedule_end) + tu dung khi het quota nam o tick().
import { fork } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { decryptSecret } from './crypto.js';

const WORKER_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'worker.js');
const BACKOFF_MS = [5000, 15000, 60000];
const MAX_RESTARTS_PER_HOUR = 10;
const RUNNING = ['starting', 'live', 'stopping'];

export function createLiveManager({ db, dataDir, plans, maxConcurrent = 3 }) {
  const workers = new Map(); // sessionId -> { child, stopping, restarts: [ts], quotaWarned }

  const q = {
    session: db.prepare('SELECT * FROM stream_sessions WHERE id=?'),
    setState: db.prepare('UPDATE stream_sessions SET state=?, last_error=COALESCE(?, last_error) WHERE id=?'),
    setError: db.prepare('UPDATE stream_sessions SET last_error=? WHERE id=?'),
    setLive: db.prepare('UPDATE stream_sessions SET state=?, started_at=?, worker_pid=?, last_error=NULL WHERE id=?'),
    setStopped: db.prepare('UPDATE stream_sessions SET state=?, ended_at=?, worker_pid=NULL WHERE id=?'),
    beat: db.prepare('UPDATE stream_sessions SET last_heartbeat=?, streamed_seconds=streamed_seconds+? WHERE id=?'),
    addUsed: db.prepare('UPDATE users SET used_stream_seconds=used_stream_seconds+? WHERE id=?'),
    bumpRestart: db.prepare('UPDATE stream_sessions SET restart_count=restart_count+1 WHERE id=?'),
    user: db.prepare('SELECT * FROM users WHERE id=?'),
    products: db.prepare('SELECT * FROM products WHERE user_id=?'),
    asset: db.prepare('SELECT * FROM stream_assets WHERE id=? AND user_id=?'),
    target: db.prepare('SELECT * FROM stream_targets WHERE id=? AND user_id=?'),
    targetFail: db.prepare("UPDATE stream_targets SET status='auth_failed', updated_at=? WHERE id=?"),
    slog: db.prepare('INSERT INTO script_log (id,session_id,kind,text,product_id,created_at) VALUES (?,?,?,?,?,?)'),
    clog: db.prepare('INSERT INTO comment_log (id,session_id,platform,username,comment,answer,answered,created_at) VALUES (?,?,?,?,?,?,?,?)'),
    due: db.prepare("SELECT id FROM stream_sessions WHERE state='scheduled' AND schedule_start IS NOT NULL AND schedule_start<=?"),
    overdue: db.prepare("SELECT id FROM stream_sessions WHERE state IN ('starting','live') AND schedule_end IS NOT NULL AND schedule_end<=?"),
    runningRows: db.prepare("SELECT * FROM stream_sessions WHERE state IN ('starting','live','stopping')"),
  };

  const slog = (sessionId, kind, text, productId = null) =>
    q.slog.run(randomUUID(), sessionId, kind, String(text).slice(0, 1000), productId, Date.now());

  const remainingSeconds = u => Math.max(0, ((plans[u.plan] || {}).hours || 0) * 3600 - (u.used_stream_seconds || 0));
  const runningCount = () => [...workers.values()].filter(w => !w.exited).length;

  function buildConfig(s) {
    const products = q.products.all(s.user_id).filter(p => JSON.parse(s.product_ids).includes(p.id));
    const assets = JSON.parse(s.asset_ids).map(id => q.asset.get(id, s.user_id)).filter(Boolean);
    const targets = JSON.parse(s.target_ids).map(id => q.target.get(id, s.user_id)).filter(Boolean)
      .map(t => ({ id: t.id, platform: t.platform, rtmp_url: t.rtmp_url, stream_key: decryptSecret(t.stream_key_enc), tiktok_username: t.tiktok_username }));
    if (!products.length) return { error: 'Phien khong con san pham nao (co the da bi xoa)' };
    if (!assets.length || !assets.some(a => fs.existsSync(a.file_path))) return { error: 'Phien khong con video clip hop le' };
    if (!targets.length) return { error: 'Phien khong con kenh phat nao' };
    return {
      config: {
        sessionId: s.id, title: s.title, dataDir,
        products, assets: assets.map(a => ({ file_path: a.file_path, duration_s: a.duration_s })),
        targets, commentsAi: !!s.comments_ai,
        tts: {
          provider: process.env.TTS_PROVIDER || 'edge',
          voice: process.env.TTS_VOICE || 'vi-VN-HoaiMyNeural',
          openaiKey: process.env.OPENAI_API_KEY || '',
          openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          openaiVoice: process.env.TTS_OPENAI_VOICE || 'alloy',
          openaiModel: process.env.TTS_OPENAI_MODEL || 'gpt-4o-mini-tts',
        },
        llm: {
          openaiKey: process.env.OPENAI_API_KEY || '',
          openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          scriptModel: process.env.SCRIPT_MODEL || 'gpt-4o-mini',
        },
      },
    };
  }

  function attach(sessionId, child) {
    const w = workers.get(sessionId);
    child.on('message', msg => {
      try { handleMsg(sessionId, msg); } catch (e) { console.error('IPC loi:', e.message); }
    });
    child.on('exit', code => {
      w.exited = true;
      const s = q.session.get(sessionId);
      if (!s) return;
      if (w.stopping || s.state === 'stopping') {
        q.setStopped.run('stopped', Date.now(), sessionId);
        slog(sessionId, 'system', 'Da dung phien');
        workers.delete(sessionId);
        return;
      }
      // Chet bat thuong -> restart co backoff, gioi han theo gio
      const now = Date.now();
      w.restarts = (w.restarts || []).filter(t => now - t < 3600000);
      if (w.restarts.length >= MAX_RESTARTS_PER_HOUR) {
        q.setState.run('error', 'Loi lien tuc, da dung tu dong (restart qua ' + MAX_RESTARTS_PER_HOUR + ' lan/gio)', sessionId);
        slog(sessionId, 'system', 'Phien gap loi lien tuc va da bi dung. Kiem tra stream key / mang roi phat lai.');
        workers.delete(sessionId);
        return;
      }
      w.restarts.push(now);
      q.bumpRestart.run(sessionId);
      const delay = BACKOFF_MS[Math.min(w.restarts.length - 1, BACKOFF_MS.length - 1)];
      slog(sessionId, 'system', `Mat ket noi (code=${code}), tu phat lai sau ${delay / 1000}s...`);
      q.setState.run('starting', null, sessionId);
      setTimeout(() => { if (workers.get(sessionId) === w) { workers.delete(sessionId); launch(sessionId, w.restarts); } }, delay);
    });
  }

  function handleMsg(sessionId, msg) {
    const w = workers.get(sessionId);
    switch (msg.type) {
      case 'ready': {
        const s = q.session.get(sessionId);
        q.setLive.run('live', s.started_at || Date.now(), w.child.pid, sessionId);
        break;
      }
      case 'heartbeat': {
        const sec = Math.max(0, Math.min(120, Math.round((msg.elapsedMs || 0) / 1000)));
        const s = q.session.get(sessionId);
        if (!s) break;
        q.beat.run(Date.now(), sec, sessionId);
        q.addUsed.run(sec, s.user_id);
        const u = q.user.get(s.user_id);
        const rem = remainingSeconds(u);
        if (rem <= 0) {
          slog(sessionId, 'system', 'Het gio live cua goi — tu dong dung phien.');
          stopSession(sessionId, 'quota');
        } else if (rem < 600 && !w.quotaWarned) {
          w.quotaWarned = true;
          slog(sessionId, 'system', 'Sap het gio live cua goi (con < 10 phut). Gia han de khong bi gian doan.');
          try { w.child.send({ type: 'say', text: 'Phiên live của shop sắp kết thúc, cả nhà nhanh tay chốt đơn kẻo lỡ nhé!' }); } catch {}
        }
        break;
      }
      case 'log': slog(sessionId, msg.kind || 'system', msg.text || '', msg.productId); break;
      case 'comment_seen': q.clog.run(randomUUID(), sessionId, msg.platform || 'tiktok', String(msg.username || '').slice(0, 100), String(msg.comment || '').slice(0, 500), null, 0, Date.now()); break;
      case 'comment_answered': q.clog.run(randomUUID(), sessionId, msg.platform || 'tiktok', String(msg.username || '').slice(0, 100), String(msg.comment || '').slice(0, 500), String(msg.answer || '').slice(0, 500), 1, Date.now()); break;
      case 'target_error': {
        if (!w.targetErrAt || Date.now() - w.targetErrAt > 60000) {
          w.targetErrAt = Date.now();
          q.targetFail.run(Date.now(), msg.targetId);
          slog(sessionId, 'system', 'Mot kenh phat bao loi (key sai/het han?): ' + (msg.line || ''));
        }
        break;
      }
      case 'fatal': q.setError.run(String(msg.message || '').slice(0, 500), sessionId); break;
    }
  }

  function launch(sessionId, restarts = []) {
    const s = q.session.get(sessionId);
    if (!s || workers.has(sessionId)) return 'Phien dang chay roi';
    const built = buildConfig(s);
    if (built.error) { q.setState.run('error', built.error, sessionId); return built.error; }
    const child = fork(WORKER_PATH, [], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
    workers.set(sessionId, { child, stopping: false, restarts, quotaWarned: false });
    attach(sessionId, child);
    child.send({ type: 'init', config: built.config });
    return null;
  }

  // ---- API cho routes ----
  async function startSession(sessionId) {
    const s = q.session.get(sessionId);
    if (!s) return 'Khong tim thay phien';
    if (RUNNING.includes(s.state) || workers.has(sessionId)) return 'Phien dang chay roi';
    if (runningCount() >= maxConcurrent) return `May chu dang phat toi da ${maxConcurrent} phien. Thu lai sau hoac lien he ho tro.`;
    const u = q.user.get(s.user_id);
    if (remainingSeconds(u) < 60) return 'Tai khoan da het gio live cua goi';
    q.setState.run('starting', null, sessionId);
    slog(sessionId, 'system', 'Dang khoi dong phien live...');
    return launch(sessionId);
  }

  function stopSession(sessionId, who = 'user') {
    const w = workers.get(sessionId);
    const s = q.session.get(sessionId);
    if (!s) return;
    if (!w) {
      if (RUNNING.includes(s.state) || s.state === 'scheduled') q.setStopped.run('stopped', Date.now(), sessionId);
      return;
    }
    w.stopping = true;
    q.setState.run('stopping', null, sessionId);
    slog(sessionId, 'system', `Nhan lenh dung (${who})`);
    try { w.child.send({ type: 'stop' }); } catch {}
    setTimeout(() => { try { if (!w.exited) w.child.kill('SIGKILL'); } catch {} }, 8000);
  }

  // Khoi dong lai server: phien 'starting'/'live' -> phat lai; 'stopping' -> coi nhu da dung
  function reconcile() {
    for (const s of q.runningRows.all()) {
      if (s.state === 'stopping') { q.setStopped.run('stopped', Date.now(), s.id); continue; }
      slog(s.id, 'system', 'May chu khoi dong lai — tu phat lai phien...');
      q.setState.run('starting', null, s.id);
      launch(s.id);
    }
  }

  // Moi phut: chay phien den gio hen, dung phien den gio ket thuc
  function tick() {
    const now = Date.now();
    for (const { id } of q.due.all(now)) {
      const err = startSession(id);
      if (err && typeof err.then === 'function') err.then(e => { if (e) slog(id, 'system', 'Khong tu phat duoc: ' + e); });
    }
    for (const { id } of q.overdue.all(now)) {
      slog(id, 'system', 'Den gio ket thuc theo lich — tu dong dung.');
      stopSession(id, 'schedule');
    }
  }

  // Test/nang cao: bom binh luan gia vao worker dang chay
  function injectComment(sessionId, username, comment) {
    const w = workers.get(sessionId);
    if (!w || w.exited) return 'Phien khong chay';
    try { w.child.send({ type: 'fake_comment', username, comment }); } catch {}
    return null;
  }

  setInterval(tick, 60000);
  return { startSession, stopSession, reconcile, tick, injectComment, runningCount };
}
