import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { inScope } from '@/lib/scope';
import { fmtVND, fmtDate } from '@/lib/format';
import PrintBtn from '../../PrintBtn';

export default async function PrintQuote({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user?.perms.includes('sales.view')) return <p className="p-8">Cần đăng nhập.</p>;
  const q = await prisma.quote.findFirst({ where: { id: Number(params.id), deletedAt: null },
    include: { lines: true } });
  if (!q || !inScope(user, q)) return <p className="p-8">Không tìm thấy báo giá trong phạm vi của bạn.</p>;
  const co = await prisma.company.findFirst();
  return (
    <div className="mx-auto max-w-[210mm] p-8 text-sm">
      <PrintBtn />
      <div className="flex items-start justify-between border-b-2 border-pink-700 pb-3">
        <div>
          <div className="text-xl font-extrabold text-pink-700">🧸 {co?.name ?? ''}</div>
          <div>{co?.address}</div>
          <div>ĐT: {co?.phone} · {co?.web}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold">BÁO GIÁ</div>
          <div className="font-mono">{q.code} · bản {q.version}</div>
          <div>Ngày: {fmtDate(q.createdAt)}</div>
          {q.validUntil && <div>Hiệu lực đến: {fmtDate(q.validUntil)}</div>}
        </div>
      </div>
      <div className="mt-3"><b>Khách hàng:</b> {q.partnerName}</div>
      <table className="mt-3 w-full border-collapse">
        <thead><tr className="bg-pink-50">
          {['#', 'Sản phẩm', 'ĐVT', 'SL', 'Đơn giá', 'CK%', 'Thành tiền'].map((h) => (
            <th key={h} className="border border-slate-300 px-2 py-1.5 text-left">{h}</th>))}
        </tr></thead>
        <tbody>{q.lines.map((l, i) => (
          <tr key={l.id}>
            <td className="border border-slate-300 px-2 py-1">{i + 1}</td>
            <td className="border border-slate-300 px-2 py-1">{l.name}<div className="font-mono text-xs text-slate-500">{l.sku}</div></td>
            <td className="border border-slate-300 px-2 py-1">{l.unit}</td>
            <td className="border border-slate-300 px-2 py-1 text-right">{l.qty}</td>
            <td className="border border-slate-300 px-2 py-1 text-right">{fmtVND(l.unitPrice)}</td>
            <td className="border border-slate-300 px-2 py-1 text-right">{Number(l.discountPct) || ''}</td>
            <td className="border border-slate-300 px-2 py-1 text-right font-semibold">{fmtVND(l.lineTotal)}</td>
          </tr>))}
        </tbody>
      </table>
      <div className="mt-3 ml-auto w-72">
        <Row k="Tiền hàng" v={q.subtotal} />
        {q.discountAmt > 0 && <Row k="Chiết khấu" v={-q.discountAmt} />}
        {q.vatEnabled && <Row k={`VAT ${q.vatPercent}%`} v={q.taxAmt} />}
        {q.otherFee > 0 && <Row k="Phí khác" v={q.otherFee} />}
        {q.shippingFee > 0 && <Row k="Vận chuyển" v={q.shippingFee} />}
        <div className="mt-1 flex justify-between border-t-2 border-pink-700 pt-1 text-base font-extrabold">
          <span>TỔNG CỘNG</span><span>{fmtVND(q.total)}đ</span>
        </div>
      </div>
      {q.note && <p className="mt-3 text-xs"><b>Ghi chú:</b> {q.note}</p>}
      <div className="mt-8 grid grid-cols-2 text-center text-xs">
        <div><b>Khách hàng</b><br />(Ký, ghi rõ họ tên)</div>
        <div><b>Người báo giá</b><br />(Ký, ghi rõ họ tên)</div>
      </div>
      <p className="mt-10 text-center text-xs text-slate-400">Cảm ơn quý khách đã quan tâm — {co?.web}</p>
    </div>
  );
}
function Row({ k, v }: { k: string; v: number }) {
  return <div className="flex justify-between py-0.5"><span>{k}</span><span>{fmtVND(v)}đ</span></div>;
}
