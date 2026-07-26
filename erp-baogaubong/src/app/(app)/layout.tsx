export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getBranding } from '@/modules/shop/branding';
import Shell from '@/components/Shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const brand = await getBranding();
  return <Shell brandName={brand.shopName}
    user={{ name: user.name, roleName: user.roleName, perms: user.perms }}>{children}</Shell>;
}
