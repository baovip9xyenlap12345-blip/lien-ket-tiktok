import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import {
  storagePut, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, ALLOWED_IMAGE_MIME, ALLOWED_VIDEO_MIME,
} from '@/lib/storage';

/** Tai anh/video san pham. multipart/form-data: file.
 *  Tra ve { ok, key } — luu key vao Product.imageUrls / Product.videoUrl. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('catalog.manage');
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw jsonError(400, 'Thiếu file.');
  const mime = file.type || 'application/octet-stream';
  const isImage = ALLOWED_IMAGE_MIME.has(mime);
  const isVideo = ALLOWED_VIDEO_MIME.has(mime);
  if (!isImage && !isVideo) throw jsonError(400, 'Chỉ nhận ảnh (PNG/JPG/WEBP/GIF) hoặc video (MP4/WEBM/MOV).');
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    throw jsonError(400, isVideo ? 'Video quá 30MB — hãy dùng video ngắn hoặc dán link.' : 'Ảnh quá 10MB.');
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const key = await storagePut(buf, file.name);
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'media_upload', entity: 'product_media',
    entityId: key, after: { fileName: file.name, size: file.size, kind: isVideo ? 'video' : 'image' }, ip, ua });
  return Response.json({ ok: true, key, kind: isVideo ? 'video' : 'image' });
});
