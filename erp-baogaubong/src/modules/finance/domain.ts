// Logic thuan phan he Tai chinh — unit-test duoc, khong cham DB.
// Nguyen tac: so du KHONG BAO GIO nhap tay — luon = dau ky + tong chung tu da duyet.

export type TxLike = { kind: string; status: string; amount: number };

/** Dau cua chung tu doi voi quy: thu/chuyen den +, chi/chuyen di/hoan tien -. */
export function signOf(kind: string): 1 | -1 {
  switch (kind) {
    case 'RECEIPT':
    case 'TRANSFER_IN': return 1;
    case 'PAYMENT':
    case 'TRANSFER_OUT':
    case 'REFUND': return -1;
    default: throw new Error(`Loại chứng từ không hợp lệ: ${kind}`);
  }
}

/** So du quy = dau ky + tong chung tu DA DUYET (PENDING/REJECTED khong tinh). */
export function balanceOf(opening: number, txs: TxLike[]): number {
  return txs.reduce((a, t) => t.status === 'APPROVED' ? a + signOf(t.kind) * t.amount : a, opening);
}

/** Ky so cua 1 thoi diem theo gio Viet Nam: 'YYYY-MM'. */
export function periodOf(d: Date): string {
  const vn = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  return `${vn.getFullYear()}-${String(vn.getMonth() + 1).padStart(2, '0')}`;
}

/** Han thanh toan = ngay tao don + so ngay duoc no. */
export function dueDateOf(orderCreatedAt: Date, creditDays: number): Date {
  const d = new Date(orderCreatedAt);
  d.setDate(d.getDate() + Math.max(0, creditDays));
  return d;
}

export type AgingBucket = 'not_due' | 'd1_7' | 'd8_30' | 'd31_60' | 'd60_plus';
export const AGING_VI: Record<AgingBucket, string> = {
  not_due: 'Chưa đến hạn', d1_7: 'Quá hạn 1-7 ngày', d8_30: 'Quá hạn 8-30 ngày',
  d31_60: 'Quá hạn 31-60 ngày', d60_plus: 'Quá hạn >60 ngày' };

/** Xep no vao gio tuoi no theo so ngay qua han. */
export function agingBucket(dueDate: Date, now: Date): AgingBucket {
  const days = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);
  if (days <= 0) return 'not_due';
  if (days <= 7) return 'd1_7';
  if (days <= 30) return 'd8_30';
  if (days <= 60) return 'd31_60';
  return 'd60_plus';
}

/** Kiem tra ky da khoa chua truoc khi ghi chung tu. */
export function assertPeriodOpen(lockedPeriods: Set<string>, happenedAt: Date): void {
  const p = periodOf(happenedAt);
  if (lockedPeriods.has(p)) {
    throw new Error(`Kỳ ${p} đã khóa sổ — không ghi/sửa chứng từ được. Cần mở khóa (có lý do) trước.`);
  }
}

/** Kiem tra so tien hoan: khong vuot phan con lai cua phieu thu goc. */
export function assertRefundable(originalAmount: number, alreadyRefunded: number, refundAmount: number): void {
  if (refundAmount <= 0) throw new Error('Số tiền hoàn phải > 0.');
  if (alreadyRefunded + refundAmount > originalAmount) {
    throw new Error(`Tổng hoàn (${(alreadyRefunded + refundAmount).toLocaleString('vi-VN')}đ) vượt số đã thu gốc (${originalAmount.toLocaleString('vi-VN')}đ).`);
  }
}
