// Phan dung DB cua phan he Ban hang (khong phai logic thuan — logic o domain.ts).
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { jsonError, type SessionUser } from '@/lib/auth';
import { resolvePrice } from '@/modules/catalog/domain';
import { computeTotals, effectiveDiscountPct, checkApproval, lineTotal, type TotalsIn } from './domain';

export type LineInput = {
  variantId: number; qty: number; unitPrice: number; discountPct?: number; note?: string;
};

export async function getSettingNum(key: string, def: number): Promise<number> {
  const s = await prisma.setting.findUnique({ where: { key } });
  const v = (s?.value as { v?: number } | null)?.v;
  return typeof v === 'number' ? v : def;
}

/** Chup snapshot dong hang tu bien the (sku/ten/dvt tai thoi diem ban) + giay to tien. */
export async function buildLines(lines: LineInput[], vatPercent: number, vatEnabled: boolean) {
  if (!lines.length) throw jsonError(400, 'Đơn cần ít nhất 1 dòng hàng.');
  const ids = lines.map((l) => l.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: ids }, deletedAt: null },
    include: { product: { include: { unit: true } } } });
  const byId = new Map(variants.map((v) => [v.id, v]));
  return lines.map((l) => {
    const v = byId.get(l.variantId);
    if (!v) throw jsonError(400, `Biến thể #${l.variantId} không tồn tại.`);
    if (!(l.qty > 0) || !Number.isInteger(l.qty)) throw jsonError(400, 'Số lượng phải là số nguyên dương.');
    if (l.unitPrice < 0 || !Number.isInteger(l.unitPrice)) throw jsonError(400, 'Đơn giá phải là số nguyên VND.');
    const name = [v.product.name, v.size, v.color].filter(Boolean).join(' - ');
    return { variantId: v.id, sku: v.sku, name, unit: v.product.unit.name,
      qty: l.qty, unitPrice: l.unitPrice, discountPct: l.discountPct ?? 0,
      taxPercent: vatEnabled ? vatPercent : 0,
      lineTotal: lineTotal({ qty: l.qty, unitPrice: l.unitPrice, discountPct: l.discountPct }),
      note: l.note ?? null };
  });
}

/** Gia tham chieu theo bang gia (uu tien bang gia cua khach) — de phat hien ban duoi gia. */
export async function referenceSubtotal(lines: LineInput[], preferListId?: number | null): Promise<number> {
  let sum = 0;
  for (const l of lines) {
    const lists = await prisma.priceList.findMany({
      where: { deletedAt: null, rules: { some: { variantId: l.variantId } } },
      include: { rules: { where: { variantId: l.variantId }, select: { minQty: true, price: true } } } });
    const r = resolvePrice({
      lists: lists.map((x) => ({ id: x.id, kind: x.kind, priority: x.priority, active: x.active,
        validFrom: x.validFrom, validTo: x.validTo, rules: x.rules })),
      preferListId: preferListId ?? null, qty: l.qty });
    sum += l.qty * (r?.price ?? l.unitPrice);
  }
  return sum;
}

/** No hien tai cua khach = tong (total - paid) cac don chua huy. */
export async function currentDebtOf(partnerId: number | null): Promise<number> {
  if (!partnerId) return 0;
  const rows = await prisma.salesOrder.findMany({
    where: { partnerId, deletedAt: null, orderStatus: { not: 'CANCELLED' } },
    select: { total: true, paidAmt: true } });
  return rows.reduce((a, r) => a + Math.max(0, r.total - r.paidAmt), 0);
}

/** Tinh tien + xet duyet cho 1 don/bao gia. Tra ve du lieu ghi DB. */
export async function priceAndApprove(opts: {
  actor: SessionUser;
  lines: LineInput[];
  partnerId?: number | null;
  priceListId?: number | null;
  discountPct?: number; discountAmt?: number;
  otherFee?: number; shippingFee?: number;
  vatEnabled: boolean; vatPercent?: number;
  paidNow?: number;
  checkDebt: boolean;   // bao gia: false, don hang: true
}) {
  const vatDefault = await getSettingNum('vat_percent', 8);
  const vatPercent = opts.vatPercent ?? vatDefault;
  const snap = await buildLines(opts.lines, vatPercent, opts.vatEnabled);
  const totalsIn: TotalsIn = {
    lines: snap.map((s) => ({ qty: s.qty, unitPrice: s.unitPrice, discountPct: Number(s.discountPct) })),
    discountPct: opts.discountPct, discountAmt: opts.discountAmt,
    otherFee: opts.otherFee, shippingFee: opts.shippingFee,
    vatEnabled: opts.vatEnabled, vatPercent };
  const totals = computeTotals(totalsIn);
  // Chiet khau hieu dung = MAX cua 2 goc nhin:
  //  (1) khai bao: giam bao nhieu % so voi don gia da go (CK dong + CK toan don)
  //  (2) tham chieu: gia cuoi thap hon bang gia (bat ca truong hop go don gia thap tay)
  const gross = opts.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const declaredPct = gross > 0 ? Math.round((1 - totals.taxBase / gross) * 10000) / 100 : 0;
  const refSubtotal = await referenceSubtotal(opts.lines, opts.priceListId);
  const refPct = refSubtotal > 0
    ? Math.round((1 - totals.taxBase / refSubtotal) * 10000) / 100
    : effectiveDiscountPct(totals.subtotal, opts.discountPct, totals.discountAmt);
  const effPct = Math.max(declaredPct, refPct);
  const maxPct = await getSettingNum('max_discount_pct', 10);
  const isAdmin = opts.actor.perms.includes('sales.approve');
  let creditLimit: number | null = null;
  let currentDebt = 0;
  if (opts.checkDebt && opts.partnerId) {
    const p = await prisma.partner.findUnique({ where: { id: opts.partnerId }, select: { creditLimit: true } });
    creditLimit = p?.creditLimit ?? 0;
    currentDebt = await currentDebtOf(opts.partnerId);
  }
  const approval = checkApproval({
    discountPct: Math.max(0, effPct), maxDiscountPct: maxPct, isAdmin,
    total: totals.total, creditLimit: opts.checkDebt ? creditLimit : null,
    currentDebt, paidNow: opts.paidNow ?? 0 });
  return { snap, totals, vatPercent, approval };
}

/** Ghi lich su chuyen trang thai. */
export async function logStatus(tx: Prisma.TransactionClient, entity: string, entityId: number,
  axis: string, fromVal: string, toVal: string, actor: SessionUser, note?: string) {
  await tx.statusHistory.create({ data: { entity, entityId, axis, fromVal, toVal,
    byId: actor.id, byName: actor.name, note: note ?? null } });
}
