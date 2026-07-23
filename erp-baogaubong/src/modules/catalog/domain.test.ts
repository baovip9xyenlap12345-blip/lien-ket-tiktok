import { describe, it, expect } from 'vitest';
import { pickTierPrice, isListValid, resolvePrice, convertQty, bomRequirement, makeSku, validateImportRow } from './domain';

describe('pickTierPrice — gia bac thang', () => {
  const rules = [{ minQty: 1, price: 100000 }, { minQty: 10, price: 90000 }, { minQty: 50, price: 80000 }];
  it('lay dung bac theo so luong', () => {
    expect(pickTierPrice(rules, 1)?.valueOf()).toBe(100000);
    expect(pickTierPrice(rules, 9)).toBe(100000);
    expect(pickTierPrice(rules, 10)).toBe(90000);
    expect(pickTierPrice(rules, 500)).toBe(80000);
  });
  it('khong co bac phu hop → null (khong bia gia 0)', () => {
    expect(pickTierPrice([{ minQty: 10, price: 90000 }], 5)).toBeNull();
  });
});

describe('resolvePrice — chon bang gia', () => {
  const lists = [
    { id: 1, kind: 'RETAIL', priority: 0, active: true, rules: [{ minQty: 1, price: 198000 }] },
    { id: 2, kind: 'WHOLESALE', priority: 10, active: true, rules: [{ minQty: 1, price: 120000 }] },
  ];
  it('mac dinh uu tien bang gia khong phai le co priority cao', () => {
    expect(resolvePrice({ lists, qty: 1 })).toEqual({ price: 120000, listId: 2 });
  });
  it('chi dinh bang gia le thi lay gia le', () => {
    expect(resolvePrice({ lists, preferListId: 1, qty: 1 })).toEqual({ price: 198000, listId: 1 });
  });
  it('bang gia het hieu luc bi bo qua', () => {
    const expired = [{ ...lists[1], validTo: new Date('2020-01-01') }, lists[0]];
    expect(resolvePrice({ lists: expired, qty: 1, date: new Date('2026-07-23') })).toEqual({ price: 198000, listId: 1 });
  });
  it('khong co gia nao → null', () => {
    expect(resolvePrice({ lists: [], qty: 1 })).toBeNull();
  });
  it('isListValid ton trong validFrom/validTo va active', () => {
    const l = { id: 3, kind: 'CUSTOM', priority: 5, active: true,
      validFrom: new Date('2026-01-01'), validTo: new Date('2026-12-31'), rules: [] };
    expect(isListValid(l, new Date('2026-06-01'))).toBe(true);
    expect(isListValid(l, new Date('2025-06-01'))).toBe(false);
    expect(isListValid({ ...l, active: false }, new Date('2026-06-01'))).toBe(false);
  });
});

describe('convertQty — quy doi don vi', () => {
  it('nhan dung he so', () => expect(convertQty(3, 10)).toBe(30));
  it('he so <= 0 bao loi', () => expect(() => convertQty(1, 0)).toThrow());
});

describe('bomRequirement — nhu cau nguyen lieu', () => {
  const items = [
    { materialVariantId: 1, qtyPerUnit: 1.2 },
    { materialVariantId: 2, qtyPerUnit: 0.8 },
  ];
  it('tinh du hao hut 5%', () => {
    const out = bomRequirement(items, 100, 5);
    expect(out[0].qtyNeeded).toBe(126);      // 1.2*100*1.05
    expect(out[1].qtyNeeded).toBe(84);       // 0.8*100*1.05
  });
  it('so luong 0 → rong; hao hut am coi nhu 0', () => {
    expect(bomRequirement(items, 0, 5)).toEqual([]);
    expect(bomRequirement(items, 10, -5)[0].qtyNeeded).toBe(12);
  });
});

describe('makeSku — sinh SKU bo dau', () => {
  it('bo dau tieng Viet, viet hoa, noi bang gach', () => {
    expect(makeSku('SP001', '1m2', null)).toBe('SP001-1M2');
    expect(makeSku('SP001', '80cm', 'hồng đậm')).toBe('SP001-80CM-HONGDA');
    expect(makeSku('SP001', null, null)).toBe('SP001');
  });
});

describe('validateImportRow — kiem tra dong CSV', () => {
  it('dong hop le khong co loi', () => {
    expect(validateImportRow({ code: 'SP1', name: 'Gấu', type: 'FINISHED', unit: 'con', price: '100000' })).toEqual([]);
  });
  it('bao loi tieng Viet cho tung truong thieu', () => {
    const errs = validateImportRow({ type: 'XXX', price: '12.5' });
    expect(errs).toContain('Thiếu mã sản phẩm');
    expect(errs).toContain('Thiếu tên sản phẩm');
    expect(errs).toContain('Thiếu đơn vị tính');
    expect(errs.some((e) => e.startsWith('Loại không hợp lệ'))).toBe(true);
    expect(errs).toContain('Giá phải là số nguyên VND');
  });
});
