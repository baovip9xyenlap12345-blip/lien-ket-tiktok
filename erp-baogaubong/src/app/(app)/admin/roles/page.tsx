import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Forbidden from '@/components/Forbidden';
import RolesClient from './ui';

export default async function RolesPage() {
  const user = await getSessionUser();
  if (!user?.perms.includes('role.manage')) return <Forbidden />;
  const [roles, perms] = await Promise.all([
    prisma.role.findMany({ include: { perms: true }, orderBy: { id: 'asc' } }),
    prisma.permission.findMany({ orderBy: { id: 'asc' } }),
  ]);
  return <RolesClient
    roles={roles.map(r => ({ id: r.id, code: r.code, name: r.name, isSystem: r.isSystem, permIds: r.perms.map(p => p.permissionId) }))}
    perms={perms.map(p => ({ id: p.id, code: p.code, name: p.name }))} />;
}
