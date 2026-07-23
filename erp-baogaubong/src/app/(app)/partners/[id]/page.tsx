import Forbidden from '@/components/Forbidden';
import { getSessionUser } from '@/lib/auth';
import PartnerDetailClient from './ui';

export default async function PartnerDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user?.perms.includes('partner.view')) return <Forbidden />;
  return <PartnerDetailClient id={Number(params.id)} canManage={user.perms.includes('partner.manage')} />;
}
