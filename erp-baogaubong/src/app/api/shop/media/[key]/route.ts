import { guarded, jsonError } from '@/lib/auth';
import { storageGet, mimeFromKey } from '@/lib/storage';
import { keyBelongsToProduct } from '@/modules/shop/data';

/** Phuc vu anh/video san pham cho GIAN HANG CONG KHAI (khong can dang nhap).
 *  Chi phuc vu key thuoc anh/video cua 1 san pham dang ban → khong lo lot file khac. */
export const GET = guarded(async (req) => {
  const key = decodeURIComponent(new URL(req.url).pathname.split('/').pop() ?? '');
  if (!key) throw jsonError(400, 'Thiếu media');
  if (!(await keyBelongsToProduct(key))) throw jsonError(404, 'Không tìm thấy.');
  let buf: Buffer;
  try { buf = await storageGet(key); }
  catch { throw jsonError(404, 'Không tìm thấy media.'); }
  return new Response(new Uint8Array(buf), { headers: {
    'Content-Type': mimeFromKey(key),
    'Cache-Control': 'public, max-age=86400',
  } });
});
