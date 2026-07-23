// Logic thuan phan he Doi tac/CRM — unit-test duoc, khong cham DB.

/** Chuan hoa SDT VN de so trung: bo ky tu la, +84/84 dau → 0. */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let s = String(raw).replace(/[^\d+]/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (s.startsWith('84') && s.length >= 10) s = '0' + s.slice(2);
  s = s.replace(/\D/g, '');
  return s.length >= 9 ? s : null;
}

/** Chuan hoa email: thuong hoa + trim. */
export function normalizeEmail(raw?: string | null): string | null {
  const s = String(raw ?? '').trim().toLowerCase();
  return s.includes('@') ? s : null;
}

/** Chuan hoa MST: chi giu chu so; MST chi nhanh 13 so tu tach lai thanh 10-3
 *  (nen "01-0123-4567" va "0101234567" duoc coi la mot). */
export function normalizeTax(raw?: string | null): string | null {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 13) return `${d.slice(0, 10)}-${d.slice(10)}`;
  return d.length >= 10 ? d : null;
}

export type DupeCandidate = { id: number; phone?: string | null; email?: string | null; taxCode?: string | null };

/** Tim ly do trung giua ban ghi moi va 1 ung vien. Tra ve [] neu khong trung. */
export function dupeReasons(
  input: { phone?: string | null; email?: string | null; taxCode?: string | null },
  cand: DupeCandidate,
): string[] {
  const out: string[] = [];
  const p1 = normalizePhone(input.phone), p2 = normalizePhone(cand.phone);
  if (p1 && p2 && p1 === p2) out.push(`trùng SĐT ${p1}`);
  const e1 = normalizeEmail(input.email), e2 = normalizeEmail(cand.email);
  if (e1 && e2 && e1 === e2) out.push(`trùng email ${e1}`);
  const t1 = normalizeTax(input.taxCode), t2 = normalizeTax(cand.taxCode);
  if (t1 && t2 && t1 === t2) out.push(`trùng MST ${t1}`);
  return out;
}

/** Kiem tra 1 dong import doi tac (CSV). Tra ve loi tieng Viet. */
export function validatePartnerRow(r: { name?: string; phone?: string; email?: string;
  credit_limit?: string; credit_days?: string }): string[] {
  const errs: string[] = [];
  if (!r.name?.trim()) errs.push('Thiếu tên khách/đối tác');
  if (r.phone && !normalizePhone(r.phone)) errs.push('SĐT không hợp lệ');
  if (r.email && !normalizeEmail(r.email)) errs.push('Email không hợp lệ');
  for (const [k, label] of [['credit_limit', 'Hạn mức nợ'], ['credit_days', 'Số ngày nợ']] as const) {
    const v = r[k];
    if (v && !/^\d+$/.test(v.trim())) errs.push(`${label} phải là số nguyên`);
  }
  return errs;
}
