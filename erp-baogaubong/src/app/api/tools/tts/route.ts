import { z } from 'zod';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { guarded, jsonError, getSessionUser } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { VI_VOICES, TTS_MAX_CHARS } from '@/modules/tools/tts';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;   // van ban dai can thoi gian doc

const VOICE_IDS = new Set<string>(VI_VOICES.map((v) => v.id));

const Body = z.object({
  text: z.string().trim().min(1, 'Nhập văn bản cần đọc').max(TTS_MAX_CHARS, `Tối đa ${TTS_MAX_CHARS.toLocaleString('vi-VN')} ký tự mỗi lần`),
  voice: z.string(),
  rate: z.number().min(0.5).max(2).default(1),   // toc do doc: 0.5x - 2x
});

/** Chuyen van ban -> giong noi tieng Viet (MP3). Chi nhan vien dang nhap dung duoc. */
export const POST = guarded(async (req) => {
  const user = await getSessionUser();
  if (!user) throw jsonError(401, 'Chưa đăng nhập.');
  if (!rateLimit(`tts:${user.id}`, 20, 10 * 60_000).ok) {
    throw jsonError(429, 'Bạn tạo quá nhanh — chờ ít phút rồi thử lại.');
  }
  const b = Body.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  if (!VOICE_IDS.has(b.data.voice)) throw jsonError(400, 'Giọng đọc không hợp lệ.');

  const tts = new MsEdgeTTS();
  await tts.setMetadata(b.data.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  // rate SSML dang phan tram tuong doi: 1x -> +0%, 1.25x -> +25%, 0.75x -> -25%
  const pct = Math.round((b.data.rate - 1) * 100);
  const { audioStream } = tts.toStream(b.data.text, { rate: `${pct >= 0 ? '+' : ''}${pct}%` });

  const chunks: Buffer[] = [];
  const buf = await new Promise<Buffer>((resolve, reject) => {
    audioStream.on('data', (c: Buffer) => chunks.push(c));
    audioStream.on('end', () => resolve(Buffer.concat(chunks)));
    audioStream.on('error', reject);
    // may chu TTS khong phan hoi -> bao loi ro rang thay vi treo
    setTimeout(() => reject(new Error('timeout')), 110_000);
  }).catch((e) => { throw jsonError(502, e?.message === 'timeout'
    ? 'Máy chủ giọng đọc phản hồi chậm — thử đoạn văn ngắn hơn.'
    : 'Không tạo được giọng đọc — kiểm tra mạng máy chủ rồi thử lại.'); });

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
