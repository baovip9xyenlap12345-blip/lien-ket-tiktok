'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cartCount } from './cart';

export default function ShopHeader({ shopName = 'Xưởng Gấu Bảo', logoSrc = null }:
  { shopName?: string; logoSrc?: string | null }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(cartCount());
    sync();
    window.addEventListener('cart-changed', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('cart-changed', sync); window.removeEventListener('storage', sync); };
  }, []);
  function search(e: React.FormEvent) { e.preventDefault(); router.push(`/shop?q=${encodeURIComponent(q.trim())}`); }
  return (
    <header className="sticky top-0 z-30 bg-pink-700 text-white shadow">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-3">
        <Link href="/shop" className="flex items-center gap-1.5 whitespace-nowrap text-lg font-extrabold">
          {logoSrc
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logoSrc} alt="" className="h-8 w-8 rounded-full bg-white object-contain" />
            : <span>🧸</span>}
          <span className="max-w-[40vw] truncate sm:max-w-none">{shopName}</span>
        </Link>
        <form onSubmit={search} className="flex flex-1 items-center">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm sản phẩm…"
            className="w-full rounded-l-full px-4 py-2 text-sm text-slate-800 outline-none" />
          <button className="rounded-r-full bg-pink-800 px-4 py-2 text-sm font-bold">Tìm</button>
        </form>
        <Link href="/shop/cart" className="relative shrink-0 text-2xl" aria-label="Giỏ hàng">🛒
          {count > 0 && <span className="absolute -right-2 -top-1 rounded-full bg-yellow-400 px-1.5 text-xs font-bold text-pink-900">{count}</span>}
        </Link>
        <Link href="/shop/account" className="shrink-0 text-2xl" aria-label="Tài khoản">👤</Link>
      </div>
    </header>
  );
}
