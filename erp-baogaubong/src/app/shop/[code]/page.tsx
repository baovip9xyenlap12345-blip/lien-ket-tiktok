import Link from 'next/link';
import { notFound } from 'next/navigation';
import { shopProductByCode } from '@/modules/shop/data';
import ProductView from './ProductView';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: { code: string } }) {
  const p = await shopProductByCode(decodeURIComponent(params.code));
  if (!p) notFound();
  return (
    <div>
      <Link href="/shop" className="mb-3 inline-block text-sm text-pink-700">← Về gian hàng</Link>
      <ProductView p={p} />
    </div>
  );
}
