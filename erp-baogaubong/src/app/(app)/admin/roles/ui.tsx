'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type R = { id: number; code: string; name: string; isSystem: boolean; permIds: number[] };
type P = { id: number; code: string; name: string };

export default function RolesClient({ roles, perms }: { roles: R[]; perms: P[] }) {
  const r = useRouter();
  const [sel, setSel] = useState<R>(roles[0]);
  const [ids, setIds] = useState<number[]>(roles[0]?.permIds ?? []);
  const [msg, setMsg] = useState('');
  function pick(role: R) { setSel(role); setIds(role.permIds); setMsg(''); }
  async function save() {
    const res = await fetch('/api/admin/roles', { method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleId: sel.id, permIds: ids }) });
    const j = await res.json();
    setMsg(j.ok ? '✅ Đã lưu' : j.error); if (j.ok) r.refresh();
  }
  return (
    <div>
      <h1 className="mb-4 text-xl font-extrabold">Phân quyền vai trò</h1>
      <div className="mb-3 flex flex-wrap gap-2">
        {roles.map((x) => (
          <button key={x.id} onClick={() => pick(x)}
            className={x.id === sel?.id ? 'btn' : 'btn-ghost'}>{x.name}</button>))}
      </div>
      {sel && (
        <div className="card p-4">
          <p className="mb-3 text-sm text-slate-500">Quyền của vai trò <b>{sel.name}</b>{sel.code === 'admin' && ' — Super Admin luôn có toàn quyền'}:</p>
          <div className="grid gap-1.5 md:grid-cols-2">
            {perms.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" disabled={sel.code === 'admin'}
                  checked={sel.code === 'admin' || ids.includes(p.id)}
                  onChange={(e) => setIds(e.target.checked ? [...ids, p.id] : ids.filter((i) => i !== p.id))} />
                {p.name} <span className="text-[10px] text-slate-400">{p.code}</span>
              </label>))}
          </div>
          {sel.code !== 'admin' && <button className="btn mt-4" onClick={save}>💾 Lưu phân quyền</button>}
          {msg && <span className="ml-3 text-sm font-semibold">{msg}</span>}
        </div>
      )}
    </div>
  );
}
