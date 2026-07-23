import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { nextCode } from '@/lib/seq';
import { paymentStatusOf } from '@/modules/sales/domain';
import { priceAndApprove, logStatus } from '@/modules/sales/server';
import { createCashTx, accountForMethod } from '@/modules/finance/server';

/** Tra cuu nhanh theo barcode/SKU cho POS (quet ma vach). */
export const GET = guarded(async (req) => {
  await requirePerm('sales.view');
  const code = new URL(req.url).searchParams.get('barcode')?.trim();
  if (!code) throw jsonError(400, 'Thiếu barcode');
  const v = await prisma.productVariant.findFirst({
    where: { deletedAt: null, OR: [{ barcode: code }, { sku: { equals: code, mode: 'insensitive' } }] },
    include: { product: { include: { unit: true } },
      priceRules: { include: { priceList: true } } } });
  if (!v) return Response.json({ ok: true, variant: null });
  const retail = v.priceRules
    .filter((r) => r.priceList.kind === 'RETAIL' && r.minQty === 1)
    .map((r) => r.price)[0] ?? null;
  return Response.json({ ok: true, variant: {
    id: v.id, sku: v.sku, name: [v.product.name, v.size, v.color].filter(Boolean).join(' - '),
    unit: v.product.unit.name, price: retail } });
});

const In = z.object({
  partnerId: z.number().int().nullable().optional(),
  partnerName: z.string().trim().default('Khách lẻ'),
  lines: z.array(z.object({ variantId: z.number().int(), qty: z.number().int().positive(),
    unitPrice: z.number().int().min(0), discountPct: z.number().min(0).max(100).default(0) })).min(1, 'Giỏ hàng trống'),
  discountPct: z.number().min(0).max(100).default(0),
  discountAmt: z.number().int().min(0).default(0),
  vatEnabled: z.boolean().default(false),   // POS khach le mac dinh khong xuat VAT; bat duoc
  paidAmt: z.number().int().min(0).default(0),
  method: z.enum(['CASH', 'TRANSFER']).default('CASH'),
  note: z.string().optional(),
});

/** Ban nhanh POS: tao don CONFIRMED + thu tien trong 1 giao dich, tra du lieu in phieu. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('sales.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const { snap, totals, vatPercent, approval } = await priceAndApprove({
    actor, lines: d.lines, partnerId: d.partnerId,
    discountPct: d.discountPct, discountAmt: d.discountAmt,
    vatEnabled: d.vatEnabled, paidNow: d.paidAmt, checkDebt: true });
  if (approval.needed) {
    // POS phai chot ngay — vuot quyen thi bao ro, chuyen sang quy trinh bao gia/duyet
    throw jsonError(400, 'Cần cấp trên duyệt: ' + approval.reasons.join('; ') + '. Hãy tạo báo giá để xin duyệt.');
  }
  const result = await prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, 'DH-');
    const o = await tx.salesOrder.create({ data: {
      code, partnerId: d.partnerId ?? null, partnerName: d.partnerName || 'Khách lẻ',
      orderStatus: 'CONFIRMED', isPos: true,
      vatEnabled: d.vatEnabled, vatPercent,
      subtotal: totals.subtotal, discountPct: d.discountPct, discountAmt: totals.discountAmt,
      taxAmt: totals.taxAmt, total: totals.total, note: d.note ?? null,
      assignedToId: actor.id, createdById: actor.id, branchId: actor.branchId ?? null } });
    await tx.orderLine.createMany({ data: snap.map((s) => ({ ...s, orderId: o.id })) });
    await logStatus(tx, 'order', o.id, 'order', '—', 'CONFIRMED', actor, 'Bán nhanh POS');
    let payCode: string | null = null;
    let paid = 0;
    if (d.paidAmt > 0) {
      paid = Math.min(d.paidAmt, totals.total);
      payCode = await nextCode(tx, 'PT-');
      const cash = await createCashTx(tx, { actor, kind: 'RECEIPT', code: payCode,
        accountId: await accountForMethod(tx, d.method), amount: paid,
        partnerId: d.partnerId ?? null, partnerName: d.partnerName || 'Khách lẻ', orderId: o.id,
        reason: `Thu tiền POS ${o.code}`, note: 'POS' });
      await tx.payment.create({ data: { code: payCode, orderId: o.id, partnerId: d.partnerId ?? null,
        amount: paid, method: d.method, note: 'POS', cashTxId: cash.tx.id, createdById: actor.id } });
      await tx.salesOrder.update({ where: { id: o.id },
        data: { paidAmt: paid, paymentStatus: paymentStatusOf(totals.total, paid) } });
      await logStatus(tx, 'order', o.id, 'payment', 'UNPAID', paymentStatusOf(totals.total, paid), actor, `${payCode} (POS)`);
    }
    return { o, payCode, paid };
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'pos_sale', entity: 'order',
    entityId: result.o.code, after: { total: totals.total, paid: result.paid }, ip, ua });
  return Response.json({ ok: true, orderId: result.o.id, orderCode: result.o.code,
    total: totals.total, paid: result.paid, change: Math.max(0, d.paidAmt - totals.total) });
});
