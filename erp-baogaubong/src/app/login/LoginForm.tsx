'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm({ brandName }: { brandName: string }) {
  const r = useRouter();
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr('');
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: fd.get('u'), password: fd.get('p') }),
    });
    const j = await res.json();
    if (j.ok) r.push('/'); else { setErr(j.error || 'Đăng nhập thất bại'); setBusy(false); }
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6">
        <h1 className="text-center text-xl font-extrabold text-brand">🧸 {brandName}</h1>
        <p className="mb-5 text-center text-xs text-slate-500">Hệ thống quản trị nội bộ</p>
        <label className="lbl">Tài khoản</label>
        <input name="u" className="inp mb-3" autoComplete="username" required />
        <label className="lbl">Mật khẩu</label>
        <input name="p" type="password" className="inp mb-4" autoComplete="current-password" required />
        <button className="btn w-full justify-center" disabled={busy}>{busy ? 'Đang đăng nhập…' : '🔓 Đăng nhập'}</button>
        {err && <p className="mt-3 text-center text-sm font-semibold text-red-600">{err}</p>}
        <p className="mt-4 text-center text-xs text-slate-400">Quên mật khẩu? Liên hệ Admin để cấp lại.</p>
      </form>
    </main>
  );
}
