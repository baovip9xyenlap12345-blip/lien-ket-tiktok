import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { inScope } from '@/lib/scope';
import { storagePut, storageDelete, MAX_UPLOAD_BYTES, ALLOWED_MIME } from '@/lib/storage';

/** Upload file dinh kem cho doi tac (logo, thiet ke, hop dong).
 *  multipart/form-data: file, partnerId. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('partner.manage');
  const form = await req.formData();
  const file = form.get('file');
  const partnerId = Number(form.get('partnerId'));
  if (!(file instanceof File)) throw jsonError(400, 'Thiếu file.');
  if (!partnerId) throw jsonError(400, 'Thiếu partnerId.');
  const p = await prisma.partner.findFirst({ where: { id: partnerId, deletedAt: null } });
  if (!p || !inScope(actor, p)) throw jsonError(404, 'Không tìm thấy đối tác trong phạm vi của bạn.');
  if (file.size > MAX_UPLOAD_BYTES) throw jsonError(400, 'File quá 10MB.');
  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mime)) throw jsonError(400, 'Định dạng không được phép (chỉ ảnh, PDF, Word, Excel, CSV).');
  const buf = Buffer.from(await file.arrayBuffer());
  const key = await storagePut(buf, file.name);
  const row = await prisma.attachment.create({ data: {
    partnerId, entity: 'partner', entityId: String(partnerId),
    fileName: file.name, mime, size: file.size, storageKey: key, uploadedById: actor.id } });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'file_upload', entity: 'attachment',
    entityId: String(row.id), after: { partner: p.code, fileName: file.name, size: file.size }, ip, ua });
  return Response.json({ ok: true, id: row.id });
});

export const DELETE = guarded(async (req) => {
  const actor = await requirePerm('partner.manage');
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) throw jsonError(400, 'Thiếu id');
  const row = await prisma.attachment.findFirst({ where: { id, deletedAt: null }, include: { partner: true } });
  if (!row || !row.partner || !inScope(actor, row.partner)) {
    throw jsonError(404, 'Không tìm thấy file trong phạm vi của bạn.');
  }
  await prisma.attachment.update({ where: { id }, data: { deletedAt: new Date() } });
  await storageDelete(row.storageKey);
  await audit({ actorId: actor.id, actorName: actor.name, action: 'file_delete', entity: 'attachment',
    entityId: String(id), before: { fileName: row.fileName } });
  return Response.json({ ok: true });
});
