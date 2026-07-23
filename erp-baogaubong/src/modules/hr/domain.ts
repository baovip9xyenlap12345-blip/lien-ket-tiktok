// Logic thuan phan he Nhan su/Luong — unit-test duoc, khong cham DB.
// LUU Y: quan tri noi bo — KHONG phai he thong ke khai luong/thue phap ly.

/** Hoa hong = can cu x %, lam tron VND. */
export function commissionOf(base: number, pct: number): number {
  if (base <= 0 || pct <= 0) return 0;
  return Math.round(base * pct / 100);
}

export type SalaryInput = {
  baseSalary: number;    // luong co ban thang
  workDays: number;      // so cong thuc te (0.5 = nua cong)
  standardDays: number;  // cong chuan thang (mac dinh 26)
  allowance: number;     // phu cap
  commission: number;    // hoa hong da chot
  bonus: number;         // thuong
  penalty: number;       // phat
  advance: number;       // tam ung da nhan
};

/** Luong theo ngay cong = round(co ban x cong / cong chuan). */
export function salaryByDays(baseSalary: number, workDays: number, standardDays: number): number {
  if (standardDays <= 0) throw new Error('Công chuẩn phải > 0.');
  if (workDays < 0) throw new Error('Số công không được âm.');
  return Math.round(baseSalary * workDays / standardDays);
}

/** Tong thuc linh. Am (tam ung/phat qua lon) van tra ve so am de ke toan thay va xu ly. */
export function payrollTotal(s: SalaryInput): { salaryByDays: number; total: number } {
  const byDays = salaryByDays(s.baseSalary, s.workDays, s.standardDays);
  const total = byDays + s.allowance + s.commission + s.bonus - s.penalty - s.advance;
  return { salaryByDays: byDays, total };
}

/** Gia tri cong hop le khi cham: 0, 0.5, 1. */
export function assertDayValue(day: number): void {
  if (![0, 0.5, 1].includes(day)) throw new Error('Công chỉ nhận 0, 0.5 hoặc 1.');
}
