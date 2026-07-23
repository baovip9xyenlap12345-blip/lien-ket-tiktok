// Logic thuan phan he Ban hang — moi cong thuc tien o day, unit-test 100%.
// Quy tac: tien VND so nguyen; lam tron Math.round o TUNG buoc co phep chia/nhan %.

export type LineIn = {
  qty: number;          // so luong (nguyen duong)
  unitPrice: number;    // don gia VND nguyen
  discountPct?: number; // chiet khau dong %, 0-100
};

export type TotalsIn = {
  lines: LineIn[];
  discountPct?: number;  // chiet khau toan don % (ap len subtotal sau chiet khau dong)
  discountAmt?: number;  // HOAC chiet khau toan don so tien — neu co ca 2, uu tien so tien
  otherFee?: number;     // phi khac (VND)
  shippingFee?: number;  // phi van chuyen (VND)
  vatEnabled?: boolean;
  vatPercent?: number;   // mac dinh lay tu cai dat (8)
};

export type TotalsOut = {
  lineTotals: number[];  // thanh tien tung dong (sau chiet khau dong)
  subtotal: number;      // tong thanh tien cac dong
  discountAmt: number;   // chiet khau toan don quy ra tien
  taxBase: number;       // can cu tinh thue = subtotal - discountAmt
  taxAmt: number;        // tien thue
  total: number;         // taxBase + taxAmt + otherFee + shippingFee
};

export function lineTotal(l: LineIn): number {
  if (l.qty < 0 || l.unitPrice < 0) throw new Error('So luong/don gia khong duoc am');
  const pct = Math.min(100, Math.max(0, l.discountPct ?? 0));
  const gross = l.qty * l.unitPrice;
  return Math.round(gross * (1 - pct / 100));
}

export function computeTotals(t: TotalsIn): TotalsOut {
  const lineTotals = t.lines.map(lineTotal);
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);
  let discountAmt = 0;
  if (t.discountAmt && t.discountAmt > 0) discountAmt = Math.min(Math.round(t.discountAmt), subtotal);
  else if (t.discountPct && t.discountPct > 0) {
    discountAmt = Math.round(subtotal * Math.min(100, t.discountPct) / 100);
  }
  const taxBase = subtotal - discountAmt;
  const taxAmt = t.vatEnabled ? Math.round(taxBase * Math.max(0, t.vatPercent ?? 0) / 100) : 0;
  const total = taxBase + taxAmt + Math.max(0, Math.round(t.otherFee ?? 0)) + Math.max(0, Math.round(t.shippingFee ?? 0));
  return { lineTotals, subtotal, discountAmt, taxBase, taxAmt, total };
}

/** Trang thai thanh toan tu so tien: tra du → PAID, tra 1 phan → PARTIAL. */
export function paymentStatusOf(total: number, paid: number): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (paid <= 0) return 'UNPAID';
  if (paid >= total) return 'PAID';
  return 'PARTIAL';
}

/** Kiem tra don/bao gia co can cap tren duyet khong. */
export function checkApproval(input: {
  discountPct: number;         // chiet khau toan don thuc te (%) — quy tu tien neu can
  maxDiscountPct: number;      // nguong cua nhan vien (cai dat)
  isAdmin: boolean;
  total: number;
  creditLimit?: number | null; // han muc no cua khach (0 = khong cho no)
  currentDebt?: number | null; // no hien tai cua khach
  paidNow?: number;            // khach tra ngay bao nhieu
}): { needed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.isAdmin) {
    if (input.discountPct > input.maxDiscountPct) {
      reasons.push(`Chiết khấu ${input.discountPct}% vượt mức được phép (${input.maxDiscountPct}%)`);
    }
    const debtAfter = (input.currentDebt ?? 0) + Math.max(0, input.total - (input.paidNow ?? 0));
    if (input.creditLimit != null && debtAfter > input.creditLimit) {
      reasons.push(`Công nợ sau đơn (${debtAfter.toLocaleString('vi-VN')}đ) vượt hạn mức (${(input.creditLimit ?? 0).toLocaleString('vi-VN')}đ)`);
    }
  }
  return { needed: reasons.length > 0, reasons };
}

/** Quy chiet khau (pct hoac amt) ve % de so voi nguong duyet. */
export function effectiveDiscountPct(subtotal: number, discountPct?: number, discountAmt?: number): number {
  if (discountAmt && discountAmt > 0 && subtotal > 0) return Math.round(discountAmt / subtotal * 10000) / 100;
  return discountPct ?? 0;
}

/* ---- May trang thai: moi truc doc lap, chi cho phep buoc hop le ---- */
const TRANSITIONS: Record<string, Record<string, string[]>> = {
  quote: {
    DRAFT: ['SENT', 'CANCELLED'],
    SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
    ACCEPTED: [], REJECTED: ['SENT'], EXPIRED: ['SENT'], CANCELLED: [],
  },
  order: {
    NEW: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['DONE', 'CANCELLED'],
    DONE: [], CANCELLED: [],
  },
  production: {
    NONE: ['QUEUED'], QUEUED: ['IN_PROGRESS', 'NONE'], IN_PROGRESS: ['FINISHED'], FINISHED: [],
  },
  shipping: {
    NONE: ['PREPARING'], PREPARING: ['SHIPPING', 'NONE'], SHIPPING: ['DELIVERED', 'RETURNED'],
    DELIVERED: ['RETURNED'], RETURNED: [],
  },
};

export function canTransition(axis: string, from: string, to: string): boolean {
  return TRANSITIONS[axis]?.[from]?.includes(to) ?? false;
}

export function assertTransition(axis: string, from: string, to: string): void {
  if (!canTransition(axis, from, to)) {
    throw new Error(`Không thể chuyển ${axis} từ ${from} sang ${to}.`);
  }
}
