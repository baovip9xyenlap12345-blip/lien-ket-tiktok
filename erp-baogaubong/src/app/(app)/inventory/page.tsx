import Forbidden from '@/components/Forbidden';
import { getSessionUser } from '@/lib/auth';
import InventoryClient from './ui';

export default async function InventoryPage() {
  const user = await getSessionUser();
  if (!user?.perms.includes('inventory.view')) return <Forbidden />;
  return (
    <InventoryClient
      canManage={user.perms.includes('inventory.manage')}
      canFinance={user.perms.includes('finance.view')}
    />
  );
}
