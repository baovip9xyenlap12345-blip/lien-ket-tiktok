import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guarded, jsonError } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { nextCode } from '@/lib/seq';
import { requirePortal } from '@/modules/portal/server';

const Body = z.object({
  items: z.array(z.object({ variantId: z.number().int(), qty: z.number().int().positive() }))
    .min(1, 'Giỏ hàng trống'),
  receiverName: z.string().trim().min(1, 'Nhập tên người nhận'),
  receiverPhone: z.string().trim().min(6, 'Nhập số điện thoại'),
  address: z.string().trim().min(5, 'Nhập địa chỉ giao hàng'),
  note: z.string().trim().max(500).optional().nullable(),
});

/** Khach dat hang COD (nhan hang tra tien). Tao don NEW + chua thu tien → nhan vien duyet/giao. */
export const POST = guarded(async (req) => {
  const me = await requirePortal();
  const b = Body.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: d.items.map((i) => i.variantId) }, deletedAt: null, status: 'ACTIVE' },
    include: { product: { include: { unit: true } },
      priceRules: { where: { minQty: 1, priceList: { kind: 'RETAIL' } }, select: { price: true }, take: 1 } } });
  const vMap = new Map(variants.map((v) => [v.id, v]));

  const lines = d.items.map((it) => {
    const v = vMap.get(it.variantId);
    if (!v) throw jsonError(400, 'Có sản phẩm không còn bán, vui lòng xem lại giỏ hàng.');
    const price = v.priceRules[0]?.price ?? 0;
    if (price <= 0) throw jsonError(400, `Sản phẩm "${v.product.name}" chưa có giá — vui lòng liên hệ shop.`);
    const qty = it.qty;
    return { variantId: v.id, sku: v.sku,
      name: [v.product.name, v.size, v.color].filter(Boolean).join(' - '),
      unit: v.product.unit.name, qty, unitPrice: price, taxPercent: 0, lineTotal: price * qty };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const partner = await prisma.partner.findUnique({ where: { id: me.partnerId } });
  const noteBlock = [`[ĐƠN ONLINE — COD]`,
    `Người nhận: ${d.receiverName} · ${d.receiverPhone}`,
    `Địa chỉ giao: ${d.address}`,
    d.note ? `Ghi chú: ${d.note}` : ''].filter(Boolean).join('\n');

  const order = await prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, 'DH-');
    const o = await tx.salesOrder.create({ data: {
      code, partnerId: me.partnerId, partnerName: me.partnerName,
      orderStatus: 'NEW', paymentStatus: 'UNPAID',
      vatEnabled: false, vatPercent: 0,
      subtotal, discountAmt: 0, taxAmt: 0, total: subtotal, shippingFee: 0,
      note: noteBlock, isPos: false,
      assignedToId: partner?.assignedToId ?? null, createdById: partner?.assignedToId ?? 1 } });
    await tx.orderLine.createMany({ data: lines.map((l) => ({ ...l, orderId: o.id })) });
    return o;
  });
  await audit({ actorId: null, actorName: `shop:${me.username}`, action: 'shop_order',
    entity: 'order', entityId: order.code, after: { total: subtotal, items: lines.length } });
  return Response.json({ ok: true, code: order.code, total: subtotal });
});
