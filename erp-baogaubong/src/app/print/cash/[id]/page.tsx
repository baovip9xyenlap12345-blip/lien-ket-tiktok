import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtVND, fmtDate } from '@/lib/format';
import { signOf } from '@/modules/finance/domain';
import PrintBtn from '../../PrintBtn';

const KIND_VI: Record<string, string> = { RECEIPT: 'PHIẾU THU', PAYMENT: 'PHIẾU CHI',
  TRANSFER_IN: 'PHIẾU CHUYỂN QUỸ (ĐẾN)', TRANSFER_OUT: 'PHIẾU CHUYỂN QUỸ (ĐI)', REFUND: 'PHIẾU HOÀN TIỀN' };

export default async function PrintCash({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user?.perms.includes('finance.view')) return <p className="p-8">Cần đăng nhập và quyền tài chính.</p>;
  const t = await prisma.cashTransaction.findUnique({ where: { id: Number(params.id) },
    include: { account: true, refundOf: { select: { code: true } } } });
  if (!t) return <p className="p-8">Không tìm thấy chứng từ.</p>;
  const co = await prisma.company.findFirst();
  return (
    <div className="mx-auto max-w-[148mm] p-8 text-sm">
      <PrintBtn />
      <div className="flex items-start justify-between border-b-2 border-pink-700 pb-3">
        <div>
          <div className="text-lg font-extrabold text-pink-700">🧸 {co?.name ?? ''}</div>
          <div className="text-xs">{co?.address}</div>
          <div className="text-xs">ĐT: {co?.phone}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold">{KIND_VI[t.kind] ?? t.kind}</div>
          <div className="font-mono">{t.code}</div>
          <div>Ngày: {fmtDate(t.happenedAt)}</div>
        </div>
      </div>
      {t.status !== 'APPROVED' && (
        <p className="mt-2 rounded bg-amber-100 p-2 text-center font-bold text-amber-700">
          {t.status === 'PENDING' ? '⏳ CHỜ DUYỆT — chưa tính vào sổ quỹ' : '✕ ĐÃ TỪ CHỐI'}</p>)}
      <div className="mt-4 space-y-1.5">
        <Row k="Quỹ" v={`${t.account.name} (${t.account.code})`} />
        {t.partnerName && <Row k={signOf(t.kind) > 0 ? 'Người nộp' : 'Người nhận'} v={t.partnerName} />}
        <Row k="Lý do" v={t.reason ?? '—'} />
        {t.refundOf && <Row k="Hoàn cho phiếu" v={t.refundOf.code} />}
        {t.note && <Row k="Ghi chú" v={t.note} />}
        <div className="mt-2 flex justify-between border-t-2 border-pink-700 pt-2 text-lg font-extrabold">
          <span>SỐ TIỀN</span>
          <span>{signOf(t.kind) > 0 ? '+' : '−'}{fmtVND(t.amount)}đ</span>
        </div>
      </div>
      <div className="mt-10 grid grid-cols-3 text-center text-xs">
        <div><b>Người lập</b><br />(Ký, họ tên)<div className="mt-10">{t.createdByName}</div></div>
        <div><b>{signOf(t.kind) > 0 ? 'Người nộp tiền' : 'Người nhận tiền'}</b><br />(Ký, họ tên)</div>
        <div><b>Thủ quỹ</b><br />(Ký, họ tên)</div>
      </div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex gap-3"><span className="w-28 shrink-0 text-slate-500">{k}</span><b>{v}</b></div>;
}
