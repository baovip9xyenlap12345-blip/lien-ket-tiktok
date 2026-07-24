'use client';
import { useCallback, useEffect, useState } from 'react';
import { fmtVND } from '@/lib/format';
import { computeTotals } from '@/modules/sales/domain';
import PosTab from './pos';

type PartnerOpt = { id: number; code: string; name: string; phone: string | null; priceListId?: number | null };
type QLine = { variantId: number; sku: string; name: string; qty: number; unitPrice: number; discountPct: number };
type Quote = { id: number; code: string; version: number; partnerId: number | null; partnerName: string;
  status: string; approvalStatus: string; approvalReason: string | null; total: number;
  vatEnabled: boolean; vatPercent: number; discountPct: string; discountAmt: number;
  otherFee: number; shippingFee: number; note: string | null; createdAt: string;
  order?: { id: number; code: string } | null;
  lines?: { variantId: number | null; sku: string; name: string; qty: number; unitPrice: number; discountPct: string }[] };
type Order = { id: number; code: string; partnerName: string; partnerPhone?: string | null;
  total: number; paidAmt: number;
  orderStatus: string; paymentStatus: string; productionStatus: string; shippingStatus: string;
  approvalStatus: string; approvalReason: string | null; isPos: boolean; note?: string | null; createdAt: string };

const QS_VI: Record<string, string> = { DRAFT: 'Nháp', SENT: 'Đã gửi', ACCEPTED: 'Khách đồng ý',
  REJECTED: 'Khách từ chối', EXPIRED: 'Hết hạn', CANCELLED: 'Đã hủy' };
const OS_VI: Record<string, string> = { NEW: 'Mới', CONFIRMED: 'Đã xác nhận', DONE: 'Hoàn tất', CANCELLED: 'Đã hủy' };
const PS_VI: Record<string, string> = { UNPAID: 'Chưa thu', PARTIAL: 'Thu 1 phần', PAID: 'Đã thu đủ', REFUNDED: 'Đã hoàn' };
const PROD_VI: Record<string, string> = { NONE: '—', QUEUED: 'Chờ SX', IN_PROGRESS: 'Đang SX', FINISHED: 'SX xong' };
const SHIP_VI: Record<string, string> = { NONE: '—', PREPARING: 'Đang soạn', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', RETURNED: 'Bị trả' };

function Chip({ label, tone }: { label: string; tone: 'green' | 'amber' | 'red' | 'slate' | 'blue' }) {
  const c = { green: 'bg-green-100 text-green-700', amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-600', slate: 'bg-slate-100 text-slate-500', blue: 'bg-blue-100 text-blue-700' }[tone];
  return <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${c}`}>{label}</span>;
}
const osTone = (s: string) => s === 'DONE' ? 'green' : s === 'CONFIRMED' ? 'blue' : s === 'CANCELLED' ? 'slate' : 'amber';
const psTone = (s: string) => s === 'PAID' ? 'green' : s === 'PARTIAL' ? 'amber' : 'red';

export default function SalesClient({ canManage, canApprove, vatDefault }: {
  canManage: boolean; canApprove: boolean; vatDefault: number;
}) {
  const [tab, setTab] = useState<'dash' | 'quotes' | 'orders' | 'carts' | 'pos'>('dash');
  const tabs: [typeof tab, string][] = [['dash', '📊 Tổng quan'], ['quotes', '📄 Báo giá'],
    ['orders', '🧾 Đơn hàng'], ['carts', '🛒 Giỏ chưa mua'],
    ...(canManage ? [['pos', '🛒 Bán nhanh POS'] as [typeof tab, string]] : [])];
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">Bán hàng</h1>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map(([k, label]) => (
            <button key={k} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === k ? 'bg-white shadow' : 'text-slate-500'}`}
              onClick={() => setTab(k)}>{label}</button>))}
        </div>
      </div>
      {tab === 'dash' && <DashTab canApprove={canApprove} />}
      {tab === 'quotes' && <QuotesTab canManage={canManage} vatDefault={vatDefault} />}
      {tab === 'orders' && <OrdersTab canManage={canManage} />}
      {tab === 'carts' && <AbandonedCartsTab />}
      {tab === 'pos' && canManage && <PosTab />}
    </div>
  );
}

/* ============================ GIO HANG CHUA MUA (KHACH BO QUEN) ============================ */
type CartGroup = { partnerId: number | null; partnerName: string; phone: string | null;
  lastAt: string; itemCount: number; total: number;
  items: { productName: string; optLabel: string | null; qty: number; unitPrice: number; at: string }[] };

function AbandonedCartsTab() {
  const [data, setData] = useState<{ groups: CartGroup[]; customers: number; totalValue: number } | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/sales/abandoned-carts').then((r) => r.json()).then((j) => { if (j.ok) setData(j); });
  }, []);
  if (!data) return <div className="rounded-xl bg-white p-8 text-center text-slate-400">Đang tải…</div>;

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
          <div className="text-xs text-slate-400">Khách đã thêm giỏ, chưa mua</div>
          <div className="text-2xl font-extrabold text-pink-700">{data.customers}</div>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
          <div className="text-xs text-slate-400">Giá trị giỏ đang chờ</div>
          <div className="text-2xl font-extrabold text-slate-800">{fmtVND(data.totalValue)}đ</div>
        </div>
      </div>
      <p className="mb-2 text-sm text-slate-500">💡 Đây là khách đã đăng nhập và thêm hàng vào giỏ nhưng chưa đặt. Gọi/nhắn Zalo để chốt đơn.</p>
      {data.groups.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-slate-400">Chưa có giỏ hàng nào đang chờ.</div>
      ) : (
        <div className="space-y-2">
          {data.groups.map((g, i) => (
            <div key={i} className="rounded-xl bg-white ring-1 ring-slate-100">
              <button className="flex w-full items-center justify-between gap-2 p-3 text-left" onClick={() => setOpen(open === i ? null : i)}>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800">{g.partnerName}</div>
                  <div className="text-xs text-slate-400">{g.phone ? `📞 ${g.phone} · ` : ''}{g.itemCount} món · cập nhật {new Date(g.lastAt).toLocaleString('vi-VN')}</div>
                </div>
                <div className="flex items-center gap-2">
                  {g.phone && <a href={`tel:${g.phone}`} onClick={(e) => e.stopPropagation()} className="rounded-lg bg-green-500 px-2.5 py-1 text-xs font-bold text-white">Gọi</a>}
                  <span className="font-extrabold text-pink-700">{fmtVND(g.total)}đ</span>
                  <span className="text-slate-300">{open === i ? '▲' : '▼'}</span>
                </div>
              </button>
              {open === i && (
                <div className="border-t px-3 py-2 text-sm">
                  {g.items.map((it, j) => (
                    <div key={j} className="flex justify-between border-b py-1 last:border-0">
                      <span className="min-w-0 flex-1 truncate">{it.productName} <span className="text-slate-400">{it.optLabel ?? ''}</span> ×{it.qty}</span>
                      <span className="ml-2 font-semibold">{fmtVND(it.unitPrice * it.qty)}đ</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================ DASHBOARD ============================ */
function DashTab({ canApprove }: { canApprove: boolean }) {
  type Dash = { today: { revenue: number; orders: number }; month: { revenue: number; orders: number; profit: number };
    debt: { amount: number; orders: number }; pendingQuotes: number; pendingApprovals: number;
    newOrders: number; transactions: number;
    daily: { label: string; revenue: number; orders: number }[]; statusPie: { status: string; count: number }[];
    top: { sku: string; name: string; qty: number; amount: number }[]; recent: Order[] };
  const [d, setD] = useState<Dash | null>(null);
  const [appr, setAppr] = useState<{ quotes: { id: number; code: string; partnerName: string; total: number; approvalReason: string | null }[];
    orders: { id: number; code: string; partnerName: string; total: number; approvalReason: string | null }[] } | null>(null);
  const load = useCallback(async () => {
    const j = await (await fetch('/api/sales/dashboard')).json();
    if (j.ok) setD(j);
    if (canApprove) {
      const a = await (await fetch('/api/sales/approve')).json();
      if (a.ok) setAppr(a);
    }
  }, [canApprove]);
  useEffect(() => { load(); }, [load]);
  async function decide(entity: 'quote' | 'order', id: number, approve: boolean) {
    await fetch('/api/sales/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, id, approve }) });
    load();
  }
  if (!d) return <div className="card p-6 text-slate-400">Đang tải…</div>;
  const pending = [...(appr?.quotes ?? []).map((x) => ({ ...x, entity: 'quote' as const })),
    ...(appr?.orders ?? []).map((x) => ({ ...x, entity: 'order' as const }))];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Doanh thu hôm nay" value={`${fmtVND(d.today.revenue)}đ`} sub={`${d.today.orders} đơn`} />
        <Stat label="Doanh thu tháng này" value={`${fmtVND(d.month.revenue)}đ`} sub={`${d.month.orders} đơn`} />
        <Stat label="Lợi nhuận gộp (tháng)" value={`${fmtVND(d.month.profit)}đ`} sub="doanh thu − giá vốn" warn={d.month.profit < 0} />
        <Stat label="Đơn mới cần xử lý" value={`${d.newOrders}`} sub="đơn khách vừa đặt" warn={d.newOrders > 0} />
        <Stat label="Số giao dịch (tháng)" value={`${d.transactions}`} sub="lượt thu tiền" />
        <Stat label="Khách còn nợ" value={`${fmtVND(d.debt.amount)}đ`} sub={`${d.debt.orders} đơn chưa thu đủ`} warn={d.debt.amount > 0} />
        <Stat label="Báo giá mở / chờ duyệt" value={`${d.pendingQuotes} / ${d.pendingApprovals}`} warn={d.pendingApprovals > 0} />
      </div>

      {/* Bieu do */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-extrabold">📊 Doanh thu 7 ngày gần nhất</h2>
          <BarChart data={d.daily} />
        </div>
        <div className="card p-4">
          <h2 className="mb-3 font-extrabold">🥧 Cơ cấu đơn tháng này</h2>
          <PieChart data={d.statusPie.map((s) => ({ label: OS_VI[s.status] ?? s.status, value: s.count,
            color: ({ NEW: '#f59e0b', CONFIRMED: '#3b82f6', DONE: '#22c55e', CANCELLED: '#94a3b8' } as Record<string, string>)[s.status] ?? '#c2185b' }))} />
        </div>
      </div>
      {canApprove && pending.length > 0 && (
        <div className="card mt-3 border-l-4 border-amber-400 p-3">
          <div className="mb-1 text-sm font-extrabold">⏳ Chờ anh duyệt ({pending.length})</div>
          {pending.map((x) => (
            <div key={x.entity + x.id} className="flex flex-wrap items-center gap-2 border-t border-slate-100 py-1.5 text-sm">
              <span className="font-mono font-bold">{x.code}</span>
              <span>{x.partnerName}</span>
              <span className="font-bold">{fmtVND(x.total)}đ</span>
              <span className="text-xs text-amber-700">{x.approvalReason}</span>
              <span className="ml-auto flex gap-1">
                <button className="btn-ghost text-green-700" onClick={() => decide(x.entity, x.id, true)}>✓ Duyệt</button>
                <button className="btn-ghost text-red-600" onClick={() => decide(x.entity, x.id, false)}>✕ Từ chối</button>
              </span>
            </div>))}
        </div>)}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 font-extrabold">Bán chạy tháng này</h2>
          {d.top.length === 0 && <p className="text-sm text-slate-400">Chưa có đơn nào trong tháng.</p>}
          {d.top.map((t) => (
            <div key={t.sku} className="flex justify-between border-t border-slate-100 py-1.5 text-sm">
              <span>{t.name} <span className="font-mono text-xs text-slate-400">{t.sku}</span></span>
              <span className="font-bold">{t.qty} · {fmtVND(t.amount)}đ</span>
            </div>))}
        </div>
        <div className="card p-4">
          <h2 className="mb-2 font-extrabold">Đơn gần nhất</h2>
          {d.recent.length === 0 && <p className="text-sm text-slate-400">Chưa có đơn hàng nào.</p>}
          {d.recent.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-2 border-t border-slate-100 py-1.5 text-sm">
              <span className="font-mono font-bold">{o.code}</span>
              <span>{o.partnerName}</span>
              <Chip label={OS_VI[o.orderStatus]} tone={osTone(o.orderStatus) as never} />
              <Chip label={PS_VI[o.paymentStatus]} tone={psTone(o.paymentStatus) as never} />
              <span className="ml-auto font-bold">{fmtVND(o.total)}đ</span>
            </div>))}
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`card p-4 ${warn ? 'border-l-4 border-amber-400' : ''}`}>
      <div className="text-xs font-bold text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

/** Bieu do cot (CSS) — doanh thu theo ngay. */
function BarChart({ data }: { data: { label: string; revenue: number; orders: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  if (data.every((d) => d.revenue === 0)) return <p className="py-8 text-center text-sm text-slate-400">Chưa có doanh thu trong 7 ngày.</p>;
  return (
    <div className="flex h-44 items-end gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
          <div className="text-[9px] font-semibold text-pink-700">{d.revenue > 0 ? `${Math.round(d.revenue / 1000)}k` : ''}</div>
          <div className="w-full rounded-t-md bg-gradient-to-t from-pink-600 to-pink-400"
            style={{ height: `${Math.max((d.revenue / max) * 100, d.revenue > 0 ? 3 : 0)}%` }} title={`${fmtVND(d.revenue)}đ · ${d.orders} đơn`} />
          <div className="text-[10px] text-slate-400">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Bieu do tron (SVG donut) — co cau theo trang thai. */
function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="py-8 text-center text-sm text-slate-400">Chưa có đơn trong tháng.</p>;
  const C = 2 * Math.PI * 60;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 160 160" className="h-36 w-36 -rotate-90">
        {data.map((d, i) => {
          const dash = (d.value / total) * C;
          const el = <circle key={i} cx="80" cy="80" r="60" fill="none" stroke={d.color} strokeWidth="26"
            strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc} />;
          acc += dash;
          return el;
        })}
      </svg>
      <div className="space-y-1.5 text-sm">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
            <span>{d.label}: <b>{d.value}</b> ({Math.round((d.value / total) * 100)}%)</span>
          </div>))}
      </div>
    </div>
  );
}

/* ============================ BAO GIA ============================ */
function QuotesTab({ canManage, vatDefault }: { canManage: boolean; vatDefault: number }) {
  const [q, setQ] = useState(''); const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: Quote[]; total: number; take: number } | null>(null);
  const [edit, setEdit] = useState<QuoteFormState | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch(`/api/sales/quotes?q=${encodeURIComponent(q)}&page=${page}`)).json();
    if (j.ok) setData(j);
  }, [q, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function action(quote: Quote, kind: 'send' | 'convert' | 'delete') {
    setErr('');
    if (kind === 'send') {
      const res = await fetch('/api/sales/quotes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quote.id, to: 'SENT' }) });
      const j = await res.json();
      if (!j.ok) setErr(`${quote.code}: ${j.error}`);
    } else if (kind === 'convert') {
      const res = await fetch('/api/sales/convert', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.id }) });
      const j = await res.json();
      if (j.ok) setErr(`✅ Đã tạo đơn ${j.orderCode}${j.approvalNeeded ? ' (chờ duyệt công nợ)' : ''} — xem ở tab Đơn hàng.`);
      else setErr(`${quote.code}: ${j.error}`);
    } else {
      if (!confirm(`Xóa báo giá ${quote.code}?`)) return;
      await fetch(`/api/sales/quotes?id=${quote.id}`, { method: 'DELETE' });
    }
    load();
  }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.take)) : 1;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="inp max-w-xs" placeholder="Tìm mã, tên khách…" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        {canManage && <button className="btn ml-auto" onClick={() => setEdit(blankQuote(vatDefault))}>＋ Tạo báo giá</button>}
      </div>
      {err && <p className={`mb-2 text-sm font-semibold ${err.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{err}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>{['Mã', 'Khách', 'Tổng tiền', 'Trạng thái', 'Duyệt', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {!data && <tr><td className="td text-slate-400" colSpan={6}>Đang tải…</td></tr>}
            {data?.rows.length === 0 && <tr><td className="td text-slate-400" colSpan={6}>Chưa có báo giá — bấm “Tạo báo giá”.</td></tr>}
            {data?.rows.map((r) => (
              <tr key={r.id}>
                <td className="td font-mono font-bold">{r.code} <span className="text-xs text-slate-400">v{r.version}</span></td>
                <td className="td">{r.partnerName}</td>
                <td className="td text-right font-bold">{fmtVND(r.total)}đ</td>
                <td className="td"><Chip label={QS_VI[r.status] ?? r.status}
                  tone={r.status === 'ACCEPTED' ? 'green' : r.status === 'SENT' ? 'blue' : r.status === 'DRAFT' ? 'amber' : 'slate'} />
                  {r.order && <span className="ml-1 font-mono text-xs text-slate-400">→ {r.order.code}</span>}</td>
                <td className="td">{r.approvalStatus === 'PENDING' ? <Chip label="Chờ duyệt" tone="amber" />
                  : r.approvalStatus === 'APPROVED' ? <Chip label="Đã duyệt" tone="green" />
                  : r.approvalStatus === 'REJECTED' ? <Chip label="Bị từ chối" tone="red" /> : '—'}</td>
                <td className="td whitespace-nowrap text-right">
                  <a className="btn-ghost" href={`/print/quote/${r.id}`} target="_blank">🖨️</a>
                  {canManage && !r.order && ['DRAFT', 'SENT'].includes(r.status) && (
                    <button className="btn-ghost" onClick={async () => {
                      const j = await (await fetch(`/api/sales/quotes?id=${r.id}`)).json();
                      if (j.ok) setEdit(quoteToForm(j.quote, vatDefault));
                    }}>✏️</button>)}
                  {canManage && r.status === 'DRAFT' && <button className="btn-ghost" onClick={() => action(r, 'send')}>📨 Gửi</button>}
                  {canManage && !r.order && ['SENT', 'ACCEPTED'].includes(r.status) && (
                    <button className="btn-ghost font-bold text-pink-700" onClick={() => action(r, 'convert')}>→ Đơn</button>)}
                  {canManage && r.status === 'DRAFT' && <button className="btn-ghost text-red-600" onClick={() => action(r, 'delete')}>🗑️</button>}
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} total={data?.total ?? 0} setPage={setPage} unit="báo giá" />
      {edit && <QuoteForm state={edit} setState={setEdit} vatDefault={vatDefault}
        onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

type QuoteFormState = { id?: number; partner: PartnerOpt | null; partnerName: string;
  lines: QLine[]; discountPct: number; discountAmt: number; otherFee: number; shippingFee: number;
  vatEnabled: boolean; vatPercent: number; note: string };
const blankQuote = (vat: number): QuoteFormState => ({ partner: null, partnerName: '', lines: [],
  discountPct: 0, discountAmt: 0, otherFee: 0, shippingFee: 0, vatEnabled: true, vatPercent: vat, note: '' });
const quoteToForm = (qt: Quote, vat: number): QuoteFormState => ({
  id: qt.id, partner: qt.partnerId ? { id: qt.partnerId, code: '', name: qt.partnerName, phone: null } : null,
  partnerName: qt.partnerName,
  lines: (qt.lines ?? []).map((l) => ({ variantId: l.variantId ?? 0, sku: l.sku, name: l.name,
    qty: l.qty, unitPrice: l.unitPrice, discountPct: Number(l.discountPct) })),
  discountPct: Number(qt.discountPct), discountAmt: 0, otherFee: qt.otherFee, shippingFee: qt.shippingFee,
  vatEnabled: qt.vatEnabled, vatPercent: qt.vatPercent || vat, note: qt.note ?? '' });

function QuoteForm({ state: s, setState: set, vatDefault, onSaved }: {
  state: QuoteFormState; setState: (s: QuoteFormState | null) => void; vatDefault: number; onSaved: () => void;
}) {
  const [pq, setPq] = useState(''); const [popts, setPopts] = useState<PartnerOpt[]>([]);
  const [sq, setSq] = useState(''); const [sopts, setSopts] = useState<{ v: { id: number; sku: string; size: string | null; color: string | null }; pname: string }[]>([]);
  const [err, setErr] = useState(''); const [warn, setWarn] = useState('');
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!pq.trim()) { setPopts([]); return; }
      const j = await (await fetch(`/api/partners?q=${encodeURIComponent(pq)}&page=1`)).json();
      if (j.ok) setPopts(j.rows.slice(0, 6));
    }, 250); return () => clearTimeout(t);
  }, [pq]);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!sq.trim()) { setSopts([]); return; }
      const j = await (await fetch(`/api/catalog/products?q=${encodeURIComponent(sq)}&page=1`)).json();
      if (j.ok) setSopts(j.rows.flatMap((p: { name: string; variants: { id: number; sku: string; size: string | null; color: string | null }[] }) =>
        p.variants.map((v) => ({ v, pname: p.name }))).slice(0, 8));
    }, 250); return () => clearTimeout(t);
  }, [sq]);
  async function addLine(v: { id: number; sku: string; size: string | null; color: string | null }, pname: string) {
    const prefer = s.partner?.priceListId ? `&listId=${s.partner.priceListId}` : '';
    const j = await (await fetch(`/api/catalog/resolve-price?variantId=${v.id}&qty=1${prefer}`)).json();
    set({ ...s, lines: [...s.lines, { variantId: v.id, sku: v.sku,
      name: [pname, v.size, v.color].filter(Boolean).join(' - '), qty: 1,
      unitPrice: j.result?.price ?? 0, discountPct: 0 }] });
    setSq(''); setSopts([]);
  }
  const totals = computeTotals({
    lines: s.lines.map((l) => ({ qty: l.qty, unitPrice: l.unitPrice, discountPct: l.discountPct })),
    discountPct: s.discountPct, discountAmt: s.discountAmt, otherFee: s.otherFee,
    shippingFee: s.shippingFee, vatEnabled: s.vatEnabled, vatPercent: s.vatPercent || vatDefault });
  async function save() {
    setErr(''); setWarn('');
    const res = await fetch('/api/sales/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, partnerId: s.partner?.id ?? null,
        partnerName: s.partner?.name ?? (s.partnerName || 'Khách lẻ'),
        priceListId: s.partner?.priceListId ?? null,
        lines: s.lines.map((l) => ({ variantId: l.variantId, qty: l.qty, unitPrice: l.unitPrice, discountPct: l.discountPct })),
        discountPct: s.discountPct, discountAmt: s.discountAmt, otherFee: s.otherFee, shippingFee: s.shippingFee,
        vatEnabled: s.vatEnabled, vatPercent: s.vatPercent, note: s.note || null }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    if (j.approvalNeeded) { alert(`Báo giá ${j.code} đã lưu nhưng CHỜ DUYỆT:\n- ${j.approvalReasons.join('\n- ')}`); }
    onSaved();
  }
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && set(null)}>
      <div className="card my-6 w-full max-w-3xl p-5">
        <h2 className="mb-3 font-extrabold">{s.id ? 'Sửa báo giá (tạo bản mới)' : 'Tạo báo giá'}</h2>
        <div className="mb-2 grid gap-2 md:grid-cols-2">
          <div>
            <label className="lbl">Khách hàng</label>
            {s.partner ? (
              <div className="flex items-center justify-between rounded-lg bg-pink-50 px-2 py-1.5 text-sm">
                <span className="font-bold">{s.partner.name}</span>
                <button className="text-red-600" onClick={() => set({ ...s, partner: null })}>✕</button>
              </div>
            ) : (
              <div className="relative">
                <input className="inp" placeholder="Tìm khách… (trống = khách lẻ)" value={pq}
                  onChange={(e) => setPq(e.target.value)} />
                {popts.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border bg-white shadow-lg">
                    {popts.map((p) => (
                      <button key={p.id} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-pink-50"
                        onClick={() => { set({ ...s, partner: p, partnerName: p.name }); setPopts([]); setPq(''); }}>
                        <b>{p.name}</b> <span className="text-xs text-slate-400">{p.phone ?? p.code}</span>
                      </button>))}
                  </div>)}
              </div>)}
          </div>
          <div><label className="lbl">Hoặc tên khách lẻ</label>
            <input className="inp" value={s.partnerName} disabled={!!s.partner}
              onChange={(e) => set({ ...s, partnerName: e.target.value })} /></div>
        </div>
        <label className="lbl">Thêm sản phẩm</label>
        <div className="relative mb-2">
          <input className="inp" placeholder="Tìm theo tên/SKU rồi chọn…" value={sq} onChange={(e) => setSq(e.target.value)} />
          {sopts.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-white shadow-lg">
              {sopts.map(({ v, pname }) => (
                <button key={v.id} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-pink-50"
                  onClick={() => addLine(v, pname)}>
                  <b>{pname}</b> {[v.size, v.color].filter(Boolean).join(' · ')} <span className="font-mono text-xs text-slate-400">{v.sku}</span>
                </button>))}
            </div>)}
        </div>
        <div className="mb-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{['Sản phẩm', 'SL', 'Đơn giá', 'CK dòng %', 'Thành tiền', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {s.lines.length === 0 && <tr><td className="td text-slate-400" colSpan={6}>Chưa có dòng hàng.</td></tr>}
              {s.lines.map((l, i) => (
                <tr key={i}>
                  <td className="td">{l.name}<div className="font-mono text-xs text-slate-400">{l.sku}</div></td>
                  <td className="td"><input className="inp w-16" inputMode="numeric" value={l.qty}
                    onChange={(e) => set({ ...s, lines: s.lines.map((x, j) => j === i ? { ...x, qty: Math.max(1, +e.target.value.replace(/\D/g, '') || 1) } : x) })} /></td>
                  <td className="td"><input className="inp w-28" inputMode="numeric" value={l.unitPrice}
                    onChange={(e) => set({ ...s, lines: s.lines.map((x, j) => j === i ? { ...x, unitPrice: +e.target.value.replace(/\D/g, '') || 0 } : x) })} /></td>
                  <td className="td"><input className="inp w-16" inputMode="numeric" value={l.discountPct || ''}
                    onChange={(e) => set({ ...s, lines: s.lines.map((x, j) => j === i ? { ...x, discountPct: Math.min(100, +e.target.value.replace(/\D/g, '') || 0) } : x) })} /></td>
                  <td className="td text-right font-bold">{fmtVND(totals.lineTotals[i] ?? 0)}</td>
                  <td className="td"><button className="text-red-600" onClick={() => set({ ...s, lines: s.lines.filter((_, j) => j !== i) })}>✕</button></td>
                </tr>))}
            </tbody>
          </table>
        </div>
        <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div><label className="lbl">CK toàn đơn (%)</label>
            <input className="inp" inputMode="numeric" value={s.discountPct || ''}
              onChange={(e) => set({ ...s, discountPct: Math.min(100, +e.target.value.replace(/\D/g, '') || 0), discountAmt: 0 })} /></div>
          <div><label className="lbl">Hoặc CK tiền (đ)</label>
            <input className="inp" inputMode="numeric" value={s.discountAmt || ''}
              onChange={(e) => set({ ...s, discountAmt: +e.target.value.replace(/\D/g, '') || 0, discountPct: 0 })} /></div>
          <div><label className="lbl">Phí khác (đ)</label>
            <input className="inp" inputMode="numeric" value={s.otherFee || ''}
              onChange={(e) => set({ ...s, otherFee: +e.target.value.replace(/\D/g, '') || 0 })} /></div>
          <div><label className="lbl">Vận chuyển (đ)</label>
            <input className="inp" inputMode="numeric" value={s.shippingFee || ''}
              onChange={(e) => set({ ...s, shippingFee: +e.target.value.replace(/\D/g, '') || 0 })} /></div>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={s.vatEnabled} onChange={(e) => set({ ...s, vatEnabled: e.target.checked })} />
            Xuất VAT</label>
          {s.vatEnabled && <span className="flex items-center gap-1">Thuế suất
            <input className="inp w-16" inputMode="numeric" value={s.vatPercent}
              onChange={(e) => set({ ...s, vatPercent: Math.min(100, +e.target.value.replace(/\D/g, '') || 0) })} />%</span>}
          <span className="ml-auto text-right">
            Tiền hàng <b>{fmtVND(totals.subtotal)}đ</b>
            {totals.discountAmt > 0 && <> · CK <b className="text-red-600">-{fmtVND(totals.discountAmt)}đ</b></>}
            {s.vatEnabled && <> · VAT <b>{fmtVND(totals.taxAmt)}đ</b></>}
            <span className="ml-2 text-lg font-extrabold text-pink-700">= {fmtVND(totals.total)}đ</span>
          </span>
        </div>
        <textarea className="inp mb-2" rows={2} placeholder="Ghi chú cho khách…" value={s.note}
          onChange={(e) => set({ ...s, note: e.target.value })} />
        {warn && <p className="mb-2 text-sm font-semibold text-amber-600">{warn}</p>}
        {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => set(null)}>Hủy</button>
          <button className="btn" onClick={save}>💾 Lưu báo giá</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ DON HANG ============================ */
function OrdersTab({ canManage }: { canManage: boolean }) {
  const [q, setQ] = useState(''); const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: Order[]; total: number; take: number } | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const load = useCallback(async () => {
    const j = await (await fetch(`/api/sales/orders?q=${encodeURIComponent(q)}&page=${page}`)).json();
    if (j.ok) setData(j);
  }, [q, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.take)) : 1;
  return (
    <div>
      <div className="mb-3"><input className="inp max-w-xs" placeholder="Tìm mã đơn, tên khách…" value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>{['Mã', 'Khách', 'SĐT', 'Tổng', 'Đã thu', 'Đơn', 'Thanh toán', 'SX', 'Giao', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {!data && <tr><td className="td text-slate-400" colSpan={10}>Đang tải…</td></tr>}
            {data?.rows.length === 0 && <tr><td className="td text-slate-400" colSpan={10}>Chưa có đơn hàng.</td></tr>}
            {data?.rows.map((o) => (
              <tr key={o.id} className="cursor-pointer hover:bg-pink-50/40" onClick={() => setDetail(o.id)}>
                <td className="td font-mono font-bold">{o.code}{o.isPos && <span className="ml-1 text-xs text-slate-400">POS</span>}
                  {o.approvalStatus === 'PENDING' && <div><Chip label="Chờ duyệt" tone="amber" /></div>}</td>
                <td className="td">{o.partnerName}</td>
                <td className="td whitespace-nowrap text-xs">{o.partnerPhone || '—'}</td>
                <td className="td text-right font-bold">{fmtVND(o.total)}đ</td>
                <td className="td text-right">{fmtVND(o.paidAmt)}đ</td>
                <td className="td"><Chip label={OS_VI[o.orderStatus]} tone={osTone(o.orderStatus) as never} /></td>
                <td className="td"><Chip label={PS_VI[o.paymentStatus]} tone={psTone(o.paymentStatus) as never} /></td>
                <td className="td text-xs">{PROD_VI[o.productionStatus]}</td>
                <td className="td text-xs">{SHIP_VI[o.shippingStatus]}</td>
                <td className="td"><a className="btn-ghost" href={`/print/order/${o.id}`} target="_blank"
                  onClick={(e) => e.stopPropagation()}>🖨️</a></td>
              </tr>))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} total={data?.total ?? 0} setPage={setPage} unit="đơn" />
      {detail && <OrderDetail id={detail} canManage={canManage} onClose={() => { setDetail(null); load(); }} />}
    </div>
  );
}

function OrderDetail({ id, canManage, onClose }: { id: number; canManage: boolean; onClose: () => void }) {
  type Full = Order & { lines: { id: number; name: string; sku: string; qty: number; unitPrice: number; lineTotal: number }[];
    payments: { id: number; code: string; amount: number; method: string; createdAt: string }[];
    quote: { code: string } | null; subtotal: number; discountAmt: number; taxAmt: number; vatEnabled: boolean; vatPercent: number;
    partner: { code: string; name: string; phone: string | null; email: string | null; addresses: { address: string }[] } | null };
  const [o, setO] = useState<Full | null>(null);
  const [history, setHistory] = useState<{ id: number; axis: string; fromVal: string; toVal: string; byName: string; createdAt: string; note: string | null }[]>([]);
  const [pay, setPay] = useState<number | ''>(''); const [method, setMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch(`/api/sales/orders?id=${id}`)).json();
    if (j.ok) { setO(j.order); setHistory(j.history); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  async function transition(axis: string, to: string) {
    setErr('');
    const res = await fetch('/api/sales/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, axis, to }) });
    const j = await res.json();
    if (!j.ok) setErr(j.error || 'Lỗi'); load();
  }
  async function collect() {
    setErr('');
    if (!o) return;
    const amount = pay === '' ? o.total - o.paidAmt : pay;
    const res = await fetch('/api/sales/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id, amount, method }) });
    const j = await res.json();
    if (!j.ok) setErr(j.error || 'Lỗi'); else setPay('');
    load();
  }
  if (!o) return null;
  const NEXT: Record<string, string[]> = {
    NEW: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['DONE', 'CANCELLED'] };
  const PROD_NEXT: Record<string, string[]> = { NONE: ['QUEUED'], QUEUED: ['IN_PROGRESS'], IN_PROGRESS: ['FINISHED'] };
  const SHIP_NEXT: Record<string, string[]> = { NONE: ['PREPARING'], PREPARING: ['SHIPPING'], SHIPPING: ['DELIVERED', 'RETURNED'], DELIVERED: ['RETURNED'] };
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card my-6 w-full max-w-2xl p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="font-extrabold">{o.code}</h2>
          {o.quote && <span className="font-mono text-xs text-slate-400">từ {o.quote.code}</span>}
          <span className="text-sm">{o.partnerName}</span>
          <a className="btn-ghost ml-auto" href={`/print/order/${o.id}`} target="_blank">🖨️ A4</a>
          <a className="btn-ghost" href={`/print/order/${o.id}?k80=1`} target="_blank">🧾 K80</a>
        </div>
        <div className="mb-2 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="mb-1 font-bold">👤 Thông tin khách hàng</div>
          <div><b>{o.partner?.name ?? o.partnerName}</b>{o.partner?.code && <span className="ml-1 text-xs text-slate-400">{o.partner.code}</span>}</div>
          {o.partner?.phone && <div>📞 <a href={`tel:${o.partner.phone}`} className="font-semibold text-pink-700">{o.partner.phone}</a></div>}
          {o.partner?.email && <div>✉️ {o.partner.email}</div>}
          {o.partner?.addresses?.[0] && <div>📍 {o.partner.addresses[0].address}</div>}
          {o.note && <div className="mt-1 whitespace-pre-wrap rounded-lg bg-white p-2 text-xs text-slate-600 ring-1 ring-slate-100">{o.note}</div>}
        </div>
        {o.approvalStatus === 'PENDING' && (
          <p className="mb-2 rounded-lg bg-amber-50 p-2 text-sm font-semibold text-amber-700">
            ⏳ Chờ duyệt: {o.approvalReason}</p>)}
        {o.approvalStatus === 'REJECTED' && (
          <p className="mb-2 rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-600">Bị từ chối duyệt.</p>)}
        <table className="mb-2 w-full text-sm">
          <tbody>{o.lines.map((l) => (
            <tr key={l.id}><td className="td">{l.name}</td>
              <td className="td text-right">{l.qty} x {fmtVND(l.unitPrice)}</td>
              <td className="td text-right font-bold">{fmtVND(l.lineTotal)}đ</td></tr>))}
          </tbody>
        </table>
        <div className="mb-2 text-right text-sm">
          Tiền hàng <b>{fmtVND(o.subtotal)}đ</b>
          {o.discountAmt > 0 && <> · CK <b className="text-red-600">-{fmtVND(o.discountAmt)}đ</b></>}
          {o.vatEnabled && <> · VAT {o.vatPercent}% <b>{fmtVND(o.taxAmt)}đ</b></>}
          <span className="ml-2 text-lg font-extrabold text-pink-700">= {fmtVND(o.total)}đ</span>
          <div>Đã thu <b className="text-green-700">{fmtVND(o.paidAmt)}đ</b>
            {o.total > o.paidAmt && <> · Còn nợ <b className="text-red-600">{fmtVND(o.total - o.paidAmt)}đ</b></>}</div>
        </div>
        {canManage && (
          <div className="mb-2 space-y-1.5 rounded-xl bg-slate-50 p-3 text-sm">
            <AxisRow label="Đơn" cur={OS_VI[o.orderStatus]} nexts={NEXT[o.orderStatus] ?? []}
              vi={OS_VI} onGo={(to) => transition('order', to)} />
            <AxisRow label="Sản xuất" cur={PROD_VI[o.productionStatus]} nexts={PROD_NEXT[o.productionStatus] ?? []}
              vi={PROD_VI} onGo={(to) => transition('production', to)} />
            <AxisRow label="Giao hàng" cur={SHIP_VI[o.shippingStatus]} nexts={SHIP_NEXT[o.shippingStatus] ?? []}
              vi={SHIP_VI} onGo={(to) => transition('shipping', to)} />
            {o.total > o.paidAmt && o.orderStatus !== 'CANCELLED' && (
              <div className="flex items-center gap-2 border-t border-slate-200 pt-2">
                <span className="font-bold">Thu tiền:</span>
                <input className="inp w-32" inputMode="numeric" placeholder={`${fmtVND(o.total - o.paidAmt)} (đủ)`}
                  value={pay} onChange={(e) => setPay(e.target.value === '' ? '' : +e.target.value.replace(/\D/g, '') || 0)} />
                <select className="inp w-auto" value={method} onChange={(e) => setMethod(e.target.value as never)}>
                  <option value="CASH">Tiền mặt</option><option value="TRANSFER">Chuyển khoản</option>
                </select>
                <button className="btn" onClick={collect}>💰 Thu</button>
              </div>)}
          </div>)}
        {o.payments.length > 0 && (
          <div className="mb-2 text-xs text-slate-500">
            {o.payments.map((p) => (
              <div key={p.id}>💰 {p.code} · {fmtVND(p.amount)}đ · {p.method === 'CASH' ? 'tiền mặt' : 'CK'} · {new Date(p.createdAt).toLocaleString('vi-VN')}</div>))}
          </div>)}
        <details className="mb-2 text-xs text-slate-500">
          <summary className="cursor-pointer font-bold">Lịch sử trạng thái ({history.length})</summary>
          {history.map((h) => (
            <div key={h.id}>· {new Date(h.createdAt).toLocaleString('vi-VN')} — [{h.axis}] {h.fromVal} → {h.toVal} bởi {h.byName}{h.note ? ` (${h.note})` : ''}</div>))}
        </details>
        {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
        <div className="flex justify-end"><button className="btn-ghost" onClick={onClose}>Đóng</button></div>
      </div>
    </div>
  );
}
function AxisRow({ label, cur, nexts, vi, onGo }: {
  label: string; cur: string; nexts: string[]; vi: Record<string, string>; onGo: (to: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 font-bold">{label}:</span><span>{cur}</span>
      {nexts.map((n) => (
        <button key={n} className={`btn-ghost ${n === 'CANCELLED' || n === 'RETURNED' ? 'text-red-600' : 'text-pink-700'}`}
          onClick={() => onGo(n)}>→ {vi[n]}</button>))}
    </div>
  );
}

function Pager({ page, pages, total, setPage, unit }: {
  page: number; pages: number; total: number; setPage: (p: number) => void; unit: string;
}) {
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="text-slate-500">Tổng {total} {unit}</span>
      <div className="flex gap-1">
        <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</button>
        <span className="px-2 py-1.5 font-bold">{page}/{pages}</span>
        <button className="btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau →</button>
      </div>
    </div>
  );
}
