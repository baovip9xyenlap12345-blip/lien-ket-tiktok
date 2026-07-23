'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fmtVND as fmtMoney } from '@/lib/format';

type Unit = { id: number; code: string; name: string };
type Cat = { id: number; name: string };
type PList = { id: number; kind: string; name: string; priority: number; active: boolean };
type Variant = { id?: number; sku?: string; barcode?: string | null; size?: string | null;
  color?: string | null; material?: string | null; costPrice: number; weightGr?: number | null };
type Product = { id: number; code: string; name: string; type: string; status: string;
  categoryId: number | null; unitId: number; desc?: string | null; note?: string | null;
  unit: Unit; category: Cat | null; variants: Variant[] };
type Rule = { id: number; priceListId: number; minQty: number; price: number;
  priceList: PList; variant: { id: number; sku: string; product: { name: string } } };
type BomItemV = { id: number; qtyPerUnit: string; note: string | null;
  materialVariant: { id: number; sku: string; product: { name: string } } };
type BomV = { id: number; no: number; status: string; wastePct: string; items: BomItemV[] };
type Bom = { id: number; name: string; product: { id: number; name: string; code: string }; versions: BomV[] };

const TYPE_VI: Record<string, string> = { FINISHED: 'Thành phẩm', MATERIAL: 'Nguyên liệu', SEMI: 'Bán thành phẩm',
  SERVICE: 'Dịch vụ', COMBO: 'Combo', CUSTOM: 'Đặt riêng', AI_BEAR: 'Gấu AI' };

export default function CatalogClient({ meta, canManage, showCost }: {
  meta: { units: Unit[]; categories: Cat[]; priceLists: PList[] };
  canManage: boolean; showCost: boolean;
}) {
  const [tab, setTab] = useState<'sp' | 'bom'>('sp');
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">Sản phẩm & hàng hóa</h1>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          <button className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === 'sp' ? 'bg-white shadow' : 'text-slate-500'}`}
            onClick={() => setTab('sp')}>Danh sách sản phẩm</button>
          <button className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === 'bom' ? 'bg-white shadow' : 'text-slate-500'}`}
            onClick={() => setTab('bom')}>Định mức (BOM)</button>
        </div>
      </div>
      {tab === 'sp'
        ? <ProductsTab meta={meta} canManage={canManage} showCost={showCost} />
        : <BomTab canManage={canManage} />}
    </div>
  );
}

/* ============================ TAB SAN PHAM ============================ */
function ProductsTab({ meta, canManage, showCost }: {
  meta: { units: Unit[]; categories: Cat[]; priceLists: PList[] }; canManage: boolean; showCost: boolean;
}) {
  const [q, setQ] = useState(''); const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: Product[]; total: number; take: number } | null>(null);
  const [edit, setEdit] = useState<(Partial<Product> & { variants: Variant[] }) | null>(null);
  const [priceOf, setPriceOf] = useState<{ variantId: number; sku: string } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/catalog/products?q=${encodeURIComponent(q)}&type=${type}&page=${page}`);
    const j = await res.json();
    if (j.ok) setData(j);
  }, [q, type, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function save() {
    setErr('');
    if (!edit) return;
    const res = await fetch('/api/catalog/products', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...edit, unitId: edit.unitId ?? meta.units[0]?.id }) });
    const j = await res.json();
    if (j.ok) { setEdit(null); load(); } else setErr(j.error || 'Lỗi');
  }
  async function del(p: Product) {
    if (!confirm(`Xóa sản phẩm "${p.name}"? (xóa mềm — có thể khôi phục trong dữ liệu)`)) return;
    await fetch(`/api/catalog/products?id=${p.id}`, { method: 'DELETE' });
    load();
  }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.take)) : 1;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="inp max-w-xs" placeholder="Tìm theo tên, mã, SKU…" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="inp w-auto" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">— Tất cả loại —</option>
          {Object.entries(TYPE_VI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <a className="btn-ghost" href="/api/catalog/export">⬇️ Xuất CSV</a>
          {canManage && <button className="btn-ghost" onClick={() => setShowImport(true)}>⬆️ Nhập CSV</button>}
          {canManage && <button className="btn" onClick={() => setEdit({ type: 'FINISHED', status: 'ACTIVE', variants: [{ costPrice: 0 }] })}>＋ Thêm sản phẩm</button>}
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th">Mã</th><th className="th">Tên sản phẩm</th><th className="th">Loại</th>
            <th className="th">ĐVT</th><th className="th">Biến thể (SKU / size / màu)</th>
            {showCost && <th className="th">Giá vốn</th>}<th className="th"></th></tr></thead>
          <tbody>
            {!data && <tr><td className="td text-slate-400" colSpan={7}>Đang tải…</td></tr>}
            {data?.rows.length === 0 && <tr><td className="td text-slate-400" colSpan={7}>Không có sản phẩm nào khớp bộ lọc.</td></tr>}
            {data?.rows.map((p) => (
              <tr key={p.id} className="align-top">
                <td className="td font-bold">{p.code}</td>
                <td className="td">{p.name}{p.category && <div className="text-xs text-slate-400">{p.category.name}</div>}</td>
                <td className="td">{TYPE_VI[p.type] ?? p.type}</td>
                <td className="td">{p.unit.name}</td>
                <td className="td">
                  {p.variants.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 py-0.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">{v.sku}</span>
                      <span className="text-xs text-slate-500">{[v.size, v.color].filter(Boolean).join(' · ') || '—'}</span>
                      <button className="text-xs font-bold text-pink-700 hover:underline"
                        onClick={() => setPriceOf({ variantId: v.id!, sku: v.sku! })}>💰 giá</button>
                    </div>))}
                </td>
                {showCost && <td className="td text-right">{p.variants.map((v) => (
                  <div key={v.id} className="py-0.5 text-sm">{fmtMoney(v.costPrice)}</div>))}</td>}
                <td className="td whitespace-nowrap">
                  {canManage && <>
                    <button className="btn-ghost" onClick={() => setEdit({ ...p, variants: p.variants.map((v) => ({ ...v })) })}>✏️</button>
                    <button className="btn-ghost text-red-600" onClick={() => del(p)}>🗑️</button>
                  </>}
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-500">Tổng {data?.total ?? 0} sản phẩm</span>
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
            <h2 className="mb-3 font-extrabold">{edit.id ? 'Sửa' : 'Thêm'} sản phẩm</h2>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div><label className="lbl">Mã sản phẩm</label>
                <input className="inp" value={edit.code ?? ''} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></div>
              <div><label className="lbl">Loại</label>
                <select className="inp" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>
                  {Object.entries(TYPE_VI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
            </div>
            <label className="lbl">Tên sản phẩm</label>
            <input className="inp mb-2" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <div className="mb-2 grid grid-cols-3 gap-2">
              <div><label className="lbl">Đơn vị tính</label>
                <select className="inp" value={edit.unitId ?? meta.units[0]?.id} onChange={(e) => setEdit({ ...edit, unitId: +e.target.value })}>
                  {meta.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select></div>
              <div><label className="lbl">Nhóm hàng</label>
                <select className="inp" value={edit.categoryId ?? ''} onChange={(e) => setEdit({ ...edit, categoryId: e.target.value ? +e.target.value : null })}>
                  <option value="">— không —</option>
                  {meta.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><label className="lbl">Trạng thái</label>
                <select className="inp" value={edit.status ?? 'ACTIVE'} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                  <option value="ACTIVE">Đang bán</option><option value="INACTIVE">Ngừng bán</option>
                </select></div>
            </div>
            <label className="lbl">Mô tả (hiện cho khách khi báo giá)</label>
            <textarea className="inp mb-3" rows={2} value={edit.desc ?? ''} onChange={(e) => setEdit({ ...edit, desc: e.target.value })} />
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-extrabold">Biến thể (size / màu)</span>
              <button className="btn-ghost" onClick={() => setEdit({ ...edit, variants: [...edit.variants, { costPrice: 0 }] })}>＋ Thêm biến thể</button>
            </div>
            <div className="mb-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><th className="th">SKU (trống = tự sinh)</th><th className="th">Size</th><th className="th">Màu</th>
                  {showCost && <th className="th">Giá vốn (VND)</th>}<th className="th">Nặng (gr)</th><th className="th"></th></tr></thead>
                <tbody>{edit.variants.map((v, i) => (
                  <tr key={i}>
                    <td className="td"><input className="inp font-mono text-xs" value={v.sku ?? ''}
                      onChange={(e) => setEdit({ ...edit, variants: edit.variants.map((x, j) => j === i ? { ...x, sku: e.target.value } : x) })} /></td>
                    <td className="td"><input className="inp w-20" value={v.size ?? ''}
                      onChange={(e) => setEdit({ ...edit, variants: edit.variants.map((x, j) => j === i ? { ...x, size: e.target.value } : x) })} /></td>
                    <td className="td"><input className="inp w-24" value={v.color ?? ''}
                      onChange={(e) => setEdit({ ...edit, variants: edit.variants.map((x, j) => j === i ? { ...x, color: e.target.value } : x) })} /></td>
                    {showCost && <td className="td"><input className="inp w-28" inputMode="numeric" value={v.costPrice}
                      onChange={(e) => setEdit({ ...edit, variants: edit.variants.map((x, j) => j === i ? { ...x, costPrice: +e.target.value.replace(/\D/g, '') || 0 } : x) })} /></td>}
                    <td className="td"><input className="inp w-20" inputMode="numeric" value={v.weightGr ?? ''}
                      onChange={(e) => setEdit({ ...edit, variants: edit.variants.map((x, j) => j === i ? { ...x, weightGr: e.target.value ? +e.target.value : null } : x) })} /></td>
                    <td className="td"><button className="btn-ghost text-red-600" disabled={edit.variants.length <= 1}
                      onClick={() => setEdit({ ...edit, variants: edit.variants.filter((_, j) => j !== i) })}>✕</button></td>
                  </tr>))}
                </tbody>
              </table>
            </div>
            {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEdit(null)}>Hủy</button>
              <button className="btn" onClick={save}>💾 Lưu sản phẩm</button>
            </div>
          </div>
        </div>
      )}

      {priceOf && <PriceModal variantId={priceOf.variantId} sku={priceOf.sku}
        lists={meta.priceLists} canManage={canManage} onClose={() => setPriceOf(null)} />}
      {showImport && <ImportModal onClose={() => { setShowImport(false); load(); }} />}
    </div>
  );
}

/* ============================ MODAL BANG GIA ============================ */
function PriceModal({ variantId, sku, lists, canManage, onClose }: {
  variantId: number; sku: string; lists: PList[]; canManage: boolean; onClose: () => void;
}) {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [add, setAdd] = useState({ priceListId: lists[0]?.id ?? 0, minQty: 1, price: 0 });
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch(`/api/catalog/prices?variantId=${variantId}`)).json();
    if (j.ok) setRules(j.rules);
  }, [variantId]);
  useEffect(() => { load(); }, [load]);
  async function saveRule() {
    setErr('');
    const res = await fetch('/api/catalog/prices', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...add, variantId }) });
    const j = await res.json();
    if (j.ok) load(); else setErr(j.error || 'Lỗi');
  }
  async function delRule(id: number) {
    await fetch(`/api/catalog/prices?id=${id}`, { method: 'DELETE' }); load();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg p-5">
        <h2 className="mb-1 font-extrabold">Bảng giá — <span className="font-mono text-sm">{sku}</span></h2>
        <p className="mb-3 text-xs text-slate-500">Giá theo bậc số lượng: khách mua từ “SL tối thiểu” trở lên sẽ áp giá của bậc đó.</p>
        <table className="mb-3 w-full text-sm">
          <thead><tr><th className="th">Bảng giá</th><th className="th">SL tối thiểu</th><th className="th">Đơn giá</th><th className="th"></th></tr></thead>
          <tbody>
            {rules === null && <tr><td className="td text-slate-400" colSpan={4}>Đang tải…</td></tr>}
            {rules?.length === 0 && <tr><td className="td text-slate-400" colSpan={4}>Chưa có giá — thêm bên dưới.</td></tr>}
            {rules?.map((r) => (
              <tr key={r.id}>
                <td className="td">{r.priceList.name}</td><td className="td">≥ {r.minQty}</td>
                <td className="td font-bold">{fmtMoney(r.price)}</td>
                <td className="td">{canManage && <button className="btn-ghost text-red-600" onClick={() => delRule(r.id)}>✕</button>}</td>
              </tr>))}
          </tbody>
        </table>
        {canManage && (
          <div className="flex flex-wrap items-end gap-2">
            <div><label className="lbl">Bảng giá</label>
              <select className="inp w-auto" value={add.priceListId} onChange={(e) => setAdd({ ...add, priceListId: +e.target.value })}>
                {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select></div>
            <div><label className="lbl">SL tối thiểu</label>
              <input className="inp w-24" inputMode="numeric" value={add.minQty}
                onChange={(e) => setAdd({ ...add, minQty: +e.target.value.replace(/\D/g, '') || 1 })} /></div>
            <div><label className="lbl">Đơn giá (VND)</label>
              <input className="inp w-32" inputMode="numeric" value={add.price}
                onChange={(e) => setAdd({ ...add, price: +e.target.value.replace(/\D/g, '') || 0 })} /></div>
            <button className="btn" onClick={saveRule}>＋ Thêm/Sửa bậc</button>
          </div>)}
        {err && <p className="mt-2 text-sm font-semibold text-red-600">{err}</p>}
        <div className="mt-3 flex justify-end"><button className="btn-ghost" onClick={onClose}>Đóng</button></div>
      </div>
    </div>
  );
}

/* ============================ MODAL NHAP CSV ============================ */
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
    const res = await fetch(`/api/catalog/import${atomic ? '?atomic=1' : ''}`, { method: 'POST', body: text });
    setResult(await res.json()); setBusy(false);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg p-5">
        <h2 className="mb-2 font-extrabold">Nhập sản phẩm từ CSV</h2>
        <p className="mb-3 text-xs text-slate-500">Cột bắt buộc: <span className="font-mono">code,name,type,unit</span> ·
          tùy chọn: <span className="font-mono">size,color,sku,cost,price_retail</span>.
          Loại: FINISHED / MATERIAL / SEMI / SERVICE / COMBO / CUSTOM / AI_BEAR.</p>
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

/* ============================ TAB BOM ============================ */
function BomTab({ canManage }: { canManage: boolean }) {
  const [boms, setBoms] = useState<Bom[] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const load = useCallback(async () => {
    const j = await (await fetch('/api/catalog/bom')).json();
    if (j.ok) setBoms(j.boms);
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <div className="mb-3 flex justify-end">
        {canManage && <button className="btn" onClick={() => setShowNew(true)}>＋ Tạo phiên bản định mức</button>}
      </div>
      {boms === null && <div className="card p-6 text-slate-400">Đang tải…</div>}
      {boms?.length === 0 && <div className="card p-6 text-center text-slate-500">
        Chưa có định mức nguyên liệu nào. Định mức (BOM) cho biết 1 thành phẩm cần bao nhiêu vải, bông, phụ kiện.</div>}
      {boms?.map((b) => (
        <div key={b.id} className="card mb-3 p-4">
          <div className="font-extrabold">{b.product.name} <span className="font-mono text-xs text-slate-400">({b.product.code})</span></div>
          {b.versions.map((v) => (
            <div key={v.id} className="mt-2 rounded-xl border border-slate-100 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm">
                <span className="font-bold">Phiên bản {v.no}</span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${v.status === 'ACTIVE' ? 'bg-green-100 text-green-700'
                  : v.status === 'RETIRED' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>
                  {v.status === 'ACTIVE' ? 'Đang dùng' : v.status === 'RETIRED' ? 'Đã thay thế' : 'Nháp'}</span>
                <span className="text-xs text-slate-500">hao hụt {Number(v.wastePct)}%</span>
              </div>
              <table className="w-full text-sm">
                <tbody>{v.items.map((it) => (
                  <tr key={it.id}>
                    <td className="td">{it.materialVariant.product.name} <span className="font-mono text-xs text-slate-400">{it.materialVariant.sku}</span></td>
                    <td className="td text-right font-bold">{Number(it.qtyPerUnit)}</td>
                    <td className="td text-xs text-slate-500">{it.note ?? ''}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>))}
        </div>))}
      {showNew && <BomNewModal onClose={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function BomNewModal({ onClose }: { onClose: () => void }) {
  type Pick_ = { id: number; label: string };
  const [finished, setFinished] = useState<Pick_[]>([]);
  const [materials, setMaterials] = useState<Pick_[]>([]);
  const [form, setForm] = useState<{ productId: number; wastePct: number; activate: boolean;
    items: { materialVariantId: number; qtyPerUnit: number }[] }>({ productId: 0, wastePct: 5, activate: true, items: [] });
  const [err, setErr] = useState('');
  useEffect(() => {
    (async () => {
      const [f, m] = await Promise.all([
        (await fetch('/api/catalog/products?type=FINISHED&page=1')).json(),
        (await fetch('/api/catalog/products?type=MATERIAL&page=1')).json(),
      ]);
      if (f.ok) setFinished(f.rows.map((p: Product) => ({ id: p.id, label: `${p.name} (${p.code})` })));
      if (m.ok) setMaterials(m.rows.flatMap((p: Product) =>
        p.variants.map((v) => ({ id: v.id!, label: `${p.name} — ${v.sku}` }))));
    })();
  }, []);
  async function save() {
    setErr('');
    if (!form.productId || !form.items.length) { setErr('Chọn thành phẩm và ít nhất 1 nguyên liệu.'); return; }
    const name = finished.find((f) => f.id === form.productId)?.label ?? 'BOM';
    const res = await fetch('/api/catalog/bom', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, name }) });
    const j = await res.json();
    if (j.ok) onClose(); else setErr(j.error || 'Lỗi');
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg p-5">
        <h2 className="mb-3 font-extrabold">Tạo phiên bản định mức</h2>
        <label className="lbl">Thành phẩm</label>
        <select className="inp mb-2" value={form.productId} onChange={(e) => setForm({ ...form, productId: +e.target.value })}>
          <option value={0}>— chọn —</option>
          {finished.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <div><label className="lbl">Hao hụt (%)</label>
            <input className="inp" inputMode="numeric" value={form.wastePct}
              onChange={(e) => setForm({ ...form, wastePct: +e.target.value.replace(/[^\d.]/g, '') || 0 })} /></div>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.activate} onChange={(e) => setForm({ ...form, activate: e.target.checked })} />
            Kích hoạt ngay (thay bản cũ)
          </label>
        </div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-extrabold">Nguyên liệu / 1 sản phẩm</span>
          <button className="btn-ghost" onClick={() => setForm({ ...form, items: [...form.items, { materialVariantId: materials[0]?.id ?? 0, qtyPerUnit: 1 }] })}>＋ Thêm dòng</button>
        </div>
        {form.items.map((it, i) => (
          <div key={i} className="mb-1 flex items-center gap-2">
            <select className="inp" value={it.materialVariantId}
              onChange={(e) => setForm({ ...form, items: form.items.map((x, j) => j === i ? { ...x, materialVariantId: +e.target.value } : x) })}>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <input className="inp w-24" inputMode="decimal" value={it.qtyPerUnit}
              onChange={(e) => setForm({ ...form, items: form.items.map((x, j) => j === i ? { ...x, qtyPerUnit: +e.target.value || 0 } : x) })} />
            <button className="btn-ghost text-red-600" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}>✕</button>
          </div>))}
        {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn" onClick={save}>💾 Lưu định mức</button>
        </div>
      </div>
    </div>
  );
}
