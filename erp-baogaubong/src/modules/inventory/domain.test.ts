import { describe, it, expect } from 'vitest';
import { directionOf, availableQty, shippableQty, assertShipQty, stocktakeDiffs, stockAlert } from './domain';

describe('directionOf — huong chung tu kho', () => {
  it('nhap/tra hang +1; xuat/ban/huy -1; kiem kho 0', () => {
    expect(directionOf('RECEIPT')).toBe(1);
    expect(directionOf('RETURN')).toBe(1);
    expect(directionOf('SALE')).toBe(-1);
    expect(directionOf('SCRAP')).toBe(-1);
    expect(directionOf('ADJUST')).toBe(0);
    expect(() => directionOf('XXX')).toThrow();
  });
});

describe('availableQty / shippableQty', () => {
  it('kha dung = ton - giu cho', () => {
    expect(availableQty(10, 3)).toBe(7);
    expect(availableQty(2, 5)).toBe(-3);
  });
  it('con duoc giao = dat - da giao, khong am', () => {
    expect(shippableQty(10, 4)).toBe(6);
    expect(shippableQty(10, 12)).toBe(0);
  });
});

describe('assertShipQty — giao khong vuot so duoc giao', () => {
  const lines = [{ sku: 'A', qty: 3, shippable: 2 }];
  it('vuot thi bao loi kem SKU', () => {
    expect(() => assertShipQty(lines, false)).toThrow('A: giao 3 vượt');
  });
  it('co quyen dac biet thi cho qua', () => {
    expect(() => assertShipQty(lines, true)).not.toThrow();
  });
  it('du thi qua', () => {
    expect(() => assertShipQty([{ sku: 'A', qty: 2, shippable: 2 }], false)).not.toThrow();
  });
});

describe('stocktakeDiffs — lech kiem kho', () => {
  it('thua +, thieu -, khop bo qua', () => {
    const out = stocktakeDiffs([
      { variantId: 1, systemQty: 10, countedQty: 12 },
      { variantId: 2, systemQty: 5, countedQty: 3 },
      { variantId: 3, systemQty: 7, countedQty: 7 },
    ]);
    expect(out).toEqual([{ variantId: 1, diff: 2 }, { variantId: 2, diff: -2 }]);
  });
});

describe('stockAlert — canh bao ton', () => {
  it('sap het khi <= min (min>0); vuot max; binh thuong null', () => {
    expect(stockAlert(2, 5, null)).toBe('low');
    expect(stockAlert(5, 5, null)).toBe('low');
    expect(stockAlert(6, 5, null)).toBeNull();
    expect(stockAlert(0, 0, null)).toBeNull();       // chua dat min → khong bao
    expect(stockAlert(100, 0, 50)).toBe('over');
  });
});
