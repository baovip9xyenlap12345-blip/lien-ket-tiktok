'use client';
import { useCallback, useEffect, useState } from 'react';
import { fmtVND } from '@/lib/format';

type Me = { partnerId: number; username: string; partnerName: string };
const OS_VI: Record<string, string> = { NEW: 'Mới', CONFIRMED: 'Đã xác nhận', DONE: 'Hoàn tất', CANCELLED: 'Đã hủy' };
const PS_VI: Record<string, string> = { UNPAID: 'Chưa thu', PARTIAL: 'Thu 1 phần', PAID: 'Đã thu đủ', REFUNDED: 'Đã hoàn' };
const SHIP_VI: Record<string, string> = { NONE: '—', PREPARING: 'Đang soạn', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', RETURNED: 'Bị trả' };
const DV_VI: Record<string, string> = { PENDING: '⏳ Chờ bạn duyệt', APPROVED: '✓ Bạn đã duyệt', REJECTED: '✕ Bạn yêu cầu sửa' };

export default function PortalClient({ brandName = 'Xưởng Gấu Bảo', domain = 'muagaubong.com' }:
  { brandName?: string; domain?: string } = {}) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [tab, setTab] = useState<'home' | 'catalog' | 'orders' | 'designs' | 'debt'>('home');
  const refresh = useCallback(async () => {
    const j = await (await fetch('/api/portal/auth')).json();
    setMe(j.user ?? null);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  if (me === undefined) return <p className="p-8 text-center text-slate-400">Đang tải…</p>;
  if (me === null) return <Login brandName={brandName} domain={domain} onOk={refresh} />;
  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-slate-50 pb-24">
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-extrabold text-pink-700">🧸 {brandName}</span>
          <span className="truncate text-sm font-bold">· {me.partnerName}</span>
          <button className="ml-auto text-sm text-red-600"
            onClick={async () => { await fetch('/api/portal/auth', { method: 'DELETE' }); refresh(); }}>Thoát</button>
        </div>
      </header>
      <main className="p-3">
        {tab === 'home' && <Home me={me} go={setTab} />}
        {tab === 'catalog' && <Catalog />}
        {tab === 'orders' && <Orders />}
        {tab === 'designs' && <Designs />}
        {tab === 'debt' && <Debt />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-3xl border-t bg-white">
        {([['home', '🏠', 'Trang chủ'], ['catalog', '🧸', 'Sản phẩm'], ['orders', '📦', 'Đơn hàng'],
          ['designs', '🎨', 'Mẫu'], ['debt', '💰', 'Công nợ']] as const).map(([k, icon, label]) => (
          <button key={k} className={`flex-1 py-2 text-center text-xs font-bold ${tab === k ? 'text-pink-700' : 'text-slate-400'}`}
            onClick={() => setTab(k)}>
            <div className="text-lg">{icon}</div>{label}
          </button>))}
      </nav>
    </div>
  );
}

function Login({ onOk, brandName, domain }: { onOk: () => void; brandName: string; domain: string }) {
  const [u, setU] = useState(''); const [p, setP] = useState('');
  const [err, setErr] = useState('');
  async function submit() {
    setErr('');
    const res = await fetch('/api/portal/auth', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ u, p }) });
    const j = await res.json();
    if (j.ok) onOk(); else setErr(j.error || 'Lỗi');
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-pink-50 p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-4 text-center">
          <div className="text-3xl">🧸</div>
          <h1 className="text-lg font-extrabold text-pink-700">Cổng khách hàng & đại lý</h1>
          <p className="text-xs text-slate-500">{brandName} — {domain}</p>
        </div>
        <label className="lbl">Tài khoản</label>
        <input className="inp mb-2" value={u} onChange={(e) => setU(e.target.value)} />
        <label className="lbl">Mật khẩu</label>
        <input className="inp mb-3" type="password" value={p} onChange={(e) => setP(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()} />
        {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
        <button className="btn w-full" onClick={submit}>Đăng nhập</button>
        <p className="mt-3 text-center text-xs text-slate-400">Chưa có tài khoản? Liên hệ nhân viên phụ trách của bạn.</p>
      </div>
    </div>
  );
}

function Home({ me, go }: { me: Me; go: (t: 'home' | 'catalog' | 'orders' | 'designs' | 'debt') => void }) {
  const [d, setD] = useState<{ openOrders: number; totalDebt: number } | null>(null);
  const [support, setSupport] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    fetch('/api/portal/data').then((r) => r.json()).then((j) => j.ok && setD(j));
  }, []);
  async function sendSupport() {
    setMsg('');
    const res = await fetch('/api/portal/actions', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'support', content: support }) });
    const j = await res.json();
    setMsg(j.ok ? '✅ Đã gửi — nhân viên phụ trách sẽ liên hệ bạn.' : (j.error || 'Lỗi'));
    if (j.ok) setSupport('');
  }
  async function upload(f: File) {
    const fd = new FormData(); fd.set('file', f);
    const res = await fetch('/api/portal/actions', { method: 'POST', body: fd });
    const j = await res.json();
    setMsg(j.ok ? '✅ Đã gửi file cho xưởng.' : (j.error || 'Lỗi'));
  }
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <button className="card p-4 text-left" onClick={() => go('orders')}>
          <div className="text-xs font-bold text-slate-400">Đơn đang xử lý</div>
          <div className="text-2xl font-extrabold">{d?.openOrders ?? '…'}</div>
        </button>
        <button className="card p-4 text-left" onClick={() => go('debt')}>
          <div className="text-xs font-bold text-slate-400">Công nợ của bạn</div>
          <div className={`text-2xl font-extrabold ${d && d.totalDebt > 0 ? 'text-red-600' : 'text-green-700'}`}>
            {d ? fmtVND(d.totalDebt) + 'đ' : '…'}</div>
        </button>
      </div>
      <div className="card mt-3 p-4">
        <h2 className="mb-1 font-extrabold">📎 Gửi logo / thiết kế cho xưởng</h2>
        <input type="file" className="block w-full text-sm"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      <div className="card mt-3 p-4">
        <h2 className="mb-1 font-extrabold">💬 Cần hỗ trợ?</h2>
        <textarea className="inp mb-2" rows={2} placeholder="VD: em muốn đổi size đơn vừa đặt…"
          value={support} onChange={(e) => setSupport(e.target.value)} />
        <button className="btn w-full" onClick={sendSupport}>Gửi hỗ trợ</button>
      </div>
      {msg && <p className="mt-2 text-center text-sm font-semibold text-green-700">{msg}</p>}
      <p className="mt-4 text-center text-xs text-slate-400">Xin chào {me.partnerName} · Hotline 0876.123.333</p>
    </div>
  );
}

function Catalog() {
  type P = { id: number; name: string; desc: string | null; unit: string;
    variants: { id: number; sku: string; size: string | null; color: string | null; price: number }[] };
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<P[]>([]);
  const [cart, setCart] = useState<Record<number, { qty: number; label: string }>>({});
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const t = setTimeout(async () => {
      const j = await (await fetch(`/api/portal/data?view=catalog&q=${encodeURIComponent(q)}`)).json();
      if (j.ok) setRows(j.rows);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const items = Object.entries(cart).filter(([, v]) => v.qty > 0);
  async function request() {
    setMsg('');
    const res = await fetch('/api/portal/actions', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'quote_request',
        lines: items.map(([vid, v]) => ({ variantId: +vid, qty: v.qty })) }) });
    const j = await res.json();
    setMsg(j.ok ? `✅ Đã gửi yêu cầu ${j.code} — nhân viên sẽ báo giá cho bạn.` : (j.error || 'Lỗi'));
    if (j.ok) setCart({});
  }
  return (
    <div>
      <input className="inp mb-2" placeholder="Tìm gấu…" value={q} onChange={(e) => setQ(e.target.value)} />
      {msg && <p className="mb-2 text-sm font-semibold text-green-700">{msg}</p>}
      {items.length > 0 && (
        <button className="btn mb-2 w-full" onClick={request}>
          📨 Gửi yêu cầu báo giá ({items.reduce((a, [, v]) => a + v.qty, 0)} sản phẩm)</button>)}
      {rows.map((p) => (
        <div key={p.id} className="card mb-2 p-3">
          <div className="font-bold">{p.name}</div>
          {p.desc && <div className="text-xs text-slate-500">{p.desc}</div>}
          {p.variants.map((v) => (
            <div key={v.id} className="mt-1 flex items-center gap-2 text-sm">
              <span className="flex-1">{[v.size, v.color].filter(Boolean).join(' · ') || p.unit}</span>
              <b className="text-pink-700">{fmtVND(v.price)}đ</b>
              <button className="btn-ghost px-2" onClick={() => setCart({ ...cart,
                [v.id]: { qty: Math.max(0, (cart[v.id]?.qty ?? 0) - 1), label: p.name } })}>−</button>
              <span className="w-6 text-center font-bold">{cart[v.id]?.qty ?? 0}</span>
              <button className="btn-ghost px-2" onClick={() => setCart({ ...cart,
                [v.id]: { qty: (cart[v.id]?.qty ?? 0) + 1, label: p.name } })}>＋</button>
            </div>))}
        </div>))}
      {rows.length === 0 && <p className="p-4 text-center text-sm text-slate-400">Không tìm thấy sản phẩm.</p>}
    </div>
  );
}

function Orders() {
  type O = { id: number; code: string; createdAt: string; orderStatus: string; paymentStatus: string;
    shippingStatus: string; total: number; paidAmt: number;
    lines: { name: string; qty: number; lineTotal: number }[];
    shipments: { code: string; status: string; carrier: string | null; trackingNo: string | null }[];
    production: { code: string; status: string; qtyPlanned: number; qtyGood: number }[] };
  const [rows, setRows] = useState<O[] | null>(null);
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch('/api/portal/data?view=orders')).json();
    if (j.ok) setRows(j.rows);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function reorder(id: number) {
    setMsg('');
    const res = await fetch('/api/portal/actions', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reorder', orderId: id }) });
    const j = await res.json();
    setMsg(j.ok ? `✅ Đã gửi yêu cầu đặt lại (${j.code}).` : (j.error || 'Lỗi'));
  }
  if (rows === null) return <p className="p-4 text-center text-slate-400">Đang tải…</p>;
  return (
    <div>
      {msg && <p className="mb-2 text-sm font-semibold text-green-700">{msg}</p>}
      {rows.length === 0 && <p className="p-4 text-center text-sm text-slate-400">Bạn chưa có đơn hàng nào.</p>}
      {rows.map((o) => (
        <div key={o.id} className="card mb-2 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-bold">{o.code}</span>
            <span className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString('vi-VN')}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold">{OS_VI[o.orderStatus]}</span>
            <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${o.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{PS_VI[o.paymentStatus]}</span>
            <b className="ml-auto">{fmtVND(o.total)}đ</b>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {o.lines.map((l) => `${l.name} ×${l.qty}`).join(' · ')}</div>
          {o.production.map((p) => (
            <div key={p.code} className="mt-1 text-xs">🏭 {p.code}: sản xuất {p.qtyGood}/{p.qtyPlanned}
              {p.status === 'DONE' ? ' ✓ xong' : '…'}</div>))}
          {o.shipments.map((s) => (
            <div key={s.code} className="mt-1 text-xs">🚚 {s.code}: {SHIP_VI[s.status]}
              {s.carrier ? ` · ${s.carrier}` : ''}{s.trackingNo ? ` · vận đơn ${s.trackingNo}` : ''}</div>))}
          {o.total > o.paidAmt && <div className="mt-1 text-xs font-bold text-red-600">Còn nợ {fmtVND(o.total - o.paidAmt)}đ</div>}
          <button className="btn-ghost mt-1 text-pink-700" onClick={() => reorder(o.id)}>🔄 Đặt lại đơn này</button>
        </div>))}
    </div>
  );
}

function Designs() {
  type Dz = { id: number; code: string; title: string;
    versions: { id: number; no: number; status: string; imageUrl: string | null; note: string | null;
      decideNote: string | null; comments: { id: number; content: string; byName: string }[] }[] };
  const [rows, setRows] = useState<Dz[] | null>(null);
  const [comment, setComment] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch('/api/portal/data?view=designs')).json();
    if (j.ok) setRows(j.rows);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function act(body: Record<string, unknown>) {
    await fetch('/api/portal/actions', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    load();
  }
  if (rows === null) return <p className="p-4 text-center text-slate-400">Đang tải…</p>;
  if (rows.length === 0) return <p className="p-4 text-center text-sm text-slate-400">
    Chưa có mẫu thiết kế nào cho bạn. Khi xưởng làm mẫu, bạn sẽ duyệt tại đây.</p>;
  return (
    <div>
      {rows.map((dz) => (
        <div key={dz.id} className="card mb-2 p-3 text-sm">
          <div className="font-bold">{dz.code} — {dz.title}</div>
          {dz.versions.map((v) => (
            <div key={v.id} className={`mt-2 rounded-xl border p-2 ${v.status === 'APPROVED' ? 'border-green-300' : 'border-slate-200'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <b>Bản {v.no}</b>
                <span className="text-xs font-bold">{DV_VI[v.status]}</span>
                {v.imageUrl && <a className="text-xs font-bold text-pink-700" href={v.imageUrl} target="_blank">🖼️ Xem mẫu</a>}
              </div>
              {v.note && <p className="text-xs text-slate-500">{v.note}</p>}
              {v.comments.map((c) => <p key={c.id} className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs">💬 <b>{c.byName}</b>: {c.content}</p>)}
              {v.status === 'PENDING' && (
                <div className="mt-2">
                  <div className="flex gap-2">
                    <button className="btn flex-1" onClick={() => act({ action: 'design_decide', versionId: v.id, approve: true })}>✓ DUYỆT MẪU NÀY</button>
                    <button className="btn-ghost flex-1 text-red-600" onClick={() => {
                      const note = prompt('Bạn muốn sửa gì?');
                      if (note != null) act({ action: 'design_decide', versionId: v.id, approve: false, note });
                    }}>✕ Yêu cầu sửa</button>
                  </div>
                  <input className="inp mt-1 text-xs" placeholder="Góp ý thêm… (Enter để gửi)" value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && comment.trim()) {
                        await act({ action: 'design_comment', versionId: v.id, content: comment });
                        setComment('');
                      }
                    }} />
                </div>)}
            </div>))}
        </div>))}
    </div>
  );
}

function Debt() {
  type D = { creditLimit: number; totalDebt: number;
    debts: { code: string; remaining: number; dueDate: string; bucket: string }[];
    payments: { code: string; amount: number; createdAt: string; note: string | null }[] };
  const [d, setD] = useState<D | null>(null);
  useEffect(() => {
    fetch('/api/portal/data?view=debt').then((r) => r.json()).then((j) => j.ok && setD(j));
  }, []);
  if (!d) return <p className="p-4 text-center text-slate-400">Đang tải…</p>;
  return (
    <div>
      <div className="card p-4 text-center">
        <div className="text-xs font-bold text-slate-400">Tổng công nợ của bạn</div>
        <div className={`text-3xl font-extrabold ${d.totalDebt > 0 ? 'text-red-600' : 'text-green-700'}`}>
          {fmtVND(d.totalDebt)}đ</div>
        {d.creditLimit > 0 && <div className="text-xs text-slate-500">Hạn mức: {fmtVND(d.creditLimit)}đ</div>}
      </div>
      {d.debts.length > 0 && (
        <div className="card mt-3 p-3 text-sm">
          <h2 className="mb-1 font-extrabold">Đơn còn nợ</h2>
          {d.debts.map((x) => (
            <div key={x.code} className="flex justify-between border-t border-slate-100 py-1.5">
              <span className="font-mono">{x.code}
                <span className={`ml-1 text-xs ${x.bucket === 'not_due' ? 'text-slate-400' : 'font-bold text-red-600'}`}>
                  hạn {new Date(x.dueDate).toLocaleDateString('vi-VN')}</span></span>
              <b>{fmtVND(x.remaining)}đ</b>
            </div>))}
        </div>)}
      <div className="card mt-3 p-3 text-sm">
        <h2 className="mb-1 font-extrabold">Lịch sử thanh toán</h2>
        {d.payments.length === 0 && <p className="text-xs text-slate-400">Chưa có.</p>}
        {d.payments.map((p) => (
          <div key={p.code} className="flex justify-between border-t border-slate-100 py-1.5">
            <span className="font-mono text-xs">{p.code} · {new Date(p.createdAt).toLocaleDateString('vi-VN')}</span>
            <b className={p.amount < 0 ? 'text-red-600' : 'text-green-700'}>{p.amount < 0 ? '−' : '+'}{fmtVND(Math.abs(p.amount))}đ</b>
          </div>))}
      </div>
    </div>
  );
}
