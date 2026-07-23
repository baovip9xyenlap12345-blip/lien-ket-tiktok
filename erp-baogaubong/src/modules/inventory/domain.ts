// Logic thuan phan he Kho — unit-test duoc, khong cham DB.

/** Huong cua tung loai chung tu kho: +1 nhap, -1 xuat, 0 = ADJUST (dau theo qty). */
export function directionOf(kind: string): 1 | -1 | 0 {
  switch (kind) {
    case 'RECEIPT': case 'TRANSFER_IN': case 'RETURN': return 1;
    case 'ISSUE': case 'SALE': case 'TRANSFER_OUT': case 'SCRAP': return -1;
    case 'ADJUST': return 0;
    default: throw new Error(`Loại chứng từ kho không hợp lệ: ${kind}`);
  }
}

/** Kha dung = ton thuc te - giu cho. */
export function availableQty(onHand: number, reserved: number): number {
  return onHand - reserved;
}

/** So con duoc giao cua 1 dong don = dat - da giao (cac dot chua huy/tra). */
export function shippableQty(orderedQty: number, shippedQty: number): number {
  return Math.max(0, orderedQty - shippedQty);
}

/** Kiem tra so luong giao tung dong; vuot thi tra loi (tru khi co quyen dac biet). */
export function assertShipQty(lines: { sku: string; qty: number; shippable: number }[], override: boolean): void {
  if (override) return;
  for (const l of lines) {
    if (l.qty > l.shippable) {
      throw new Error(`${l.sku}: giao ${l.qty} vượt số còn được giao (${l.shippable}). Cần quyền duyệt để giao vượt.`);
    }
  }
}

/** Chenh lech kiem kho → chung tu dieu chinh (+ thua, - thieu); 0 bo qua. */
export function stocktakeDiffs(lines: { variantId: number; systemQty: number; countedQty: number }[]) {
  return lines
    .map((l) => ({ variantId: l.variantId, diff: l.countedQty - l.systemQty }))
    .filter((l) => l.diff !== 0);
}

/** Canh bao ton: sap het (<= min, min>0) hoac vuot max. */
export function stockAlert(onHand: number, minStock: number, maxStock: number | null): 'low' | 'over' | null {
  if (minStock > 0 && onHand <= minStock) return 'low';
  if (maxStock != null && maxStock > 0 && onHand > maxStock) return 'over';
  return null;
}
