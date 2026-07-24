import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';

/** Danh sach khuyen mai (quan tri). */
export const GET = guarded(async () => {
  await requirePerm('catalog.view');
  const promos = await prisma.promotion.findMany({ orderBy: { id: 'desc' } });
  return Response.json({ ok: true, promos });
});

const Body = z.object({
  id: z.number().int().optional(),
  code: z.string().trim().min(2, 'Nhập mã (VD GAU10)').max(30),
  name: z.string().trim().min(1, 'Nhập tên chương trình'),
  type: z.enum(['PERCENT', 'AMOUNT']),
  value: z.number().int().min(0),
  minOrder: z.number().int().min(0).default(0),
  maxDiscount: z.number().int().min(0).nullable().optional(),
  active: z.boolean().default(true),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

/** Tao / sua khuyen mai. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('catalog.manage');
  const b = Body.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const code = d.code.toUpperCase();
  if (d.type === 'PERCENT' && d.value > 100) throw jsonError(400, 'Giảm theo % không quá 100.');
  const dup = await prisma.promotion.findFirst({ where: { code } });
  if (dup && dup.id !== d.id) throw jsonError(400, `Mã "${code}" đã tồn tại.`);
  const data = {
    code, name: d.name, type: d.type, value: d.value, minOrder: d.minOrder,
    maxDiscount: d.maxDiscount ?? null, active: d.active,
    validFrom: d.validFrom ? new Date(d.validFrom) : null,
    validTo: d.validTo ? new Date(d.validTo) : null,
    imageUrl: d.imageUrl || null, videoUrl: d.videoUrl || null, note: d.note || null,
  };
  const row = d.id
    ? await prisma.promotion.update({ where: { id: d.id }, data })
    : await prisma.promotion.create({ data });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: d.id ? 'promo_update' : 'promo_create',
    entity: 'promotion', entityId: String(row.id), after: { code, name: d.name }, ip, ua });
  return Response.json({ ok: true, id: row.id });
});

/** Xoa khuyen mai. */
export const DELETE = guarded(async (req) => {
  const actor = await requirePerm('catalog.manage');
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) throw jsonError(400, 'Thiếu id');
  await prisma.promotion.delete({ where: { id } });
  await audit({ actorId: actor.id, actorName: actor.name, action: 'promo_delete', entity: 'promotion', entityId: String(id) });
  return Response.json({ ok: true });
});
