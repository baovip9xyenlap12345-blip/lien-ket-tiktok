import { describe, it, expect } from 'vitest';
import { lineTotal, computeTotals, paymentStatusOf, checkApproval, effectiveDiscountPct,
  canTransition, assertTransition } from './domain';

describe('lineTotal — thanh tien dong', () => {
  it('khong chiet khau: qty x gia', () => {
    expect(lineTotal({ qty: 3, unitPrice: 198000 })).toBe(594000);
  });
  it('chiet khau dong 10%', () => {
    expect(lineTotal({ qty: 2, unitPrice: 150000, discountPct: 10 })).toBe(270000);
  });
  it('lam tron ve so nguyen VND (33.333%)', () => {
    expect(lineTotal({ qty: 1, unitPrice: 100000, discountPct: 33.333 })).toBe(66667);
  });
  it('chiet khau >100 bi kep ve 100; am ve 0', () => {
    expect(lineTotal({ qty: 1, unitPrice: 50000, discountPct: 150 })).toBe(0);
    expect(lineTotal({ qty: 1, unitPrice: 50000, discountPct: -5 })).toBe(50000);
  });
  it('so am bao loi', () => {
    expect(() => lineTotal({ qty: -1, unitPrice: 1000 })).toThrow();
  });
});

describe('computeTotals — tong don', () => {
  const lines = [
    { qty: 10, unitPrice: 120000 },                 // 1.200.000
    { qty: 2, unitPrice: 198000, discountPct: 5 },  // 376.200
  ];
  it('day du: chiet khau % + VAT 8% + phi', () => {
    const r = computeTotals({ lines, discountPct: 10, otherFee: 20000, shippingFee: 30000,
      vatEnabled: true, vatPercent: 8 });
    expect(r.subtotal).toBe(1576200);
    expect(r.discountAmt).toBe(157620);
    expect(r.taxBase).toBe(1418580);
    expect(r.taxAmt).toBe(113486);       // round(1418580*0.08)=113486.4→113486
    expect(r.total).toBe(1418580 + 113486 + 50000);
  });
  it('chiet khau bang tien uu tien hon %', () => {
    const r = computeTotals({ lines, discountPct: 10, discountAmt: 100000, vatEnabled: false });
    expect(r.discountAmt).toBe(100000);
    expect(r.total).toBe(1476200);
  });
  it('chiet khau tien vuot subtotal bi kep (khong am tien)', () => {
    const r = computeTotals({ lines: [{ qty: 1, unitPrice: 50000 }], discountAmt: 99999999, vatEnabled: false });
    expect(r.discountAmt).toBe(50000);
    expect(r.total).toBe(0);
  });
  it('khong VAT: taxAmt = 0', () => {
    expect(computeTotals({ lines, vatEnabled: false, vatPercent: 8 }).taxAmt).toBe(0);
  });
  it('don rong: tat ca 0', () => {
    const r = computeTotals({ lines: [] });
    expect(r.subtotal).toBe(0); expect(r.total).toBe(0);
  });
  it('VAT 10% lam tron nua dong', () => {
    // 15 x 3333 = 49995; VAT 10% = 4999.5 → 5000
    const r = computeTotals({ lines: [{ qty: 15, unitPrice: 3333 }], vatEnabled: true, vatPercent: 10 });
    expect(r.taxAmt).toBe(5000);
    expect(r.total).toBe(54995);
  });
});

describe('paymentStatusOf', () => {
  it('0 → UNPAID, mot phan → PARTIAL, du/thua → PAID', () => {
    expect(paymentStatusOf(100000, 0)).toBe('UNPAID');
    expect(paymentStatusOf(100000, 40000)).toBe('PARTIAL');
    expect(paymentStatusOf(100000, 100000)).toBe('PAID');
    expect(paymentStatusOf(100000, 120000)).toBe('PAID');
  });
});

describe('checkApproval — xin duyet', () => {
  it('sale chiet khau vuot nguong → can duyet', () => {
    const r = checkApproval({ discountPct: 15, maxDiscountPct: 10, isAdmin: false, total: 1000000 });
    expect(r.needed).toBe(true);
    expect(r.reasons[0]).toContain('vượt mức');
  });
  it('admin khong bi chan', () => {
    expect(checkApproval({ discountPct: 50, maxDiscountPct: 10, isAdmin: true, total: 1 }).needed).toBe(false);
  });
  it('no vuot han muc → can duyet; tra du tien thi khong', () => {
    const base = { discountPct: 0, maxDiscountPct: 10, isAdmin: false, total: 5000000,
      creditLimit: 2000000, currentDebt: 0 };
    expect(checkApproval({ ...base, paidNow: 0 }).needed).toBe(true);
    expect(checkApproval({ ...base, paidNow: 5000000 }).needed).toBe(false);
    expect(checkApproval({ ...base, paidNow: 3500000 }).needed).toBe(false); // no 1.5tr < 2tr
  });
  it('khach da no san + don moi cong don', () => {
    const r = checkApproval({ discountPct: 0, maxDiscountPct: 10, isAdmin: false, total: 1000000,
      creditLimit: 2000000, currentDebt: 1500000, paidNow: 0 });
    expect(r.needed).toBe(true);
  });
});

describe('effectiveDiscountPct', () => {
  it('quy tien ve % (2 chu so)', () => {
    expect(effectiveDiscountPct(1000000, undefined, 125000)).toBe(12.5);
    expect(effectiveDiscountPct(0, undefined, 125000)).toBe(0);
    expect(effectiveDiscountPct(1000000, 7)).toBe(7);
  });
});

describe('may trang thai 4 truc', () => {
  it('quote: DRAFT→SENT→ACCEPTED hop le; DRAFT→ACCEPTED khong', () => {
    expect(canTransition('quote', 'DRAFT', 'SENT')).toBe(true);
    expect(canTransition('quote', 'SENT', 'ACCEPTED')).toBe(true);
    expect(canTransition('quote', 'DRAFT', 'ACCEPTED')).toBe(false);
  });
  it('order: NEW→CONFIRMED→DONE; DONE la cuoi', () => {
    expect(canTransition('order', 'NEW', 'CONFIRMED')).toBe(true);
    expect(canTransition('order', 'CONFIRMED', 'DONE')).toBe(true);
    expect(canTransition('order', 'DONE', 'CANCELLED')).toBe(false);
  });
  it('shipping: SHIPPING→DELIVERED→RETURNED (tra hang sau giao)', () => {
    expect(canTransition('shipping', 'SHIPPING', 'DELIVERED')).toBe(true);
    expect(canTransition('shipping', 'DELIVERED', 'RETURNED')).toBe(true);
    expect(canTransition('shipping', 'NONE', 'DELIVERED')).toBe(false);
  });
  it('assertTransition nem loi tieng Viet', () => {
    expect(() => assertTransition('order', 'DONE', 'NEW')).toThrow('Không thể chuyển');
  });
});
