import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getBranding, fmtPhone } from '@/modules/shop/branding';
import { shopImg } from '@/modules/shop/util';
import ShopHeader from './ShopHeader';
import ShopFab from './ShopFab';

// Tieu de trang lay theo thuong hieu trong Cai dat (doi ten xuong → doi tieu de luon).
export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
  return { title: `${b.shopName} — Gấu bông chính xưởng`,
    description: b.slogan || 'Gấu bông, thú nhồi bông chính xưởng — đặt hàng online, giao tận nơi.' };
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const b = await getBranding();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Suspense fallback={<div className="h-16 bg-pink-700" />}>
        <ShopHeader shopName={b.shopName} logoSrc={b.logoUrl ? shopImg(b.logoUrl) : null} />
      </Suspense>
      <main className="mx-auto max-w-5xl p-3 pb-24">{children}</main>
      <footer className="border-t bg-white py-6 text-center text-xs text-slate-400">
        🧸 {b.shopName} · Hotline <a href={`tel:${b.phone}`} className="font-semibold text-pink-600">{fmtPhone(b.phone)}</a> · {b.domain}
        {b.address && <><br />{b.address}</>}<br />
        Gấu bông chính xưởng — giao tận nơi toàn quốc.
      </footer>
      <ShopFab phone={b.phone} messengerLink={b.messengerLink} zaloLink={b.zaloLink} />
    </div>
  );
}
