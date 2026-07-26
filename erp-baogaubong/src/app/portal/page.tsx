import { getBranding } from '@/modules/shop/branding';
import PortalClient from './ui';

export const dynamic = 'force-dynamic';

/** Cong dai ly/khach hang — dang nhap rieng, mobile-first. */
export default async function PortalPage() {
  const brand = await getBranding();
  return <PortalClient brandName={brand.shopName} domain={brand.domain} />;
}
