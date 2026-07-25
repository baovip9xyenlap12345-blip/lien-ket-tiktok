import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guarded, jsonError, reqMeta } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { getPortalUser } from '@/modules/portal/server';

const Body = z.object({
  variantId: z.number().int(),
  qty: z.number().int().positive().max(100000),
});

/** Ghi nhan khach da THEM VAO GIO (chua mua). Chi ghi khi khach da dang nhap cong —
 *  de quan tri biet "khach nao them gio ma chua mua" va goi cham soc. Khach an danh -> bo qua (tra ok). */
export const POST = guarded(async (req) => {
  const { ip } = reqMeta();
  if (!rateLimit(`cart:ip:${ip ?? 'x'}`, 120, 60_000).ok) return Response.json({ ok: true, tracked: false });
  const me = await getPortalUser();
  if (!me) return Response.json({ ok: true, tracked: false });   // khach chua dang nhap: khong theo doi
  const b = Body.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');

  const v = await prisma.productVariant.findFirst({
    where: { id: b.data.variantId, deletedAt: null, status: 'ACTIVE' },
    include: { product: true,
      priceRules: { where: { priceList: { kind: 'RETAIL' }, minQty: 1 }, select: { price: true } } } });
  if (!v) return Response.json({ ok: true, tracked: false });

  const partner = await prisma.partner.findUnique({ where: { id: me.partnerId }, select: { phone: true } });
  const optLabel = [v.size, v.color].filter(Boolean).join(' · ') || null;
  const unitPrice = v.priceRules[0]?.price ?? 0;

  // Gop theo (khach, bien the) khi chua mua — cap nhat so luong moi nhat thay vi tao nhieu dong.
  const existing = await prisma.shopCartActivity.findFirst({
    where: { partnerId: me.partnerId, variantId: v.id, converted: false }, select: { id: true } });
  if (existing) {
    await prisma.shopCartActivity.update({ where: { id: existing.id },
      data: { qty: b.data.qty, unitPrice, optLabel, productName: v.product.name, productCode: v.product.code } });
  } else {
    await prisma.shopCartActivity.create({ data: {
      partnerId: me.partnerId, partnerName: me.partnerName,
      phone: partner?.phone ?? null, variantId: v.id,
      productCode: v.product.code, productName: v.product.name,
      optLabel, qty: b.data.qty, unitPrice } });
  }
  return Response.json({ ok: true, tracked: true });
});
