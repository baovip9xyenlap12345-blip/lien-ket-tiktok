import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';

/** Danh sach nhom hang dang dung. */
export const GET = guarded(async () => {
  await requirePerm('catalog.view');
  const cats = await prisma.category.findMany({ where: { deletedAt: null }, orderBy: { id: 'asc' },
    select: { id: true, name: true } });
  return Response.json({ ok: true, categories: cats });
});

/** Them moi / doi ten nhom hang. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('catalog.manage');
  const b = z.object({ id: z.number().int().optional(), name: z.string().trim().min(1, 'Nhập tên nhóm') }).safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const dup = await prisma.category.findFirst({ where: { name: b.data.name, deletedAt: null } });
  if (dup && dup.id !== b.data.id) throw jsonError(400, `Nhóm "${b.data.name}" đã có.`);
  const row = b.data.id
    ? await prisma.category.update({ where: { id: b.data.id }, data: { name: b.data.name } })
    : await prisma.category.create({ data: { name: b.data.name } });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: b.data.id ? 'category_rename' : 'category_create',
    entity: 'category', entityId: String(row.id), after: { name: b.data.name }, ip, ua });
  return Response.json({ ok: true, id: row.id, name: row.name });
});

/** Xoa nhom hang — chan neu con san pham dang dung (tranh mo coi). */
export const DELETE = guarded(async (req) => {
  const actor = await requirePerm('catalog.manage');
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) throw jsonError(400, 'Thiếu id');
  const used = await prisma.product.count({ where: { categoryId: id, deletedAt: null } });
  if (used > 0) throw jsonError(400, `Còn ${used} sản phẩm thuộc nhóm này — hãy chuyển nhóm cho chúng trước khi xóa.`);
  await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ actorId: actor.id, actorName: actor.name, action: 'category_delete', entity: 'category', entityId: String(id) });
  return Response.json({ ok: true });
});
