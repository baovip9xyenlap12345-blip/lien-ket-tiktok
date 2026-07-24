'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RegisterInner() {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/shop';
  const [f, setF] = useState({ name: '', phone: '', password: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    const res = await fetch('/api/shop/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const j = await res.json(); setBusy(false);
    if (j.ok) router.push(next); else setErr(j.error || 'Đăng ký lỗi');
  }
  return (
    <div className="mx-auto max-w-sm rounded-xl bg-white p-6 ring-1 ring-slate-100">
      <h1 className="text-lg font-extrabold">Đăng ký tài khoản</h1>
      <p className="mb-3 text-sm text-slate-500">Miễn phí — chỉ cần số điện thoại.</p>
      <form onSubmit={submit} className="space-y-2">
        <input className="w-full rounded-lg border px-3 py-2" placeholder="Họ tên" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="w-full rounded-lg border px-3 py-2" inputMode="tel" placeholder="Số điện thoại" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className="w-full rounded-lg border px-3 py-2" type="password" placeholder="Mật khẩu (≥ 6 ký tự)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {err && <p className="text-sm font-semibold text-red-600">{err}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-pink-700 py-2.5 font-bold text-white disabled:opacity-50">{busy ? 'Đang tạo…' : 'Đăng ký'}</button>
      </form>
      <p className="mt-3 text-center text-sm text-slate-500">Đã có tài khoản?{' '}
        <Link className="font-bold text-pink-700" href={`/shop/login?next=${encodeURIComponent(next)}`}>Đăng nhập</Link></p>
    </div>
  );
}
export default function RegisterPage() { return <Suspense><RegisterInner /></Suspense>; }
