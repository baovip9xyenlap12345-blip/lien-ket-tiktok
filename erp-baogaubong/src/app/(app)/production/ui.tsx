'use client';
import { useCallback, useEffect, useState } from 'react';
import { fmtVND } from '@/lib/format';
import { STAGE_VI, STAGES, type Stage } from '@/modules/production/domain';

type ProdRow = { id: number; code: string; status: string; qtyPlanned: number; qtyGood: number;
  qtyDefect: number; qtyScrap: number; dueDate: string | null; name: string; sku: string;
  progress: number; late: boolean; costEstimate: number; costActual: number };
type Design = { id: number; code: string; title: string; status: string; partnerName: string | null;
  versions: { id: number; no: number; status: string; imageUrl: string | null }[] };

const PST_VI: Record<string, string> = { DRAFT: 'Nháp', RELEASED: 'Đã giữ NL',
  IN_PROGRESS: 'Đang sản xuất', DONE: 'Hoàn thành', CANCELLED: 'Đã hủy' };
const DV_VI: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: '✓ Đã duyệt', REJECTED: '✕ Yêu cầu sửa' };

export default function ProductionClient({ canManage, canApprove, showCost }: {
  canManage: boolean; canApprove: boolean; showCost: boolean;
}) {
  const [tab, setTab] = useState<'orders' | 'designs'>('orders');
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">Sản xuất</h1>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          <button className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === 'orders' ? 'bg-white shadow' : 'text-slate-500'}`}
            onClick={() => setTab('orders')}>🏭 Lệnh sản xuất</button>
          <button className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === 'designs' ? 'bg-white shadow' : 'text-slate-500'}`}
            onClick={() => setTab('designs')}>🎨 Thiết kế & duyệt mẫu</button>
        </div>
      </div>
      {tab === 'orders' ? <OrdersTab canManage={canManage} showCost={showCost} />
        : <DesignsTab canManage={canManage} canApprove={canApprove} />}
    </div>
  );
}

/* ============================ LENH SAN XUAT ============================ */
function OrdersTab({ canManage, showCost }: { canManage: boolean; showCost: boolean }) {
  const [rows, setRows] = useState<ProdRow[] | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const load = useCallback(async () => {
    const j = await (await fetch('/api/production/orders')).json();
    if (j.ok) setRows(j.rows);
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <div className="mb-3 flex justify-end">
        {canManage && <button className="btn" onClick={() => setShowNew(true)}>＋ Tạo lệnh sản xuất</button>}
      </div>
      {rows === null && <div className="card p-6 text-slate-400">Đang tải…</div>}
      {rows?.length === 0 && <div className="card p-6 text-center text-slate-500">
        Chưa có lệnh sản xuất nào.</div>}
      <div className="grid gap-2 md:grid-cols-2">
        {rows?.map((r) => (
          <button key={r.id} className={`card p-3 text-left hover:ring-2 hover:ring-pink-200 ${r.late ? 'border-l-4 border-red-500' : ''}`}
            onClick={() => setDetail(r.id)}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono font-bold">{r.code}</span>
              <span className="font-bold">{r.name}</span>
              <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${r.status === 'DONE' ? 'bg-green-100 text-green-700'
                : r.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700'
                : r.status === 'CANCELLED' ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700'}`}>
                {PST_VI[r.status]}</span>
              {r.late && <span className="text-xs font-bold text-red-600">⏰ CHẬM TIẾN ĐỘ</span>}
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full ${r.late ? 'bg-red-500' : 'bg-pink-600'}`} style={{ width: `${r.progress}%` }} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Tiến độ {r.progress}% · đạt {r.qtyGood}/{r.qtyPlanned}
                {r.qtyScrap > 0 && <span className="text-red-500"> · hỏng {r.qtyScrap}</span>}</span>
              {r.dueDate && <span>· hạn {new Date(r.dueDate).toLocaleDateString('vi-VN')}</span>}
              {showCost && <span className="ml-auto">NL dự kiến {fmtVND(r.costEstimate)}đ{r.costActual ? ` · thực tế ${fmtVND(r.costActual)}đ` : ''}</span>}
            </div>
          </button>))}
      </div>
      {detail && <ProdDetail id={detail} canManage={canManage} showCost={showCost}
        onClose={() => { setDetail(null); load(); }} />}
      {showNew && <NewProdModal onClose={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function ProdDetail({ id, canManage, showCost, onClose }: {
  id: number; canManage: boolean; showCost: boolean; onClose: () => void;
}) {
  type Full = { prod: { id: number; code: string; status: string; qtyPlanned: number; qtyGood: number;
    qtyDefect: number; qtyScrap: number; dueDate: string | null; costEstimate: number; costActual: number;
    overrideNote: string | null; materialsIssued: boolean;
    steps: { id: number; stage: string; qtyGood: number; qtyDefect: number; qtyRework: number;
      note: string | null; byName: string; createdAt: string }[];
    designVersion: { no: number; status: string; design: { code: string; title: string } } | null };
    requirement: { sku: string; name: string; qtyInt: number; costPrice: number }[];
    variant: { sku: string; name: string; type: string } | null;
    checklist: string[]; progress: number; late: boolean };
  const [d, setD] = useState<Full | null>(null);
  const [stage, setStage] = useState<Stage>('CUT');
  const [stepQty, setStepQty] = useState({ good: 0, defect: 0, rework: 0, note: '' });
  const [qc, setQc] = useState<{ inspected: number; pass: number; fail: number; scrap: number; checks: Record<string, boolean> }>({ inspected: 0, pass: 0, fail: 0, scrap: 0, checks: {} });
  const [err, setErr] = useState(''); const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch(`/api/production/orders?id=${id}`)).json();
    if (j.ok) setD(j);
  }, [id]);
  useEffect(() => { load(); }, [load]);
  async function act(body: Record<string, unknown>) {
    setErr(''); setMsg('');
    const res = await fetch('/api/production/orders', { method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return false; }
    load(); return true;
  }
  if (!d) return null;
  const p = d.prod;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card my-6 w-full max-w-2xl p-5">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="font-extrabold">{p.code}</h2>
          <span>{d.variant?.name}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold">{PST_VI[p.status]}</span>
          {d.late && <span className="text-xs font-bold text-red-600">⏰ CHẬM</span>}
        </div>
        {p.designVersion && (
          <p className="mb-1 text-xs text-slate-500">🎨 Mẫu: {p.designVersion.design.code} bản {p.designVersion.no} — {DV_VI[p.designVersion.status]}
            {p.overrideNote && <b className="text-amber-600"> · Ngoại lệ: {p.overrideNote}</b>}</p>)}
        <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full ${d.late ? 'bg-red-500' : 'bg-pink-600'}`} style={{ width: `${d.progress}%` }} />
        </div>
        <p className="mb-2 text-sm">Kế hoạch <b>{p.qtyPlanned}</b> · QC đạt <b className="text-green-700">{p.qtyGood}</b>
          · lỗi làm lại <b className="text-amber-600">{p.qtyDefect}</b> · hỏng <b className="text-red-600">{p.qtyScrap}</b>
          {showCost && <> · NL dự kiến <b>{fmtVND(p.costEstimate)}đ</b>{p.costActual > 0 && <> / thực tế <b>{fmtVND(p.costActual)}đ</b></>}</>}</p>

        {d.requirement.length > 0 && (
          <details className="mb-2 rounded-xl bg-slate-50 p-3 text-sm" open={p.status === 'DRAFT'}>
            <summary className="cursor-pointer font-bold">Nhu cầu nguyên liệu (BOM + hao hụt)</summary>
            {d.requirement.map((r) => (
              <div key={r.sku} className="flex justify-between py-0.5">
                <span>{r.name} <span className="font-mono text-xs text-slate-400">{r.sku}</span></span>
                <span className="font-bold">{r.qtyInt}{showCost && <span className="text-xs text-slate-400"> · {fmtVND(r.qtyInt * r.costPrice)}đ</span>}</span>
              </div>))}
          </details>)}

        {canManage && p.status === 'DRAFT' && (
          <button className="btn mb-2 w-full" onClick={() => act({ action: 'release' })}>📌 Phát lệnh (giữ nguyên liệu)</button>)}
        {canManage && p.status === 'RELEASED' && (
          <button className="btn mb-2 w-full" onClick={() => act({ action: 'start' })}>▶️ Bắt đầu (cấp phát nguyên liệu)</button>)}

        {canManage && p.status === 'IN_PROGRESS' && (
          <div className="mb-2 rounded-xl bg-slate-50 p-3">
            <div className="mb-1 text-sm font-extrabold">Ghi công đoạn</div>
            <div className="mb-2 flex flex-wrap gap-1">
              {STAGES.filter((s) => s !== 'QC' && s !== 'PACK').map((s) => (
                <button key={s} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${stage === s ? 'bg-pink-700 text-white' : 'bg-white'}`}
                  onClick={() => setStage(s)}>{STAGE_VI[s]}</button>))}
            </div>
            <div className="flex flex-wrap items-end gap-2 text-sm">
              <div><label className="lbl">Đạt</label>
                <input className="inp w-20" inputMode="numeric" value={stepQty.good || ''}
                  onChange={(e) => setStepQty({ ...stepQty, good: +e.target.value.replace(/\D/g, '') || 0 })} /></div>
              <div><label className="lbl">Lỗi</label>
                <input className="inp w-20" inputMode="numeric" value={stepQty.defect || ''}
                  onChange={(e) => setStepQty({ ...stepQty, defect: +e.target.value.replace(/\D/g, '') || 0 })} /></div>
              <div><label className="lbl">Làm lại</label>
                <input className="inp w-20" inputMode="numeric" value={stepQty.rework || ''}
                  onChange={(e) => setStepQty({ ...stepQty, rework: +e.target.value.replace(/\D/g, '') || 0 })} /></div>
              <input className="inp flex-1" placeholder="Ghi chú/link ảnh…" value={stepQty.note}
                onChange={(e) => setStepQty({ ...stepQty, note: e.target.value })} />
              <button className="btn" onClick={async () => {
                if (await act({ action: 'step', stage, qtyGood: stepQty.good, qtyDefect: stepQty.defect,
                  qtyRework: stepQty.rework, note: stepQty.note || null })) {
                  setStepQty({ good: 0, defect: 0, rework: 0, note: '' }); setMsg('✅ Đã ghi công đoạn.');
                }
              }}>＋ Ghi</button>
            </div>

            <div className="mt-3 border-t border-slate-200 pt-2">
              <div className="mb-1 text-sm font-extrabold">KCS (QC) — {d.variant?.type === 'AI_BEAR' ? 'gấu AI' : 'gấu bông'}</div>
              {d.checklist.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={qc.checks[c] ?? false}
                    onChange={(e) => setQc({ ...qc, checks: { ...qc.checks, [c]: e.target.checked } })} />
                  {c}</label>))}
              <div className="mt-1 flex flex-wrap items-end gap-2 text-sm">
                <div><label className="lbl">Số kiểm</label>
                  <input className="inp w-20" inputMode="numeric" value={qc.inspected || ''}
                    onChange={(e) => setQc({ ...qc, inspected: +e.target.value.replace(/\D/g, '') || 0 })} /></div>
                <div><label className="lbl">Đạt</label>
                  <input className="inp w-20" inputMode="numeric" value={qc.pass || ''}
                    onChange={(e) => setQc({ ...qc, pass: +e.target.value.replace(/\D/g, '') || 0 })} /></div>
                <div><label className="lbl">Lỗi (làm lại)</label>
                  <input className="inp w-20" inputMode="numeric" value={qc.fail || ''}
                    onChange={(e) => setQc({ ...qc, fail: +e.target.value.replace(/\D/g, '') || 0 })} /></div>
                <div><label className="lbl">Hỏng</label>
                  <input className="inp w-20" inputMode="numeric" value={qc.scrap || ''}
                    onChange={(e) => setQc({ ...qc, scrap: +e.target.value.replace(/\D/g, '') || 0 })} /></div>
                <button className="btn" onClick={async () => {
                  if (await act({ action: 'qc', inspected: qc.inspected, pass: qc.pass,
                    fail: qc.fail, scrap: qc.scrap, checklist: qc.checks })) {
                    setQc({ inspected: 0, pass: 0, fail: 0, scrap: 0, checks: {} }); setMsg('✅ Đã ghi QC.');
                  }
                }}>✅ Ghi QC</button>
              </div>
              <button className="btn mt-2 w-full" onClick={() => act({ action: 'finish' })}>
                📦 Nhập kho thành phẩm ({p.qtyGood} con QC đạt)</button>
            </div>
          </div>)}

        {canManage && !['DONE', 'CANCELLED'].includes(p.status) && (
          <button className="btn-ghost mb-2 text-red-600" onClick={() => {
            const note = prompt('Lý do hủy lệnh?');
            if (note != null) act({ action: 'cancel', note });
          }}>🗑️ Hủy lệnh</button>)}

        <details className="mb-2 text-xs text-slate-500">
          <summary className="cursor-pointer font-bold">Nhật ký công đoạn ({p.steps.length})</summary>
          {p.steps.map((s) => (
            <div key={s.id}>· {new Date(s.createdAt).toLocaleString('vi-VN')} — {STAGE_VI[s.stage as Stage] ?? s.stage}:
              đạt {s.qtyGood}{s.qtyDefect ? `, lỗi ${s.qtyDefect}` : ''}{s.qtyRework ? `, làm lại ${s.qtyRework}` : ''}
              {s.note ? ` (${s.note})` : ''} — {s.byName}</div>))}
        </details>
        {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
        {msg && <p className="mb-2 text-sm font-semibold text-green-700">{msg}</p>}
        <div className="flex justify-end"><button className="btn-ghost" onClick={onClose}>Đóng</button></div>
      </div>
    </div>
  );
}

function NewProdModal({ onClose }: { onClose: () => void }) {
  const [sq, setSq] = useState('');
  const [opts, setOpts] = useState<{ id: number; sku: string; name: string }[]>([]);
  const [variant, setVariant] = useState<{ id: number; sku: string; name: string } | null>(null);
  const [qty, setQty] = useState(10);
  const [dueDate, setDueDate] = useState('');
  const [designs, setDesigns] = useState<Design[]>([]);
  const [designVersionId, setDesignVersionId] = useState<number | ''>('');
  const [err, setErr] = useState('');
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!sq.trim()) { setOpts([]); return; }
      const j = await (await fetch(`/api/catalog/products?q=${encodeURIComponent(sq)}&page=1`)).json();
      if (j.ok) setOpts(j.rows
        .filter((p: { type: string }) => ['FINISHED', 'SEMI', 'CUSTOM', 'AI_BEAR'].includes(p.type))
        .flatMap((p: { name: string; variants: { id: number; sku: string; size: string | null }[] }) =>
          p.variants.map((v) => ({ id: v.id, sku: v.sku, name: [p.name, v.size].filter(Boolean).join(' - ') }))).slice(0, 8));
    }, 250);
    return () => clearTimeout(t);
  }, [sq]);
  useEffect(() => {
    fetch('/api/production/designs').then((r) => r.json()).then((j) => j.ok && setDesigns(j.rows));
  }, []);
  async function save() {
    setErr('');
    if (!variant) { setErr('Chọn sản phẩm cần sản xuất.'); return; }
    const res = await fetch('/api/production/orders', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: variant.id, qtyPlanned: qty, warehouseId: 1,
        designVersionId: designVersionId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-md p-5">
        <h2 className="mb-3 font-extrabold">Tạo lệnh sản xuất</h2>
        {variant ? (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-pink-50 px-2 py-1.5 text-sm">
            <span><b>{variant.name}</b> <span className="font-mono text-xs">{variant.sku}</span></span>
            <button className="text-red-600" onClick={() => setVariant(null)}>✕</button>
          </div>
        ) : (
          <div className="relative mb-2">
            <input className="inp" placeholder="Tìm sản phẩm (thành phẩm/đặt riêng/gấu AI)…" value={sq}
              onChange={(e) => setSq(e.target.value)} />
            {opts.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border bg-white shadow-lg">
                {opts.map((v) => (
                  <button key={v.id} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-pink-50"
                    onClick={() => { setVariant(v); setOpts([]); setSq(''); }}>
                    <b>{v.name}</b> <span className="font-mono text-xs text-slate-400">{v.sku}</span>
                  </button>))}
              </div>)}
          </div>)}
        <div className="mb-2 grid grid-cols-2 gap-2">
          <div><label className="lbl">Số lượng</label>
            <input className="inp" inputMode="numeric" value={qty}
              onChange={(e) => setQty(Math.max(1, +e.target.value.replace(/\D/g, '') || 1))} /></div>
          <div><label className="lbl">Hạn hoàn thành</label>
            <input className="inp" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        </div>
        <label className="lbl">Bản thiết kế (hàng đặt riêng bắt buộc)</label>
        <select className="inp mb-3" value={designVersionId}
          onChange={(e) => setDesignVersionId(e.target.value ? +e.target.value : '')}>
          <option value="">— không gắn mẫu —</option>
          {designs.flatMap((dz) => dz.versions.map((v) => (
            <option key={v.id} value={v.id}>{dz.code} · {dz.title} · bản {v.no} ({DV_VI[v.status]})</option>)))}
        </select>
        {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn" onClick={save}>💾 Tạo lệnh</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ THIET KE ============================ */
function DesignsTab({ canManage, canApprove }: { canManage: boolean; canApprove: boolean }) {
  const [rows, setRows] = useState<Design[] | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch('/api/production/designs')).json();
    if (j.ok) setRows(j.rows);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function create() {
    setErr('');
    if (!title.trim()) { setErr('Nhập tên yêu cầu.'); return; }
    const res = await fetch('/api/production/designs', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', title }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    setTitle(''); load();
  }
  return (
    <div>
      {canManage && (
        <div className="mb-3 flex gap-2">
          <input className="inp max-w-md" placeholder="VD: Gấu tốt nghiệp in logo trường ABC…"
            value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()} />
          <button className="btn" onClick={create}>＋ Yêu cầu thiết kế</button>
        </div>)}
      {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
      {rows?.length === 0 && <div className="card p-6 text-center text-slate-500">Chưa có yêu cầu thiết kế nào.</div>}
      {rows?.map((dz) => (
        <button key={dz.id} className="card mb-2 flex w-full flex-wrap items-center gap-2 p-3 text-left text-sm hover:ring-2 hover:ring-pink-200"
          onClick={() => setDetail(dz.id)}>
          <span className="font-mono font-bold">{dz.code}</span>
          <span className="font-bold">{dz.title}</span>
          {dz.partnerName && <span className="text-xs text-slate-500">{dz.partnerName}</span>}
          <span className={`ml-auto rounded px-1.5 py-0.5 text-xs font-bold ${dz.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {dz.status === 'APPROVED' ? '✓ Có mẫu duyệt' : `${dz.versions.length} bản demo`}</span>
        </button>))}
      {detail && <DesignDetail id={detail} canManage={canManage} canApprove={canApprove}
        onClose={() => { setDetail(null); load(); }} />}
    </div>
  );
}

function DesignDetail({ id, canManage, canApprove, onClose }: {
  id: number; canManage: boolean; canApprove: boolean; onClose: () => void;
}) {
  type Full = { id: number; code: string; title: string; desc: string | null; status: string;
    versions: { id: number; no: number; status: string; imageUrl: string | null; note: string | null;
      decidedByName: string | null; decidedAt: string | null; decideNote: string | null;
      comments: { id: number; content: string; byName: string; createdAt: string }[] }[] };
  const [dz, setDz] = useState<Full | null>(null);
  const [newVer, setNewVer] = useState({ imageUrl: '', note: '' });
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch(`/api/production/designs?id=${id}`)).json();
    if (j.ok) setDz(j.design);
  }, [id]);
  useEffect(() => { load(); }, [load]);
  async function post(body: Record<string, unknown>) {
    setErr('');
    const res = await fetch('/api/production/designs', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return false; }
    load(); return true;
  }
  if (!dz) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card my-6 w-full max-w-xl p-5">
        <h2 className="mb-1 font-extrabold">{dz.code} — {dz.title}</h2>
        {dz.desc && <p className="mb-2 text-sm text-slate-500">{dz.desc}</p>}
        {canManage && (
          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex-1"><label className="lbl">Link ảnh demo</label>
              <input className="inp" placeholder="https://… (ảnh mẫu)" value={newVer.imageUrl}
                onChange={(e) => setNewVer({ ...newVer, imageUrl: e.target.value })} /></div>
            <div className="flex-1"><label className="lbl">Ghi chú bản này</label>
              <input className="inp" value={newVer.note} onChange={(e) => setNewVer({ ...newVer, note: e.target.value })} /></div>
            <button className="btn" onClick={async () => {
              if (await post({ action: 'version', designId: dz.id, imageUrl: newVer.imageUrl || null, note: newVer.note || null })) {
                setNewVer({ imageUrl: '', note: '' });
              }
            }}>＋ Thêm bản demo</button>
          </div>)}
        {dz.versions.map((v) => (
          <div key={v.id} className={`mb-2 rounded-xl border p-3 text-sm ${v.status === 'APPROVED' ? 'border-green-300 bg-green-50/40' : v.status === 'REJECTED' ? 'border-red-200 opacity-70' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <b>Bản {v.no}</b>
              <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${v.status === 'APPROVED' ? 'bg-green-100 text-green-700' : v.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                {DV_VI[v.status]}</span>
              {v.decidedByName && <span className="text-xs text-slate-400">
                bởi {v.decidedByName} · {v.decidedAt ? new Date(v.decidedAt).toLocaleString('vi-VN') : ''}
                {v.decideNote ? ` — ${v.decideNote}` : ''}</span>}
              {canApprove && v.status === 'PENDING' && (
                <span className="ml-auto flex gap-1">
                  <button className="btn-ghost text-green-700" onClick={() => post({ action: 'decide', versionId: v.id, approve: true })}>✓ Duyệt</button>
                  <button className="btn-ghost text-red-600" onClick={() => {
                    const note = prompt('Cần sửa gì?');
                    if (note != null) post({ action: 'decide', versionId: v.id, approve: false, note });
                  }}>✕ Yêu cầu sửa</button>
                </span>)}
            </div>
            {v.imageUrl && <a className="text-xs font-bold text-pink-700 hover:underline" href={v.imageUrl} target="_blank">🖼️ Xem ảnh demo</a>}
            {v.note && <p className="text-xs text-slate-500">{v.note}</p>}
            {v.comments.map((c) => (
              <p key={c.id} className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs">💬 <b>{c.byName}</b>: {c.content}</p>))}
            {canManage && v.status === 'PENDING' && (
              <div className="mt-1 flex gap-1">
                <input className="inp text-xs" placeholder="Góp ý bản này…" value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && comment.trim()) {
                      if (await post({ action: 'comment', versionId: v.id, content: comment })) setComment('');
                    }
                  }} />
              </div>)}
          </div>))}
        {dz.versions.length === 0 && <p className="text-sm text-slate-400">Chưa có bản demo nào.</p>}
        {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
        <div className="flex justify-end"><button className="btn-ghost" onClick={onClose}>Đóng</button></div>
      </div>
    </div>
  );
}
