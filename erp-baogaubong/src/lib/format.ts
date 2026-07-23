// Tien VND luu so nguyen. Cac ham nay la cho lop hien thi.
export function fmtVND(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('vi-VN');
}
export function fmtDate(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  const p = (v: number) => String(v).padStart(2, '0');
  return `${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()}`;
}
export function parseVND(s: string): number {
  const n = parseInt(String(s).replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}
