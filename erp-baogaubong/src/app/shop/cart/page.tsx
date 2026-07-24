'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtVND } from '@/lib/format';
import { shopImg } from '@/modules/shop/util';
import { readCart, setQty, removeItem, unitPrice, type CartItem } from '../cart';

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setItems(readCart());
    sync(); setReady(true);
    window.addEventListener('cart-changed', sync);
    return () => window.removeEventListener('cart-changed', sync);
  }, []);
  const total = items.reduce((s, x) => s + x.qty * unitPrice(x), 0);
  if (!ready) return null;

  return (
    <div>
      <h1 className="mb-3 text-lg font-extrabold">🛒 Giỏ hàng</h1>
      {items.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center text-slate-400">
          Giỏ hàng trống.<br /><Link href="/shop" className="mt-2 inline-block font-bold text-pink-700">← Tiếp tục mua sắm</Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.variantId} className="flex items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-slate-100">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {it.cover
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={shopImg(it.cover)!} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-2xl text-slate-300">🧸</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-semibold">{it.name}</div>
                  <div className="text-xs text-slate-400">{it.opt}</div>
                  <div className="font-bold text-pink-700">{fmtVND(unitPrice(it))}đ{unitPrice(it) < it.price && <span className="ml-1 text-xs text-slate-400 line-through">{fmtVND(it.price)}</span>}</div>
                </div>
                <div className="flex items-center rounded-lg border text-sm">
                  <button className="px-2 py-1" onClick={() => setQty(it.variantId, it.qty - 1)}>−</button>
                  <span className="w-8 border-x py-1 text-center">{it.qty}</span>
                  <button className="px-2 py-1" onClick={() => setQty(it.variantId, it.qty + 1)}>＋</button>
                </div>
                <button className="shrink-0 px-1 text-slate-400 hover:text-red-500" onClick={() => removeItem(it.variantId)}>✕</button>
              </div>
            ))}
          </div>
          <div className="sticky bottom-0 mt-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-100">
            <div>Tổng: <span className="text-xl font-extrabold text-pink-700">{fmtVND(total)}</span></div>
            <button onClick={() => router.push('/shop/checkout')} className="rounded-xl bg-pink-700 px-6 py-3 font-bold text-white">Đặt hàng →</button>
          </div>
        </>
      )}
    </div>
  );
}
