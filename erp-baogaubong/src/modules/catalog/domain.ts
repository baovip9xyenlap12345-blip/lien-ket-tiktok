// Logic thuan cua phan he san pham — unit-test duoc, khong cham DB.

export type PriceRuleInput = { minQty: number; price: number };
export type PriceListInput = {
  id: number; kind: string; priority: number; active: boolean;
  validFrom?: Date | null; validTo?: Date | null;
  rules: PriceRuleInput[];
};

/** Chon gia theo bac so luong trong 1 bang gia: bac lon nhat co minQty <= qty. */
export function pickTierPrice(rules: PriceRuleInput[], qty: number): number | null {
  const ok = rules.filter((r) => r.minQty <= qty).sort((a, b) => b.minQty - a.minQty);
  return ok.length ? ok[0].price : null;
}

/** Bang gia con hieu luc tai thoi diem date? */
export function isListValid(l: PriceListInput, date: Date): boolean {
  if (!l.active) return false;
  if (l.validFrom && date < l.validFrom) return false;
  if (l.validTo && date > l.validTo) return false;
  return true;
}

/**
 * Giai gia cho 1 bien the: uu tien bang gia duoc chi dinh (neu hop le),
 * sau do den cac bang gia khac theo priority giam dan, cuoi cung RETAIL.
 * Tra ve null neu khong co gia nao — nguoi goi phai xu ly, khong tu bia gia 0.
 */
export function resolvePrice(opts: {
  lists: PriceListInput[]; preferListId?: number | null; qty: number; date?: Date;
}): { price: number; listId: number } | null {
  const date = opts.date ?? new Date();
  const valid = opts.lists.filter((l) => isListValid(l, date));
  const ordered = [
    ...valid.filter((l) => l.id === opts.preferListId),
    ...valid.filter((l) => l.id !== opts.preferListId && l.kind !== 'RETAIL')
      .sort((a, b) => b.priority - a.priority),
    ...valid.filter((l) => l.id !== opts.preferListId && l.kind === 'RETAIL'),
  ];
  for (const l of ordered) {
    const p = pickTierPrice(l.rules, opts.qty);
    if (p !== null) return { price: p, listId: l.id };
  }
  return null;
}

/** Quy doi so luong giua 2 don vi. factor: 1 from = factor * to. */
export function convertQty(qty: number, factor: number): number {
  if (!(factor > 0)) throw new Error('He so quy doi phai > 0');
  return qty * factor;
}

/** Tinh nhu cau nguyen lieu cho lenh san xuat tu BOM (co hao hut %). */
export function bomRequirement(
  items: { materialVariantId: number; qtyPerUnit: number }[],
  producedQty: number,
  wastePct: number,
): { materialVariantId: number; qtyNeeded: number }[] {
  if (producedQty <= 0) return [];
  const k = 1 + Math.max(0, wastePct) / 100;
  return items.map((i) => ({
    materialVariantId: i.materialVariantId,
    qtyNeeded: Math.ceil(i.qtyPerUnit * producedQty * k * 10000) / 10000,
  }));
}

/** Sinh SKU tu ma san pham + thuoc tinh (bo dau, viet hoa). */
export function makeSku(productCode: string, size?: string | null, color?: string | null): string {
  const clean = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return [productCode, size ? clean(size) : '', color ? clean(color).slice(0, 6) : '']
    .filter(Boolean).join('-');
}

/** Kiem tra 1 dong import san pham (CSV). Tra ve danh sach loi tieng Viet. */
export function validateImportRow(r: {
  code?: string; name?: string; type?: string; unit?: string; sku?: string; price?: string;
}): string[] {
  const errs: string[] = [];
  if (!r.code?.trim()) errs.push('Thiếu mã sản phẩm');
  if (!r.name?.trim()) errs.push('Thiếu tên sản phẩm');
  const types = ['FINISHED','MATERIAL','SEMI','SERVICE','COMBO','CUSTOM','AI_BEAR'];
  if (!r.type || !types.includes(r.type)) errs.push('Loại không hợp lệ (' + types.join('/') + ')');
  if (!r.unit?.trim()) errs.push('Thiếu đơn vị tính');
  if (r.price && !/^\d+$/.test(r.price.trim())) errs.push('Giá phải là số nguyên VND');
  return errs;
}
