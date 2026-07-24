import { Suspense } from 'react';
import type { Metadata } from 'next';
import ShopHeader from './ShopHeader';
import ShopFab from './ShopFab';

export const metadata: Metadata = { title: 'Xưởng Gấu Bảo — Gấu bông chính xưởng', description: 'Gấu bông, thú nhồi bông chính xưởng — đặt hàng online, giao tận nơi.' };

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Suspense fallback={<div className="h-14 bg-pink-700" />}><ShopHeader /></Suspense>
      <main className="mx-auto max-w-5xl p-3 pb-24">{children}</main>
      <footer className="border-t bg-white py-6 text-center text-xs text-slate-400">
        🧸 Xưởng Gấu Bảo · Hotline <a href="tel:0376533857" className="font-semibold text-pink-600">0376.533.857</a> · muagaubong.com<br />
        Gấu bông chính xưởng — giao tận nơi toàn quốc.
      </footer>
      <ShopFab />
    </div>
  );
}
