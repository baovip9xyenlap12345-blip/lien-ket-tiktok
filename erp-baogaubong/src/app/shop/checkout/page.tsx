'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fmtVND } from '@/lib/format';
import { readCart, clearCart, type CartItem } from '../cart';

type Me = { partnerName: string; username: string } | null;

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [me, setMe] = useState<Me>(null);
  const [authReady, setAuthReady] = useState(false);
  const [f, setF] = useState({ receiverName: '', receiverPhone: '', address: '', note: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ code: string; total: number } | null>(null);

  useEffect(() => { setItems(readCart()); }, []);
  useEffect(() => {
    fetch('/api/portal/auth').then((r) => r.json()).then((j) => {
      if (j.ok && j.user) {
        setMe(j.user);
        setF((s) => ({ ...s, receiverName: j.user.partnerName ?? '', receiverPhone: j.user.username ?? '' }));
      }
    }).finally(() => setAuthReady(true));
  }, []);
  // Dat hang xong -> tu chuyen vao nhom Zalo sau 6 giay (khach van kip xem ma don + nut vao ngay).
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => { window.location.href = 'https://zalo.me/g/qolxci436'; }, 6000);
    return () => clearTimeout(t);
  }, [done]);
  const total = items.reduce((s, x) => s + x.qty * x.price, 0);

  async function submit() {
    setErr(''); setBusy(true);
    const res = await fetch('/api/shop/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })), ...f }) });
    const j = await res.json(); setBusy(false);
    if (j.ok) { clearCart(); setDone({ code: j.code, total: j.total }); }
    else setErr(j.error || 'Đặt hàng lỗi');
  }

  if (done) return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-8 text-center ring-1 ring-slate-100">
      <div className="text-5xl">✅</div>
      <h1 className="mt-3 text-xl font-extrabold">Đặt hàng thành công!</h1>
      <p className="mt-2 text-slate-600">Mã đơn: <b className="text-pink-700">{done.code}</b></p>
      <p className="text-slate-600">Tổng tiền (COD): <b>{fmtVND(done.total)}</b></p>
      <p className="mt-2 text-sm text-slate-400">Xưởng sẽ gọi xác nhận & giao hàng. Bạn trả tiền khi nhận hàng.</p>
      <a href="https://zalo.me/g/qolxci436" target="_blank" rel="noreferrer"
        className="mt-5 block rounded-xl bg-[#0068FF] py-3 font-bold text-white shadow">💬 Vào nhóm Zalo — nhận ưu đãi & theo dõi đơn</a>
      <p className="mt-1 text-xs text-slate-400">Đang tự chuyển vào nhóm Zalo sau 6 giây…</p>
      <div className="mt-4 flex justify-center gap-3">
        <Link href="/shop" className="rounded-xl border-2 border-pink-600 px-5 py-2 font-bold text-pink-700">Tiếp tục mua</Link>
        <Link href="/shop/account" className="rounded-xl bg-pink-700 px-5 py-2 font-bold text-white">Xem đơn của tôi</Link>
      </div>
    </div>
  );

  if (items.length === 0) return (
    <div className="rounded-xl bg-white p-10 text-center text-slate-400">
      Giỏ hàng trống.<br /><Link href="/shop" className="mt-2 inline-block font-bold text-pink-700">← Mua sắm</Link>
    </div>
  );

  if (authReady && !me) return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-8 text-center ring-1 ring-slate-100">
      <div className="text-4xl">👤</div>
      <h1 className="mt-2 text-lg font-extrabold">Đăng nhập để đặt hàng</h1>
      <p className="mt-1 text-sm text-slate-500">Tạo tài khoản nhanh bằng số điện thoại để theo dõi đơn hàng.</p>
      <div className="mt-4 flex justify-center gap-3">
        <Link href="/shop/login?next=/shop/checkout" className="rounded-xl border-2 border-pink-600 px-5 py-2 font-bold text-pink-700">Đăng nhập</Link>
        <Link href="/shop/register?next=/shop/checkout" className="rounded-xl bg-pink-700 px-5 py-2 font-bold text-white">Đăng ký</Link>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <h1 className="mb-2 text-lg font-extrabold">Thông tin giao hàng</h1>
        <div className="space-y-2 rounded-xl bg-white p-4 ring-1 ring-slate-100">
          <div><label className="text-sm font-semibold">Tên người nhận</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={f.receiverName} onChange={(e) => setF({ ...f, receiverName: e.target.value })} /></div>
          <div><label className="text-sm font-semibold">Số điện thoại</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" inputMode="tel" value={f.receiverPhone} onChange={(e) => setF({ ...f, receiverPhone: e.target.value })} /></div>
          <div><label className="text-sm font-semibold">Địa chỉ giao hàng</label>
            <textarea className="mt-1 w-full rounded-lg border px-3 py-2" rows={2} placeholder="Số nhà, thôn/xóm, xã/phường, huyện, tỉnh" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div><label className="text-sm font-semibold">Ghi chú (tùy chọn)</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        </div>
      </div>
      <div>
        <h1 className="mb-2 text-lg font-extrabold">Đơn hàng</h1>
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
          {items.map((it) => (
            <div key={it.variantId} className="flex justify-between border-b py-1.5 text-sm last:border-0">
              <span className="min-w-0 flex-1 truncate">{it.name} <span className="text-slate-400">{it.opt}</span> ×{it.qty}</span>
              <span className="ml-2 font-semibold">{fmtVND(it.price * it.qty)}</span>
            </div>
          ))}
          <div className="mt-3 flex justify-between text-lg font-extrabold">
            <span>Tổng (COD)</span><span className="text-pink-700">{fmtVND(total)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Thanh toán khi nhận hàng (COD). Phí ship xưởng báo khi xác nhận.</p>
          {err && <p className="mt-2 text-sm font-semibold text-red-600">{err}</p>}
          <button onClick={submit} disabled={busy || !authReady}
            className="mt-3 w-full rounded-xl bg-pink-700 py-3 font-bold text-white disabled:opacity-50">
            {busy ? 'Đang đặt…' : 'Đặt hàng (COD)'}</button>
        </div>
      </div>
    </div>
  );
}
