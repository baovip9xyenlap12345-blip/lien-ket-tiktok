import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { inScope } from '@/lib/scope';
import { fmtVND, fmtDate } from '@/lib/format';
import PrintBtn from '../../PrintBtn';

/** In don hang: mac dinh A4; ?k80=1 in phieu POS kho 80mm. */
export default async function PrintOrder({ params, searchParams }: {
  params: { id: string }; searchParams: { k80?: string } }) {
  const user = await getSessionUser();
  if (!user?.perms.includes('sales.view')) return <p className="p-8">Cần đăng nhập.</p>;
  const o = await prisma.salesOrder.findFirst({ where: { id: Number(params.id), deletedAt: null },
    include: { lines: true, payments: true, quote: { select: { code: true } } } });
  if (!o || !inScope(user, o)) return <p className="p-8">Không tìm thấy đơn trong phạm vi của bạn.</p>;
  const co = await prisma.company.findFirst();
  const k80 = searchParams.k80 === '1';

  if (k80) {
    return (
      <div className="mx-auto w-[80mm] p-2 font-mono text-[11px] leading-4">
        <PrintBtn />
        <div className="text-center">
          <div className="text-sm font-extrabold">{co?.name}</div>
          <div>{co?.address}</div>
          <div>ĐT: {co?.phone}</div>
          <div className="my-1 border-t border-dashed border-black" />
          <div className="font-extrabold">PHIẾU BÁN HÀNG</div>
          <div>{o.code} · {fmtDate(o.createdAt)}</div>
          <div>Khách: {o.partnerName}</div>
        </div>
        <div className="my-1 border-t border-dashed border-black" />
        {o.lines.map((l) => (
          <div key={l.id} className="mb-1">
            <div>{l.name}</div>
            <div className="flex justify-between">
              <span>{l.qty} x {fmtVND(l.unitPrice)}{Number(l.discountPct) ? ` (-${Number(l.discountPct)}%)` : ''}</span>
              <span>{fmtVND(l.lineTotal)}</span>
            </div>
          </div>))}
        <div className="my-1 border-t border-dashed border-black" />
        <div className="flex justify-between"><span>Tiền hàng</span><span>{fmtVND(o.subtotal)}</span></div>
        {o.discountAmt > 0 && <div className="flex justify-between"><span>Chiết khấu</span><span>-{fmtVND(o.discountAmt)}</span></div>}
        {o.vatEnabled && <div className="flex justify-between"><span>VAT {o.vatPercent}%</span><span>{fmtVND(o.taxAmt)}</span></div>}
        <div className="flex justify-between text-sm font-extrabold"><span>TỔNG</span><span>{fmtVND(o.total)}</span></div>
        <div className="flex justify-between"><span>Đã thu</span><span>{fmtVND(o.paidAmt)}</span></div>
        {o.total > o.paidAmt && <div className="flex justify-between font-bold"><span>CÒN NỢ</span><span>{fmtVND(o.total - o.paidAmt)}</span></div>}
        <div className="my-1 border-t border-dashed border-black" />
        <div className="text-center">Cảm ơn quý khách! · {co?.web}</div>
      </div>
    );
  }

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
          <div className="text-2xl font-extrabold">ĐƠN HÀNG</div>
          <div className="font-mono">{o.code}{o.quote ? ` · từ ${o.quote.code}` : ''}</div>
          <div>Ngày: {fmtDate(o.createdAt)}</div>
        </div>
      </div>
      <div className="mt-3"><b>Khách hàng:</b> {o.partnerName}</div>
      <table className="mt-3 w-full border-collapse">
        <thead><tr className="bg-pink-50">
          {['#', 'Sản phẩm', 'ĐVT', 'SL', 'Đơn giá', 'CK%', 'Thành tiền'].map((h) => (
            <th key={h} className="border border-slate-300 px-2 py-1.5 text-left">{h}</th>))}
        </tr></thead>
        <tbody>{o.lines.map((l, i) => (
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
        <Row k="Tiền hàng" v={o.subtotal} />
        {o.discountAmt > 0 && <Row k="Chiết khấu" v={-o.discountAmt} />}
        {o.vatEnabled && <Row k={`VAT ${o.vatPercent}%`} v={o.taxAmt} />}
        {o.otherFee > 0 && <Row k="Phí khác" v={o.otherFee} />}
        {o.shippingFee > 0 && <Row k="Vận chuyển" v={o.shippingFee} />}
        <div className="mt-1 flex justify-between border-t-2 border-pink-700 pt-1 text-base font-extrabold">
          <span>TỔNG CỘNG</span><span>{fmtVND(o.total)}đ</span>
        </div>
        <Row k="Đã thanh toán" v={o.paidAmt} />
        {o.total > o.paidAmt && (
          <div className="flex justify-between py-0.5 font-extrabold text-red-600">
            <span>Còn nợ</span><span>{fmtVND(o.total - o.paidAmt)}đ</span></div>)}
      </div>
      {o.note && <p className="mt-3 text-xs"><b>Ghi chú:</b> {o.note}</p>}
      <div className="mt-8 grid grid-cols-3 text-center text-xs">
        <div><b>Khách hàng</b><br />(Ký, ghi rõ họ tên)</div>
        <div><b>Người giao hàng</b><br />(Ký, ghi rõ họ tên)</div>
        <div><b>Người lập</b><br />(Ký, ghi rõ họ tên)</div>
      </div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: number }) {
  return <div className="flex justify-between py-0.5"><span>{k}</span><span>{fmtVND(v)}đ</span></div>;
}
