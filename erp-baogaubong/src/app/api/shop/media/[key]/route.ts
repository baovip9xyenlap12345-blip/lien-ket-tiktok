import { Readable } from 'stream';
import { guarded, jsonError } from '@/lib/auth';
import { storageSize, storageStream, mimeFromKey } from '@/lib/storage';
import { keyBelongsToProduct } from '@/modules/shop/data';

// Bo nho dem "key nay thuoc san pham dang ban" — tranh hoi CSDL moi lan tai anh (rat nhieu khi dong khach).
// Key la UUID (noi dung khong doi) nen cache an toan; TTL ngan de san pham an/hien cap nhat kip.
const okCache = new Map<string, number>();   // key -> han dung (ms)
const TTL_MS = 5 * 60_000;

async function allowed(key: string): Promise<boolean> {
  const now = Date.now();
  const exp = okCache.get(key);
  if (exp && exp > now) return true;
  if (okCache.size > 5000) okCache.clear();   // chan phinh bo nho
  const ok = await keyBelongsToProduct(key);
  if (ok) okCache.set(key, now + TTL_MS);
  return ok;
}

/** Phuc vu anh/video san pham cho GIAN HANG CONG KHAI.
 *  - Doc theo luong (khong nap ca file vao RAM) → nhe cho may chu khi dong khach.
 *  - Ho tro Range → video tua/stream muot, khong phai tai het moi xem.
 *  - Cache-Control immutable → trinh duyet/Caddy giu lai, khong hoi lai (giam tai cuc lon). */
export const GET = guarded(async (req) => {
  const key = decodeURIComponent(new URL(req.url).pathname.split('/').pop() ?? '');
  if (!key) throw jsonError(400, 'Thiếu media');
  if (!(await allowed(key))) throw jsonError(404, 'Không tìm thấy.');

  let size: number;
  try { size = storageSize(key); }
  catch { throw jsonError(404, 'Không tìm thấy media.'); }

  const type = mimeFromKey(key);
  const cache = 'public, max-age=31536000, immutable';
  const range = req.headers.get('range');

  // Tua video: tra ve dung khuc khach yeu cau (206 Partial Content).
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m?.[1] ? parseInt(m[1], 10) : 0;
    let end = m?.[2] ? parseInt(m[2], 10) : size - 1;
    if (!Number.isFinite(start) || start < 0) start = 0;
    if (!Number.isFinite(end) || end >= size) end = size - 1;
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    const stream = storageStream(key, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, { status: 206, headers: {
      'Content-Type': type,
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': cache,
    } });
  }

  const stream = storageStream(key);
  return new Response(Readable.toWeb(stream) as ReadableStream, { headers: {
    'Content-Type': type,
    'Content-Length': String(size),
    'Accept-Ranges': 'bytes',
    'Cache-Control': cache,
  } });
});
