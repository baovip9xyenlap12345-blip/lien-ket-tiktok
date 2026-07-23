'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fmtVND } from '@/lib/format';
import { computeTotals } from '@/modules/sales/domain';

type Variant = { id: number; sku: string; size: string | null; color: string | null };
type Product = { id: number; name: string; type: string; variants: Variant[] };
type CartLine = { variantId: number; sku: string; name: string; qty: number; unitPrice: number; discountPct: number };
type PartnerOpt = { id: number; code: string; name: string; phone: string | null };

export default function PosTab() {
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [partner, setPartner] = useState<PartnerOpt | null>(null);
  const [pq, setPq] = useState(''); const [popts, setPopts] = useState<PartnerOpt[]>([]);
  const [discountAmt, setDiscountAmt] = useState(0);
  const [vat, setVat] = useState(false);
  const [paid, setPaid] = useState<number | ''>('');
  const [method, setMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const j = await (await fetch(`/api/catalog/products?q=${encodeURIComponent(q)}&type=FINISHED&page=1`)).json();
    if (j.ok) setProducts(j.rows);
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!pq.trim()) { setPopts([]); return; }
      const j = await (await fetch(`/api/partners?q=${encodeURIComponent(pq)}&role=customer&page=1`)).json();
      if (j.ok) setPopts(j.rows.slice(0, 6));
    }, 250);
    return () => clearTimeout(t);
  }, [pq]);

  async function addVariant(v: Variant, name: string) {
    setErr('');
    let price = prices[v.id];
    if (price === undefined) {
      const j = await (await fetch(`/api/catalog/resolve-price?variantId=${v.id}&qty=1`)).json();
      price = j.result?.price ?? 0;
      setPrices((p) => ({ ...p, [v.id]: price }));
      if (!j.result) setErr(`${v.sku} chưa có giá — nhập giá tay trong giỏ.`);
    }
    setCart((c) => {
      const i = c.findIndex((x) => x.variantId === v.id);
      if (i >= 0) return c.map((x, j2) => j2 === i ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { variantId: v.id, sku: v.sku,
        name: [name, v.size, v.color].filter(Boolean).join(' - '), qty: 1, unitPrice: price ?? 0, discountPct: 0 }];
    });
  }

  /** Quet ma vach: Enter trong o tim kiem → tra cuu chinh xac barcode/SKU. */
  async function onScan() {
    const code = q.trim();
    if (!code) return;
    const j = await (await fetch(`/api/sales/pos?barcode=${encodeURIComponent(code)}`)).json();
    if (j.ok && j.variant) {
      const v = j.variant;
      if (v.price != null) setPrices((p) => ({ ...p, [v.id]: v.price }));
      setCart((c) => {
        const i = c.findIndex((x) => x.variantId === v.id);
        if (i >= 0) return c.map((x, j2) => j2 === i ? { ...x, qty: x.qty + 1 } : x);
        return [...c, { variantId: v.id, sku: v.sku, name: v.name, qty: 1, unitPrice: v.price ?? 0, discountPct: 0 }];
      });
      setQ(''); searchRef.current?.focus();
    }
  }

  const totals = computeTotals({
    lines: cart.map((l) => ({ qty: l.qty, unitPrice: l.unitPrice, discountPct: l.discountPct })),
    discountAmt, vatEnabled: vat, vatPercent: 8 });
  const paidNum = paid === '' ? totals.total : paid; // bo trong = thu du

  async function checkout() {
    setErr(''); setMsg('');
    if (!cart.length) { setErr('Giỏ hàng trống.'); return; }
    setBusy(true);
    const res = await fetch('/api/sales/pos', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerId: partner?.id ?? null, partnerName: partner?.name ?? 'Khách lẻ',
        lines: cart.map((l) => ({ variantId: l.variantId, qty: l.qty, unitPrice: l.unitPrice, discountPct: l.discountPct })),
        discountAmt, vatEnabled: vat, paidAmt: paidNum, method }) });
    const j = await res.json();
    setBusy(false);
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    setMsg(`✅ Đã bán ${j.orderCode} — tổng ${fmtVND(j.total)}đ${j.change ? `, trả lại khách ${fmtVND(j.change)}đ` : ''}`);
    window.open(`/print/order/${j.orderId}?k80=1`, '_blank', 'width=420,height=640');
    setCart([]); setDiscountAmt(0); setPaid(''); setPartner(null); setPq('');
    searchRef.current?.focus();
  }

  return (
    <div className="grid gap-3 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <input ref={searchRef} className="inp mb-2" autoFocus
          placeholder="Tìm sản phẩm… (quét mã vạch rồi Enter)"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onScan()} />
        <div className="grid max-h-[70vh] grid-cols-2 gap-2 overflow-y-auto md:grid-cols-3">
          {products.map((p) => p.variants.map((v) => (
            <button key={v.id} className="card p-2 text-left hover:ring-2 hover:ring-pink-300"
              onClick={() => addVariant(v, p.name)}>
              <div className="text-sm font-bold leading-tight">{p.name}</div>
              <div className="text-xs text-slate-500">{[v.size, v.color].filter(Boolean).join(' · ') || v.sku}</div>
              <div className="mt-1 text-sm font-extrabold text-pink-700">
                {prices[v.id] !== undefined ? fmtVND(prices[v.id]) + 'đ' : '· bấm để lấy giá ·'}</div>
            </button>)))}
          {products.length === 0 && <p className="col-span-full p-4 text-sm text-slate-400">Không tìm thấy sản phẩm.</p>}
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="card p-3">
          <div className="mb-2">
            <label className="lbl">Khách hàng (bỏ trống = Khách lẻ)</label>
            {partner ? (
              <div className="flex items-center justify-between rounded-lg bg-pink-50 px-2 py-1.5 text-sm">
                <span className="font-bold">{partner.name}</span>
                <button className="text-red-600" onClick={() => setPartner(null)}>✕</button>
              </div>
            ) : (
              <div className="relative">
                <input className="inp" placeholder="Tìm khách theo tên/SĐT…" value={pq} onChange={(e) => setPq(e.target.value)} />
                {popts.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border bg-white shadow-lg">
                    {popts.map((p) => (
                      <button key={p.id} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-pink-50"
                        onClick={() => { setPartner(p); setPopts([]); setPq(''); }}>
                        <b>{p.name}</b> <span className="text-xs text-slate-400">{p.phone ?? p.code}</span>
                      </button>))}
                  </div>)}
              </div>)}
          </div>
          <div className="max-h-56 overflow-y-auto">
            {cart.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Giỏ hàng trống — chọn sản phẩm bên trái.</p>}
            {cart.map((l, i) => (
              <div key={l.variantId} className="mb-1.5 rounded-lg border border-slate-100 p-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-bold leading-tight">{l.name}</span>
                  <button className="text-red-600" onClick={() => setCart(cart.filter((_, j) => j !== i))}>✕</button>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <button className="btn-ghost px-2" onClick={() => setCart(cart.map((x, j) => j === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}>−</button>
                  <input className="inp w-14 text-center" inputMode="numeric" value={l.qty}
                    onChange={(e) => setCart(cart.map((x, j) => j === i ? { ...x, qty: Math.max(1, +e.target.value.replace(/\D/g, '') || 1) } : x))} />
                  <button className="btn-ghost px-2" onClick={() => setCart(cart.map((x, j) => j === i ? { ...x, qty: x.qty + 1 } : x))}>＋</button>
                  <input className="inp ml-auto w-24 text-right" inputMode="numeric" value={l.unitPrice}
                    onChange={(e) => setCart(cart.map((x, j) => j === i ? { ...x, unitPrice: +e.target.value.replace(/\D/g, '') || 0 } : x))} />
                  <span className="w-20 text-right font-bold">{fmtVND(l.qty * l.unitPrice)}</span>
                </div>
              </div>))}
          </div>
          <div className="mt-2 border-t pt-2 text-sm">
            <div className="flex items-center justify-between py-0.5">
              <span>Tiền hàng</span><span className="font-bold">{fmtVND(totals.subtotal)}đ</span></div>
            <div className="flex items-center justify-between py-0.5">
              <span>Giảm giá (đ)</span>
              <input className="inp w-28 text-right" inputMode="numeric" value={discountAmt || ''}
                onChange={(e) => setDiscountAmt(+e.target.value.replace(/\D/g, '') || 0)} /></div>
            <label className="flex items-center gap-2 py-0.5">
              <input type="checkbox" checked={vat} onChange={(e) => setVat(e.target.checked)} />
              Xuất VAT 8% {vat && <span className="ml-auto font-bold">{fmtVND(totals.taxAmt)}đ</span>}
            </label>
            <div className="flex items-center justify-between py-1 text-lg font-extrabold text-pink-700">
              <span>TỔNG</span><span>{fmtVND(totals.total)}đ</span></div>
            <div className="flex items-center justify-between py-0.5">
              <span>Khách đưa (trống = đủ)</span>
              <input className="inp w-28 text-right" inputMode="numeric" value={paid}
                onChange={(e) => setPaid(e.target.value === '' ? '' : +e.target.value.replace(/\D/g, '') || 0)} /></div>
            {paidNum < totals.total && (
              <div className="flex justify-between py-0.5 font-bold text-red-600">
                <span>Còn nợ{!partner && ' (cần chọn khách!)'}</span><span>{fmtVND(totals.total - paidNum)}đ</span></div>)}
            {paidNum > totals.total && (
              <div className="flex justify-between py-0.5 font-bold text-green-700">
                <span>Trả lại khách</span><span>{fmtVND(paidNum - totals.total)}đ</span></div>)}
            <div className="mt-1 flex gap-2">
              {(['CASH', 'TRANSFER'] as const).map((m) => (
                <button key={m} className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold ${method === m ? 'bg-pink-700 text-white' : 'bg-slate-100'}`}
                  onClick={() => setMethod(m)}>{m === 'CASH' ? '💵 Tiền mặt' : '🏦 Chuyển khoản'}</button>))}
            </div>
            {err && <p className="mt-2 text-sm font-semibold text-red-600">{err}</p>}
            {msg && <p className="mt-2 text-sm font-semibold text-green-700">{msg}</p>}
            <button className="btn mt-2 w-full py-3 text-base" disabled={busy || (paidNum < totals.total && !partner)}
              onClick={checkout}>{busy ? 'Đang xử lý…' : '💾 THANH TOÁN & IN'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
