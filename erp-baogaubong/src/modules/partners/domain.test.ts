import { describe, it, expect } from 'vitest';
import { normalizePhone, normalizeEmail, normalizeTax, dupeReasons, validatePartnerRow } from './domain';
import { scopeWhere, inScope } from '../../lib/scope';

describe('normalizePhone — chuan hoa SDT VN', () => {
  it('bo ky tu la, +84/84 → 0', () => {
    expect(normalizePhone('0876.123.333')).toBe('0876123333');
    expect(normalizePhone('+84 876 123 333')).toBe('0876123333');
    expect(normalizePhone('84876123333')).toBe('0876123333');
    expect(normalizePhone('(0876) 123-333')).toBe('0876123333');
  });
  it('qua ngan / rong → null', () => {
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe('normalizeEmail / normalizeTax', () => {
  it('email thuong hoa, khong co @ → null', () => {
    expect(normalizeEmail(' Bao@GMAIL.com ')).toBe('bao@gmail.com');
    expect(normalizeEmail('khong-phai-email')).toBeNull();
  });
  it('MST giu so + gach, ngan hon 10 → null', () => {
    expect(normalizeTax('0101234567-001')).toBe('0101234567-001');
    expect(normalizeTax('01 0123 4567')).toBe('0101234567');
    expect(normalizeTax('123')).toBeNull();
  });
});

describe('dupeReasons — phat hien trung', () => {
  it('trung SDT du viet khac dinh dang', () => {
    const r = dupeReasons({ phone: '+84876123333' }, { id: 1, phone: '0876.123.333' });
    expect(r).toHaveLength(1);
    expect(r[0]).toContain('trùng SĐT');
  });
  it('trung ca email va MST → 2 ly do', () => {
    const r = dupeReasons({ email: 'A@x.com', taxCode: '0101234567' },
      { id: 2, email: 'a@x.com', taxCode: '01-0123-4567' });
    expect(r).toHaveLength(2);
  });
  it('khong trung → rong; truong rong khong tinh trung', () => {
    expect(dupeReasons({ phone: '0876123333' }, { id: 3, phone: '0912345678' })).toEqual([]);
    expect(dupeReasons({ phone: null }, { id: 4, phone: null })).toEqual([]);
  });
});

describe('scopeWhere / inScope — pham vi du lieu', () => {
  const own = { id: 7, scope: 'OWN', branchId: 1 };
  const branch = { id: 8, scope: 'BRANCH', branchId: 1 };
  const all = { id: 9, scope: 'ALL', branchId: null };
  it('OWN chi thay ban ghi minh phu trach/tao', () => {
    expect(scopeWhere(own)).toEqual({ OR: [{ assignedToId: 7 }, { createdById: 7 }] });
    expect(inScope(own, { assignedToId: 7 })).toBe(true);
    expect(inScope(own, { assignedToId: 99, createdById: 7 })).toBe(true);
    expect(inScope(own, { assignedToId: 99, createdById: 99, branchId: 1 })).toBe(false);
  });
  it('BRANCH thay theo chi nhanh + cua minh', () => {
    expect(inScope(branch, { branchId: 1, assignedToId: 99 })).toBe(true);
    expect(inScope(branch, { branchId: 2, assignedToId: 99 })).toBe(false);
    expect(inScope(branch, { branchId: 2, assignedToId: 8 })).toBe(true);
  });
  it('ALL thay het', () => {
    expect(scopeWhere(all)).toEqual({});
    expect(inScope(all, { assignedToId: 1, branchId: 5 })).toBe(true);
  });
});

describe('validatePartnerRow — dong import CSV', () => {
  it('dong hop le', () => {
    expect(validatePartnerRow({ name: 'Chị Lan', phone: '0912345678', credit_limit: '5000000' })).toEqual([]);
  });
  it('bao loi tieng Viet', () => {
    const errs = validatePartnerRow({ phone: '12', email: 'x', credit_limit: '1.5' });
    expect(errs).toContain('Thiếu tên khách/đối tác');
    expect(errs).toContain('SĐT không hợp lệ');
    expect(errs).toContain('Email không hợp lệ');
    expect(errs).toContain('Hạn mức nợ phải là số nguyên');
  });
});
