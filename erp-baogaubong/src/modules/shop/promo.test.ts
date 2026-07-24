import { describe, it, expect } from 'vitest';
import { promoDiscount, promoLabel } from './promo';

describe('promoDiscount', () => {
  it('giam so tien co dinh khi du don toi thieu', () => {
    expect(promoDiscount({ type: 'AMOUNT', value: 10000, minOrder: 200000, maxDiscount: null }, 250000)).toBe(10000);
  });
  it('khong giam khi chua du don toi thieu', () => {
    expect(promoDiscount({ type: 'AMOUNT', value: 10000, minOrder: 200000, maxDiscount: null }, 150000)).toBe(0);
  });
  it('giam theo phan tram', () => {
    expect(promoDiscount({ type: 'PERCENT', value: 10, minOrder: 0, maxDiscount: null }, 300000)).toBe(30000);
  });
  it('ap tran giam toi da cho phan tram', () => {
    expect(promoDiscount({ type: 'PERCENT', value: 50, minOrder: 0, maxDiscount: 50000 }, 300000)).toBe(50000);
  });
  it('khong bao gio giam qua tong don', () => {
    expect(promoDiscount({ type: 'AMOUNT', value: 999999, minOrder: 0, maxDiscount: null }, 100000)).toBe(100000);
  });
  it('don rong -> 0', () => {
    expect(promoDiscount({ type: 'PERCENT', value: 10, minOrder: 0, maxDiscount: null }, 0)).toBe(0);
  });
});

describe('promoLabel', () => {
  it('mo ta giam tien + don toi thieu', () => {
    expect(promoLabel({ type: 'AMOUNT', value: 10000, minOrder: 200000, maxDiscount: null })).toBe('Giảm 10k · đơn từ 200k');
  });
  it('mo ta giam % co tran', () => {
    expect(promoLabel({ type: 'PERCENT', value: 10, minOrder: 0, maxDiscount: 50000 })).toBe('Giảm 10% (tối đa 50k)');
  });
});
