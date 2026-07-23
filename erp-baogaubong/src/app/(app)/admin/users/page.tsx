import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Forbidden from '@/components/Forbidden';
import UsersClient from './ui';

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user?.perms.includes('user.manage')) return <Forbidden />;
  const [users, roles, branches] = await Promise.all([
    prisma.user.findMany({ where: { deletedAt: null }, include: { role: true, branch: true }, orderBy: { id: 'asc' } }),
    prisma.role.findMany({ orderBy: { id: 'asc' } }),
    prisma.branch.findMany({ where: { deletedAt: null } }),
  ]);
  return <UsersClient
    users={users.map(u => ({ id: u.id, username: u.username, name: u.name, phone: u.phone, active: u.active,
      roleId: u.roleId, roleName: u.role.name, branchId: u.branchId, branchName: u.branch?.name ?? null, scope: u.scope }))}
    roles={roles.map(r => ({ id: r.id, name: r.name }))}
    branches={branches.map(b => ({ id: b.id, name: b.name }))} />;
}
