import { describe, it, expect } from 'vitest';
import { signOf, balanceOf, periodOf, dueDateOf, agingBucket, assertPeriodOpen, assertRefundable } from './domain';

describe('signOf / balanceOf — so du tu chung tu', () => {
  it('thu + chuyen den la +; chi/chuyen di/hoan la -', () => {
    expect(signOf('RECEIPT')).toBe(1);
    expect(signOf('TRANSFER_IN')).toBe(1);
    expect(signOf('PAYMENT')).toBe(-1);
    expect(signOf('TRANSFER_OUT')).toBe(-1);
    expect(signOf('REFUND')).toBe(-1);
    expect(() => signOf('XXX')).toThrow();
  });
  it('so du = dau ky + chung tu DA DUYET; PENDING khong tinh', () => {
    const txs = [
      { kind: 'RECEIPT', status: 'APPROVED', amount: 500000 },
      { kind: 'PAYMENT', status: 'APPROVED', amount: 200000 },
      { kind: 'PAYMENT', status: 'PENDING', amount: 999999 },
      { kind: 'REFUND', status: 'APPROVED', amount: 50000 },
      { kind: 'PAYMENT', status: 'REJECTED', amount: 888888 },
    ];
    expect(balanceOf(1000000, txs)).toBe(1000000 + 500000 - 200000 - 50000);
  });
});

describe('periodOf — ky so gio VN', () => {
  it('dung thang theo Asia/Ho_Chi_Minh (23h59 UTC 31/1 = 06h59 1/2 VN)', () => {
    expect(periodOf(new Date('2026-07-15T10:00:00Z'))).toBe('2026-07');
    expect(periodOf(new Date('2026-01-31T23:59:00Z'))).toBe('2026-02');
    expect(periodOf(new Date('2026-01-31T10:00:00Z'))).toBe('2026-01');
  });
});

describe('dueDateOf / agingBucket — tuoi no', () => {
  const created = new Date('2026-07-01T03:00:00Z');
  it('han = ngay tao + so ngay no', () => {
    expect(dueDateOf(created, 15).toISOString().slice(0, 10)).toBe('2026-07-16');
    expect(dueDateOf(created, 0).toISOString().slice(0, 10)).toBe('2026-07-01');
  });
  it('gio tuoi no dung bien', () => {
    const due = new Date('2026-07-10T00:00:00Z');
    const day = (n: number) => new Date(due.getTime() + n * 86400000);
    expect(agingBucket(due, day(0))).toBe('not_due');
    expect(agingBucket(due, day(1))).toBe('d1_7');
    expect(agingBucket(due, day(7))).toBe('d1_7');
    expect(agingBucket(due, day(8))).toBe('d8_30');
    expect(agingBucket(due, day(30))).toBe('d8_30');
    expect(agingBucket(due, day(31))).toBe('d31_60');
    expect(agingBucket(due, day(61))).toBe('d60_plus');
  });
});

describe('khoa ky & hoan tien', () => {
  it('ky khoa thi chan ghi, ky mo thi cho', () => {
    const locked = new Set(['2026-06']);
    expect(() => assertPeriodOpen(locked, new Date('2026-06-15T10:00:00Z'))).toThrow('đã khóa sổ');
    expect(() => assertPeriodOpen(locked, new Date('2026-07-15T10:00:00Z'))).not.toThrow();
  });
  it('hoan tien khong vuot goc (ke ca hoan nhieu lan)', () => {
    expect(() => assertRefundable(500000, 0, 200000)).not.toThrow();
    expect(() => assertRefundable(500000, 400000, 100000)).not.toThrow();
    expect(() => assertRefundable(500000, 400000, 100001)).toThrow('vượt số đã thu gốc');
    expect(() => assertRefundable(500000, 0, 0)).toThrow();
  });
});
