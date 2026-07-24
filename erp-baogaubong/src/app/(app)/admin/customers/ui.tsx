'use client';
import { useCallback, useEffect, useState } from 'react';

type Row = { id: number; partnerId: number; username: string; active: boolean;
  name: string; phone: string | null; isVip: boolean; orders: number; createdAt: string };

export default function CustomersClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<(Partial<Row> & { password?: string }) | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async (query: string) => {
    setLoading(true);
    const j = await fetch(`/api/admin/customers?q=${encodeURIComponent(query)}`).then((r) => r.json());
    if (j.ok) setRows(j.rows);
    setLoading(false);
  }, []);
  useEffect(() => { load(''); }, [load]);

  async function save() {
    if (!edit) return;
    setErr('');
    const body: Record<string, unknown> = { id: edit.id };
    if (edit.name) body.name = edit.name;
    if (edit.phone) body.phone = edit.phone;
    if (edit.password) body.password = edit.password;
    if (edit.active !== undefined) body.active = edit.active;
    const j = await fetch('/api/admin/customers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body) }).then((r) => r.json());
    if (j.ok) { setEdit(null); setMsg('✅ Đã lưu thông tin khách.'); setTimeout(() => setMsg(''), 2500); load(q); }
    else setErr(j.error || 'Lỗi lưu');
  }
  async function toggleLock(r: Row) {
    if (!confirm(r.active ? `Khóa tài khoản của ${r.name}? Khách sẽ không đăng nhập được.` : `Mở khóa cho ${r.name}?`)) return;
    await fetch('/api/admin/customers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, active: !r.active }) });
    load(q);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold">👤 Tài khoản khách hàng</h1>
          <p className="text-sm text-slate-500">Xem & quản lý tài khoản đăng nhập của khách: tên, số điện thoại, mật khẩu.</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="inp w-56" placeholder="Tìm tên / SĐT…" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(q)} />
          <button className="btn" onClick={() => load(q)}>Tìm</button>
        </div>
      </div>

      {msg && <p className="mb-2 text-sm font-semibold text-green-600">{msg}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="th">Tên khách</th><th className="th">SĐT (đăng nhập)</th>
            <th className="th">Số đơn</th><th className="th">Trạng thái</th><th className="th">Ngày tạo</th><th className="th"></th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td className="td text-slate-400" colSpan={6}>Đang tải…</td></tr>
              : rows.length === 0 ? <tr><td className="td text-slate-400" colSpan={6}>Chưa có tài khoản khách nào.</td></tr>
              : rows.map((r) => (
                <tr key={r.id}>
                  <td className="td font-semibold">{r.name} {r.isVip && <span className="ml-1 text-xs text-amber-500">⭐VIP</span>}</td>
                  <td className="td">{r.phone ?? r.username}</td>
                  <td className="td">{r.orders}</td>
                  <td className="td">{r.active
                    ? <span className="font-semibold text-green-700">Hoạt động</span>
                    : <span className="font-semibold text-red-600">Đã khóa</span>}</td>
                  <td className="td text-sm text-slate-400">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="td whitespace-nowrap">
                    <button className="btn-ghost" onClick={() => setEdit({ id: r.id, name: r.name, phone: r.phone ?? r.username, active: r.active })}>✏️ Sửa</button>
                    <button className="btn-ghost text-red-600" onClick={() => toggleLock(r)}>{r.active ? '🔒 Khóa' : '🔓 Mở'}</button>
                  </td>
                </tr>))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <div className="card w-full max-w-md p-5">
            <h2 className="mb-3 font-extrabold">Sửa tài khoản khách</h2>
            <label className="lbl">Tên khách</label>
            <input className="inp mb-2" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <label className="lbl">Số điện thoại (dùng để đăng nhập)</label>
            <input className="inp mb-2" inputMode="tel" value={edit.phone ?? ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            <label className="lbl">Đặt lại mật khẩu <span className="font-normal text-slate-400">(bỏ trống = giữ nguyên)</span></label>
            <input className="inp mb-2" type="text" placeholder="Mật khẩu mới cho khách" value={edit.password ?? ''} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
            <p className="mb-2 text-xs text-slate-400">💡 Đặt mật khẩu mới rồi báo cho khách. Mật khẩu tối thiểu 6 ký tự.</p>
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={edit.active ?? true} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Cho phép đăng nhập (bỏ tick = khóa)</label>
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
