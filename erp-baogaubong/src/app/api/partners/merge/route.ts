import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { inScope } from '@/lib/scope';

const In = z.object({ keepId: z.number().int(), mergeId: z.number().int() });

/** Gop 2 doi tac trung: chuyen lien he/dia chi/cham soc/file sang ban giu lai,
 *  ban bi gop danh dau mergedInto + xoa mem. Ghi audit truoc/sau. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('partner.manage');
  const b = In.safeParse(await req.json());
  if (!b.success || b.data.keepId === b.data.mergeId) throw jsonError(400, 'Chọn 2 đối tác khác nhau để gộp.');
  const { keepId, mergeId } = b.data;
  const [keep, merge] = await Promise.all([
    prisma.partner.findFirst({ where: { id: keepId, deletedAt: null } }),
    prisma.partner.findFirst({ where: { id: mergeId, deletedAt: null } }),
  ]);
  if (!keep || !merge) throw jsonError(404, 'Không tìm thấy đối tác cần gộp.');
  if (!inScope(actor, keep) || !inScope(actor, merge)) {
    throw jsonError(403, 'Đối tác nằm ngoài phạm vi dữ liệu của bạn.');
  }
  await prisma.$transaction(async (tx) => {
    await tx.partnerContact.updateMany({ where: { partnerId: mergeId }, data: { partnerId: keepId } });
    await tx.partnerAddress.updateMany({ where: { partnerId: mergeId }, data: { partnerId: keepId } });
    await tx.careActivity.updateMany({ where: { partnerId: mergeId }, data: { partnerId: keepId } });
    await tx.attachment.updateMany({ where: { partnerId: mergeId }, data: { partnerId: keepId, entityId: String(keepId) } });
    // Giu thong tin con thieu: dien vao cho trong cua ban giu lai
    await tx.partner.update({ where: { id: keepId }, data: {
      phone: keep.phone ?? merge.phone, normPhone: keep.normPhone ?? merge.normPhone,
      email: keep.email ?? merge.email, normEmail: keep.normEmail ?? merge.normEmail,
      taxCode: keep.taxCode ?? merge.taxCode,
      note: [keep.note, merge.note && `[Gộp từ ${merge.code}] ${merge.note}`].filter(Boolean).join('\n') || null } });
    await tx.partner.update({ where: { id: mergeId },
      data: { mergedIntoId: keepId, deletedAt: new Date() } });
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'partner_merge', entity: 'partner',
    entityId: keep.code,
    before: { merged: merge.code, mergedName: merge.name, phone: merge.phone, email: merge.email },
    after: { keep: keep.code, keepName: keep.name }, ip, ua });
  return Response.json({ ok: true });
});
