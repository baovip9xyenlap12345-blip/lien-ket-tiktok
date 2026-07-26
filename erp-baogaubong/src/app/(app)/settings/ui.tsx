'use client';
import { useState } from 'react';

type C = { name: string; taxCode: string; address: string; phone: string; web: string };
type S = { vat_percent: number; doc_prefix: string; session_idle_min: number; max_discount_pct: number };
type B = { shopName: string; slogan: string; domain: string; phone: string;
  messengerLink: string; zaloLink: string; zaloGroupLink: string; logoUrl: string; address: string };

// O nhap dinh nghia o MODULE (ngoai component) — giu on dinh, khong bi "dung lai" moi lan go → khong mat con tro.
function F({ label, v, set, ph }: { label: string; v: string; set: (x: string) => void; ph?: string }) {
  return <div><label className="lbl">{label}</label><input className="inp" value={v} placeholder={ph} onChange={(e) => set(e.target.value)} /></div>;
}

export default function SettingsClient({ company, settings, branding }: { company: C; settings: S; branding: B }) {
  const [c, setC] = useState(company); const [s, setS] = useState(settings); const [msg, setMsg] = useState('');
  const [b, setB] = useState(branding);
  const [upBusy, setUpBusy] = useState(false);
  async function save() {
    const res = await fetch('/api/settings', { method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: c, settings: s, branding: b }) });
    const j = await res.json(); setMsg(j.ok ? '✅ Đã lưu cài đặt' : j.error);
  }
  async function uploadLogo(f: File | undefined) {
    if (!f) return;
    setUpBusy(true);
    const fd = new FormData(); fd.append('file', f);
    const j = await fetch('/api/catalog/media', { method: 'POST', body: fd }).then((r) => r.json()).catch(() => ({ ok: false }));
    setUpBusy(false);
    if (j.ok) setB({ ...b, logoUrl: j.key }); else alert(j.error || 'Tải logo lỗi');
  }
  const logoSrc = b.logoUrl
    ? (/^https?:\/\//.test(b.logoUrl) ? b.logoUrl : `/api/catalog/media/${encodeURIComponent(b.logoUrl)}`)
    : null;
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
      <div className="card mt-4 space-y-3 p-4">
        <h2 className="font-bold">🧸 Gian hàng online (thương hiệu)</h2>
        <p className="-mt-2 text-xs text-slate-400">Đổi ở đây là gian hàng đổi theo ngay — không cần sửa code. Dùng khi nhân bản app cho xưởng khác.</p>
        <div className="grid grid-cols-2 gap-3">
          <F label="Tên gian hàng" v={b.shopName} set={(x) => setB({ ...b, shopName: x })} ph="VD Xưởng Gấu Bảo" />
          <F label="Hotline" v={b.phone} set={(x) => setB({ ...b, phone: x })} ph="VD 0376533857" />
        </div>
        <F label="Câu giới thiệu (banner trang chủ)" v={b.slogan} set={(x) => setB({ ...b, slogan: x })} />
        <div className="grid grid-cols-2 gap-3">
          <F label="Tên miền (hiện ở chân trang)" v={b.domain} set={(x) => setB({ ...b, domain: x })} ph="VD muagaubong.com" />
          <F label="Địa chỉ xưởng (tùy chọn)" v={b.address} set={(x) => setB({ ...b, address: x })} />
        </div>
        <F label="Link Messenger (Facebook)" v={b.messengerLink} set={(x) => setB({ ...b, messengerLink: x })} ph="https://www.facebook.com/..." />
        <div className="grid grid-cols-2 gap-3">
          <F label="Link Zalo (nút liên hệ)" v={b.zaloLink} set={(x) => setB({ ...b, zaloLink: x })} ph="https://zalo.me/0376533857" />
          <F label="Link nhóm Zalo (sau khi đặt hàng)" v={b.zaloGroupLink} set={(x) => setB({ ...b, zaloGroupLink: x })} ph="https://zalo.me/g/..." />
        </div>
        <div>
          <label className="lbl">Logo (tùy chọn — chưa có thì dùng 🧸)</label>
          <div className="mt-1 flex items-center gap-3">
            {logoSrc
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoSrc} alt="logo" className="h-12 w-12 rounded-lg bg-white object-contain ring-1 ring-slate-200" />
              : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-pink-50 text-2xl">🧸</span>}
            <input type="file" accept="image/*" className="text-xs" disabled={upBusy}
              onChange={(e) => uploadLogo(e.target.files?.[0])} />
            {b.logoUrl && <button className="text-xs font-semibold text-red-600" onClick={() => setB({ ...b, logoUrl: '' })}>Xóa logo</button>}
            {upBusy && <span className="text-xs text-slate-400">Đang tải…</span>}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn" onClick={save}>💾 Lưu cài đặt</button>
        {msg && <span className="text-sm font-semibold">{msg}</span>}
      </div>
    </div>
  );
}
