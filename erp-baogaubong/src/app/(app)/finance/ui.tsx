'use client';
import { useCallback, useEffect, useState } from 'react';
import { fmtVND } from '@/lib/format';
import { AGING_VI } from '@/modules/finance/domain';

type Account = { id: number; code: string; name: string; kind: string; balance: number;
  openingBalance: number; active: boolean; pendingCount: number };
type Tx = { id: number; code: string; kind: string; status: string; amount: number;
  partnerName: string | null; orderId: number | null; reason: string | null; note: string | null;
  happenedAt: string; period: string; account: { code: string; name: string } };

const KIND_VI: Record<string, string> = { RECEIPT: '💰 Thu', PAYMENT: '💸 Chi',
  TRANSFER_IN: '🔁 Chuyển đến', TRANSFER_OUT: '🔁 Chuyển đi', REFUND: '↩️ Hoàn tiền' };
const ACC_KIND_VI: Record<string, string> = { CASH: 'Tiền mặt', BANK: 'Ngân hàng', COD: 'COD chờ đối soát' };
const nowPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const rid = () => `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export default function FinanceClient({ canManage, canApprove }: { canManage: boolean; canApprove: boolean }) {
  const [tab, setTab] = useState<'dash' | 'ledger' | 'vouchers' | 'debt' | 'lock'>('dash');
  const tabs: [typeof tab, string][] = [['dash', '📊 Tổng quan'], ['ledger', '📒 Sổ quỹ'],
    ...(canManage ? [['vouchers', '🧾 Thu / Chi'] as [typeof tab, string]] : []),
    ['debt', '📕 Công nợ'], ['lock', '🔒 Khóa sổ']];
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">Giao dịch & quỹ</h1>
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map(([k, label]) => (
            <button key={k} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === k ? 'bg-white shadow' : 'text-slate-500'}`}
              onClick={() => setTab(k)}>{label}</button>))}
        </div>
      </div>
      {tab === 'dash' && <DashTab canApprove={canApprove} />}
      {tab === 'ledger' && <LedgerTab />}
      {tab === 'vouchers' && canManage && <VouchersTab canApprove={canApprove} />}
      {tab === 'debt' && <DebtTab canManage={canManage} />}
      {tab === 'lock' && <LockTab canApprove={canApprove} />}
    </div>
  );
}

/* ============================ TONG QUAN ============================ */
function DashTab({ canApprove }: { canApprove: boolean }) {
  type Dash = { period: string; funds: { id: number; code: string; name: string; kind: string; balance: number }[];
    month: { thu: number; chi: number; net: number }; pending: number };
  const [d, setD] = useState<Dash | null>(null);
  useEffect(() => { fetch('/api/finance/dashboard').then((r) => r.json()).then((j) => j.ok && setD(j)); }, []);
  if (!d) return <div className="card p-6 text-slate-400">Đang tải…</div>;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {d.funds.map((f) => (
          <div key={f.id} className="card p-4">
            <div className="text-xs font-bold text-slate-400">{f.name} <span className="font-mono">({f.code})</span></div>
            <div className={`mt-1 text-xl font-extrabold ${f.balance < 0 ? 'text-red-600' : ''}`}>{fmtVND(f.balance)}đ</div>
            <div className="text-xs text-slate-500">{ACC_KIND_VI[f.kind]}</div>
          </div>))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="card p-4"><div className="text-xs font-bold text-slate-400">Thu tháng {d.period.slice(5)}</div>
          <div className="mt-1 text-lg font-extrabold text-green-700">+{fmtVND(d.month.thu)}đ</div></div>
        <div className="card p-4"><div className="text-xs font-bold text-slate-400">Chi tháng {d.period.slice(5)}</div>
          <div className="mt-1 text-lg font-extrabold text-red-600">−{fmtVND(d.month.chi)}đ</div></div>
        <div className="card p-4"><div className="text-xs font-bold text-slate-400">Dòng tiền ròng</div>
          <div className={`mt-1 text-lg font-extrabold ${d.month.net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {d.month.net >= 0 ? '+' : ''}{fmtVND(d.month.net)}đ</div></div>
      </div>
      {d.pending > 0 && (
        <p className="card mt-3 border-l-4 border-amber-400 p-3 text-sm font-semibold">
          ⏳ Có {d.pending} phiếu chi chờ duyệt{canApprove ? ' — vào tab Thu / Chi để duyệt.' : '.'}</p>)}
    </div>
  );
}

/* ============================ SO QUY ============================ */
function LedgerTab() {
  type Ledger = { account: { id: number; code: string; name: string }; period: string;
    opening: number; thu: number; chi: number; closing: number; locked: boolean; rows: Tx[] };
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState(0);
  const [period, setPeriod] = useState(nowPeriod());
  const [data, setData] = useState<Ledger | null>(null);
  useEffect(() => {
    fetch('/api/finance/accounts').then((r) => r.json()).then((j) => {
      if (j.ok) { setAccounts(j.accounts); if (j.accounts[0] && !accountId) setAccountId(j.accounts[0].id); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const load = useCallback(async () => {
    if (!accountId) return;
    const j = await (await fetch(`/api/finance/ledger?accountId=${accountId}&period=${period}`)).json();
    if (j.ok) setData(j);
  }, [accountId, period]);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select className="inp w-auto" value={accountId} onChange={(e) => setAccountId(+e.target.value)}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
        </select>
        <input className="inp w-36" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        {data?.locked && <span className="rounded bg-slate-200 px-2 py-1 text-xs font-bold">🔒 Kỳ đã khóa</span>}
        <a className="btn-ghost ml-auto" href={`/api/finance/export?period=${period}`}>⬇️ Xuất CSV</a>
      </div>
      {data && (
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Đầu kỳ" value={fmtVND(data.opening) + 'đ'} />
          <Stat label="Tổng thu" value={'+' + fmtVND(data.thu) + 'đ'} green />
          <Stat label="Tổng chi" value={'−' + fmtVND(data.chi) + 'đ'} red />
          <Stat label="Cuối kỳ" value={fmtVND(data.closing) + 'đ'} bold />
        </div>)}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>{['Ngày', 'Mã', 'Loại', 'Nội dung', 'Trạng thái', 'Số tiền', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {!data && <tr><td className="td text-slate-400" colSpan={7}>Đang tải…</td></tr>}
            {data?.rows.length === 0 && <tr><td className="td text-slate-400" colSpan={7}>Kỳ này chưa có chứng từ.</td></tr>}
            {data?.rows.map((t) => <TxRow key={t.id} t={t} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function TxRow({ t }: { t: Tx }) {
  const plus = t.kind === 'RECEIPT' || t.kind === 'TRANSFER_IN';
  return (
    <tr className={t.status === 'REJECTED' ? 'opacity-40' : ''}>
      <td className="td text-xs">{new Date(t.happenedAt).toLocaleDateString('vi-VN')}</td>
      <td className="td font-mono font-bold">{t.code}</td>
      <td className="td text-sm">{KIND_VI[t.kind]}</td>
      <td className="td text-sm">{t.reason ?? ''}{t.partnerName && <div className="text-xs text-slate-400">{t.partnerName}</div>}</td>
      <td className="td text-xs">{t.status === 'PENDING' ? <b className="text-amber-600">Chờ duyệt</b>
        : t.status === 'REJECTED' ? <b className="text-red-600">Từ chối</b> : <span className="text-green-700">✓</span>}</td>
      <td className={`td text-right font-bold ${plus ? 'text-green-700' : 'text-red-600'}`}>
        {plus ? '+' : '−'}{fmtVND(t.amount)}đ</td>
      <td className="td"><a className="btn-ghost" href={`/print/cash/${t.id}`} target="_blank">🖨️</a></td>
    </tr>
  );
}
function Stat({ label, value, green, red, bold }: { label: string; value: string; green?: boolean; red?: boolean; bold?: boolean }) {
  return (
    <div className="card p-3">
      <div className="text-xs font-bold text-slate-400">{label}</div>
      <div className={`mt-0.5 font-extrabold ${green ? 'text-green-700' : red ? 'text-red-600' : ''} ${bold ? 'text-lg' : ''}`}>{value}</div>
    </div>
  );
}

/* ============================ THU / CHI ============================ */
function VouchersTab({ canApprove }: { canApprove: boolean }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pending, setPending] = useState<Tx[]>([]);
  const [form, setForm] = useState({ kind: 'RECEIPT' as 'RECEIPT' | 'PAYMENT', accountId: 0,
    amount: 0, partnerName: '', reason: '', note: '' });
  const [transfer, setTransfer] = useState({ fromId: 0, toId: 0, amount: 0, note: '' });
  const [refund, setRefund] = useState({ code: '', amount: 0, reason: '' });
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch('/api/finance/accounts')).json();
    if (j.ok) { setAccounts(j.accounts);
      setForm((f) => ({ ...f, accountId: f.accountId || j.accounts[0]?.id || 0 }));
      setTransfer((t) => ({ ...t, fromId: t.fromId || j.accounts[0]?.id || 0, toId: t.toId || j.accounts[1]?.id || 0 }));
    }
    if (canApprove) {
      const a = await (await fetch('/api/finance/approve')).json();
      if (a.ok) setPending(a.rows);
    }
  }, [canApprove]);
  useEffect(() => { load(); }, [load]);

  async function submitVoucher() {
    setErr(''); setMsg('');
    const res = await fetch('/api/finance/tx', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, idempotencyKey: rid() }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    setMsg(`✅ Đã lập ${j.code}${j.status === 'PENDING' ? ' — CHỜ DUYỆT (chưa tính vào quỹ)' : ''}`);
    window.open(`/print/cash/${j.id}`, '_blank', 'width=700,height=800');
    setForm({ ...form, amount: 0, partnerName: '', reason: '', note: '' }); load();
  }
  async function submitTransfer() {
    setErr(''); setMsg('');
    const res = await fetch('/api/finance/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...transfer, idempotencyKey: rid() }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    setMsg(`✅ Đã chuyển quỹ (${j.code})`); setTransfer({ ...transfer, amount: 0, note: '' }); load();
  }
  async function submitRefund() {
    setErr(''); setMsg('');
    const found = await (await fetch(`/api/finance/tx?q=${encodeURIComponent(refund.code)}&page=1`)).json();
    const orig = found.ok ? found.rows.find((t: Tx) => t.code === refund.code.trim() && t.kind === 'RECEIPT') : null;
    if (!orig) { setErr(`Không tìm thấy phiếu thu ${refund.code}.`); return; }
    const res = await fetch('/api/finance/refund', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId: orig.id, amount: refund.amount, reason: refund.reason, idempotencyKey: rid() }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    setMsg(`✅ Đã hoàn tiền (${j.code}) — liên kết phiếu gốc ${refund.code}`);
    setRefund({ code: '', amount: 0, reason: '' }); load();
  }
  async function decide(id: number, approve: boolean) {
    await fetch('/api/finance/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, approve }) });
    load();
  }
  return (
    <div>
      {canApprove && pending.length > 0 && (
        <div className="card mb-3 border-l-4 border-amber-400 p-3">
          <div className="mb-1 text-sm font-extrabold">⏳ Phiếu chi chờ duyệt ({pending.length})</div>
          {pending.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-2 border-t border-slate-100 py-1.5 text-sm">
              <span className="font-mono font-bold">{t.code}</span>
              <span>{t.reason}</span>
              <span className="font-bold text-red-600">−{fmtVND(t.amount)}đ</span>
              <span className="text-xs text-slate-400">{t.account.name}</span>
              <span className="ml-auto flex gap-1">
                <button className="btn-ghost text-green-700" onClick={() => decide(t.id, true)}>✓ Duyệt</button>
                <button className="btn-ghost text-red-600" onClick={() => decide(t.id, false)}>✕ Từ chối</button>
              </span>
            </div>))}
        </div>)}
      {msg && <p className="mb-2 text-sm font-semibold text-green-700">{msg}</p>}
      {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="card p-4">
          <h2 className="mb-2 font-extrabold">Lập phiếu thu / chi</h2>
          <div className="mb-2 flex gap-2">
            {(['RECEIPT', 'PAYMENT'] as const).map((k) => (
              <button key={k} className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold ${form.kind === k ? (k === 'RECEIPT' ? 'bg-green-600 text-white' : 'bg-red-600 text-white') : 'bg-slate-100'}`}
                onClick={() => setForm({ ...form, kind: k })}>{k === 'RECEIPT' ? '💰 Phiếu thu' : '💸 Phiếu chi'}</button>))}
          </div>
          <label className="lbl">Quỹ</label>
          <select className="inp mb-2" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: +e.target.value })}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} — {fmtVND(a.balance)}đ</option>)}
          </select>
          <label className="lbl">Số tiền (VND)</label>
          <input className="inp mb-2" inputMode="numeric" value={form.amount || ''}
            onChange={(e) => setForm({ ...form, amount: +e.target.value.replace(/\D/g, '') || 0 })} />
          <label className="lbl">{form.kind === 'RECEIPT' ? 'Người nộp' : 'Người nhận'}</label>
          <input className="inp mb-2" value={form.partnerName} onChange={(e) => setForm({ ...form, partnerName: e.target.value })} />
          <label className="lbl">Lý do</label>
          <input className="inp mb-2" placeholder="VD: mua bông, trả tiền điện…" value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <button className="btn w-full" onClick={submitVoucher}>💾 Lập phiếu & in</button>
          {form.kind === 'PAYMENT' && !canApprove && (
            <p className="mt-1 text-xs text-amber-600">Phiếu chi của bạn sẽ chờ chủ xưởng duyệt mới tính vào quỹ.</p>)}
        </div>
        <div className="card p-4">
          <h2 className="mb-2 font-extrabold">Chuyển quỹ</h2>
          <label className="lbl">Từ quỹ</label>
          <select className="inp mb-2" value={transfer.fromId} onChange={(e) => setTransfer({ ...transfer, fromId: +e.target.value })}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} — {fmtVND(a.balance)}đ</option>)}
          </select>
          <label className="lbl">Sang quỹ</label>
          <select className="inp mb-2" value={transfer.toId} onChange={(e) => setTransfer({ ...transfer, toId: +e.target.value })}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <label className="lbl">Số tiền (VND)</label>
          <input className="inp mb-2" inputMode="numeric" value={transfer.amount || ''}
            onChange={(e) => setTransfer({ ...transfer, amount: +e.target.value.replace(/\D/g, '') || 0 })} />
          <label className="lbl">Ghi chú</label>
          <input className="inp mb-3" value={transfer.note} onChange={(e) => setTransfer({ ...transfer, note: e.target.value })} />
          <button className="btn w-full" onClick={submitTransfer}>🔁 Chuyển quỹ</button>
          <p className="mt-1 text-xs text-slate-400">VD: cuối ngày nộp tiền mặt vào ngân hàng; COD ngân hàng báo có → chuyển từ quỹ COD sang ngân hàng.</p>
        </div>
        <div className="card p-4">
          <h2 className="mb-2 font-extrabold">Hoàn tiền khách</h2>
          <label className="lbl">Mã phiếu thu gốc</label>
          <input className="inp mb-2 font-mono" placeholder="PT-0001" value={refund.code}
            onChange={(e) => setRefund({ ...refund, code: e.target.value })} />
          <label className="lbl">Số tiền hoàn (VND)</label>
          <input className="inp mb-2" inputMode="numeric" value={refund.amount || ''}
            onChange={(e) => setRefund({ ...refund, amount: +e.target.value.replace(/\D/g, '') || 0 })} />
          <label className="lbl">Lý do</label>
          <input className="inp mb-3" placeholder="VD: khách trả hàng lỗi…" value={refund.reason}
            onChange={(e) => setRefund({ ...refund, reason: e.target.value })} />
          <button className="btn w-full" onClick={submitRefund}>↩️ Hoàn tiền</button>
          <p className="mt-1 text-xs text-slate-400">Phiếu hoàn LIÊN KẾT phiếu thu gốc — không sửa/xóa phiếu cũ, không hoàn quá số đã thu.</p>
        </div>
      </div>
    </div>
  );
}

/* ============================ CONG NO ============================ */
function DebtTab({ canManage }: { canManage: boolean }) {
  type DebtRow = { partnerId: number | null; partnerName: string; code: string | null; phone: string | null;
    debt: number; creditLimit: number; overLimit: boolean;
    orders: { id: number; code: string; remaining: number; dueDate: string; bucket: string }[] };
  const [data, setData] = useState<{ rows: DebtRow[]; summary: Record<string, number>; total: number } | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [collect, setCollect] = useState<{ orderId: number; code: string; remaining: number } | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch(`/api/finance/debt${overdueOnly ? '?overdue=1' : ''}`)).json();
    if (j.ok) setData(j);
  }, [overdueOnly]);
  useEffect(() => { load(); }, [load]);
  async function doCollect() {
    if (!collect) return;
    setErr('');
    const res = await fetch('/api/sales/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: collect.orderId, amount: amount === '' ? collect.remaining : amount, method: 'CASH' }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    setCollect(null); setAmount(''); load();
  }
  if (!data) return <div className="card p-6 text-slate-400">Đang tải…</div>;
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        {(Object.keys(AGING_VI) as (keyof typeof AGING_VI)[]).map((k) => (
          <div key={k} className={`card p-3 ${k !== 'not_due' && data.summary[k] > 0 ? 'border-l-4 border-red-400' : ''}`}>
            <div className="text-xs font-bold text-slate-400">{AGING_VI[k]}</div>
            <div className="mt-0.5 font-extrabold">{fmtVND(data.summary[k] ?? 0)}đ</div>
          </div>))}
      </div>
      <div className="mb-3 flex items-center gap-3">
        <span className="font-bold">Tổng phải thu: <span className="text-red-600">{fmtVND(data.total)}đ</span></span>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
          Chỉ hiện quá hạn</label>
      </div>
      {data.rows.length === 0 && <div className="card p-6 text-center text-slate-500">🎉 Không có công nợ nào{overdueOnly ? ' quá hạn' : ''}.</div>}
      {data.rows.map((r) => (
        <div key={r.partnerId ?? r.partnerName} className={`card mb-2 p-3 ${r.overLimit ? 'border-l-4 border-red-500' : ''}`}>
          <div className="flex flex-wrap items-center gap-2">
            <b>{r.partnerName}</b>
            {r.code && <span className="font-mono text-xs text-slate-400">{r.code}</span>}
            {r.phone && <span className="text-xs text-slate-500">{r.phone}</span>}
            {r.overLimit && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-600">
              VƯỢT HẠN MỨC ({fmtVND(r.creditLimit)}đ)</span>}
            <span className="ml-auto font-extrabold text-red-600">{fmtVND(r.debt)}đ</span>
          </div>
          <div className="mt-1 space-y-0.5 text-sm">
            {r.orders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{o.code}</span>
                <span className={o.bucket === 'not_due' ? 'text-slate-500' : 'font-semibold text-red-600'}>
                  {AGING_VI[o.bucket as keyof typeof AGING_VI]} · hạn {new Date(o.dueDate).toLocaleDateString('vi-VN')}</span>
                <span className="ml-auto font-bold">{fmtVND(o.remaining)}đ</span>
                {canManage && <button className="btn-ghost text-green-700"
                  onClick={() => { setCollect({ orderId: o.id, code: o.code, remaining: o.remaining }); setAmount(''); }}>💰 Thu</button>}
              </div>))}
          </div>
        </div>))}
      {collect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setCollect(null)}>
          <div className="card w-full max-w-sm p-5">
            <h2 className="mb-2 font-extrabold">Thu nợ đơn {collect.code}</h2>
            <label className="lbl">Số tiền (trống = thu đủ {fmtVND(collect.remaining)}đ)</label>
            <input className="inp mb-3" inputMode="numeric" value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : +e.target.value.replace(/\D/g, '') || 0)} />
            {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setCollect(null)}>Hủy</button>
              <button className="btn" onClick={doCollect}>💰 Thu tiền</button>
            </div>
          </div>
        </div>)}
    </div>
  );
}

/* ============================ KHOA SO ============================ */
function LockTab({ canApprove }: { canApprove: boolean }) {
  type Lock = { period: string; locked: boolean; lockedByName: string; lockedAt: string; note: string | null };
  const [rows, setRows] = useState<Lock[]>([]);
  const [period, setPeriod] = useState(nowPeriod());
  const [note, setNote] = useState('');
  const [err, setErr] = useState(''); const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch('/api/finance/lock')).json();
    if (j.ok) setRows(j.rows);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function submit(lock: boolean) {
    setErr(''); setMsg('');
    const res = await fetch('/api/finance/lock', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, lock, note: note || undefined }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    setMsg(lock ? `🔒 Đã khóa kỳ ${period}` : `🔓 Đã mở khóa kỳ ${period} (có ghi nhật ký)`);
    setNote(''); load();
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="card p-4">
        <h2 className="mb-2 font-extrabold">Khóa / mở khóa sổ theo kỳ</h2>
        <p className="mb-2 text-xs text-slate-500">Kỳ đã khóa: không ghi thêm/duyệt chứng từ vào kỳ đó. Mở khóa bắt buộc ghi lý do và lưu nhật ký.</p>
        <input className="inp mb-2 w-40" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        <input className="inp mb-3" placeholder="Lý do (bắt buộc khi mở khóa)" value={note} onChange={(e) => setNote(e.target.value)} />
        {canApprove ? (
          <div className="flex gap-2">
            <button className="btn" onClick={() => submit(true)}>🔒 Khóa kỳ</button>
            <button className="btn-ghost" onClick={() => submit(false)}>🔓 Mở khóa</button>
          </div>
        ) : <p className="text-sm text-slate-400">Chỉ người có quyền duyệt tài chính được khóa/mở sổ.</p>}
        {err && <p className="mt-2 text-sm font-semibold text-red-600">{err}</p>}
        {msg && <p className="mt-2 text-sm font-semibold text-green-700">{msg}</p>}
      </div>
      <div className="card p-4">
        <h2 className="mb-2 font-extrabold">Lịch sử khóa sổ</h2>
        {rows.length === 0 && <p className="text-sm text-slate-400">Chưa khóa kỳ nào.</p>}
        {rows.map((r) => (
          <div key={r.period} className="flex flex-wrap items-center gap-2 border-t border-slate-100 py-1.5 text-sm">
            <span className="font-mono font-bold">{r.period}</span>
            {r.locked ? <span className="font-bold text-slate-700">🔒 Đang khóa</span>
              : <span className="text-slate-400">🔓 Đã mở</span>}
            <span className="text-xs text-slate-400">{r.lockedByName} · {new Date(r.lockedAt).toLocaleString('vi-VN')}</span>
            {r.note && <span className="text-xs text-slate-500">({r.note})</span>}
          </div>))}
      </div>
    </div>
  );
}
