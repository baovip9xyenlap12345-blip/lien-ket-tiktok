import { describe, it, expect } from 'vitest';
import { progressPct, isLate, assertQcQty, materialCost, receiptableQty, assertStage } from './domain';

describe('assertStage / progressPct', () => {
  it('cong doan sai bao loi', () => {
    expect(() => assertStage('XX')).toThrow();
    expect(() => assertStage('SEW')).not.toThrow();
  });
  it('tien do theo cong doan sau cung co san luong', () => {
    expect(progressPct(100, { CUT: 80, SEW: 50 })).toBe(50);
    expect(progressPct(100, { CUT: 80, SEW: 50, PACK: 20 })).toBe(20);
    expect(progressPct(100, {})).toBe(0);
    expect(progressPct(100, { PACK: 120 })).toBe(100); // khong vuot 100
    expect(progressPct(0, { PACK: 5 })).toBe(0);
  });
});

describe('isLate — canh bao cham tien do', () => {
  const due = new Date('2026-07-20');
  it('qua han + chua xong → cham', () => {
    expect(isLate(due, 'IN_PROGRESS', new Date('2026-07-23'))).toBe(true);
    expect(isLate(due, 'RELEASED', new Date('2026-07-19'))).toBe(false);
    expect(isLate(due, 'DONE', new Date('2026-07-23'))).toBe(false);
    expect(isLate(null, 'IN_PROGRESS', new Date())).toBe(false);
  });
});

describe('assertQcQty — so QC phai khop', () => {
  it('dat + loi + hong = so kiem', () => {
    expect(() => assertQcQty({ inspected: 10, pass: 8, fail: 1, scrap: 1 })).not.toThrow();
    expect(() => assertQcQty({ inspected: 10, pass: 8, fail: 1, scrap: 0 })).toThrow('phải bằng số kiểm');
    expect(() => assertQcQty({ inspected: 10, pass: -1, fail: 11, scrap: 0 })).toThrow('không được âm');
  });
});

describe('materialCost / receiptableQty', () => {
  it('chi phi = tong dinh muc x gia von (lam tron)', () => {
    expect(materialCost([
      { qtyNeeded: 1.26, costPrice: 45000 },  // 56.700
      { qtyNeeded: 0.84, costPrice: 60000 },  // 50.400
      { qtyNeeded: 2.1, costPrice: 1500 },    // 3.150
    ])).toBe(110250);
  });
  it('nhap thanh pham dung 1 lan, chi so dat', () => {
    expect(receiptableQty(8, false)).toBe(8);
    expect(() => receiptableQty(8, true)).toThrow('đã nhập thành phẩm rồi');
    expect(() => receiptableQty(0, false)).toThrow('Chưa có sản phẩm nào QC đạt');
  });
});
