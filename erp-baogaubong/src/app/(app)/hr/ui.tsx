'use client';
import { useCallback, useEffect, useState } from 'react';
import { fmtVND } from '@/lib/format';

type UserOpt = { id: number; name: string };
type Slip = { id: number; code: string; userId: number; name: string; period: string;
  baseSalary: number; workDays: string; standardDays: number; salaryByDays: number;
  allowance: number; commission: number; bonus: number; penalty: number; advance: number;
  total: number; status: string };

const nowPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const SLIP_VI: Record<string, string> = { DRAFT: 'Nháp', APPROVED: 'Đã duyệt', PAID: 'Đã chi' };

export default function HrClient({ canView, canManage, myName }: {
  canView: boolean; canManage: boolean; myName: string;
}) {
  const [tab, setTab] = useState<'my' | 'staff' | 'timesheet' | 'kpi' | 'payroll'>(canView ? 'staff' : 'my');
  const tabs: [typeof tab, string][] = [
    ['my', '🙋 Của tôi'],
    ...(canView ? [['staff', '👥 Nhân sự'] as [typeof tab, string],
      ['timesheet', '🗓️ Chấm công'] as [typeof tab, string],
      ['kpi', '🎯 KPI & Hoa hồng'] as [typeof tab, string],
      ['payroll', '💵 Lương'] as [typeof tab, string]] : [])];
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">Nhân viên & lương</h1>
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map(([k, label]) => (
            <button key={k} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === k ? 'bg-white shadow' : 'text-slate-500'}`}
              onClick={() => setTab(k)}>{label}</button>))}
        </div>
      </div>
      <p className="mb-3 text-xs text-slate-400">Quản trị nội bộ xưởng — không thay thế hệ thống kê khai lương/thuế theo pháp luật.</p>
      {tab === 'my' && <MyTab myName={myName} canManage={canManage} />}
      {tab === 'staff' && canView && <StaffTab canManage={canManage} />}
      {tab === 'timesheet' && canView && <TimesheetTab canManage={canManage} />}
      {tab === 'kpi' && canView && <KpiTab canManage={canManage} />}
      {tab === 'payroll' && canView && <PayrollTab canManage={canManage} />}
    </div>
  );
}

/* ============================ CUA TOI ============================ */
function MyTab({ myName, canManage }: { myName: string; canManage: boolean }) {
  type Task = { id: number; title: string; status: string; priority: string; dueAt: string | null;
    assigneeId: number; createdByName: string };
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [slips, setSlips] = useState<Slip[]>([]);
  const [newTask, setNewTask] = useState({ title: '', assigneeId: 0, dueAt: '', priority: 'NORMAL' });
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const [t, s] = await Promise.all([
      (await fetch('/api/hr/tasks')).json(),
      (await fetch('/api/hr/payroll?mine=1')).json()]);
    if (t.ok) { setTasks(t.rows); setUsers(t.users); }
    if (s.ok) setSlips(s.rows);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function addTask() {
    setErr('');
    const res = await fetch('/api/hr/tasks', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTask.title, assigneeId: newTask.assigneeId || undefined,
        dueAt: newTask.dueAt ? new Date(newTask.dueAt).toISOString() : null, priority: newTask.priority }) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    setNewTask({ title: '', assigneeId: 0, dueAt: '', priority: 'NORMAL' }); load();
  }
  async function setStatus(id: number, status: string) {
    await fetch('/api/hr/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }) });
    load();
  }
  const open = tasks.filter((t) => t.status === 'OPEN' || t.status === 'DOING');
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="card p-4">
        <h2 className="mb-2 font-extrabold">Việc cần làm ({open.length})</h2>
        <div className="mb-2 flex flex-wrap items-end gap-2 text-sm">
          <input className="inp flex-1" placeholder="Thêm việc… (VD: đóng 20 đơn sáng mai)" value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && addTask()} />
          {canManage && (
            <select className="inp w-auto" value={newTask.assigneeId}
              onChange={(e) => setNewTask({ ...newTask, assigneeId: +e.target.value })}>
              <option value={0}>— cho tôi —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>)}
          <input className="inp w-auto" type="date" value={newTask.dueAt}
            onChange={(e) => setNewTask({ ...newTask, dueAt: e.target.value })} />
          <button className="btn" onClick={addTask}>＋</button>
        </div>
        {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
        {tasks.length === 0 && <p className="text-sm text-slate-400">Chưa có việc nào.</p>}
        {tasks.map((t) => (
          <div key={t.id} className={`flex flex-wrap items-center gap-2 border-t border-slate-100 py-1.5 text-sm ${t.status === 'DONE' || t.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
            {t.priority === 'HIGH' && <span className="text-red-600">🔥</span>}
            <span className={t.status === 'DONE' ? 'line-through' : 'font-semibold'}>{t.title}</span>
            {t.dueAt && <span className={`text-xs ${new Date(t.dueAt) < new Date() && t.status !== 'DONE' ? 'font-bold text-red-600' : 'text-slate-400'}`}>
              ⏰ {new Date(t.dueAt).toLocaleDateString('vi-VN')}</span>}
            <span className="text-xs text-slate-400">giao bởi {t.createdByName}</span>
            <span className="ml-auto flex gap-1">
              {t.status !== 'DONE' && t.status !== 'CANCELLED' && (
                <button className="btn-ghost text-green-700" onClick={() => setStatus(t.id, 'DONE')}>✓ Xong</button>)}
              {t.status === 'DONE' && (
                <button className="btn-ghost" onClick={() => setStatus(t.id, 'OPEN')}>↩︎</button>)}
            </span>
          </div>))}
      </div>
      <div className="card p-4">
        <h2 className="mb-2 font-extrabold">Phiếu lương của tôi — {myName}</h2>
        {slips.length === 0 && <p className="text-sm text-slate-400">Chưa có phiếu lương nào.</p>}
        {slips.map((s) => <SlipCard key={s.id} s={s} />)}
      </div>
    </div>
  );
}
function SlipCard({ s }: { s: Slip }) {
  return (
    <div className="mb-2 rounded-xl border border-slate-100 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono font-bold">{s.code}</span>
        <span className="font-bold">kỳ {s.period}</span>
        <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${s.status === 'PAID' ? 'bg-green-100 text-green-700' : s.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
          {SLIP_VI[s.status]}</span>
        <span className="ml-auto text-lg font-extrabold text-pink-700">{fmtVND(s.total)}đ</span>
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Công {Number(s.workDays)}/{s.standardDays} → {fmtVND(s.salaryByDays)}đ
        {s.allowance > 0 && <> · phụ cấp {fmtVND(s.allowance)}đ</>}
        {s.commission > 0 && <> · hoa hồng {fmtVND(s.commission)}đ</>}
        {s.bonus > 0 && <> · thưởng {fmtVND(s.bonus)}đ</>}
        {s.penalty > 0 && <> · phạt −{fmtVND(s.penalty)}đ</>}
        {s.advance > 0 && <> · tạm ứng −{fmtVND(s.advance)}đ</>}
      </div>
    </div>
  );
}

/* ============================ NHAN SU ============================ */
function StaffTab({ canManage }: { canManage: boolean }) {
  type Row = { id: number; username: string; name: string; active: boolean; role: { name: string };
    profile: { position: string | null; baseSalary: number; allowance: number; bankAccount: string | null } | null };
  const [rows, setRows] = useState<Row[]>([]);
  const [edit, setEdit] = useState<{ userId: number; name: string; position: string;
    baseSalary: number; allowance: number; bankAccount: string } | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch('/api/hr/staff')).json();
    if (j.ok) setRows(j.rows);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function save() {
    if (!edit) return;
    setErr('');
    const res = await fetch('/api/hr/staff', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    setEdit(null); load();
  }
  return (
    <div className="card overflow-x-auto">
      <table className="w-full">
        <thead><tr>{['Nhân viên', 'Vai trò', 'Vị trí', 'Lương cơ bản', 'Phụ cấp', 'STK', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id} className={r.active ? '' : 'opacity-50'}>
            <td className="td font-bold">{r.name} <span className="text-xs text-slate-400">@{r.username}</span></td>
            <td className="td">{r.role.name}</td>
            <td className="td">{r.profile?.position ?? '—'}</td>
            <td className="td text-right font-bold">{r.profile ? fmtVND(r.profile.baseSalary) + 'đ' : '—'}</td>
            <td className="td text-right">{r.profile ? fmtVND(r.profile.allowance) + 'đ' : '—'}</td>
            <td className="td font-mono text-xs">{r.profile?.bankAccount ?? '—'}</td>
            <td className="td">{canManage && <button className="btn-ghost" onClick={() => setEdit({
              userId: r.id, name: r.name, position: r.profile?.position ?? '',
              baseSalary: r.profile?.baseSalary ?? 0, allowance: r.profile?.allowance ?? 0,
              bankAccount: r.profile?.bankAccount ?? '' })}>✏️</button>}</td>
          </tr>))}
        </tbody>
      </table>
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <div className="card w-full max-w-sm p-5">
            <h2 className="mb-3 font-extrabold">Hồ sơ — {edit.name}</h2>
            <label className="lbl">Vị trí</label>
            <input className="inp mb-2" value={edit.position} onChange={(e) => setEdit({ ...edit, position: e.target.value })} />
            <label className="lbl">Lương cơ bản (VND/tháng)</label>
            <input className="inp mb-2" inputMode="numeric" value={edit.baseSalary || ''}
              onChange={(e) => setEdit({ ...edit, baseSalary: +e.target.value.replace(/\D/g, '') || 0 })} />
            <label className="lbl">Phụ cấp (VND/tháng)</label>
            <input className="inp mb-2" inputMode="numeric" value={edit.allowance || ''}
              onChange={(e) => setEdit({ ...edit, allowance: +e.target.value.replace(/\D/g, '') || 0 })} />
            <label className="lbl">Số tài khoản</label>
            <input className="inp mb-3" value={edit.bankAccount} onChange={(e) => setEdit({ ...edit, bankAccount: e.target.value })} />
            {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEdit(null)}>Hủy</button>
              <button className="btn" onClick={save}>💾 Lưu</button>
            </div>
          </div>
        </div>)}
    </div>
  );
}

/* ============================ CHAM CONG ============================ */
function TimesheetTab({ canManage }: { canManage: boolean }) {
  const [period, setPeriod] = useState(nowPeriod());
  const [data, setData] = useState<{ users: UserOpt[]; rows: { userId: number; date: string; day: number }[] } | null>(null);
  const load = useCallback(async () => {
    const j = await (await fetch(`/api/hr/timesheet?period=${period}`)).json();
    if (j.ok) setData(j);
  }, [period]);
  useEffect(() => { load(); }, [load]);
  const days = (() => {
    const [y, m] = period.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  })();
  const val = (uId: number, d: number) => {
    const date = `${period}-${String(d).padStart(2, '0')}`;
    return data?.rows.find((r) => r.userId === uId && r.date === date)?.day;
  };
  async function cycle(uId: number, d: number) {
    if (!canManage) return;
    const cur = val(uId, d);
    const next = cur === undefined ? 1 : cur === 1 ? 0.5 : cur === 0.5 ? 0 : 1;
    await fetch('/api/hr/timesheet', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uId, date: `${period}-${String(d).padStart(2, '0')}`, day: next }) });
    load();
  }
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <input className="inp w-36" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        <a className="btn-ghost ml-auto" href={`/api/hr/export?type=timesheet&period=${period}`}>⬇️ Xuất bảng công</a>
      </div>
      <p className="mb-2 text-xs text-slate-400">Bấm vào ô để chấm: 1 công → nửa công → nghỉ → xoay vòng. Mỗi lần sửa đều ghi nhật ký.</p>
      <div className="card overflow-x-auto">
        <table className="text-xs">
          <thead><tr><th className="th sticky left-0 bg-slate-50">Nhân viên</th>
            {Array.from({ length: days }, (_, i) => <th key={i} className="th px-1 text-center">{i + 1}</th>)}
            <th className="th text-center">Σ</th></tr></thead>
          <tbody>{data?.users.map((u) => {
            const total = data.rows.filter((r) => r.userId === u.id).reduce((a, r) => a + r.day, 0);
            return (
              <tr key={u.id}>
                <td className="td sticky left-0 whitespace-nowrap bg-white font-bold">{u.name}</td>
                {Array.from({ length: days }, (_, i) => {
                  const v = val(u.id, i + 1);
                  return (
                    <td key={i} className={`cursor-pointer border border-slate-100 px-1 text-center ${v === 1 ? 'bg-green-100 font-bold' : v === 0.5 ? 'bg-amber-100' : v === 0 ? 'bg-red-50 text-red-400' : ''}`}
                      onClick={() => cycle(u.id, i + 1)}>
                      {v === undefined ? '' : v === 0.5 ? '½' : v}</td>);
                })}
                <td className="td text-center font-extrabold">{total}</td>
              </tr>);
          })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================ KPI & HOA HONG ============================ */
function KpiTab({ canManage }: { canManage: boolean }) {
  const [period, setPeriod] = useState(nowPeriod());
  const [kpi, setKpi] = useState<{ userId: number; name: string; target: number; revenue: number;
    collected: number; pct: number | null }[]>([]);
  const [comm, setComm] = useState<{ rules: { version: number; basis: string; pct: string; createdByName: string }[];
    periods: { period: string; ruleVersion: number; pct: string; basis: string;
      lines: { userId: number; name: string; base: number; amount: number }[] }[] } | null>(null);
  const [rule, setRule] = useState({ basis: 'REVENUE', pct: 5 });
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const [k, c] = await Promise.all([
      (await fetch(`/api/hr/kpi?period=${period}`)).json(),
      (await fetch('/api/hr/commission')).json()]);
    if (k.ok) setKpi(k.rows);
    if (c.ok) setComm(c);
  }, [period]);
  useEffect(() => { load(); }, [load]);
  async function setTarget(userId: number, target: number) {
    await fetch('/api/hr/kpi', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, period, targetRevenue: target }) });
    load();
  }
  async function post(body: Record<string, unknown>) {
    setErr(''); setMsg('');
    const res = await fetch('/api/hr/commission', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    setMsg('✅ Xong.'); load();
  }
  return (
    <div>
      <div className="mb-3"><input className="inp w-36" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 font-extrabold">🎯 KPI doanh thu kỳ {period}</h2>
          <p className="mb-2 text-xs text-slate-400">Thực tế lấy từ đơn hàng thật (đã xác nhận) — không nhập tay.</p>
          {kpi.map((r) => (
            <div key={r.userId} className="flex flex-wrap items-center gap-2 border-t border-slate-100 py-1.5 text-sm">
              <span className="w-32 font-bold">{r.name}</span>
              {canManage ? (
                <input className="inp w-32 text-right" inputMode="numeric" defaultValue={r.target || ''}
                  placeholder="chỉ tiêu…" onBlur={(e) => {
                    const v = +e.target.value.replace(/\D/g, '') || 0;
                    if (v !== r.target) setTarget(r.userId, v);
                  }} />
              ) : <span>{fmtVND(r.target)}đ</span>}
              <span className="ml-auto">bán <b>{fmtVND(r.revenue)}đ</b> · thu <b>{fmtVND(r.collected)}đ</b>
                {r.pct != null && <b className={`ml-1 ${r.pct >= 100 ? 'text-green-700' : 'text-amber-600'}`}>({r.pct}%)</b>}</span>
            </div>))}
        </div>
        <div className="card p-4">
          <h2 className="mb-2 font-extrabold">💎 Hoa hồng</h2>
          {canManage && (
            <div className="mb-2 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-2 text-sm">
              <div><label className="lbl">Căn cứ</label>
                <select className="inp w-auto" value={rule.basis} onChange={(e) => setRule({ ...rule, basis: e.target.value })}>
                  <option value="REVENUE">Doanh thu (đơn xác nhận)</option>
                  <option value="COLLECTED">Tiền đã thu</option>
                </select></div>
              <div><label className="lbl">%</label>
                <input className="inp w-16" inputMode="decimal" value={rule.pct}
                  onChange={(e) => setRule({ ...rule, pct: +e.target.value.replace(/[^\d.]/g, '') || 0 })} /></div>
              <button className="btn-ghost" onClick={() => post({ action: 'rule', basis: rule.basis, pct: rule.pct })}>＋ Quy tắc mới (phiên bản)</button>
              <button className="btn" onClick={() => post({ action: 'close', period })}>🔒 Chốt hoa hồng kỳ {period}</button>
            </div>)}
          {comm?.rules[0] && <p className="mb-1 text-xs text-slate-500">
            Quy tắc hiện hành: v{comm.rules[0].version} — {Number(comm.rules[0].pct)}% trên {comm.rules[0].basis === 'REVENUE' ? 'doanh thu' : 'tiền đã thu'}</p>}
          {msg && <p className="mb-1 text-sm font-semibold text-green-700">{msg}</p>}
          {err && <p className="mb-1 text-sm font-semibold text-red-600">{err}</p>}
          {comm?.periods.map((p) => (
            <div key={p.period} className="mt-1 rounded-xl border border-slate-100 p-2 text-sm">
              <div className="font-bold">🔒 Kỳ {p.period} — v{p.ruleVersion} ({Number(p.pct)}%)</div>
              {p.lines.map((l) => (
                <div key={l.userId} className="flex justify-between text-xs">
                  <span>{l.name}</span>
                  <span>{fmtVND(l.base)}đ → <b className="text-pink-700">{fmtVND(l.amount)}đ</b></span>
                </div>))}
              {p.lines.length === 0 && <p className="text-xs text-slate-400">Không có doanh số trong kỳ.</p>}
            </div>))}
        </div>
      </div>
    </div>
  );
}

/* ============================ LUONG ============================ */
function PayrollTab({ canManage }: { canManage: boolean }) {
  const [period, setPeriod] = useState(nowPeriod());
  const [rows, setRows] = useState<Slip[]>([]);
  const [accounts, setAccounts] = useState<{ id: number; name: string; kind: string }[]>([]);
  const [edit, setEdit] = useState<Slip | null>(null);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const j = await (await fetch(`/api/hr/payroll?period=${period}`)).json();
    if (j.ok) setRows(j.rows);
    const a = await (await fetch('/api/finance/accounts')).json().catch(() => ({ ok: false }));
    if (a.ok) setAccounts(a.accounts.filter((x: { kind: string }) => x.kind !== 'COD'));
  }, [period]);
  useEffect(() => { load(); }, [load]);
  async function act(body: Record<string, unknown>) {
    setErr(''); setMsg('');
    const res = await fetch('/api/hr/payroll', {
      method: body.period ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json();
    if (!j.ok) { setErr(j.error || 'Lỗi'); return; }
    if (j.created !== undefined) setMsg(`✅ Sinh ${j.created} phiếu (bỏ qua ${j.skipped} đã có).`);
    if (j.pcCode) setMsg(`✅ Đã chi lương — phiếu chi ${j.pcCode} liên kết.`);
    load();
  }
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="inp w-36" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        {canManage && <button className="btn" onClick={() => act({ period })}>⚙️ Sinh phiếu lương kỳ này</button>}
        <a className="btn-ghost ml-auto" href={`/api/hr/export?type=payroll&period=${period}`}>⬇️ Xuất bảng lương</a>
      </div>
      {msg && <p className="mb-2 text-sm font-semibold text-green-700">{msg}</p>}
      {err && <p className="mb-2 text-sm font-semibold text-red-600">{err}</p>}
      {rows.length === 0 && <div className="card p-6 text-center text-slate-500">Chưa có phiếu lương kỳ này — bấm “Sinh phiếu lương”.</div>}
      {rows.map((s) => (
        <div key={s.id} className="card mb-2 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-bold">{s.code}</span>
            <span className="font-bold">{s.name}</span>
            <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${s.status === 'PAID' ? 'bg-green-100 text-green-700' : s.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
              {SLIP_VI[s.status]}</span>
            <span className="ml-auto font-extrabold text-pink-700">{fmtVND(s.total)}đ</span>
            {canManage && s.status === 'DRAFT' && <>
              <button className="btn-ghost" onClick={() => setEdit(s)}>✏️ Thưởng/phạt/ứng</button>
              <button className="btn-ghost text-green-700" onClick={() => act({ action: 'approve', id: s.id })}>✓ Duyệt</button>
            </>}
            {canManage && s.status === 'APPROVED' && accounts[0] && (
              <button className="btn" onClick={() => act({ action: 'pay', id: s.id, accountId: accounts[0].id })}>💸 Chi lương</button>)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Công {Number(s.workDays)}/{s.standardDays} → {fmtVND(s.salaryByDays)}đ · phụ cấp {fmtVND(s.allowance)}đ
            · hoa hồng {fmtVND(s.commission)}đ · thưởng {fmtVND(s.bonus)}đ · phạt {fmtVND(s.penalty)}đ · ứng {fmtVND(s.advance)}đ
          </div>
        </div>))}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <div className="card w-full max-w-sm p-5">
            <h2 className="mb-3 font-extrabold">{edit.code} — {edit.name}</h2>
            {(['bonus', 'penalty', 'advance'] as const).map((k) => (
              <div key={k}><label className="lbl">{k === 'bonus' ? 'Thưởng' : k === 'penalty' ? 'Phạt' : 'Tạm ứng đã nhận'} (VND)</label>
                <input className="inp mb-2" inputMode="numeric" value={edit[k] || ''}
                  onChange={(e) => setEdit({ ...edit, [k]: +e.target.value.replace(/\D/g, '') || 0 })} /></div>))}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEdit(null)}>Hủy</button>
              <button className="btn" onClick={async () => {
                await act({ action: 'update', id: edit.id, bonus: edit.bonus, penalty: edit.penalty, advance: edit.advance });
                setEdit(null);
              }}>💾 Lưu</button>
            </div>
          </div>
        </div>)}
    </div>
  );
}
