'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type U = { id: number; username: string; name: string; phone: string | null; active: boolean;
  roleIds: number[]; roleNames: string[]; branchId: number | null; branchName: string | null; scope: string };
type Opt = { id: number; name: string };

export default function UsersClient({ users, roles, branches }: { users: U[]; roles: Opt[]; branches: Opt[] }) {
  const r = useRouter();
  const [edit, setEdit] = useState<Partial<U> & { password?: string } | null>(null);
  const [err, setErr] = useState('');
  function toggleRole(id: number) {
    if (!edit) return;
    const cur = edit.roleIds ?? [];
    setEdit({ ...edit, roleIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  }
  async function save() {
    setErr('');
    if (!edit?.roleIds || edit.roleIds.length === 0) { setErr('Hãy chọn ít nhất 1 vai trò.'); return; }
    const res = await fetch('/api/admin/users', {
      method: edit?.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit),
    });
    const j = await res.json();
    if (j.ok) { setEdit(null); r.refresh(); } else setErr(j.error || 'Lỗi');
  }
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Tài khoản nhân viên</h1>
        <button className="btn" onClick={() => setEdit({ active: true, scope: 'OWN', roleIds: [] })}>＋ Thêm tài khoản</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th">Tài khoản</th><th className="th">Họ tên</th><th className="th">Vai trò</th>
            <th className="th">Chi nhánh</th><th className="th">Phạm vi</th><th className="th">Trạng thái</th><th className="th"></th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}>
              <td className="td font-bold">{u.username}</td><td className="td">{u.name}</td>
              <td className="td">
                <div className="flex flex-wrap gap-1">
                  {u.roleNames.map((n, i) => (
                    <span key={i} className={`rounded px-1.5 py-0.5 text-xs font-semibold ${i === 0 ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-600'}`}>{n}</span>
                  ))}
                </div>
              </td>
              <td className="td">{u.branchName ?? '—'}</td>
              <td className="td">{u.scope}</td>
              <td className="td">{u.active ? <span className="font-semibold text-green-700">Hoạt động</span> : <span className="text-red-600">Khóa</span>}</td>
              <td className="td"><button className="btn-ghost" onClick={() => setEdit(u)}>✏️ Sửa</button></td>
            </tr>))}
          </tbody>
        </table>
      </div>
      {edit && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <div className="card w-full max-w-md p-5">
            <h2 className="mb-3 font-extrabold">{edit.id ? 'Sửa' : 'Thêm'} tài khoản</h2>
            <label className="lbl">Tài khoản đăng nhập</label>
            <input className="inp mb-2" value={edit.username ?? ''} disabled={!!edit.id}
              onChange={(e) => setEdit({ ...edit, username: e.target.value })} />
            <label className="lbl">Họ tên</label>
            <input className="inp mb-2" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <label className="lbl">SĐT</label>
            <input className="inp mb-2" value={edit.phone ?? ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            <label className="lbl">{edit.id ? 'Đặt lại mật khẩu (bỏ trống = giữ nguyên)' : 'Mật khẩu'}</label>
            <input className="inp mb-2" type="password" value={edit.password ?? ''} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
            <label className="lbl">Vai trò <span className="font-normal text-slate-400">(chọn nhiều để nhân viên kiêm nhiều việc — ô đầu tiên là vai trò chính)</span></label>
            <div className="mb-2 flex flex-wrap gap-1.5 rounded-lg border p-2">
              {roles.map((x) => {
                const sel = (edit.roleIds ?? []).includes(x.id);
                const order = (edit.roleIds ?? []).indexOf(x.id);
                return (
                  <button type="button" key={x.id} onClick={() => toggleRole(x.id)}
                    className={`rounded-lg border px-2.5 py-1 text-sm font-semibold ${sel ? 'border-pink-600 bg-pink-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
                    {sel && order === 0 ? '★ ' : sel ? '✓ ' : ''}{x.name}
                  </button>);
              })}
            </div>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div><label className="lbl">Chi nhánh</label>
                <select className="inp" value={edit.branchId ?? ''} onChange={(e) => setEdit({ ...edit, branchId: e.target.value ? +e.target.value : null })}>
                  <option value="">— không —</option>{branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select></div>
              <div><label className="lbl">Phạm vi dữ liệu</label>
                <select className="inp" value={edit.scope} onChange={(e) => setEdit({ ...edit, scope: e.target.value })}>
                  {['OWN','TEAM','BRANCH','ALL'].map((s) => <option key={s}>{s}</option>)}
                </select></div>
            </div>
            <div className="mb-3">
              <label className="lbl">Trạng thái</label>
              <select className="inp" value={edit.active ? '1' : '0'} onChange={(e) => setEdit({ ...edit, active: e.target.value === '1' })}>
                <option value="1">Hoạt động</option><option value="0">Khóa</option>
              </select>
            </div>
            {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEdit(null)}>Hủy</button>
              <button className="btn" onClick={save}>💾 Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
