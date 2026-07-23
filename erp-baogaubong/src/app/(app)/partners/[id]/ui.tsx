'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { fmtVND } from '@/lib/format';
import { KIND_VI } from '../ui';

type P = {
  id: number; code: string; name: string; type: string;
  isCustomer: boolean; isSupplier: boolean; isAgent: boolean;
  phone: string | null; email: string | null; taxCode: string | null;
  source: string | null; channel: string | null; creditLimit: number; creditDays: number;
  note: string | null; group: { name: string } | null; assignedTo: { id: number; name: string } | null;
  contacts: { id: number; name: string; phone: string | null; email: string | null; position: string | null }[];
  addresses: { id: number; label: string | null; address: string; isBilling: boolean; isShipping: boolean }[];
  activities: { id: number; kind: string; content: string; dueAt: string | null; doneAt: string | null;
    createdAt: string; createdBy: { name: string }; assignee: { name: string } | null }[];
  attachments: { id: number; fileName: string; mime: string; size: number; createdAt: string;
    uploadedBy: { name: string } }[];
};

export default function PartnerDetailClient({ id, canManage }: { id: number; canManage: boolean }) {
  const [p, setP] = useState<P | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [care, setCare] = useState({ kind: 'NOTE', content: '', dueAt: '' });
  const [showMerge, setShowMerge] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/partners/detail?id=${id}`);
    const j = await res.json();
    if (j.ok) setP(j.partner); else setNotFound(true);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function addCare() {
    setErr('');
    if (!care.content.trim()) { setErr('Nhập nội dung trước đã.'); return; }
    const res = await fetch('/api/partners/care', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId: id, kind: care.kind, content: care.content,
        dueAt: care.dueAt ? new Date(care.dueAt).toISOString() : null }) });
    const j = await res.json();
    if (j.ok) { setCare({ kind: 'NOTE', content: '', dueAt: '' }); load(); } else setErr(j.error || 'Lỗi');
  }
  async function toggleDone(aid: number, done: boolean) {
    await fetch('/api/partners/care', { method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: aid, done }) });
    load();
  }
  async function upload() {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    const fd = new FormData(); fd.set('file', f); fd.set('partnerId', String(id));
    const res = await fetch('/api/files', { method: 'POST', body: fd });
    const j = await res.json();
    if (!j.ok) setErr(j.error || 'Upload lỗi');
    if (fileRef.current) fileRef.current.value = '';
    load();
  }
  async function delFile(fid: number) {
    if (!confirm('Xóa file này?')) return;
    await fetch(`/api/files?id=${fid}`, { method: 'DELETE' }); load();
  }

  if (notFound) return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <div className="text-4xl">🔒</div>
      <p className="mt-2 font-bold">Không tìm thấy đối tác trong phạm vi của bạn.</p>
      <Link className="btn-ghost mt-3 inline-block" href="/partners">← Về danh sách</Link>
    </div>);
  if (!p) return <div className="card p-6 text-slate-400">Đang tải…</div>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link className="btn-ghost" href="/partners">←</Link>
        <h1 className="text-xl font-extrabold">{p.name} <span className="font-mono text-sm text-slate-400">{p.code}</span></h1>
        <span className="text-xs text-slate-500">
          {[p.isCustomer && 'Khách hàng', p.isAgent && 'Đại lý', p.isSupplier && 'NCC'].filter(Boolean).join(' · ')}
        </span>
        {canManage && <button className="btn-ghost ml-auto" onClick={() => setShowMerge(true)}>🔀 Gộp khách trùng</button>}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          <div className="card p-4 text-sm">
            <h2 className="mb-2 font-extrabold">Thông tin</h2>
            <Row k="SĐT" v={p.phone} /><Row k="Email" v={p.email} /><Row k="MST" v={p.taxCode} />
            <Row k="Nhóm" v={p.group?.name} /><Row k="Nguồn" v={p.source} /><Row k="Kênh" v={p.channel} />
            <Row k="Sale phụ trách" v={p.assignedTo?.name} />
            <Row k="Hạn mức nợ" v={p.creditLimit ? `${fmtVND(p.creditLimit)}đ / ${p.creditDays} ngày` : null} />
            {p.note && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs">{p.note}</p>}
          </div>
          <div className="card p-4 text-sm">
            <h2 className="mb-2 font-extrabold">Liên hệ & địa chỉ</h2>
            {p.contacts.length === 0 && p.addresses.length === 0 && <p className="text-xs text-slate-400">Chưa có — bấm ✏️ ở danh sách để thêm.</p>}
            {p.contacts.map((c) => (
              <div key={c.id} className="mb-1">👤 <b>{c.name}</b>{c.position ? ` (${c.position})` : ''}{c.phone ? ` · ${c.phone}` : ''}</div>))}
            {p.addresses.map((a) => (
              <div key={a.id} className="mb-1">📍 {a.address}
                <span className="text-xs text-slate-400">{a.isBilling ? ' · HĐ' : ''}{a.isShipping ? ' · Giao hàng' : ''}</span></div>))}
          </div>
          <div className="card p-4 text-sm">
            <h2 className="mb-2 font-extrabold">Tệp đính kèm ({p.attachments.length})</h2>
            {canManage && (
              <div className="mb-2 flex items-center gap-2">
                <input ref={fileRef} type="file" className="block w-full text-xs" />
                <button className="btn-ghost" onClick={upload}>⬆️</button>
              </div>)}
            {p.attachments.map((f) => (
              <div key={f.id} className="mb-1 flex items-center gap-2">
                <a className="flex-1 truncate font-semibold text-pink-700 hover:underline" href={`/api/files/${f.id}`}>
                  📎 {f.fileName}</a>
                <span className="text-xs text-slate-400">{Math.ceil(f.size / 1024)}KB</span>
                {canManage && <button className="text-red-600" onClick={() => delFile(f.id)}>✕</button>}
              </div>))}
            {p.attachments.length === 0 && <p className="text-xs text-slate-400">Chưa có file (logo, thiết kế, hợp đồng…).</p>}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card p-4">
            <h2 className="mb-2 font-extrabold">Lịch sử chăm sóc & nhiệm vụ</h2>
            {canManage && (
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <div><label className="lbl">Loại</label>
                  <select className="inp w-auto" value={care.kind} onChange={(e) => setCare({ ...care, kind: e.target.value })}>
                    {Object.entries(KIND_VI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div className="min-w-40 flex-1"><label className="lbl">Nội dung</label>
                  <input className="inp" placeholder="VD: Gọi báo giá gấu 1m2…" value={care.content}
                    onChange={(e) => setCare({ ...care, content: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && addCare()} /></div>
                <div><label className="lbl">Hạn / nhắc lúc</label>
                  <input className="inp" type="datetime-local" value={care.dueAt}
                    onChange={(e) => setCare({ ...care, dueAt: e.target.value })} /></div>
                <button className="btn" onClick={addCare}>＋ Ghi</button>
              </div>)}
            {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
            <div className="flex flex-col gap-2">
              {p.activities.length === 0 && <p className="text-sm text-slate-400">
                Chưa có hoạt động nào. Báo giá, đơn hàng, thanh toán sẽ tự hiện ở đây khi các phân hệ sau hoàn thành.</p>}
              {p.activities.map((a) => (
                <div key={a.id} className={`rounded-xl border p-3 text-sm ${a.doneAt ? 'border-slate-100 bg-slate-50 opacity-70' : 'border-slate-200'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{KIND_VI[a.kind] ?? a.kind}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(a.createdAt).toLocaleString('vi-VN')} · {a.createdBy.name}
                      {a.assignee ? ` → ${a.assignee.name}` : ''}
                    </span>
                    {a.dueAt && !a.doneAt && (
                      <span className={`text-xs font-bold ${new Date(a.dueAt) < new Date() ? 'text-red-600' : 'text-amber-600'}`}>
                        ⏰ hạn {new Date(a.dueAt).toLocaleString('vi-VN')}</span>)}
                    {canManage && (a.kind === 'TASK' || a.dueAt) && (
                      <button className="ml-auto text-xs font-bold text-pink-700 hover:underline"
                        onClick={() => toggleDone(a.id, !a.doneAt)}>{a.doneAt ? '↩︎ Mở lại' : '✓ Xong'}</button>)}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{a.content}</p>
                </div>))}
            </div>
          </div>
        </div>
      </div>
      {showMerge && <MergeModal keepId={p.id} keepLabel={`${p.code} — ${p.name}`}
        onClose={() => { setShowMerge(false); load(); }} />}
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return <div className="mb-1 flex gap-2"><span className="w-28 shrink-0 text-slate-400">{k}</span><span className="font-semibold">{v || '—'}</span></div>;
}

function MergeModal({ keepId, keepLabel, onClose }: { keepId: number; keepLabel: string; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<{ id: number; code: string; name: string; phone: string | null }[]>([]);
  const [pick, setPick] = useState<number | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    const t = setTimeout(async () => {
      const j = await (await fetch(`/api/partners?q=${encodeURIComponent(q)}&page=1`)).json();
      if (j.ok) setRows(j.rows.filter((r: { id: number }) => r.id !== keepId).slice(0, 8));
    }, 250);
    return () => clearTimeout(t);
  }, [q, keepId]);
  async function run() {
    setErr('');
    if (!pick) { setErr('Chọn đối tác bị gộp.'); return; }
    if (!confirm('Gộp xong không tách lại được (dữ liệu chuyển hết về bản giữ lại). Tiếp tục?')) return;
    const res = await fetch('/api/partners/merge', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keepId, mergeId: pick }) });
    const j = await res.json();
    if (j.ok) onClose(); else setErr(j.error || 'Lỗi');
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-md p-5">
        <h2 className="mb-1 font-extrabold">Gộp khách trùng</h2>
        <p className="mb-3 text-xs text-slate-500">Giữ lại: <b>{keepLabel}</b>. Chọn bản trùng bên dưới —
          liên hệ, địa chỉ, lịch sử chăm sóc, file sẽ chuyển hết sang bản giữ lại; bản trùng bị ẩn và ghi vào nhật ký.</p>
        <input className="inp mb-2" placeholder="Tìm đối tác bị gộp…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mb-2 max-h-48 overflow-y-auto">
          {rows.map((r) => (
            <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-sm hover:bg-slate-50">
              <input type="radio" name="mg" checked={pick === r.id} onChange={() => setPick(r.id)} />
              <span className="font-mono text-xs">{r.code}</span> {r.name}
              <span className="text-xs text-slate-400">{r.phone ?? ''}</span>
            </label>))}
          {rows.length === 0 && <p className="text-xs text-slate-400">Không có kết quả.</p>}
        </div>
        {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn" onClick={run}>🔀 Gộp</button>
        </div>
      </div>
    </div>
  );
}
