import Forbidden from '@/components/Forbidden';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ReportsClient from './ui';

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user?.perms.includes('report.view')) return <Forbidden />;
  const users = await prisma.user.findMany({ where: { deletedAt: null, active: true },
    select: { id: true, name: true }, orderBy: { id: 'asc' } });
  return <ReportsClient users={users} />;
}
