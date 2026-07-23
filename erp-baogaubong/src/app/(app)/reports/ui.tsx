'use client';
import { useCallback, useEffect, useState } from 'react';
import { fmtVND } from '@/lib/format';

type Report = {
  sum: { revenueVat: number; revenueNoVat: number; tax: number; collected: number; orders: number; debt: number };
  byDay: { date: string; revenueVat: number; revenueNoVat: number; collected: number; orders: number }[];
  byUser: { userId: number; name: string; revenue: number; orders: number }[];
  topProducts: { sku: string; name: string; qty: number; amount: number }[];
  orders: { id: number; code: string; partnerName: string; total: number; vatEnabled: boolean;
    paidAmt: number; createdAt: string; user: string }[];
};

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const monthStart = () => today().slice(0, 8) + '01';

export default function ReportsClient({ users }: { users: { id: number; name: string }[] }) {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [userId, setUserId] = useState(0);
  const [d, setD] = useState<Report | null>(null);
  const [showOrders, setShowOrders] = useState(false);
  const load = useCallback(async () => {
    const j = await (await fetch(`/api/reports/sales?from=${from}&to=${to}${userId ? `&userId=${userId}` : ''}`)).json();
    if (j.ok) setD(j);
  }, [from, to, userId]);
  useEffect(() => { load(); }, [load]);
  const maxDay = Math.max(1, ...(d?.byDay.map((x) => x.revenueVat + x.revenueNoVat) ?? [1]));
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-extrabold">Báo cáo bán hàng</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <input className="inp w-auto" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          →
          <input className="inp w-auto" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <select className="inp w-auto" value={userId} onChange={(e) => setUserId(+e.target.value)}>
            <option value={0}>— Mọi nhân viên —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>
      {!d ? <div className="card p-6 text-slate-400">Đang tải…</div> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Doanh thu CÓ VAT" value={fmtVND(d.sum.revenueVat) + 'đ'} sub={`thuế ${fmtVND(d.sum.tax)}đ`} />
            <Stat label="Doanh thu KHÔNG VAT" value={fmtVND(d.sum.revenueNoVat) + 'đ'} />
            <Stat label="Tổng doanh thu" value={fmtVND(d.sum.revenueVat + d.sum.revenueNoVat) + 'đ'} sub={`${d.sum.orders} đơn`} bold />
            <Stat label="TIỀN ĐÃ THU (khác doanh thu)" value={fmtVND(d.sum.collected) + 'đ'} green />
            <Stat label="Còn phải thu (của kỳ)" value={fmtVND(d.sum.debt) + 'đ'} red={d.sum.debt > 0} />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Doanh thu = tổng tiền đơn Đã xác nhận/Hoàn tất theo ngày tạo · Tiền đã thu = phiếu thu theo ngày thu (gồm cả hoàn âm) — hai số này khác nhau là bình thường.</p>
          <div className="card mt-3 p-4">
            <h2 className="mb-2 font-extrabold">Theo ngày</h2>
            {d.byDay.length === 0 && <p className="text-sm text-slate-400">Không có dữ liệu trong khoảng lọc.</p>}
            {d.byDay.map((r) => (
              <div key={r.date} className="mb-1 flex items-center gap-2 text-xs">
                <span className="w-20 font-mono">{r.date.slice(5)}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                  <div className="flex h-full">
                    <div className="bg-pink-600" style={{ width: `${(r.revenueVat / maxDay) * 100}%` }} />
                    <div className="bg-pink-300" style={{ width: `${(r.revenueNoVat / maxDay) * 100}%` }} />
                  </div>
                </div>
                <span className="w-40 text-right">
                  <b>{fmtVND(r.revenueVat + r.revenueNoVat)}đ</b>
                  <span className="text-green-700"> · thu {fmtVND(r.collected)}đ</span></span>
              </div>))}
            <p className="mt-1 text-xs text-slate-400">■ đậm = có VAT · ■ nhạt = không VAT</p>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="card p-4">
              <h2 className="mb-2 font-extrabold">Theo nhân viên</h2>
              {d.byUser.map((u) => (
                <div key={u.userId} className="flex justify-between border-t border-slate-100 py-1.5 text-sm">
                  <span>{u.name} <span className="text-xs text-slate-400">({u.orders} đơn)</span></span>
                  <b>{fmtVND(u.revenue)}đ</b>
                </div>))}
            </div>
            <div className="card p-4">
              <h2 className="mb-2 font-extrabold">Bán chạy trong kỳ</h2>
              {d.topProducts.map((t) => (
                <div key={t.sku} className="flex justify-between border-t border-slate-100 py-1.5 text-sm">
                  <span>{t.name} <span className="font-mono text-xs text-slate-400">{t.sku}</span></span>
                  <span><b>{t.qty}</b> · {fmtVND(t.amount)}đ</span>
                </div>))}
            </div>
          </div>
          <div className="card mt-3 p-4">
            <button className="font-extrabold" onClick={() => setShowOrders(!showOrders)}>
              📄 Chứng từ trong kỳ ({d.orders.length}) {showOrders ? '▲' : '▼'}</button>
            {showOrders && d.orders.map((o) => (
              <div key={o.id} className="flex flex-wrap justify-between gap-2 border-t border-slate-100 py-1.5 text-sm">
                <span><a className="font-mono font-bold text-pink-700 hover:underline"
                  href={`/print/order/${o.id}`} target="_blank">{o.code}</a> · {o.partnerName}
                  <span className="text-xs text-slate-400"> · {o.user} · {o.vatEnabled ? 'VAT' : 'không VAT'}</span></span>
                <span><b>{fmtVND(o.total)}đ</b> · thu {fmtVND(o.paidAmt)}đ</span>
              </div>))}
          </div>
        </>
      )}
    </div>
  );
}
function Stat({ label, value, sub, bold, green, red }: {
  label: string; value: string; sub?: string; bold?: boolean; green?: boolean; red?: boolean;
}) {
  return (
    <div className={`card p-4 ${red ? 'border-l-4 border-red-400' : ''}`}>
      <div className="text-xs font-bold text-slate-400">{label}</div>
      <div className={`mt-1 font-extrabold ${bold ? 'text-xl' : 'text-lg'} ${green ? 'text-green-700' : ''}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
