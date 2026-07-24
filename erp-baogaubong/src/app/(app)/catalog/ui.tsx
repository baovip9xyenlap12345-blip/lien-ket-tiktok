'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fmtVND as fmtMoney } from '@/lib/format';

type Unit = { id: number; code: string; name: string };
type Cat = { id: number; name: string };
type PList = { id: number; kind: string; name: string; priority: number; active: boolean };
type Variant = { id?: number; sku?: string; barcode?: string | null; size?: string | null;
  color?: string | null; material?: string | null; costPrice: number; weightGr?: number | null;
  salePrice?: number | null; stock?: number; openingStock?: number | null };
type Grp = { name: string; options: string[]; optionImages?: (string | null)[] };
type Product = { id: number; code: string; name: string; type: string; status: string;
  categoryId: number | null; unitId: number; desc?: string | null; note?: string | null;
  imageUrls?: string[]; videoUrl?: string | null; variantGroups?: Grp[] | null;
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
  const [categories, setCategories] = useState<Cat[]>(meta.categories);
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
        ? <ProductsTab meta={{ ...meta, categories }} canManage={canManage} showCost={showCost} setCategories={setCategories} />
        : <BomTab canManage={canManage} />}
    </div>
  );
}

/* ============================ MEDIA (ANH / VIDEO) ============================ */
// Key noi bo -> phuc vu qua API; link http -> giu nguyen (YouTube/TikTok/Drive).
function mediaSrc(key: string): string {
  return /^https?:\/\//.test(key) ? key : `/api/catalog/media/${encodeURIComponent(key)}`;
}

function ImageGallery({ urls, setUrls, canManage }: { urls: string[]; setUrls: (u: string[]) => void; canManage: boolean }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  async function onPick(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    const added: string[] = [];
    for (const f of Array.from(files).slice(0, 9 - urls.length)) {
      const fd = new FormData(); fd.append('file', f);
      const j = await (await fetch('/api/catalog/media', { method: 'POST', body: fd })).json();
      if (j.ok) added.push(j.key); else alert(j.error || 'Tải ảnh lỗi');
    }
    setBusy(false);
    setUrls([...urls, ...added].slice(0, 9));
    if (inputRef.current) inputRef.current.value = '';
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir; if (j < 0 || j >= urls.length) return;
    const next = [...urls]; [next[i], next[j]] = [next[j], next[i]]; setUrls(next);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((u, i) => (
        <div key={u + i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaSrc(u)} alt={`Ảnh ${i + 1}`} className="h-full w-full object-cover" />
          {i === 0 && <span className="absolute left-0 top-0 rounded-br bg-pink-600 px-1 text-[10px] font-bold text-white">Bìa</span>}
          {canManage && <>
            <button type="button" className="absolute right-0 top-0 bg-black/60 px-1 text-xs leading-4 text-white"
              onClick={() => setUrls(urls.filter((_, j) => j !== i))}>✕</button>
            <div className="absolute bottom-0 flex w-full justify-between bg-black/40 text-white">
              <button type="button" className="px-1 text-xs" onClick={() => move(i, -1)}>◀</button>
              <button type="button" className="px-1 text-xs" onClick={() => move(i, 1)}>▶</button>
            </div>
          </>}
        </div>
      ))}
      {canManage && urls.length < 9 && (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-pink-400 hover:text-pink-500">
          <span className="text-2xl leading-none">＋</span>
          <span className="mt-1 text-[10px]">{busy ? 'Đang tải…' : `Thêm ảnh ${urls.length}/9`}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onPick(e.target.files)} />
    </div>
  );
}

function VideoField({ url, setUrl, canManage }: { url: string; setUrl: (u: string) => void; canManage: boolean }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  async function onPick(files: FileList | null) {
    const f = files?.[0]; if (!f) return;
    setBusy(true);
    const fd = new FormData(); fd.append('file', f);
    const j = await (await fetch('/api/catalog/media', { method: 'POST', body: fd })).json();
    setBusy(false);
    if (j.ok) setUrl(j.key); else alert(j.error || 'Tải video lỗi');
    if (inputRef.current) inputRef.current.value = '';
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input className="inp flex-1" placeholder="Dán link YouTube / TikTok / Drive…"
        value={url} onChange={(e) => setUrl(e.target.value)} />
      {canManage && <button type="button" className="btn-ghost whitespace-nowrap" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? 'Đang tải…' : '⬆️ Tải video ≤30MB'}</button>}
      {url && <a className="text-xs font-semibold text-pink-700 underline" href={mediaSrc(url)} target="_blank" rel="noreferrer">Xem</a>}
      {url && canManage && <button type="button" className="text-xs text-red-600" onClick={() => setUrl('')}>Xóa</button>}
      <input ref={inputRef} type="file" accept="video/*" hidden onChange={(e) => onPick(e.target.files)} />
    </div>
  );
}

/* ===================== TRINH TAO PHAN LOAI (Shopee-style) ===================== */
const vkey = (s?: string | null, c?: string | null) => `${s ?? ''}||${c ?? ''}`;

/** Sinh danh sach to hop tu cac nhom (nhom1 x nhom2), giu lai gia/SKU da nhap theo key. */
function genVariants(groups: Grp[], existing: Variant[]): Variant[] {
  const g1 = (groups[0]?.options ?? []).map((o) => o.trim()).filter(Boolean);
  const g2 = (groups[1]?.options ?? []).map((o) => o.trim()).filter(Boolean);
  const ex = new Map(existing.map((v) => [vkey(v.size, v.color), v] as const));
  const base = (s: string | null, c: string | null): Variant => {
    const e = ex.get(vkey(s, c));
    return e ? { ...e, size: s, color: c } : { size: s, color: c, costPrice: 0, salePrice: null, weightGr: null };
  };
  if (g1.length && g2.length) return g1.flatMap((s) => g2.map((c) => base(s, c)));
  if (g1.length) return g1.map((s) => base(s, null));
  return [existing[0] ? { ...existing[0], size: null, color: null } : { costPrice: 0, salePrice: null, weightGr: null }];
}

/** Suy ra nhom phan loai khi mo SUA (uu tien ban luu, khong co thi doan tu size/mau). */
function deriveGroups(p: Partial<Product> & { variants: Variant[] }): Grp[] {
  if (p.variantGroups && p.variantGroups.length) return p.variantGroups.map((g) => ({ name: g.name, options: [...g.options], optionImages: g.optionImages ? [...g.optionImages] : undefined }));
  const sizes = [...new Set(p.variants.map((v) => v.size).filter(Boolean))] as string[];
  const colors = [...new Set(p.variants.map((v) => v.color).filter(Boolean))] as string[];
  const g: Grp[] = [];
  if (sizes.length) g.push({ name: 'Kích thước', options: sizes });
  if (colors.length) g.push({ name: 'Màu sắc', options: colors });
  return g;
}

/** O tai anh nho cho tung lua chon (nhom phan loai 1) — giong Shopee. */
function OptImg({ img, onChange }: { img: string | null; onChange: (key: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(f: File | undefined) {
    if (!f) return; setBusy(true);
    const fd = new FormData(); fd.append('file', f);
    const j = await (await fetch('/api/catalog/media', { method: 'POST', body: fd })).json();
    setBusy(false);
    if (j.ok) onChange(j.key); else alert(j.error || 'Tải ảnh lỗi');
    if (ref.current) ref.current.value = '';
  }
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} title="Ảnh cho lựa chọn này"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded border-2 border-dashed border-slate-300 text-slate-400 hover:border-pink-400">
        {img
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={mediaSrc(img)} alt="" className="h-full w-full object-cover" />
          : <span className="text-sm">{busy ? '…' : '📷'}</span>}
      </button>
      {img && <button type="button" onClick={() => onChange(null)} className="absolute -right-1.5 -top-1.5 rounded-full bg-black/60 px-1 text-[10px] leading-4 text-white">✕</button>}
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

function VariantBuilder({ groups, variants, showCost, onChange }: {
  groups: Grp[]; variants: Variant[]; showCost: boolean;
  onChange: (groups: Grp[], variants: Variant[]) => void;
}) {
  const [bulk, setBulk] = useState({ price: '', cost: '', weight: '', stock: '' });
  const num = (s: string) => +s.replace(/\D/g, '') || 0;
  const regen = (g: Grp[]) => onChange(g, genVariants(g, variants));
  const setName = (gi: number, name: string) => onChange(groups.map((g, i) => i === gi ? { ...g, name } : g), variants);
  const imgsOf = (g: Grp) => g.optionImages ?? g.options.map(() => null);
  const setOpt = (gi: number, oi: number, val: string) => regen(groups.map((g, i) => i === gi ? { ...g, options: g.options.map((o, j) => j === oi ? val : o) } : g));
  const addOpt = (gi: number) => regen(groups.map((g, i) => i === gi ? { ...g, options: [...g.options, ''], optionImages: [...imgsOf(g), null] } : g));
  const delOpt = (gi: number, oi: number) => regen(groups.map((g, i) => i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi), optionImages: imgsOf(g).filter((_, j) => j !== oi) } : g));
  const setOptImg = (gi: number, oi: number, key: string | null) => onChange(groups.map((g, i) => i === gi ? { ...g, optionImages: imgsOf(g).map((im, j) => j === oi ? key : im) } : g), variants);
  const addGroup = () => regen([...groups, { name: '', options: [''] }]);
  const delGroup = (gi: number) => regen(groups.filter((_, i) => i !== gi));
  const setVar = (i: number, patch: Partial<Variant>) => onChange(groups, variants.map((v, j) => j === i ? { ...v, ...patch } : v));
  const applyBulk = () => onChange(groups, variants.map((v) => ({ ...v,
    salePrice: bulk.price ? num(bulk.price) : v.salePrice,
    costPrice: bulk.cost ? num(bulk.cost) : v.costPrice,
    weightGr: bulk.weight ? num(bulk.weight) : v.weightGr,
    // Ton dau ky chi ap cho bien the MOI (chua co id) — bien the cu chinh ton o muc Kho.
    openingStock: (!v.id && bulk.stock) ? num(bulk.stock) : v.openingStock })));
  const hasGroups = groups.length > 0;

  return (
    <div>
      {/* Cac nhom phan loai */}
      {groups.map((g, gi) => (
        <div key={gi} className="mb-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-bold">Nhóm phân loại {gi + 1}</span>
            <input className="inp flex-1" placeholder="VD: Kích thước / Màu sắc"
              value={g.name} onChange={(e) => setName(gi, e.target.value)} />
            <button type="button" className="text-slate-400 hover:text-red-500" onClick={() => delGroup(gi)}>✕</button>
          </div>
          {gi === 0 && <p className="mb-1 pl-2 text-xs text-slate-400">💡 Thêm ảnh cho từng lựa chọn (VD mỗi màu 1 ảnh) — khách bấm sẽ thấy ảnh đó.</p>}
          <div className="space-y-1 pl-2">
            {g.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                {gi === 0 && <OptImg img={g.optionImages?.[oi] ?? null} onChange={(key) => setOptImg(gi, oi, key)} />}
                <input className="inp max-w-xs" placeholder="VD: 30cm / Đỏ" value={o} onChange={(e) => setOpt(gi, oi, e.target.value)} />
                <button type="button" className="text-slate-400 hover:text-red-500" disabled={g.options.length <= 1} onClick={() => delOpt(gi, oi)}>✕</button>
              </div>
            ))}
            <button type="button" className="text-sm font-semibold text-pink-700" onClick={() => addOpt(gi)}>＋ Thêm tùy chọn</button>
          </div>
        </div>
      ))}
      {groups.length < 2 && (
        <button type="button" className="mb-3 w-full rounded-lg border-2 border-dashed border-slate-300 py-2 text-sm font-semibold text-slate-500 hover:border-pink-400 hover:text-pink-600"
          onClick={addGroup}>＋ Thêm nhóm phân loại {groups.length + 1} (VD: {groups.length === 0 ? 'Kích thước' : 'Màu sắc'})</button>
      )}

      {/* Ap dung hang loat */}
      {hasGroups && variants.length > 1 && (
        <div className="mb-2 flex flex-wrap items-end gap-2 rounded-lg bg-pink-50 p-2">
          <span className="text-sm font-bold">Điền nhanh tất cả:</span>
          <input className="inp w-28" placeholder="Giá bán" inputMode="numeric" value={bulk.price} onChange={(e) => setBulk({ ...bulk, price: e.target.value })} />
          {showCost && <input className="inp w-28" placeholder="Giá vốn" inputMode="numeric" value={bulk.cost} onChange={(e) => setBulk({ ...bulk, cost: e.target.value })} />}
          <input className="inp w-24" placeholder="Nặng (gr)" inputMode="numeric" value={bulk.weight} onChange={(e) => setBulk({ ...bulk, weight: e.target.value })} />
          <input className="inp w-24" placeholder="Tồn kho" inputMode="numeric" value={bulk.stock} onChange={(e) => setBulk({ ...bulk, stock: e.target.value })} />
          <button type="button" className="btn" onClick={applyBulk}>Áp dụng</button>
        </div>
      )}

      {/* Bang to hop */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr>
            {hasGroups && <th className="th">{groups[0]?.name || 'Phân loại 1'}</th>}
            {groups.length >= 2 && <th className="th">{groups[1]?.name || 'Phân loại 2'}</th>}
            <th className="th">Giá bán (VND)</th>{showCost && <th className="th">Giá vốn (VND)</th>}
            <th className="th">Nặng (gr)</th><th className="th">Kho</th><th className="th">SKU (trống = tự sinh)</th>
          </tr></thead>
          <tbody>{variants.map((v, i) => (
            <tr key={i}>
              {hasGroups && <td className="td font-semibold">{v.size || '—'}</td>}
              {groups.length >= 2 && <td className="td font-semibold">{v.color || '—'}</td>}
              <td className="td"><input className="inp w-28" inputMode="numeric" placeholder="0" value={v.salePrice ?? ''}
                onChange={(e) => setVar(i, { salePrice: e.target.value ? num(e.target.value) : null })} /></td>
              {showCost && <td className="td"><input className="inp w-28" inputMode="numeric" value={v.costPrice}
                onChange={(e) => setVar(i, { costPrice: num(e.target.value) })} /></td>}
              <td className="td"><input className="inp w-20" inputMode="numeric" value={v.weightGr ?? ''}
                onChange={(e) => setVar(i, { weightGr: e.target.value ? num(e.target.value) : null })} /></td>
              <td className="td">{v.id
                ? <span className="whitespace-nowrap text-slate-500" title="Sửa tồn ở mục Kho">{v.stock ?? 0} <span className="text-[10px]">(ở Kho)</span></span>
                : <input className="inp w-20" inputMode="numeric" placeholder="0" value={v.openingStock ?? ''}
                    onChange={(e) => setVar(i, { openingStock: e.target.value ? num(e.target.value) : null })} />}</td>
              <td className="td"><input className="inp font-mono text-xs" value={v.sku ?? ''}
                onChange={(e) => setVar(i, { sku: e.target.value })} /></td>
            </tr>))}
          </tbody>
        </table>
      </div>
      {!hasGroups && <p className="mt-1 text-xs text-slate-400">Sản phẩm 1 loại duy nhất. Muốn bán nhiều size/màu → bấm “Thêm nhóm phân loại” ở trên.</p>}
    </div>
  );
}

/* ============================ TAB SAN PHAM ============================ */
function ProductsTab({ meta, canManage, showCost, setCategories }: {
  meta: { units: Unit[]; categories: Cat[]; priceLists: PList[] }; canManage: boolean; showCost: boolean;
  setCategories: (c: Cat[]) => void;
}) {
  const [showCatMgr, setShowCatMgr] = useState(false);
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
          <a className="btn-ghost" href="/shop" target="_blank" rel="noreferrer">🛍️ Xem gian hàng</a>
          <a className="btn-ghost" href="/api/catalog/export">⬇️ Xuất CSV</a>
          {canManage && <button className="btn-ghost" onClick={() => setShowCatMgr(true)}>🏷️ Nhóm hàng</button>}
          {canManage && <button className="btn-ghost" onClick={() => setShowImport(true)}>⬆️ Nhập CSV</button>}
          {canManage && <button className="btn" onClick={() => setEdit({ type: 'FINISHED', status: 'ACTIVE', variantGroups: [], variants: [{ costPrice: 0 }] })}>＋ Thêm sản phẩm</button>}
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
                <td className="td">
                  <div className="flex items-center gap-2">
                    {p.imageUrls && p.imageUrls[0]
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={mediaSrc(p.imageUrls[0])} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                      : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-300">🧸</span>}
                    <div>{p.name}{p.category && <div className="text-xs text-slate-400">{p.category.name}</div>}
                      {p.videoUrl && <span className="ml-1 text-xs text-pink-600">🎬</span>}</div>
                  </div>
                </td>
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
                    <button className="btn-ghost" onClick={() => setEdit({ ...p, variantGroups: deriveGroups(p), variants: p.variants.map((v) => ({ ...v })) })}>✏️</button>
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
            <label className="lbl">Hình ảnh sản phẩm (tối đa 9 — ảnh đầu là ảnh bìa)</label>
            <div className="mb-3">
              <ImageGallery urls={edit.imageUrls ?? []} canManage={canManage}
                setUrls={(u) => setEdit({ ...edit, imageUrls: u })} />
            </div>
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
            <textarea className="inp mb-3" rows={3} value={edit.desc ?? ''} onChange={(e) => setEdit({ ...edit, desc: e.target.value })} />
            <label className="lbl">Video sản phẩm (dán link hoặc tải file ngắn)</label>
            <div className="mb-3">
              <VideoField url={edit.videoUrl ?? ''} canManage={canManage}
                setUrl={(u) => setEdit({ ...edit, videoUrl: u })} />
            </div>
            <div className="mb-1 text-sm font-extrabold">Phân loại hàng</div>
            <div className="mb-3">
              <VariantBuilder groups={edit.variantGroups ?? []} variants={edit.variants} showCost={showCost}
                onChange={(g, vs) => setEdit({ ...edit, variantGroups: g, variants: vs })} />
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
      {showCatMgr && <CategoryManager cats={meta.categories} setCats={setCategories} onClose={() => setShowCatMgr(false)} />}
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

/* ===================== QUAN LY NHOM HANG ===================== */
function CategoryManager({ cats, setCats, onClose }: { cats: Cat[]; setCats: (c: Cat[]) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [edit, setEdit] = useState<{ id: number; name: string } | null>(null);
  const [err, setErr] = useState('');
  async function add() {
    if (!name.trim()) return;
    const j = await (await fetch('/api/catalog/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) })).json();
    if (j.ok) { setCats([...cats, { id: j.id, name: j.name }]); setName(''); setErr(''); } else setErr(j.error || 'Lỗi');
  }
  async function rename() {
    if (!edit || !edit.name.trim()) return;
    const j = await (await fetch('/api/catalog/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: edit.id, name: edit.name.trim() }) })).json();
    if (j.ok) { setCats(cats.map((c) => c.id === edit.id ? { ...c, name: j.name } : c)); setEdit(null); setErr(''); } else setErr(j.error || 'Lỗi');
  }
  async function del(id: number) {
    if (!confirm('Xóa nhóm hàng này?')) return;
    const j = await (await fetch(`/api/catalog/categories?id=${id}`, { method: 'DELETE' })).json();
    if (j.ok) { setCats(cats.filter((c) => c.id !== id)); setErr(''); } else setErr(j.error || 'Lỗi');
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card my-6 w-full max-w-md p-5">
        <h2 className="mb-1 font-extrabold">🏷️ Quản lý nhóm hàng</h2>
        <p className="mb-3 text-xs text-slate-500">Thêm/sửa/xóa nhóm hàng. Khách sẽ thấy các nhóm này ở gian hàng để lọc sản phẩm.</p>
        <div className="mb-2 flex gap-2">
          <input className="inp flex-1" placeholder="Tên nhóm mới (VD: Gấu bông in logo)" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button type="button" className="btn" onClick={add}>＋ Thêm</button>
        </div>
        {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {cats.length === 0 && <p className="text-sm text-slate-400">Chưa có nhóm nào.</p>}
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
              {edit?.id === c.id
                ? <>
                    <input className="inp flex-1" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && rename()} />
                    <button type="button" className="btn-ghost text-green-700" onClick={rename}>Lưu</button>
                    <button type="button" className="btn-ghost" onClick={() => setEdit(null)}>Hủy</button>
                  </>
                : <>
                    <span className="flex-1 font-semibold">{c.name}</span>
                    <button type="button" className="btn-ghost" onClick={() => setEdit({ id: c.id, name: c.name })}>✏️</button>
                    <button type="button" className="btn-ghost text-red-600" onClick={() => del(c.id)}>🗑️</button>
                  </>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end"><button type="button" className="btn-ghost" onClick={onClose}>Đóng</button></div>
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
