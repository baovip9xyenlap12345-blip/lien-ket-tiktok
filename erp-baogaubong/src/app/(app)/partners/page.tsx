import Forbidden from '@/components/Forbidden';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import PartnersClient from './ui';

export default async function PartnersPage() {
  const user = await getSessionUser();
  if (!user?.perms.includes('partner.view')) return <Forbidden />;
  const [groups, sales, priceLists] = await Promise.all([
    prisma.partnerGroup.findMany({ orderBy: { id: 'asc' } }),
    prisma.user.findMany({ where: { active: true, deletedAt: null },
      select: { id: true, name: true }, orderBy: { id: 'asc' } }),
    prisma.priceList.findMany({ where: { deletedAt: null },
      select: { id: true, name: true, kind: true }, orderBy: { priority: 'desc' } }),
  ]);
  return (
    <PartnersClient
      meta={{ groups, sales, priceLists }}
      canManage={user.perms.includes('partner.manage')}
      myScope={user.scope}
    />
  );
}
