import { getSessionUser } from '@/lib/auth';
import HrClient from './ui';

export default async function HrPage() {
  const user = await getSessionUser();
  if (!user) return null; // middleware da chan; phong ho
  return (
    <HrClient
      canView={user.perms.includes('hr.view') || user.perms.includes('hr.manage')}
      canManage={user.perms.includes('hr.manage')}
      myName={user.name}
    />
  );
}
