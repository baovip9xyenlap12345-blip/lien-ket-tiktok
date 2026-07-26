import { getBranding } from '@/modules/shop/branding';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const brand = await getBranding();
  return <LoginForm brandName={brand.shopName} />;
}
