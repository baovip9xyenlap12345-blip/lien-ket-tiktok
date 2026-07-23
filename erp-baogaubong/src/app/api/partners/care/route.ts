import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { inScope } from '@/lib/scope';

/** Nhiem vu cham soc sap den han / qua han cua toi (lich nhac). */
export const GET = guarded(async (req) => {
  const user = await requirePerm('partner.view');
  const url = new URL(req.url);
  const scope = url.searchParams.get('due') === '1';
  if (scope) {
    const rows = await prisma.careActivity.findMany({
      where: { deletedAt: null, doneAt: null, dueAt: { not: null },
        OR: [{ assigneeId: user.id }, { assigneeId: null, createdById: user.id }],
        partner: { deletedAt: null } },
      include: { partner: { select: { id: true, code: true, name: true } } },
      orderBy: { dueAt: 'asc' }, take: 50 });
    return Response.json({ ok: true, rows });
  }
  const partnerId = Number(url.searchParams.get('partnerId'));
  if (!partnerId) throw jsonError(400, 'Thiếu partnerId');
  const p = await prisma.partner.findFirst({ where: { id: partnerId, deletedAt: null } });
  if (!p || !inScope(user, p)) throw jsonError(404, 'Không tìm thấy đối tác trong phạm vi của bạn.');
  const rows = await prisma.careActivity.findMany({
    where: { partnerId, deletedAt: null },
    include: { createdBy: { select: { name: true } }, assignee: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }, take: 100 });
  return Response.json({ ok: true, rows });
});

const In = z.object({
  partnerId: z.number().int(),
  kind: z.enum(['NOTE', 'CALL', 'TASK', 'MEETING']).default('NOTE'),
  content: z.string().trim().min(1, 'Nội dung không được để trống'),
  dueAt: z.string().datetime().optional().nullable(),
  remindAt: z.string().datetime().optional().nullable(),
  assigneeId: z.number().int().optional().nullable(),
});

export const POST = guarded(async (req) => {
  const actor = await requirePerm('partner.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const p = await prisma.partner.findFirst({ where: { id: d.partnerId, deletedAt: null } });
  if (!p || !inScope(actor, p)) throw jsonError(404, 'Không tìm thấy đối tác trong phạm vi của bạn.');
  const row = await prisma.careActivity.create({ data: {
    partnerId: d.partnerId, kind: d.kind, content: d.content,
    dueAt: d.dueAt ? new Date(d.dueAt) : null, remindAt: d.remindAt ? new Date(d.remindAt) : null,
    assigneeId: d.assigneeId ?? actor.id, createdById: actor.id } });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'care_create', entity: 'care',
    entityId: String(row.id), after: { partner: p.code, kind: d.kind }, ip, ua });
  return Response.json({ ok: true, id: row.id });
});

/** Danh dau xong / mo lai nhiem vu. */
export const PATCH = guarded(async (req) => {
  const actor = await requirePerm('partner.manage');
  const b = z.object({ id: z.number().int(), done: z.boolean() }).safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu không hợp lệ');
  const row = await prisma.careActivity.findFirst({
    where: { id: b.data.id, deletedAt: null }, include: { partner: true } });
  if (!row || !inScope(actor, row.partner)) throw jsonError(404, 'Không tìm thấy nhiệm vụ trong phạm vi của bạn.');
  await prisma.careActivity.update({ where: { id: row.id },
    data: { doneAt: b.data.done ? new Date() : null } });
  return Response.json({ ok: true });
});

export const DELETE = guarded(async (req) => {
  const actor = await requirePerm('partner.manage');
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) throw jsonError(400, 'Thiếu id');
  const row = await prisma.careActivity.findFirst({
    where: { id, deletedAt: null }, include: { partner: true } });
  if (!row || !inScope(actor, row.partner)) throw jsonError(404, 'Không tìm thấy nhiệm vụ trong phạm vi của bạn.');
  await prisma.careActivity.update({ where: { id }, data: { deletedAt: new Date() } });
  return Response.json({ ok: true });
});
