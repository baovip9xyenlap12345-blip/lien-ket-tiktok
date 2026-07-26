// Adapter giong doc AI -> PCM s16le 24000Hz mono (48.000 byte / giay)
// Nha cung cap: edge (Microsoft Edge TTS, mien phi) | openai (tra phi) | mock (test khong mang)
// Loi o day KHONG duoc lam sap worker: ham synthesize nem loi, noi goi tu quyet dinh bo qua doan do.
import { spawn } from 'node:child_process';

export const PCM_RATE = 24000;
export const PCM_BYTES_PER_SEC = PCM_RATE * 2; // mono 16-bit

// Giai ma mp3/bat ky dinh dang -> PCM s16le 24k mono bang ffmpeg
function decodeToPcm(inputBuf) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 's16le', '-ar', String(PCM_RATE), '-ac', '1', 'pipe:1']);
    const out = []; const err = [];
    p.stdout.on('data', d => out.push(d));
    p.stderr.on('data', d => err.push(d));
    p.on('error', reject);
    p.on('close', code => {
      const pcm = Buffer.concat(out);
      if (code !== 0 || pcm.length < 1000) return reject(new Error('ffmpeg decode loi: ' + Buffer.concat(err).toString().slice(0, 200)));
      resolve(pcm);
    });
    p.stdin.on('error', () => {});
    p.stdin.end(inputBuf);
  });
}

// ---- Microsoft Edge TTS (goi qua thu vien msedge-tts, API co the doi giua cac ban) ----
let MsEdgeMod = null;
async function edgeSynthesize(text, voice) {
  if (!MsEdgeMod) MsEdgeMod = await import('msedge-tts');
  const { MsEdgeTTS, OUTPUT_FORMAT } = MsEdgeMod;
  const tts = new MsEdgeTTS();
  const fmt = (OUTPUT_FORMAT && (OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3 || OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)) || 'audio-24khz-48kbitrate-mono-mp3';
  await tts.setMetadata(voice, fmt);
  const r = await tts.toStream(text);
  const stream = r && typeof r.on === 'function' ? r : (r && r.audioStream); // ho tro ca 2 kieu API
  if (!stream) throw new Error('msedge-tts khong tra ve stream');
  const chunks = [];
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Edge TTS qua thoi gian')), 30000);
    stream.on('data', d => chunks.push(d));
    stream.on('end', () => { clearTimeout(t); resolve(); });
    stream.on('error', e => { clearTimeout(t); reject(e); });
  });
  try { if (typeof tts.close === 'function') tts.close(); } catch {}
  return decodeToPcm(Buffer.concat(chunks));
}

// ---- OpenAI TTS: tra thang PCM 24kHz s16le mono, khong can giai ma ----
async function openaiSynthesize(text, { apiKey, baseUrl, voice, model }) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 60000);
  try {
    const resp = await fetch(`${baseUrl}/audio/speech`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, voice, input: text, response_format: 'pcm' }),
      signal: ac.signal,
    });
    if (!resp.ok) throw new Error(`OpenAI TTS ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    return Buffer.from(await resp.arrayBuffer());
  } finally { clearTimeout(t); }
}

// ---- Mock (test offline): chuoi bip co nhip theo do dai van ban ----
function mockSynthesize(text) {
  const words = Math.max(3, String(text).trim().split(/\s+/).length);
  const seconds = Math.min(60, words * 0.35);
  const n = Math.floor(seconds * PCM_RATE);
  const buf = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const tSec = i / PCM_RATE;
    const word = Math.floor(tSec / 0.35);
    const freq = 180 + (word % 7) * 40;                 // doi cao do theo "tu"
    const inWord = tSec % 0.35 < 0.26 ? 1 : 0;          // khoang lang giua cac "tu"
    const v = Math.sin(2 * Math.PI * freq * tSec) * 6500 * inWord;
    buf.writeInt16LE(v | 0, i * 2);
  }
  return Promise.resolve(buf);
}

export function createTts(cfg) {
  const provider = cfg.provider || 'edge';
  const voice = cfg.voice || 'vi-VN-HoaiMyNeural';
  return {
    provider,
    // -> Buffer PCM s16le 24k mono
    async synthesize(text) {
      const clean = String(text || '').trim();
      if (!clean) return Buffer.alloc(0);
      if (provider === 'mock') return mockSynthesize(clean);
      if (provider === 'openai') {
        return openaiSynthesize(clean, {
          apiKey: cfg.openaiKey, baseUrl: cfg.openaiBaseUrl || 'https://api.openai.com/v1',
          voice: cfg.openaiVoice || 'alloy', model: cfg.openaiModel || 'gpt-4o-mini-tts',
        });
      }
      return edgeSynthesize(clean, voice);
    },
  };
}
