import Forbidden from '@/components/Forbidden';
import { getSessionUser } from '@/lib/auth';
import FinanceClient from './ui';

export default async function FinancePage() {
  const user = await getSessionUser();
  if (!user?.perms.includes('finance.view')) return <Forbidden />;
  return (
    <FinanceClient
      canManage={user.perms.includes('finance.manage')}
      canApprove={user.perms.includes('finance.approve')}
    />
  );
}
