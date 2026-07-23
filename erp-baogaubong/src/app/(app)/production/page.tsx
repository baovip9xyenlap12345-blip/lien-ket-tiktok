import Forbidden from '@/components/Forbidden';
import { getSessionUser } from '@/lib/auth';
import ProductionClient from './ui';

export default async function ProductionPage() {
  const user = await getSessionUser();
  if (!user?.perms.includes('production.view')) return <Forbidden />;
  return (
    <ProductionClient
      canManage={user.perms.includes('production.manage')}
      canApprove={user.perms.includes('sales.approve')}
      showCost={user.perms.includes('cost.view')}
    />
  );
}
