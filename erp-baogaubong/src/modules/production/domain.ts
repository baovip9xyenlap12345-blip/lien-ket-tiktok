// Logic thuan phan he San xuat — unit-test duoc, khong cham DB.
// Nhu cau nguyen lieu dung bomRequirement (GD2, da co test rieng).

export const STAGES = ['PREP', 'CUT', 'SEW', 'STUFF', 'FINISH', 'QC', 'PACK'] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_VI: Record<Stage, string> = {
  PREP: 'Chuẩn bị', CUT: 'Cắt', SEW: 'May', STUFF: 'Nhồi bông',
  FINISH: 'Hoàn thiện', QC: 'KCS (QC)', PACK: 'Đóng gói' };

/** Cong doan hop le: phai la 1 trong chuoi chuan. */
export function assertStage(stage: string): asserts stage is Stage {
  if (!STAGES.includes(stage as Stage)) throw new Error(`Công đoạn không hợp lệ: ${stage}`);
}

/** Tien do % = san luong dat cua cong doan cuoi cung co ghi nhan / ke hoach. */
export function progressPct(qtyPlanned: number, stageGood: Partial<Record<Stage, number>>): number {
  if (qtyPlanned <= 0) return 0;
  // Tien do thuc te: cong doan sau cung da lam duoc bao nhieu (min-flow khong vuot ke hoach)
  let last = 0;
  for (const s of STAGES) {
    const g = stageGood[s] ?? 0;
    if (g > 0) last = g;
  }
  return Math.min(100, Math.round((last / qtyPlanned) * 100));
}

/** Cham tien do: qua han ma chua xong. */
export function isLate(dueDate: Date | null, status: string, now: Date): boolean {
  if (!dueDate || status === 'DONE' || status === 'CANCELLED') return false;
  return now > dueDate;
}

/** Ket qua QC: dat + loi + hong khong vuot so dua vao kiem. */
export function assertQcQty(input: { inspected: number; pass: number; fail: number; scrap: number }): void {
  const { inspected, pass, fail, scrap } = input;
  if (pass < 0 || fail < 0 || scrap < 0) throw new Error('Số lượng QC không được âm.');
  if (pass + fail + scrap !== inspected) {
    throw new Error(`Đạt (${pass}) + lỗi làm lại (${fail}) + hỏng (${scrap}) phải bằng số kiểm (${inspected}).`);
  }
}

/** Chi phi nguyen lieu du kien = tong (dinh muc x gia von) co hao hut. */
export function materialCost(items: { qtyNeeded: number; costPrice: number }[]): number {
  return Math.round(items.reduce((a, i) => a + i.qtyNeeded * i.costPrice, 0));
}

/** So thanh pham duoc nhap kho = tong QC dat, va CHI nhap 1 lan. */
export function receiptableQty(qcPassTotal: number, alreadyReceipted: boolean): number {
  if (alreadyReceipted) throw new Error('Lệnh này đã nhập thành phẩm rồi — không nhập lại được.');
  if (qcPassTotal <= 0) throw new Error('Chưa có sản phẩm nào QC đạt — không có gì để nhập kho.');
  return qcPassTotal;
}
