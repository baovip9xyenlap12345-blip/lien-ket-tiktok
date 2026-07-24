import { requirePerm, guarded, jsonError } from '@/lib/auth';
import { storageGet, mimeFromKey } from '@/lib/storage';

/** Phuc vu anh/video san pham cho nguoi dung noi bo co quyen xem san pham.
 *  Dung trong <img src>/<video src> — trinh duyet tu gui cookie phien. */
export const GET = guarded(async (req) => {
  await requirePerm('catalog.view');
  const key = decodeURIComponent(new URL(req.url).pathname.split('/').pop() ?? '');
  if (!key) throw jsonError(400, 'Thiếu khóa media');
  let buf: Buffer;
  try { buf = await storageGet(key); }
  catch { throw jsonError(404, 'Không tìm thấy media.'); }
  return new Response(new Uint8Array(buf), { headers: {
    'Content-Type': mimeFromKey(key),
    'Cache-Control': 'private, max-age=86400',
  } });
});
