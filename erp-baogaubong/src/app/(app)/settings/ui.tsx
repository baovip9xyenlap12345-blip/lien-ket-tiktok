'use client';
import { useState } from 'react';

type C = { name: string; taxCode: string; address: string; phone: string; web: string };
type S = { vat_percent: number; doc_prefix: string; session_idle_min: number; max_discount_pct: number };

// O nhap dinh nghia o MODULE (ngoai component) — giu on dinh, khong bi "dung lai" moi lan go → khong mat con tro.
function F({ label, v, set }: { label: string; v: string; set: (x: string) => void }) {
  return <div><label className="lbl">{label}</label><input className="inp" value={v} onChange={(e) => set(e.target.value)} /></div>;
}

export default function SettingsClient({ company, settings }: { company: C; settings: S }) {
  const [c, setC] = useState(company); const [s, setS] = useState(settings); const [msg, setMsg] = useState('');
  async function save() {
    const res = await fetch('/api/settings', { method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: c, settings: s }) });
    const j = await res.json(); setMsg(j.ok ? '✅ Đã lưu cài đặt' : j.error);
  }
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-extrabold">Cài đặt hệ thống</h1>
      <div className="card space-y-3 p-4">
        <h2 className="font-bold">Thông tin công ty (in trên chứng từ)</h2>
        <F label="Tên công ty" v={c.name} set={(x) => setC({ ...c, name: x })} />
        <div className="grid grid-cols-2 gap-3">
          <F label="Mã số thuế" v={c.taxCode} set={(x) => setC({ ...c, taxCode: x })} />
          <F label="Điện thoại" v={c.phone} set={(x) => setC({ ...c, phone: x })} />
        </div>
        <F label="Địa chỉ" v={c.address} set={(x) => setC({ ...c, address: x })} />
        <F label="Website" v={c.web} set={(x) => setC({ ...c, web: x })} />
      </div>
      <div className="card mt-4 space-y-3 p-4">
        <h2 className="font-bold">Thông số nghiệp vụ</h2>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="lbl">VAT mặc định (%)</label>
            <input className="inp" type="number" value={s.vat_percent} onChange={(e) => setS({ ...s, vat_percent: +e.target.value })} /></div>
          <div><label className="lbl">Tiền tố chứng từ</label>
            <input className="inp" value={s.doc_prefix} onChange={(e) => setS({ ...s, doc_prefix: e.target.value.toUpperCase() })} /></div>
          <div><label className="lbl">Tự đăng xuất sau (phút)</label>
            <input className="inp" type="number" value={s.session_idle_min} onChange={(e) => setS({ ...s, session_idle_min: +e.target.value })} /></div>
          <div><label className="lbl">Chiết khấu tối đa của NV (%)</label>
            <input className="inp" type="number" value={s.max_discount_pct} onChange={(e) => setS({ ...s, max_discount_pct: +e.target.value })} /></div>
        </div>
        <p className="text-xs text-slate-400">Múi giờ nghiệp vụ: Asia/Ho_Chi_Minh · Tiền tệ: VND (số nguyên) · Ngày: dd/MM/yyyy</p>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn" onClick={save}>💾 Lưu cài đặt</button>
        {msg && <span className="text-sm font-semibold">{msg}</span>}
      </div>
    </div>
  );
}
