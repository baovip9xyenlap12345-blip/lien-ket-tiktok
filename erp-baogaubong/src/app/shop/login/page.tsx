'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { normalizePhone } from '@/modules/partners/domain';

function LoginInner() {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/shop/account';
  const [phone, setPhone] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    const u = normalizePhone(phone) ?? phone.trim();
    const res = await fetch('/api/portal/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ u, p: password }) });
    const j = await res.json(); setBusy(false);
    if (j.ok) router.push(next); else setErr(j.error || 'Sai tài khoản hoặc mật khẩu');
  }
  return (
    <div className="mx-auto max-w-sm rounded-xl bg-white p-6 ring-1 ring-slate-100">
      <h1 className="text-lg font-extrabold">Đăng nhập</h1>
      <p className="mb-3 text-sm text-slate-500">Dùng số điện thoại đã đăng ký.</p>
      <form onSubmit={submit} className="space-y-2">
        <input className="w-full rounded-lg border px-3 py-2" inputMode="tel" placeholder="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="w-full rounded-lg border px-3 py-2" type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <p className="text-sm font-semibold text-red-600">{err}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-pink-700 py-2.5 font-bold text-white disabled:opacity-50">{busy ? 'Đang vào…' : 'Đăng nhập'}</button>
      </form>
      <p className="mt-3 text-center text-sm text-slate-500">Chưa có tài khoản?{' '}
        <Link className="font-bold text-pink-700" href={`/shop/register?next=${encodeURIComponent(next)}`}>Đăng ký ngay</Link></p>
    </div>
  );
}
export default function LoginPage() { return <Suspense><LoginInner /></Suspense>; }
