import { describe, it, expect } from 'vitest';
import { commissionOf, salaryByDays, payrollTotal, assertDayValue } from './domain';

describe('commissionOf', () => {
  it('phan tram co ban + lam tron', () => {
    expect(commissionOf(10_000_000, 10)).toBe(1_000_000);
    expect(commissionOf(427_680, 5)).toBe(21_384);
    expect(commissionOf(333_333, 1.5)).toBe(5_000);   // 4999.995 → 5000
  });
  it('can cu 0 hoac % 0 → 0', () => {
    expect(commissionOf(0, 10)).toBe(0);
    expect(commissionOf(1_000_000, 0)).toBe(0);
  });
});

describe('salaryByDays / payrollTotal', () => {
  it('luong theo cong: 5tr co ban, 13/26 cong = 2.5tr', () => {
    expect(salaryByDays(5_000_000, 13, 26)).toBe(2_500_000);
    expect(salaryByDays(5_000_000, 26, 26)).toBe(5_000_000);
    expect(salaryByDays(7_000_000, 25.5, 26)).toBe(6_865_385); // lam tron
  });
  it('cong chuan 0 / cong am bao loi', () => {
    expect(() => salaryByDays(1, 1, 0)).toThrow();
    expect(() => salaryByDays(1, -1, 26)).toThrow();
  });
  it('tong thuc linh du cac khoan', () => {
    const r = payrollTotal({ baseSalary: 5_000_000, workDays: 26, standardDays: 26,
      allowance: 500_000, commission: 1_200_000, bonus: 300_000, penalty: 100_000, advance: 1_000_000 });
    expect(r.salaryByDays).toBe(5_000_000);
    expect(r.total).toBe(5_000_000 + 500_000 + 1_200_000 + 300_000 - 100_000 - 1_000_000);
  });
  it('tam ung qua lon → tong am (de ke toan thay, khong che giau)', () => {
    expect(payrollTotal({ baseSalary: 1_000_000, workDays: 26, standardDays: 26,
      allowance: 0, commission: 0, bonus: 0, penalty: 0, advance: 2_000_000 }).total).toBe(-1_000_000);
  });
});

describe('assertDayValue', () => {
  it('chi nhan 0 / 0.5 / 1', () => {
    expect(() => assertDayValue(1)).not.toThrow();
    expect(() => assertDayValue(0.5)).not.toThrow();
    expect(() => assertDayValue(0)).not.toThrow();
    expect(() => assertDayValue(0.75)).toThrow();
    expect(() => assertDayValue(2)).toThrow();
  });
});
