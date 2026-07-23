import { describe, it, expect } from 'vitest';
import { fmtVND, parseVND, fmtDate } from './format';
describe('dinh dang VN', () => {
  it('tien VND', () => {
    expect(fmtVND(1234567)).toBe('1.234.567');
    expect(fmtVND(0)).toBe('0');
    expect(parseVND('1.234.567 đ')).toBe(1234567);
  });
  it('ngay dd/MM/yyyy', () => {
    expect(fmtDate(new Date(2026, 6, 22))).toBe('22/07/2026');
  });
});
