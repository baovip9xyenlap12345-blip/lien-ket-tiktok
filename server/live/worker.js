// Worker cho 1 PHIEN LIVE (tien trinh con, fork tu manager).
// KHONG mo CSDL — moi trang thai gui ve manager qua IPC (process.send).
// Nhiem vu: dung scene.mp4 -> chay FFmpeg ben vung -> bom TTS vao FIFO -> cap nhat overlay.
// Neu FFmpeg chet: thoat ma 1 de manager restart co backoff.
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { makeFifo, buildFfmpegArgs, spawnFfmpeg } from './ffmpeg.js';
import { AudioDirector } from './audio.js';
import { createTts } from './tts.js';
import { createScriptGen, FILLERS } from './script.js';
import { createOverlay } from './overlay.js';

const run = promisify(execFile);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const send = msg => { try { process.send(msg); } catch {} };
const log = (kind, text, productId) => send({ type: 'log', kind, text: String(text).slice(0, 1000), productId: productId || null });

let cfg = null;
let ffmpeg = null;
let director = null;
let stopping = false;
let tts, scriptGen, overlay;
const fillerCache = new Map();

process.on('message', async msg => {
  if (msg.type === 'init' && !cfg) { cfg = msg.config; main().catch(fatal); }
  else if (msg.type === 'stop') gracefulStop();
  else if (msg.type === 'say' && director && tts) {
    // manager nho MC doc 1 cau (vd: canh bao sap het gio)
    tts.synthesize(msg.text).then(pcm => director.enqueue(pcm, 0, { kind: 'system', text: msg.text })).catch(() => {});
  } else if (msg.type === 'fake_comment') {
    // phuc vu kiem thu: bom binh luan gia vao duong xu ly that
    if (commentsBuffer) commentsBuffer.push({ platform: 'tiktok', username: msg.username || 'test', comment: msg.comment || '' });
  }
});

function fatal(err) {
  send({ type: 'fatal', message: String(err && err.message || err).slice(0, 500) });
  process.exit(1);
}

function gracefulStop() {
  if (stopping) return;
  stopping = true;
  try { if (director) director.stop(); } catch {}
  try { if (ffmpeg) ffmpeg.kill('SIGTERM'); } catch {}
  setTimeout(() => { try { if (ffmpeg) ffmpeg.kill('SIGKILL'); } catch {}; process.exit(0); }, 4000);
}
process.on('SIGTERM', gracefulStop);

// ---- Binh luan (bat o M4 qua comments.js; buffer nay luon ton tai de test duoc) ----
let commentsBuffer = [];

async function main() {
  const dir = path.join(cfg.dataDir, 'live', 'sessions', cfg.sessionId);
  fs.mkdirSync(dir, { recursive: true });

  tts = createTts(cfg.tts);
  scriptGen = createScriptGen({ ...cfg.llm, onWarn: w => log('system', w) });
  overlay = createOverlay(dir);
  overlay.showProduct(cfg.products[0] || null);

  // 1) scene.mp4: 1 clip -> dung truc tiep; nhieu clip -> noi bang concat demuxer (-c copy, da chuan hoa)
  let sceneFile;
  const clips = cfg.assets.filter(a => fs.existsSync(a.file_path));
  if (!clips.length) throw new Error('Khong tim thay file video clip nao cua phien');
  if (clips.length === 1) sceneFile = clips[0].file_path;
  else {
    sceneFile = path.join(dir, 'scene.mp4');
    const listFile = path.join(dir, 'list.txt');
    fs.writeFileSync(listFile, clips.map(c => `file '${c.file_path.replace(/'/g, "'\\''")}'`).join('\n'));
    await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', sceneFile]);
  }

  // 2) FIFO am thanh + FFmpeg ben vung
  const fifoPath = path.join(dir, 'audio.fifo');
  makeFifo(fifoPath);
  const args = buildFfmpegArgs({ sceneFile, fifoPath, overlayFiles: overlay.files, targets: cfg.targets });

  ffmpeg = spawnFfmpeg({
    args,
    targets: cfg.targets,
    onTargetError: (targetId, line) => send({ type: 'target_error', targetId, line }),
    onExit: (code, sig, tail) => {
      if (stopping) return;
      send({ type: 'fatal', message: `FFmpeg thoat (code=${code} sig=${sig}): ${tail.split('\n').slice(-3).join(' | ').slice(0, 400)}` });
      process.exit(1);
    },
  });

  // 3) Mo FIFO de ghi (hoan tat khi FFmpeg mo dau doc) roi bat dau bom am thanh theo nhip
  const fifoStream = fs.createWriteStream(fifoPath);
  fifoStream.on('error', () => { /* EPIPE khi ffmpeg chet -> onExit lo */ });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('FFmpeg khong mo duong am thanh (timeout 15s)')), 15000);
    fifoStream.on('open', () => { clearTimeout(t); resolve(); });
    fifoStream.on('error', e => { clearTimeout(t); reject(e); });
  });

  director = new AudioDirector(fifoStream, {
    onSegmentStart: meta => {
      if (!meta || !meta.text) return;
      if (meta.productId) {
        const p = cfg.products.find(x => x.id === meta.productId);
        if (p) overlay.showProduct(p);
      }
      log(meta.kind || 'script', meta.text, meta.productId);
      if (meta.kind === 'comment_answer' && meta.username) {
        send({ type: 'comment_answered', platform: meta.platform || 'tiktok', username: meta.username, comment: meta.comment, answer: meta.text });
      }
    },
  });
  director.start();
  send({ type: 'ready' });
  log('system', `Bat dau phat: ${cfg.targets.map(t => t.platform).join(' + ')} | giong: ${cfg.tts.provider}`);

  // 4) Nhip tim 30s de manager cong gio da phat
  let lastBeat = Date.now();
  setInterval(() => { const now = Date.now(); send({ type: 'heartbeat', elapsedMs: now - lastBeat }); lastBeat = now; }, 30000);

  // 5) Bat doc binh luan TikTok (M4) — loi khong duoc anh huong stream
  if (cfg.commentsAi) {
    import('./comments.js')
      .then(m => m.startCommentListener({ cfg, buffer: commentsBuffer, log }))
      .catch(e => log('system', 'Khong bat duoc doc binh luan: ' + e.message));
    commentAnswerLoop().catch(() => {});
  }

  await scriptLoop();
}

// ---- Vong lap kich ban: giu san >=120s am thanh trong hang doi ----
async function scriptLoop() {
  let ttsFailWarned = false;
  while (!stopping) {
    try {
      if (director.queuedSeconds() < 120) {
        const batch = await scriptGen.generateBatch(cfg.products, 6);
        for (const seg of batch) {
          if (stopping) return;
          try {
            const pcm = await tts.synthesize(seg.text);
            director.enqueue(pcm, 1, { kind: 'script', text: seg.text, productId: seg.productId });
            ttsFailWarned = false;
          } catch (e) {
            if (!ttsFailWarned) { log('system', 'Giong doc AI loi (se thu lai): ' + e.message); ttsFailWarned = true; }
            await sleep(2000);
          }
        }
      }
      // Sap can tieng -> chen cau dem (co cache de khong goi TTS lap lai)
      if (director.queuedSeconds() < 15) {
        const text = FILLERS[Math.floor(Math.random() * FILLERS.length)];
        try {
          let pcm = fillerCache.get(text);
          if (!pcm) { pcm = await tts.synthesize(text); fillerCache.set(text, pcm); }
          director.enqueue(pcm, 2, { kind: 'filler', text });
        } catch {}
      }
    } catch (e) { log('system', 'Loi vong lap kich ban: ' + e.message); }
    await sleep(3000);
  }
}

// ---- Vong lap tra loi binh luan (chi chay khi commentsAi bat) ----
async function commentAnswerLoop() {
  const seen = new Set();
  while (!stopping) {
    await sleep(20000);
    try {
      if (!commentsBuffer.length) continue;
      const batch = commentsBuffer.splice(0, 30)
        .filter(c => c.comment && c.comment.length >= 2 && !/https?:\/\//i.test(c.comment))
        .filter(c => { const k = c.username + '|' + c.comment; if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, 10);
      if (seen.size > 2000) seen.clear();
      if (!batch.length) continue;
      for (const c of batch) send({ type: 'comment_seen', platform: c.platform, username: c.username, comment: c.comment });
      const answers = await scriptGen.answerComments(batch, cfg.products, cfg.title);
      for (const a of answers.slice(0, 2)) {
        const spoken = `Bạn ${a.username} hỏi: ${a.comment}. ${a.answer}`;
        try {
          const pcm = await tts.synthesize(spoken);
          director.enqueue(pcm, 0, { kind: 'comment_answer', text: a.answer, username: a.username, comment: a.comment, platform: 'tiktok' });
        } catch {}
      }
    } catch (e) { log('system', 'Loi tra loi binh luan: ' + e.message); }
  }
}
