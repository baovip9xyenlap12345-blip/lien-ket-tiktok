'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtVND } from '@/lib/format';

type Order = { code: string; createdAt: string; total: number; orderStatus: string;
  paymentStatus: string; shippingStatus: string; items: { name: string; qty: number; lineTotal: number }[] };
type Me = { partnerName: string; username: string } | null;

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fetch('/api/portal/auth').then((r) => r.json()).then(async (j) => {
      if (j.ok && j.user) {
        setMe(j.user);
        const o = await (await fetch('/api/shop/my-orders')).json();
        if (o.ok) setOrders(o.orders);
      }
    }).finally(() => setReady(true));
  }, []);
  async function logout() { await fetch('/api/portal/auth', { method: 'DELETE' }); router.push('/shop'); }

  if (!ready) return null;
  if (!me) return (
    <div className="mx-auto max-w-sm rounded-xl bg-white p-8 text-center ring-1 ring-slate-100">
      <div className="text-4xl">👤</div>
      <p className="mt-2 text-slate-600">Bạn chưa đăng nhập.</p>
      <div className="mt-4 flex justify-center gap-3">
        <Link href="/shop/login" className="rounded-xl border-2 border-pink-600 px-5 py-2 font-bold text-pink-700">Đăng nhập</Link>
        <Link href="/shop/register" className="rounded-xl bg-pink-700 px-5 py-2 font-bold text-white">Đăng ký</Link>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-slate-100">
        <div><div className="font-extrabold">👤 {me.partnerName}</div><div className="text-sm text-slate-400">{me.username}</div></div>
        <button onClick={logout} className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-slate-600">Đăng xuất</button>
      </div>
      <h1 className="mb-2 text-lg font-extrabold">Đơn hàng của tôi</h1>
      {orders.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-slate-400">Chưa có đơn nào.<br />
          <Link href="/shop" className="mt-2 inline-block font-bold text-pink-700">← Mua sắm ngay</Link></div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.code} className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-pink-700">{o.code}</span>
                <span className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-semibold text-pink-700">{o.orderStatus}</span>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {o.items.map((it, i) => <div key={i} className="truncate">{it.name} ×{it.qty}</div>)}
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-slate-400">{o.paymentStatus} · {o.shippingStatus}</span>
                <span className="font-extrabold">{fmtVND(o.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
