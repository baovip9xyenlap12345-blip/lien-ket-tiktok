import { prisma } from '@/lib/db';
import { requirePerm, guarded } from '@/lib/auth';

export const GET = guarded(async () => {
  await requirePerm('catalog.view');
  const [units, categories, priceLists] = await Promise.all([
    prisma.unit.findMany({ orderBy: { id: 'asc' } }),
    prisma.category.findMany({ where: { deletedAt: null }, orderBy: { id: 'asc' } }),
    prisma.priceList.findMany({ where: { deletedAt: null }, orderBy: { priority: 'desc' } }),
  ]);
  return Response.json({ ok: true, units, categories, priceLists });
});
