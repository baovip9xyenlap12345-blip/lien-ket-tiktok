import { prisma } from '@/lib/db';
import { requirePerm, guarded } from '@/lib/auth';

export const GET = guarded(async () => {
  await requirePerm('partner.view');
  const [groups, sales, priceLists] = await Promise.all([
    prisma.partnerGroup.findMany({ orderBy: { id: 'asc' } }),
    prisma.user.findMany({ where: { active: true, deletedAt: null },
      select: { id: true, name: true }, orderBy: { id: 'asc' } }),
    prisma.priceList.findMany({ where: { deletedAt: null },
      select: { id: true, name: true, kind: true }, orderBy: { priority: 'desc' } }),
  ]);
  return Response.json({ ok: true, groups, sales, priceLists });
});

export const POST = guarded(async (req) => {
  await requirePerm('partner.manage');
  const { name } = await req.json();
  if (!name?.trim()) return Response.json({ ok: false, error: 'Thiếu tên nhóm' }, { status: 400 });
  const g = await prisma.partnerGroup.upsert({ where: { name: name.trim() }, update: {}, create: { name: name.trim() } });
  return Response.json({ ok: true, id: g.id });
});
