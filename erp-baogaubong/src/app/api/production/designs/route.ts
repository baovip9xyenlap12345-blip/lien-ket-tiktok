import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { nextCode } from '@/lib/seq';

export const GET = guarded(async (req) => {
  await requirePerm('production.view');
  const url = new URL(req.url);
  const id = Number(url.searchParams.get('id')) || 0;
  if (id) {
    const design = await prisma.designRequest.findFirst({ where: { id, deletedAt: null },
      include: { versions: { orderBy: { no: 'desc' },
        include: { comments: { orderBy: { id: 'asc' } } } } } });
    if (!design) throw jsonError(404, 'Không tìm thấy yêu cầu thiết kế.');
    return Response.json({ ok: true, design });
  }
  const rows = await prisma.designRequest.findMany({ where: { deletedAt: null },
    include: { versions: { orderBy: { no: 'desc' }, take: 1 } },
    orderBy: { id: 'desc' }, take: 50 });
  return Response.json({ ok: true, rows });
});

const CreateIn = z.object({ action: z.literal('create'),
  title: z.string().trim().min(1, 'Nhập tên yêu cầu thiết kế'),
  desc: z.string().optional().nullable(),
  partnerId: z.number().int().nullable().optional(),
  partnerName: z.string().optional().nullable(),
  orderId: z.number().int().nullable().optional() });
const VersionIn = z.object({ action: z.literal('version'),
  designId: z.number().int(),
  imageUrl: z.string().trim().optional().nullable(),
  note: z.string().optional().nullable() });
const CommentIn = z.object({ action: z.literal('comment'),
  versionId: z.number().int(), content: z.string().trim().min(1, 'Nhập nội dung góp ý') });
const DecideIn = z.object({ action: z.literal('decide'),
  versionId: z.number().int(), approve: z.boolean(), note: z.string().optional().nullable() });
const In = z.discriminatedUnion('action', [CreateIn, VersionIn, CommentIn, DecideIn]);

export const POST = guarded(async (req) => {
  const actor = await requirePerm('production.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const { ip, ua } = reqMeta();

  if (d.action === 'create') {
    const row = await prisma.$transaction(async (tx) => {
      const code = await nextCode(tx, 'TK-');
      return tx.designRequest.create({ data: { code, title: d.title, desc: d.desc ?? null,
        partnerId: d.partnerId ?? null, partnerName: d.partnerName ?? null,
        orderId: d.orderId ?? null, createdById: actor.id, createdByName: actor.name } });
    });
    await audit({ actorId: actor.id, actorName: actor.name, action: 'design_create',
      entity: 'design', entityId: row.code, after: { title: d.title }, ip, ua });
    return Response.json({ ok: true, id: row.id, code: row.code });
  }

  if (d.action === 'version') {
    const design = await prisma.designRequest.findFirst({ where: { id: d.designId, deletedAt: null } });
    if (!design) throw jsonError(404, 'Không tìm thấy yêu cầu thiết kế.');
    const last = await prisma.designVersion.findFirst({ where: { designId: d.designId }, orderBy: { no: 'desc' } });
    const row = await prisma.designVersion.create({ data: { designId: d.designId,
      no: (last?.no ?? 0) + 1, imageUrl: d.imageUrl ?? null, note: d.note ?? null,
      createdById: actor.id, createdByName: actor.name } });
    await audit({ actorId: actor.id, actorName: actor.name, action: 'design_version',
      entity: 'design', entityId: design.code, after: { version: row.no }, ip, ua });
    return Response.json({ ok: true, id: row.id, no: row.no });
  }

  if (d.action === 'comment') {
    const ver = await prisma.designVersion.findUnique({ where: { id: d.versionId } });
    if (!ver) throw jsonError(404, 'Không tìm thấy bản demo.');
    await prisma.designComment.create({ data: { versionId: d.versionId, content: d.content,
      byId: actor.id, byName: actor.name } });
    return Response.json({ ok: true });
  }

  // decide — duyet/yeu cau sua: ghi nguoi + thoi gian, can quyen duyet
  if (!actor.perms.includes('sales.approve')) {
    throw jsonError(403, 'Duyệt mẫu cần quyền duyệt (chủ xưởng).');
  }
  const ver = await prisma.designVersion.findUnique({ where: { id: d.versionId }, include: { design: true } });
  if (!ver) throw jsonError(404, 'Không tìm thấy bản demo.');
  if (ver.status !== 'PENDING') throw jsonError(400, 'Bản này đã được quyết định rồi.');
  await prisma.$transaction(async (tx) => {
    await tx.designVersion.update({ where: { id: ver.id },
      data: { status: d.approve ? 'APPROVED' : 'REJECTED',
        decidedById: actor.id, decidedByName: actor.name, decidedAt: new Date(),
        decideNote: d.note ?? null } });
    if (d.approve) {
      await tx.designRequest.update({ where: { id: ver.designId }, data: { status: 'APPROVED' } });
    }
  });
  await audit({ actorId: actor.id, actorName: actor.name,
    action: d.approve ? 'design_approve' : 'design_reject',
    entity: 'design', entityId: ver.design.code,
    after: { version: ver.no, note: d.note }, ip, ua });
  return Response.json({ ok: true });
});
