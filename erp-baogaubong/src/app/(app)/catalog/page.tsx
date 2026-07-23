import Forbidden from '@/components/Forbidden';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import CatalogClient from './ui';

export default async function CatalogPage() {
  const user = await getSessionUser();
  if (!user?.perms.includes('catalog.view')) return <Forbidden />;
  const [units, categories, priceLists] = await Promise.all([
    prisma.unit.findMany({ orderBy: { id: 'asc' } }),
    prisma.category.findMany({ where: { deletedAt: null }, orderBy: { id: 'asc' } }),
    prisma.priceList.findMany({ where: { deletedAt: null }, orderBy: { priority: 'desc' } }),
  ]);
  return (
    <CatalogClient
      meta={{ units, categories, priceLists: priceLists.map((l) => ({
        id: l.id, kind: l.kind, name: l.name, priority: l.priority, active: l.active })) }}
      canManage={user.perms.includes('catalog.manage')}
      showCost={user.perms.includes('cost.view')}
    />
  );
}
