'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fmtVND } from '@/lib/format';

type WH = { id: number; code: string; name: string };
type BalRow = { warehouseId: number; variantId: number; sku: string; name: string; type: string;
  onHand: number; reserved: number; available: number; minStock: number; maxStock: number | null;
  alert: 'low' | 'over' | null };
type MoveLine = { variantId: number; sku: string; name: string; qty: number };
type Shipment = { id: number; code: string; orderId: number; status: string; carrier: string | null;
  trackingNo: string | null; shipFee: number; codAmount: number; codStatus: string;
  lines: { id: number; sku: string; name: string; qty: number }[];
  order: { id: number; code: string; partnerName: string } | null; createdAt: string };

const MOVE_VI: Record<string, string> = { RECEIPT: '📥 Nhập kho', ISSUE: '📤 Xuất kho',
  SALE: '🛒 Giao bán', TRANSFER_IN: '🔁 Chuyển đến', TRANSFER_OUT: '🔁 Chuyển đi',
  ADJUST: '📝 Điều chỉnh', RETURN: '↩️ Nhập lại', SCRAP: '🗑️ Hủy hàng' };
const SHIP_VI: Record<string, string> = { PREPARING: 'Đang soạn', SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao', RETURNED: 'Bị trả', CANCELLED: 'Đã hủy' };

export default function InventoryClient({ canManage, canFinance }: { canManage: boolean; canFinance: boolean }) {
  const [tab, setTab] = useState<'stock' | 'move' | 'ship' | 'count' | 'cod'>('stock');
  const tabs: [typeof tab, string][] = [['stock', '📦 Tồn kho'],
    ...(canManage ? [['move', '📥 Nhập / Xuất'] as [typeof tab, string], ['ship', '🚚 Giao hàng'] as [typeof tab, string],
      ['count', '📋 Kiểm kho'] as [typeof tab, string]] : []),
    ...(canFinance ? [['cod', '💵 Đối soát COD'] as [typeof tab, string]] : [])];
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">Kho & Giao hàng</h1>
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map(([k, label]) => (
            <button key={k} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === k ? 'bg-white shadow' : 'text-slate-500'}`}
              onClick={() => setTab(k)}>{label}</button>))}
        </div>
      </div>
      {tab === 'stock' && <StockTab />}
      {tab === 'move' && canManage && <MoveTab />}
      {tab === 'ship' && canManage && <ShipTab />}
      {tab === 'count' && canManage && <CountTab />}
      {tab === 'cod' && canFinance && <CodTab />}
    </div>
  );
}

function useWarehouses() {
  const [whs, setWhs] = useState<WH[]>([]);
  useEffect(() => {
    fetch('/api/inventory/balances').then((r) => r.json()).then((j) => j.ok && setWhs(j.warehouses));
  }, []);
  return whs;
}

/* ============================ TON KHO ============================ */
function StockTab() {
  const [q, setQ] = useState(''); const [alertOnly, setAlertOnly] = useState(false);
  const [data, setData] = useState<{ warehouses: WH[]; rows: BalRow[] } | null>(null);
  const [history, setHistory] = useState<{ sku: string; variantId: number } | null>(null);
  const load = useCallback(async () => {
    const j = await (await fetch(`/api/inventory/balances?q=${encodeURIComponent(q)}${alertOnly ? '&alert=1' : ''}`)).json();
    if (j.ok) setData(j);
  }, [q, alertOnly]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const whName = (id: number) => data?.warehouses.find((w) => w.id === id)?.name ?? id;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="inp max-w-xs" placeholder="Tìm SKU, tên hàng…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={alertOnly} onChange={(e) => setAlertOnly(e.target.checked)} />
          Chỉ hiện cảnh báo</label>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>{['Kho', 'SKU', 'Tên hàng', 'Tồn thực tế', 'Giữ chỗ', 'Khả dụng', 'Cảnh báo', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {!data && <tr><td className="td text-slate-400" colSpan={8}>Đang tải…</td></tr>}
            {data?.rows.length === 0 && <tr><td className="td text-slate-400" colSpan={8}>
              Chưa có tồn kho — nhập kho ở tab “Nhập / Xuất”.</td></tr>}
            {data?.rows.map((r) => (
              <tr key={`${r.warehouseId}-${r.variantId}`} className={r.alert === 'low' ? 'bg-red-50/60' : r.alert === 'over' ? 'bg-amber-50/60' : ''}>
                <td className="td text-xs">{whName(r.warehouseId)}</td>
                <td className="td font-mono text-xs font-bold">{r.sku}</td>
                <td className="td text-sm">{r.name}</td>
                <td className="td text-right font-extrabold">{r.onHand}</td>
                <td className="td text-right text-slate-500">{r.reserved}</td>
                <td className="td text-right font-bold">{r.available}</td>
                <td className="td text-xs">{r.alert === 'low' ? <b className="text-red-600">⚠️ Sắp hết (≤{r.minStock})</b>
                  : r.alert === 'over' ? <b className="text-amber-600">Vượt max</b> : ''}</td>
                <td className="td"><button className="btn-ghost text-xs" onClick={() => setHistory({ sku: r.sku, variantId: r.variantId })}>📜 Thẻ kho</button></td>
              </tr>))}
          </tbody>
        </table>
      </div>
      {history && <HistoryModal {...history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function HistoryModal({ sku, variantId, onClose }: { sku: string; variantId: number; onClose: () => void }) {
  type Mv = { id: number; kind: string; qty: number; refType: string | null; refId: string | null;
    note: string | null; byName: string; createdAt: string };
  const [rows, setRows] = useState<Mv[] | null>(null);
  useEffect(() => {
    fetch(`/api/inventory/move?variantId=${variantId}`).then((r) => r.json()).then((j) => j.ok && setRows(j.rows));
  }, [variantId]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card max-h-[80vh] w-full max-w-lg overflow-y-auto p-5">
        <h2 className="mb-2 font-extrabold">Thẻ kho — <span className="font-mono text-sm">{sku}</span></h2>
        {rows === null && <p className="text-sm text-slate-400">Đang tải…</p>}
        {rows?.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-2 border-t border-slate-100 py-1.5 text-sm">
            <span className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleString('vi-VN')}</span>
            <span>{MOVE_VI[m.kind] ?? m.kind}</span>
            <span className={`font-extrabold ${m.qty > 0 ? 'text-green-700' : 'text-red-600'}`}>{m.qty > 0 ? '+' : ''}{m.qty}</span>
            {m.refId && <span className="font-mono text-xs text-slate-400">{m.refId}</span>}
            <span className="ml-auto text-xs text-slate-400">{m.byName}</span>
          </div>))}
        <div className="mt-3 flex justify-end"><button className="btn-ghost" onClick={onClose}>Đóng</button></div>
      </div>
    </div>
  );
}

/* ==================== CHON HANG BANG QUET/TIM (dung chung) ==================== */
function LinePicker({ lines, setLines }: { lines: MoveLine[]; setLines: (l: MoveLine[]) => void }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState<{ id: number; sku: string; name: string }[]>([]);
  const lastScan = useRef<{ sku: string; at: number }>({ sku: '', at: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setOpts([]); return; }
      const j = await (await fetch(`/api/catalog/products?q=${encodeURIComponent(q)}&page=1`)).json();
      if (j.ok) setOpts(j.rows.flatMap((p: { name: string; variants: { id: number; sku: string; size: string | null; color: string | null }[] }) =>
        p.variants.map((v) => ({ id: v.id, sku: v.sku,
          name: [p.name, v.size, v.color].filter(Boolean).join(' - ') }))).slice(0, 8));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  function add(v: { id: number; sku: string; name: string }, fromScan = false) {
    // Chong quet trung ngoai y muon: cung SKU trong vong 2 giay → hoi lai
    if (fromScan && lastScan.current.sku === v.sku && Date.now() - lastScan.current.at < 2000) {
      if (!confirm(`Vừa quét ${v.sku} xong — cộng thêm 1 nữa?`)) return;
    }
    lastScan.current = { sku: v.sku, at: Date.now() };
    const i = lines.findIndex((l) => l.variantId === v.id);
    if (i >= 0) setLines(lines.map((l, j) => j === i ? { ...l, qty: l.qty + 1 } : l));
    else setLines([...lines, { variantId: v.id, sku: v.sku, name: v.name, qty: 1 }]);
    setQ(''); setOpts([]); inputRef.current?.focus();
  }
  async function onScan() {
    const code = q.trim();
    if (!code) return;
    const j = await (await fetch(`/api/sales/pos?barcode=${encodeURIComponent(code)}`)).json();
    if (j.ok && j.variant) add({ id: j.variant.id, sku: j.variant.sku, name: j.variant.name }, true);
  }
  return (
    <div>
      <div className="relative mb-2">
        <input ref={inputRef} className="inp" placeholder="Quét mã vạch/SKU rồi Enter, hoặc gõ tên để tìm…"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onScan()} />
        {opts.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border bg-white shadow-lg">
            {opts.map((v) => (
              <button key={v.id} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-pink-50"
                onClick={() => add(v)}>
                <b>{v.name}</b> <span className="font-mono text-xs text-slate-400">{v.sku}</span>
              </button>))}
          </div>)}
      </div>
      {lines.map((l, i) => (
        <div key={l.variantId} className="mb-1 flex items-center gap-2 text-sm">
          <span className="font-mono text-xs font-bold">{l.sku}</span>
          <span className="flex-1 truncate">{l.name}</span>
          <input className="inp w-20 text-center" inputMode="numeric" value={l.qty}
            onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, qty: +e.target.value.replace(/[^\d-]/g, '') || 0 } : x))} />
          <button className="text-red-600" onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button>
        </div>))}
      {lines.length === 0 && <p className="py-2 text-center text-xs text-slate-400">Chưa có dòng hàng nào.</p>}
    </div>
  );
}

/* ============================ NHAP / XUAT ============================ */
function MoveTab() {
  const whs = useWarehouses();
  const [kind, setKind] = useState<'RECEIPT' | 'ISSUE' | 'RETURN' | 'SCRAP'>('RECEIPT');
  const [warehouseId, setWarehouseId] = useState(0);
  const [lines, setLines] = useState<MoveLine[]>([]);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { if (whs[0] && !warehouseId) setWarehouseId(whs[0].id); }, [whs, warehouseId]);
  async function submit() {
    setErr(''); setMsg('');
    const res = await fetch('/api/inventory/move', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, warehouseId, note, lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })) }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    setMsg(`✅ Đã ghi ${MOVE_VI[kind]} — ${lines.length} dòng.`); setLines([]); setNote('');
  }
  return (
    <div className="card max-w-2xl p-4">
      <div className="mb-2 flex flex-wrap gap-2">
        {(['RECEIPT', 'ISSUE', 'RETURN', 'SCRAP'] as const).map((k) => (
          <button key={k} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${kind === k ? 'bg-pink-700 text-white' : 'bg-slate-100'}`}
            onClick={() => setKind(k)}>{MOVE_VI[k]}</button>))}
      </div>
      <label className="lbl">Kho</label>
      <select className="inp mb-2 w-auto" value={warehouseId} onChange={(e) => setWarehouseId(+e.target.value)}>
        {whs.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
      </select>
      <LinePicker lines={lines} setLines={setLines} />
      <label className="lbl mt-2">Lý do / nội dung</label>
      <input className="inp mb-3" placeholder="VD: nhập lô gấu về từ xưởng may…" value={note} onChange={(e) => setNote(e.target.value)} />
      {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
      {msg && <p className="mb-2 text-sm font-semibold text-green-700">{msg}</p>}
      <button className="btn" onClick={submit}>💾 Ghi chứng từ kho</button>
      <p className="mt-2 text-xs text-slate-400">Chứng từ kho không sửa/xóa được — sai thì ghi chứng từ ngược lại. Hệ thống cấm âm kho.</p>
    </div>
  );
}

/* ============================ GIAO HANG ============================ */
function ShipTab() {
  const whs = useWarehouses();
  const [rows, setRows] = useState<Shipment[] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch('/api/inventory/shipments?page=1')).json();
    if (j.ok) setRows(j.rows);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function go(s: Shipment, to: string) {
    setErr('');
    let restock = true;
    if (to === 'RETURNED' || to === 'CANCELLED') {
      restock = confirm('Hàng nhận lại còn bán được không?\nOK = nhập lại kho · Cancel = hàng hỏng (hủy)');
    }
    const res = await fetch('/api/inventory/shipments', { method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, to, restock }) });
    const j = await res.json();
    if (!j.ok) setErr(`${s.code}: ${j.error}`);
    load();
  }
  const NEXT: Record<string, string[]> = { PREPARING: ['SHIPPING', 'CANCELLED'], SHIPPING: ['DELIVERED', 'RETURNED'], DELIVERED: ['RETURNED'] };
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button className="btn" onClick={() => setShowNew(true)}>＋ Tạo đợt giao từ đơn</button>
      </div>
      {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
      {rows === null && <div className="card p-6 text-slate-400">Đang tải…</div>}
      {rows?.length === 0 && <div className="card p-6 text-center text-slate-500">Chưa có đợt giao nào.</div>}
      {rows?.map((s) => (
        <div key={s.id} className="card mb-2 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono font-bold">{s.code}</span>
            {s.order && <span>đơn <b>{s.order.code}</b> · {s.order.partnerName}</span>}
            <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${s.status === 'DELIVERED' ? 'bg-green-100 text-green-700'
              : s.status === 'SHIPPING' ? 'bg-blue-100 text-blue-700'
              : s.status === 'RETURNED' || s.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500'
              : 'bg-amber-100 text-amber-700'}`}>{SHIP_VI[s.status]}</span>
            {s.carrier && <span className="text-xs text-slate-500">🚚 {s.carrier}{s.trackingNo ? ` · ${s.trackingNo}` : ''}</span>}
            {s.codAmount > 0 && <span className={`text-xs font-bold ${s.codStatus === 'RECONCILED' ? 'text-green-700' : 'text-amber-600'}`}>
              COD {fmtVND(s.codAmount)}đ {s.codStatus === 'RECONCILED' ? '✓ đã đối soát' : s.status === 'DELIVERED' ? '· chờ đối soát' : ''}</span>}
            <span className="ml-auto flex gap-1">
              {(NEXT[s.status] ?? []).map((to) => (
                <button key={to} className={`btn-ghost text-xs ${to === 'RETURNED' || to === 'CANCELLED' ? 'text-red-600' : 'text-pink-700'}`}
                  onClick={() => go(s, to)}>→ {SHIP_VI[to]}</button>))}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {s.lines.map((l) => `${l.sku} ×${l.qty}`).join(' · ')}
          </div>
        </div>))}
      {showNew && <NewShipmentModal whs={whs} onClose={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function NewShipmentModal({ whs, onClose }: { whs: WH[]; onClose: () => void }) {
  type Ord = { id: number; code: string; partnerName: string };
  const [oq, setOq] = useState(''); const [orders, setOrders] = useState<Ord[]>([]);
  const [order, setOrder] = useState<Ord | null>(null);
  const [orderLines, setOrderLines] = useState<{ variantId: number; sku: string; name: string; qty: number; ship: number }[]>([]);
  const [warehouseId, setWarehouseId] = useState(whs[0]?.id ?? 0);
  const [carrier, setCarrier] = useState(''); const [trackingNo, setTrackingNo] = useState('');
  const [shipFee, setShipFee] = useState(0); const [codAmount, setCodAmount] = useState(0);
  const [err, setErr] = useState('');
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!oq.trim()) { setOrders([]); return; }
      const j = await (await fetch(`/api/sales/orders?q=${encodeURIComponent(oq)}&status=CONFIRMED&page=1`)).json();
      if (j.ok) setOrders(j.rows.slice(0, 6));
    }, 250);
    return () => clearTimeout(t);
  }, [oq]);
  async function pick(o: Ord) {
    setOrder(o); setOrders([]); setOq('');
    const j = await (await fetch(`/api/sales/orders?id=${o.id}`)).json();
    if (j.ok) {
      setOrderLines(j.order.lines
        .filter((l: { variantId: number | null }) => l.variantId)
        .map((l: { variantId: number; sku: string; name: string; qty: number }) =>
          ({ variantId: l.variantId, sku: l.sku, name: l.name, qty: l.qty, ship: l.qty })));
      const remaining = j.order.total - j.order.paidAmt;
      setCodAmount(Math.max(0, remaining));
    }
  }
  async function save() {
    setErr('');
    if (!order) { setErr('Chọn đơn trước.'); return; }
    const lines = orderLines.filter((l) => l.ship > 0).map((l) => ({ variantId: l.variantId, qty: l.ship }));
    if (!lines.length) { setErr('Chọn số lượng giao.'); return; }
    const res = await fetch('/api/inventory/shipments', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, warehouseId, lines, carrier: carrier || null,
        trackingNo: trackingNo || null, shipFee, codAmount }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card my-6 w-full max-w-xl p-5">
        <h2 className="mb-3 font-extrabold">Tạo đợt giao hàng</h2>
        {order ? (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-pink-50 px-2 py-1.5 text-sm">
            <span><b>{order.code}</b> · {order.partnerName}</span>
            <button className="text-red-600" onClick={() => { setOrder(null); setOrderLines([]); }}>✕</button>
          </div>
        ) : (
          <div className="relative mb-2">
            <input className="inp" placeholder="Tìm đơn Đã xác nhận theo mã/tên khách…" value={oq} onChange={(e) => setOq(e.target.value)} />
            {orders.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border bg-white shadow-lg">
                {orders.map((o) => (
                  <button key={o.id} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-pink-50"
                    onClick={() => pick(o)}><b>{o.code}</b> · {o.partnerName}</button>))}
              </div>)}
          </div>)}
        {orderLines.length > 0 && (
          <table className="mb-2 w-full text-sm">
            <thead><tr><th className="th">Hàng</th><th className="th">Đặt</th><th className="th">Giao đợt này</th></tr></thead>
            <tbody>{orderLines.map((l, i) => (
              <tr key={l.variantId}>
                <td className="td">{l.name} <span className="font-mono text-xs text-slate-400">{l.sku}</span></td>
                <td className="td text-center">{l.qty}</td>
                <td className="td"><input className="inp w-20 text-center" inputMode="numeric" value={l.ship}
                  onChange={(e) => setOrderLines(orderLines.map((x, j) => j === i ? { ...x, ship: +e.target.value.replace(/\D/g, '') || 0 } : x))} /></td>
              </tr>))}
            </tbody>
          </table>)}
        <div className="mb-2 grid grid-cols-2 gap-2">
          <div><label className="lbl">Kho xuất</label>
            <select className="inp" value={warehouseId} onChange={(e) => setWarehouseId(+e.target.value)}>
              {whs.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select></div>
          <div><label className="lbl">Đơn vị vận chuyển</label>
            <input className="inp" placeholder="GHN, GHTK, Viettel Post…" value={carrier} onChange={(e) => setCarrier(e.target.value)} /></div>
          <div><label className="lbl">Mã vận đơn</label>
            <input className="inp font-mono" value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} /></div>
          <div><label className="lbl">Phí giao (đ)</label>
            <input className="inp" inputMode="numeric" value={shipFee || ''}
              onChange={(e) => setShipFee(+e.target.value.replace(/\D/g, '') || 0)} /></div>
          <div><label className="lbl">Thu hộ COD (đ)</label>
            <input className="inp" inputMode="numeric" value={codAmount || ''}
              onChange={(e) => setCodAmount(+e.target.value.replace(/\D/g, '') || 0)} /></div>
        </div>
        {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn" onClick={save}>🚚 Tạo & xuất kho</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ KIEM KHO ============================ */
function CountTab() {
  const whs = useWarehouses();
  const [warehouseId, setWarehouseId] = useState(0);
  const [lines, setLines] = useState<MoveLine[]>([]);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { if (whs[0] && !warehouseId) setWarehouseId(whs[0].id); }, [whs, warehouseId]);
  async function submit() {
    setErr(''); setMsg('');
    const res = await fetch('/api/inventory/stocktake', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warehouseId, note,
        lines: lines.map((l) => ({ variantId: l.variantId, countedQty: l.qty })) }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    setMsg(`✅ Kiểm kho ${j.code} xong — ${j.diffs} dòng lệch đã tự điều chỉnh.`);
    setLines([]); setNote('');
  }
  return (
    <div className="card max-w-2xl p-4">
      <h2 className="mb-1 font-extrabold">Kiểm kho</h2>
      <p className="mb-2 text-xs text-slate-500">Quét/chọn hàng rồi nhập SỐ ĐẾM THỰC TẾ trên kệ. Hệ thống so với sổ và tự sinh chứng từ điều chỉnh phần lệch.</p>
      <select className="inp mb-2 w-auto" value={warehouseId} onChange={(e) => setWarehouseId(+e.target.value)}>
        {whs.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
      <LinePicker lines={lines} setLines={setLines} />
      <input className="inp mb-3 mt-2" placeholder="Ghi chú đợt kiểm…" value={note} onChange={(e) => setNote(e.target.value)} />
      {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
      {msg && <p className="mb-2 text-sm font-semibold text-green-700">{msg}</p>}
      <button className="btn" onClick={submit}>📋 Chốt kiểm kho</button>
    </div>
  );
}

/* ============================ DOI SOAT COD ============================ */
function CodTab() {
  type CodRow = Shipment & { order: { code: string; partnerName: string } | null };
  const [data, setData] = useState<{ rows: CodRow[]; total: number } | null>(null);
  const [accounts, setAccounts] = useState<{ id: number; code: string; name: string; kind: string }[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [toAccountId, setToAccountId] = useState(0);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const [j, a] = await Promise.all([
      (await fetch('/api/inventory/cod')).json(),
      (await fetch('/api/finance/accounts')).json()]);
    if (j.ok) setData(j);
    if (a.ok) {
      const nonCod = a.accounts.filter((x: { kind: string }) => x.kind !== 'COD');
      setAccounts(nonCod);
      if (nonCod[0]) setToAccountId((v) => v || nonCod[0].id);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  const pickedTotal = data?.rows.filter((r) => picked.includes(r.id)).reduce((a, r) => a + r.codAmount, 0) ?? 0;
  async function reconcile() {
    setErr(''); setMsg('');
    const res = await fetch('/api/inventory/cod', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipmentIds: picked, toAccountId }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    setMsg(`✅ Đã đối soát ${fmtVND(j.total)}đ — tiền chuyển từ quỹ COD sang quỹ đích.`);
    setPicked([]); load();
  }
  if (!data) return <div className="card p-6 text-slate-400">Đang tải…</div>;
  return (
    <div>
      <p className="mb-2 text-sm text-slate-500">
        Đơn <b>đã giao xong</b> nhưng tiền COD còn nằm ở đơn vị vận chuyển (quỹ “COD chờ đối soát”).
        Khi ngân hàng báo có, chọn các vận đơn khớp sao kê rồi bấm đối soát.</p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-bold">Chờ đối soát: {fmtVND(data.total)}đ</span>
        <span className="ml-auto flex items-center gap-2 text-sm">
          Chuyển về:
          <select className="inp w-auto" value={toAccountId} onChange={(e) => setToAccountId(+e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button className="btn" disabled={!picked.length} onClick={reconcile}>
            ✓ Đối soát {picked.length ? `(${fmtVND(pickedTotal)}đ)` : ''}</button>
        </span>
      </div>
      {msg && <p className="mb-2 text-sm font-semibold text-green-700">{msg}</p>}
      {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
      {data.rows.length === 0 && <div className="card p-6 text-center text-slate-500">🎉 Không còn COD nào chờ đối soát.</div>}
      {data.rows.map((r) => (
        <label key={r.id} className="card mb-2 flex cursor-pointer flex-wrap items-center gap-2 p-3 text-sm">
          <input type="checkbox" checked={picked.includes(r.id)}
            onChange={(e) => setPicked(e.target.checked ? [...picked, r.id] : picked.filter((x) => x !== r.id))} />
          <span className="font-mono font-bold">{r.code}</span>
          {r.order && <span>{r.order.code} · {r.order.partnerName}</span>}
          {r.carrier && <span className="text-xs text-slate-500">🚚 {r.carrier}{r.trackingNo ? ` · ${r.trackingNo}` : ''}</span>}
          <span className="ml-auto font-extrabold">{fmtVND(r.codAmount)}đ</span>
        </label>))}
    </div>
  );
}
