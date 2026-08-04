import { z } from 'zod';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { guarded, jsonError, getSessionUser } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { VI_VOICES, TTS_MAX_CHARS } from '@/modules/tools/tts';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const VOICE_IDS = new Set<string>(VI_VOICES.map((v) => v.id));

const Body = z.object({
  text: z.string().trim().min(1, 'Nhập văn bản cần đọc').max(TTS_MAX_CHARS, `Tối đa ${TTS_MAX_CHARS.toLocaleString('vi-VN')} ký tự mỗi lần`),
  voice: z.string(),
  rate: z.number().min(0.5).max(2).default(1),   // toc do doc: 0.5x - 2x
});

// Cat van ban thanh doan ~600 ky tu THEO CAU (khong cat giua cau) — de doc SONG SONG cho nhanh
// va moi doan chi mat vai giay → khong bi Cloudflare/proxy cat vi qua 100 giay.
const CHUNK_MAX = 600;
function splitText(text: string): string[] {
  const parts = text.split(/(?<=[.!?…;:\n])\s+/).filter((p) => p.trim());
  const out: string[] = [];
  let cur = '';
  for (let p of parts) {
    // cau don le qua dai -> cat cung theo dau phay/khoang trang
    while (p.length > CHUNK_MAX) {
      const cut = Math.max(p.lastIndexOf(',', CHUNK_MAX), p.lastIndexOf(' ', CHUNK_MAX), CHUNK_MAX);
      const head = p.slice(0, cut).trim();
      if (cur) { out.push(cur); cur = ''; }
      if (head) out.push(head);
      p = p.slice(cut).trim();
    }
    if (!p) continue;
    if (cur && (cur.length + p.length + 1) > CHUNK_MAX) { out.push(cur); cur = p; }
    else cur = cur ? `${cur} ${p}` : p;
  }
  if (cur) out.push(cur);
  return out.length ? out : [text];
}

/** Doc 1 doan van (1 ket noi rieng) -> MP3. */
function synthChunk(text: string, voice: string, rateStr: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const bufs: Buffer[] = [];
    const timer = setTimeout(() => reject(new Error('timeout')), 45_000);
    (async () => {
      const tts = new MsEdgeTTS();
      // 48kbps du ro cho giong noi, file nhe ~mot nua so voi 96kbps → tai ve nhanh hon
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text, { rate: rateStr });
      audioStream.on('data', (c: Buffer) => bufs.push(c));
      audioStream.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(bufs)); });
      audioStream.on('error', (e: Error) => { clearTimeout(timer); reject(e); });
    })().catch((e) => { clearTimeout(timer); reject(e); });
  });
}

/** Chay toi da `limit` viec cung luc, giu dung thu tu ket qua. */
async function mapPool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  }));
  return out;
}

/** Chuyen van ban -> giong noi tieng Viet (MP3). Doan dai duoc doc song song 4 luong cho nhanh. */
export const POST = guarded(async (req) => {
  const user = await getSessionUser();
  if (!user) throw jsonError(401, 'Chưa đăng nhập.');
  if (!rateLimit(`tts:${user.id}`, 20, 10 * 60_000).ok) {
    throw jsonError(429, 'Bạn tạo quá nhanh — chờ ít phút rồi thử lại.');
  }
  const b = Body.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  if (!VOICE_IDS.has(b.data.voice)) throw jsonError(400, 'Giọng đọc không hợp lệ.');

  const pct = Math.round((b.data.rate - 1) * 100);
  const rateStr = `${pct >= 0 ? '+' : ''}${pct}%`;
  const pieces = splitText(b.data.text);

  let failed = 0;
  const bufs = await mapPool(pieces, 4, async (p) => {
    // loi tam thoi (mang chap chon / may chu TTS ban) -> tu thu lai toi da 2 lan
    for (let attempt = 1; ; attempt++) {
      try { return await synthChunk(p, b.data.voice, rateStr); }
      catch (e) {
        if (attempt >= 3) { failed++; throw e; }
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
  }).catch(() => null);

  if (!bufs || failed > 0) {
    throw jsonError(502, 'Máy chủ giọng đọc đang bận hoặc mạng chập chờn — bấm Tạo audio thử lại (đã tự thử 3 lần).');
  }
  const buf = Buffer.concat(bufs);
  if (buf.length < 200) throw jsonError(502, 'Không tạo được giọng đọc — thử lại sau ít phút.');
  return new Response(new Uint8Array(buf), { headers: {
    'Content-Type': 'audio/mpeg',
    'Content-Length': String(buf.length),
    'Cache-Control': 'no-store',
  } });
});

/** Danh sach giong doc kha dung. */
export const GET = guarded(async () => {
  const user = await getSessionUser();
  if (!user) throw jsonError(401, 'Chưa đăng nhập.');
  return Response.json({ ok: true, voices: VI_VOICES });
});
