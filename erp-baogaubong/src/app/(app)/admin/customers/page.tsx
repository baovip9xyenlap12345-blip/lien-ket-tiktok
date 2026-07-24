import { getSessionUser } from '@/lib/auth';
import Forbidden from '@/components/Forbidden';
import CustomersClient from './ui';

export default async function CustomersPage() {
  const user = await getSessionUser();
  if (!user?.perms.includes('partner.manage')) return <Forbidden />;
  return <CustomersClient />;
}
