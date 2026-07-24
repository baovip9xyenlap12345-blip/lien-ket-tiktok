'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { fmtVND } from '@/lib/format';

type Opt = { id: number; name: string };
type PListOpt = { id: number; name: string; kind: string };
type Contact = { id?: number; name: string; phone?: string | null; email?: string | null;
  position?: string | null; note?: string | null };
type Addr = { id?: number; label?: string | null; address: string; isBilling: boolean; isShipping: boolean };
type Partner = { id: number; code: string; name: string; type: string;
  isCustomer: boolean; isSupplier: boolean; isAgent: boolean;
  phone: string | null; email: string | null; taxCode: string | null;
  groupId: number | null; source: string | null; channel: string | null;
  priceListId: number | null; assignedToId: number | null;
  creditLimit: number; creditDays: number; isVip?: boolean; note: string | null;
  group: Opt | null; assignedTo: Opt | null;
  contacts?: Contact[]; addresses?: Addr[] };
type Dupe = { id: number; code: string; name: string; reasons: string[] };
type DueTask = { id: number; kind: string; content: string; dueAt: string;
  partner: { id: number; code: string; name: string } };

export const KIND_VI: Record<string, string> = { NOTE: '📝 Ghi chú', CALL: '📞 Cuộc gọi', TASK: '✅ Nhiệm vụ', MEETING: '🤝 Gặp mặt' };

export default function PartnersClient({ meta, canManage, myScope }: {
  meta: { groups: Opt[]; sales: Opt[]; priceLists: PListOpt[] };
  canManage: boolean; myScope: string;
}) {
  const [role, setRole] = useState<'customer' | 'supplier' | 'agent' | ''>('customer');
  const [flag, setFlag] = useState<'' | 'online' | 'vip'>('');
  const [q, setQ] = useState(''); const [groupId, setGroupId] = useState(0);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: Partner[]; total: number; take: number } | null>(null);
  const [edit, setEdit] = useState<(Partial<Partner> & { contacts: Contact[]; addresses: Addr[] }) | null>(null);
  const [dupes, setDupes] = useState<Dupe[] | null>(null);
  const [due, setDue] = useState<DueTask[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/partners?q=${encodeURIComponent(q)}&role=${role}&flag=${flag}&groupId=${groupId || ''}&page=${page}`);
    const j = await res.json();
    if (j.ok) setData(j);
  }, [q, role, flag, groupId, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    fetch('/api/partners/care?due=1').then((r) => r.json()).then((j) => { if (j.ok) setDue(j.rows); }).catch(() => {});
  }, []);

  async function save(force = false) {
    setErr(''); setDupes(null);
    if (!edit) return;
    const res = await fetch('/api/partners', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...edit, forceDupe: force }) });
    const j = await res.json();
    if (j.ok) { setEdit(null); load(); }
    else if (res.status === 409 && j.dupes) setDupes(j.dupes);
    else setErr(j.error || 'Lỗi');
  }
  const blank = (): Partial<Partner> & { contacts: Contact[]; addresses: Addr[] } => ({
    type: 'PERSON', isCustomer: role !== 'supplier', isSupplier: role === 'supplier', isAgent: role === 'agent',
    creditLimit: 0, creditDays: 0, contacts: [], addresses: [] });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.take)) : 1;
  const overdue = due.filter((t) => new Date(t.dueAt) < new Date());

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">Đối tác & CRM</h1>
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {([['customer', 'Khách hàng'], ['agent', 'Đại lý'], ['supplier', 'Nhà cung cấp'], ['', 'Tất cả']] as const)
              .map(([k, label]) => (
              <button key={k} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${role === k ? 'bg-white shadow' : 'text-slate-500'}`}
                onClick={() => { setRole(k); setPage(1); }}>{label}</button>))}
          </div>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {([['', 'Tất cả'], ['online', '🌐 Khách online'], ['vip', '⭐ VIP']] as const).map(([k, label]) => (
              <button key={k} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${flag === k ? 'bg-white shadow' : 'text-slate-500'}`}
                onClick={() => { setFlag(k); setPage(1); }}>{label}</button>))}
          </div>
        </div>
      </div>

      {due.length > 0 && (
        <div className="card mb-3 border-l-4 border-amber-400 p-3">
          <div className="mb-1 text-sm font-extrabold">
            🔔 Lịch nhắc chăm sóc của tôi — {due.length} việc{overdue.length ? ` (${overdue.length} quá hạn)` : ''}
          </div>
          <div className="flex flex-col gap-0.5 text-sm">
            {due.slice(0, 5).map((t) => (
              <div key={t.id} className={new Date(t.dueAt) < new Date() ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                {new Date(t.dueAt).toLocaleDateString('vi-VN')} · {KIND_VI[t.kind] ?? t.kind} · {t.content} —{' '}
                <Link className="font-bold text-pink-700 hover:underline" href={`/partners/${t.partner.id}`}>{t.partner.name}</Link>
              </div>))}
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="inp max-w-xs" placeholder="Tìm tên, mã, SĐT, email, MST…" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="inp w-auto" value={groupId} onChange={(e) => { setGroupId(+e.target.value); setPage(1); }}>
          <option value={0}>— Mọi nhóm khách —</option>
          {meta.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <a className="btn-ghost" href="/api/partners/export">⬇️ Xuất CSV</a>
          {canManage && <button className="btn-ghost" onClick={() => setShowImport(true)}>⬆️ Nhập CSV</button>}
          {canManage && <button className="btn" onClick={() => setEdit(blank())}>＋ Thêm đối tác</button>}
        </div>
      </div>
      {myScope === 'OWN' && (
        <p className="mb-2 text-xs text-slate-400">Bạn đang xem theo phạm vi cá nhân — chỉ khách do bạn phụ trách hoặc tạo.</p>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th">Mã</th><th className="th">Tên</th><th className="th">Liên hệ</th>
            <th className="th">Nhóm</th><th className="th">Sale phụ trách</th>
            <th className="th">Hạn mức nợ</th><th className="th"></th></tr></thead>
          <tbody>
            {!data && <tr><td className="td text-slate-400" colSpan={7}>Đang tải…</td></tr>}
            {data?.rows.length === 0 && <tr><td className="td text-slate-400" colSpan={7}>
              Chưa có đối tác nào — bấm “Thêm đối tác” hoặc “Nhập CSV”.</td></tr>}
            {data?.rows.map((p) => (
              <tr key={p.id}>
                <td className="td font-bold">
                  <Link className="text-pink-700 hover:underline" href={`/partners/${p.id}`}>{p.code}</Link>
                </td>
                <td className="td">
                  <Link className="font-semibold hover:underline" href={`/partners/${p.id}`}>{p.name}</Link>
                  {p.isVip && <span className="ml-1 rounded bg-amber-100 px-1 text-xs font-bold text-amber-700">⭐ VIP</span>}
                  {p.source === 'online' && <span className="ml-1 rounded bg-blue-100 px-1 text-xs font-bold text-blue-700">🌐 Online</span>}
                  <div className="text-xs text-slate-400">
                    {[p.isCustomer && 'Khách', p.isAgent && 'Đại lý', p.isSupplier && 'NCC'].filter(Boolean).join(' · ')}
                    {p.type === 'COMPANY' ? ' · Doanh nghiệp' : ''}
                  </div>
                </td>
                <td className="td text-sm">{p.phone ?? '—'}{p.email && <div className="text-xs text-slate-400">{p.email}</div>}</td>
                <td className="td">{p.group?.name ?? '—'}</td>
                <td className="td">{p.assignedTo?.name ?? '—'}</td>
                <td className="td text-right text-sm">{p.creditLimit ? `${fmtVND(p.creditLimit)}đ / ${p.creditDays} ngày` : '—'}</td>
                <td className="td whitespace-nowrap">
                  {canManage && <button className="btn-ghost" onClick={async () => {
                    // Lay day du lien he/dia chi truoc khi sua — tranh ghi de mat du lieu
                    const j = await (await fetch(`/api/partners/detail?id=${p.id}`)).json();
                    if (j.ok) setEdit({ ...j.partner, contacts: j.partner.contacts ?? [], addresses: j.partner.addresses ?? [] });
                  }}>✏️</button>}
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-500">Tổng {data?.total ?? 0} đối tác</span>
        <div className="flex gap-1">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</button>
          <span className="px-2 py-1.5 font-bold">{page}/{pages}</span>
          <button className="btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau →</button>
        </div>
      </div>

      {edit && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <div className="card my-6 w-full max-w-2xl p-5">
            <h2 className="mb-3 font-extrabold">{edit.id ? `Sửa ${edit.code}` : 'Thêm đối tác'}</h2>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div><label className="lbl">Tên khách / công ty</label>
                <input className="inp" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div><label className="lbl">Loại</label>
                <select className="inp" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>
                  <option value="PERSON">Cá nhân</option><option value="COMPANY">Doanh nghiệp</option>
                </select></div>
            </div>
            <div className="mb-2 flex gap-4 text-sm">
              {([['isCustomer', 'Khách hàng'], ['isAgent', 'Đại lý'], ['isSupplier', 'Nhà cung cấp']] as const).map(([k, label]) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={!!edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.checked })} />{label}
                </label>))}
            </div>
            <div className="mb-2 grid grid-cols-3 gap-2">
              <div><label className="lbl">SĐT</label>
                <input className="inp" value={edit.phone ?? ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
              <div><label className="lbl">Email</label>
                <input className="inp" value={edit.email ?? ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
              <div><label className="lbl">MST</label>
                <input className="inp" value={edit.taxCode ?? ''} onChange={(e) => setEdit({ ...edit, taxCode: e.target.value })} /></div>
            </div>
            <div className="mb-2 grid grid-cols-3 gap-2">
              <div><label className="lbl">Nhóm khách</label>
                <select className="inp" value={edit.groupId ?? ''} onChange={(e) => setEdit({ ...edit, groupId: e.target.value ? +e.target.value : null })}>
                  <option value="">— không —</option>
                  {meta.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select></div>
              <div><label className="lbl">Nguồn khách</label>
                <input className="inp" placeholder="Facebook, TikTok…" value={edit.source ?? ''}
                  onChange={(e) => setEdit({ ...edit, source: e.target.value })} /></div>
              <div><label className="lbl">Kênh bán</label>
                <input className="inp" placeholder="Online, tại xưởng…" value={edit.channel ?? ''}
                  onChange={(e) => setEdit({ ...edit, channel: e.target.value })} /></div>
            </div>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div><label className="lbl">Bảng giá áp dụng</label>
                <select className="inp" value={edit.priceListId ?? ''} onChange={(e) => setEdit({ ...edit, priceListId: e.target.value ? +e.target.value : null })}>
                  <option value="">— theo mặc định —</option>
                  {meta.priceLists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select></div>
              <div><label className="lbl">Sale phụ trách</label>
                <select className="inp" value={edit.assignedToId ?? ''} onChange={(e) => setEdit({ ...edit, assignedToId: e.target.value ? +e.target.value : null })}>
                  <option value="">— tôi —</option>
                  {meta.sales.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div><label className="lbl">Hạn mức công nợ (VND)</label>
                <input className="inp" inputMode="numeric" value={edit.creditLimit ?? 0}
                  onChange={(e) => setEdit({ ...edit, creditLimit: +e.target.value.replace(/\D/g, '') || 0 })} /></div>
              <div><label className="lbl">Số ngày được nợ</label>
                <input className="inp" inputMode="numeric" value={edit.creditDays ?? 0}
                  onChange={(e) => setEdit({ ...edit, creditDays: +e.target.value.replace(/\D/g, '') || 0 })} /></div>
            </div>

            <SubRows title="Người liên hệ" rows={edit.contacts}
              onAdd={() => setEdit({ ...edit, contacts: [...edit.contacts, { name: '' }] })}
              onDel={(i) => setEdit({ ...edit, contacts: edit.contacts.filter((_, j) => j !== i) })}
              render={(c, i) => (
                <div className="grid flex-1 grid-cols-3 gap-1">
                  <input className="inp" placeholder="Tên" value={c.name}
                    onChange={(e) => setEdit({ ...edit, contacts: edit.contacts.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} />
                  <input className="inp" placeholder="SĐT" value={c.phone ?? ''}
                    onChange={(e) => setEdit({ ...edit, contacts: edit.contacts.map((x, j) => j === i ? { ...x, phone: e.target.value } : x) })} />
                  <input className="inp" placeholder="Chức vụ" value={c.position ?? ''}
                    onChange={(e) => setEdit({ ...edit, contacts: edit.contacts.map((x, j) => j === i ? { ...x, position: e.target.value } : x) })} />
                </div>)} />
            <SubRows title="Địa chỉ" rows={edit.addresses}
              onAdd={() => setEdit({ ...edit, addresses: [...edit.addresses, { address: '', isBilling: !edit.addresses.some((a) => a.isBilling), isShipping: !edit.addresses.some((a) => a.isShipping) }] })}
              onDel={(i) => setEdit({ ...edit, addresses: edit.addresses.filter((_, j) => j !== i) })}
              render={(a, i) => (
                <div className="flex flex-1 items-center gap-2">
                  <input className="inp flex-1" placeholder="Địa chỉ" value={a.address}
                    onChange={(e) => setEdit({ ...edit, addresses: edit.addresses.map((x, j) => j === i ? { ...x, address: e.target.value } : x) })} />
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={a.isBilling}
                    onChange={(e) => setEdit({ ...edit, addresses: edit.addresses.map((x, j) => j === i ? { ...x, isBilling: e.target.checked } : x) })} />HĐ</label>
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={a.isShipping}
                    onChange={(e) => setEdit({ ...edit, addresses: edit.addresses.map((x, j) => j === i ? { ...x, isShipping: e.target.checked } : x) })} />Giao</label>
                </div>)} />

            <label className="lbl">Ghi chú</label>
            <textarea className="inp mb-2" rows={2} value={edit.note ?? ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />

            {dupes && (
              <div className="mb-2 rounded-lg bg-amber-50 p-3 text-sm">
                <div className="mb-1 font-bold text-amber-700">⚠️ Có thể trùng với đối tác đã có:</div>
                {dupes.map((d) => (
                  <div key={d.id}>• <Link className="font-bold text-pink-700 hover:underline" href={`/partners/${d.id}`}>{d.code} — {d.name}</Link>
                    <span className="text-slate-500"> ({d.reasons.join(', ')})</span></div>))}
                <div className="mt-2 flex gap-2">
                  <button className="btn-ghost" onClick={() => setDupes(null)}>Để tôi kiểm tra</button>
                  <button className="btn" onClick={() => save(true)}>Vẫn lưu (khách khác nhau)</button>
                </div>
              </div>)}
            {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEdit(null)}>Hủy</button>
              <button className="btn" onClick={() => save(false)}>💾 Lưu</button>
            </div>
          </div>
        </div>
      )}
      {showImport && <ImportModal onClose={() => { setShowImport(false); load(); }} />}
    </div>
  );
}

function SubRows<T>({ title, rows, onAdd, onDel, render }: {
  title: string; rows: T[]; onAdd: () => void; onDel: (i: number) => void;
  render: (row: T, i: number) => React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-extrabold">{title}</span>
        <button className="btn-ghost" onClick={onAdd}>＋ Thêm</button>
      </div>
      {rows.length === 0 && <p className="text-xs text-slate-400">Chưa có.</p>}
      {rows.map((r, i) => (
        <div key={i} className="mb-1 flex items-center gap-2">
          {render(r, i)}
          <button className="btn-ghost text-red-600" onClick={() => onDel(i)}>✕</button>
        </div>))}
    </div>
  );
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [atomic, setAtomic] = useState(true);
  const [result, setResult] = useState<{ created?: number; rowErrors?: { line: number; errors: string[] }[]; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    const f = fileRef.current?.files?.[0];
    if (!f) { setResult({ error: 'Anh chọn file CSV trước đã.' }); return; }
    setBusy(true);
    const text = await f.text();
    const res = await fetch(`/api/partners/import${atomic ? '?atomic=1' : ''}`, { method: 'POST', body: text });
    setResult(await res.json()); setBusy(false);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg p-5">
        <h2 className="mb-2 font-extrabold">Nhập đối tác từ CSV</h2>
        <p className="mb-3 text-xs text-slate-500">Cột bắt buộc: <span className="font-mono">name</span> ·
          tùy chọn: <span className="font-mono">phone,email,tax_code,type,supplier,group,source,credit_limit,credit_days,note</span>.
          Dòng trùng SĐT với khách có sẵn sẽ bị báo lỗi.</p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="mb-2 block w-full text-sm" />
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={atomic} onChange={(e) => setAtomic(e.target.checked)} />
          Chế độ toàn vẹn: 1 dòng lỗi → hủy toàn bộ (khuyên dùng)
        </label>
        {result?.error && <p className="mb-2 text-sm font-semibold text-red-600">{result.error}</p>}
        {result?.created !== undefined && <p className="mb-2 text-sm font-semibold text-green-700">Đã nhập {result.created} dòng.</p>}
        {!!result?.rowErrors?.length && (
          <div className="mb-2 max-h-40 overflow-y-auto rounded-lg bg-red-50 p-2 text-xs text-red-700">
            {result.rowErrors.map((e, i) => <div key={i}>Dòng {e.line}: {e.errors.join('; ')}</div>)}
          </div>)}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Đóng</button>
          <button className="btn" disabled={busy} onClick={run}>{busy ? 'Đang nhập…' : '⬆️ Nhập'}</button>
        </div>
      </div>
    </div>
  );
}
