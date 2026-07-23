import Forbidden from '@/components/Forbidden';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import SalesClient from './ui';

export default async function SalesPage() {
  const user = await getSessionUser();
  if (!user?.perms.includes('sales.view')) return <Forbidden />;
  const vat = await prisma.setting.findUnique({ where: { key: 'vat_percent' } });
  return (
    <SalesClient
      canManage={user.perms.includes('sales.manage')}
      canApprove={user.perms.includes('sales.approve')}
      vatDefault={Number((vat?.value as { v?: number } | null)?.v ?? 8)}
    />
  );
}
