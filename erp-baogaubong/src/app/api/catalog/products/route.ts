import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { makeSku } from '@/modules/catalog/domain';
import { applyMovements } from '@/modules/inventory/server';

export const GET = guarded(async (req) => {
  await requirePerm('catalog.view');
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const type = url.searchParams.get('type') ?? '';
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const take = 20;
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(type ? { type: type as never } : {}),
    ...(q ? { OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { code: { contains: q, mode: 'insensitive' } },
      { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } },
    ] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.product.findMany({ where, include: {
      variants: { where: { deletedAt: null }, include: {
        priceRules: { where: { minQty: 1, priceList: { kind: 'RETAIL' } }, select: { price: true }, take: 1 } } },
      unit: true, category: true },
      orderBy: { id: 'asc' }, skip: (page - 1) * take, take }),
    prisma.product.count({ where }),
  ]);
  // Ton kho hien tai (tong cac kho) cho tung bien the.
  const allVarIds = rows.flatMap((p) => p.variants.map((v) => v.id));
  const balances = allVarIds.length
    ? await prisma.inventoryBalance.groupBy({ by: ['variantId'], where: { variantId: { in: allVarIds } }, _sum: { onHand: true } })
    : [];
  const stockMap = new Map(balances.map((b) => [b.variantId, b._sum.onHand ?? 0]));
  // Gan gia ban le (bac SL>=1) + ton kho vao tung bien the cho form hien thi.
  const outRows = rows.map((p) => ({ ...p,
    variants: p.variants.map(({ priceRules, ...v }) => ({ ...v,
      salePrice: priceRules[0]?.price ?? null, stock: stockMap.get(v.id) ?? 0 })) }));
  return Response.json({ ok: true, rows: outRows, total, page, take });
});

const VariantIn = z.object({
  id: z.number().int().optional(),
  sku: z.string().trim().optional(), barcode: z.string().trim().optional().nullable(),
  size: z.string().trim().optional().nullable(), color: z.string().trim().optional().nullable(),
  material: z.string().trim().optional().nullable(),
  costPrice: z.number().int().min(0).default(0), weightGr: z.number().int().min(0).nullable().optional(),
  salePrice: z.number().int().min(0).nullable().optional(), // gia ban le (bac SL>=1)
  openingStock: z.number().int().min(0).nullable().optional(), // ton dau ky — CHI ghi khi tao bien the moi
});
const ProductIn = z.object({
  id: z.number().int().optional(),
  code: z.string().trim().min(2), name: z.string().trim().min(1),
  type: z.enum(['FINISHED','MATERIAL','SEMI','SERVICE','COMBO','CUSTOM','AI_BEAR']),
  status: z.enum(['ACTIVE','INACTIVE']).default('ACTIVE'),
  categoryId: z.number().int().nullable().optional(),
  unitId: z.number().int(),
  desc: z.string().optional().nullable(), note: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).max(9, 'Tối đa 9 ảnh').default([]),
  videoUrl: z.string().trim().max(500).nullable().optional(),
  variantGroups: z.array(z.object({ name: z.string().trim(), options: z.array(z.string().trim()),
    optionImages: z.array(z.string().nullable()).optional() })).max(2).nullable().optional(),
  qtyTiers: z.array(z.object({ minQty: z.number().int().min(2), discount: z.number().min(0).max(90) })).max(5).nullable().optional(),
  tags: z.array(z.string()).default([]),
  taxPercent: z.number().int().min(0).max(100).nullable().optional(),
  deductMode: z.enum(['BUNDLE','COMPONENTS']).nullable().optional(),
  variants: z.array(VariantIn).min(1, 'Sản phẩm cần ít nhất 1 biến thể'),
});

export const POST = guarded(async (req) => {
  const actor = await requirePerm('catalog.manage');
  const b = ProductIn.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const dupCode = await prisma.product.findUnique({ where: { code: d.code } });
  if (dupCode && dupCode.id !== d.id) throw jsonError(400, `Mã sản phẩm ${d.code} đã tồn tại.`);
  const skus = d.variants.map((v) => v.sku?.trim() || makeSku(d.code, v.size, v.color));
  if (new Set(skus).size !== skus.length) throw jsonError(400, 'SKU trong sản phẩm bị trùng nhau.');
  const dupSku = await prisma.productVariant.findFirst({
    where: { sku: { in: skus }, ...(d.id ? { NOT: { productId: d.id } } : {}) } });
  if (dupSku) throw jsonError(400, `SKU ${dupSku.sku} đã thuộc sản phẩm khác.`);

  const result = await prisma.$transaction(async (tx) => {
    const base = { code: d.code, name: d.name, type: d.type, status: d.status,
      categoryId: d.categoryId ?? null, unitId: d.unitId, desc: d.desc ?? null, note: d.note ?? null,
      imageUrls: d.imageUrls.slice(0, 9), videoUrl: d.videoUrl?.trim() || null,
      variantGroups: (d.variantGroups && d.variantGroups.length ? d.variantGroups : Prisma.JsonNull) as never,
      qtyTiers: (d.qtyTiers && d.qtyTiers.length ? d.qtyTiers : Prisma.JsonNull) as never,
      tags: d.tags, taxPercent: d.taxPercent ?? null, deductMode: d.deductMode ?? null };
    const tierList = (d.qtyTiers ?? []).filter((t) => t.minQty >= 2 && t.discount > 0).sort((a, b) => a.minQty - b.minQty);
    const p = d.id
      ? await tx.product.update({ where: { id: d.id }, data: { ...base, version: { increment: 1 } } })
      : await tx.product.create({ data: base });
    const keepIds: number[] = [];
    const openingLines: { variantId: number; qty: number }[] = [];
    // Bang gia ban le mac dinh — tao neu chua co (de luu "gia ban" ngay tren tung size).
    let retail = await tx.priceList.findFirst({ where: { kind: 'RETAIL', deletedAt: null }, orderBy: { priority: 'desc' } });
    for (let i = 0; i < d.variants.length; i++) {
      const v = d.variants[i];
      const data = { sku: skus[i], barcode: v.barcode || null, size: v.size ?? null, color: v.color ?? null,
        material: v.material ?? null, costPrice: v.costPrice, weightGr: v.weightGr ?? null };
      const saved = v.id
        ? await tx.productVariant.update({ where: { id: v.id }, data })
        : await tx.productVariant.create({ data: { ...data, productId: p.id } });
      keepIds.push(saved.id);
      // Ton dau ky: CHI ghi cho bien the MOI tao (khong id) → tranh cong don khi sua/luu lai.
      if (!v.id && v.openingStock != null && v.openingStock > 0) openingLines.push({ variantId: saved.id, qty: v.openingStock });
      // Gia ban le theo BAC so luong: minQty=1 la gia goc; cac bac si = gia goc * (1 - giam%).
      if (v.salePrice != null && v.salePrice > 0) {
        if (!retail) retail = await tx.priceList.create({ data: { kind: 'RETAIL', name: 'Giá bán lẻ', priority: 0, active: true } });
        const keep = [1];
        await tx.priceRule.upsert({
          where: { priceListId_variantId_minQty: { priceListId: retail.id, variantId: saved.id, minQty: 1 } },
          update: { price: v.salePrice }, create: { priceListId: retail.id, variantId: saved.id, minQty: 1, price: v.salePrice } });
        for (const t of tierList) {
          const tp = Math.max(0, Math.round(v.salePrice * (1 - t.discount / 100)));
          await tx.priceRule.upsert({
            where: { priceListId_variantId_minQty: { priceListId: retail.id, variantId: saved.id, minQty: t.minQty } },
            update: { price: tp }, create: { priceListId: retail.id, variantId: saved.id, minQty: t.minQty, price: tp } });
          keep.push(t.minQty);
        }
        await tx.priceRule.deleteMany({ where: { priceListId: retail.id, variantId: saved.id, minQty: { notIn: keep } } });
      } else if (retail) {
        await tx.priceRule.deleteMany({ where: { priceListId: retail.id, variantId: saved.id } });
      }
    }
    await tx.productVariant.updateMany({
      where: { productId: p.id, id: { notIn: keepIds }, deletedAt: null },
      data: { deletedAt: new Date() } });
    // Ghi ton dau ky = phieu NHAP kho (RECEIPT) vao kho mac dinh — qua applyMovements (bat bien + khoa dong).
    if (openingLines.length) {
      const wh = await tx.warehouse.findFirst({ orderBy: { id: 'asc' } });
      if (wh) await applyMovements(tx, { actor, warehouseId: wh.id, kind: 'RECEIPT',
        lines: openingLines, refType: 'product_opening', refId: p.code, note: 'Tồn đầu kỳ khi tạo sản phẩm' });
    }
    return p;
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: d.id ? 'product_update' : 'product_create',
    entity: 'product', entityId: result.code, after: { name: d.name, type: d.type, variants: skus }, ip, ua });
  return Response.json({ ok: true, id: result.id });
});

export const DELETE = guarded(async (req) => {
  const actor = await requirePerm('catalog.manage');
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) throw jsonError(400, 'Thiếu id');
  const p = await prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ actorId: actor.id, actorName: actor.name, action: 'product_delete', entity: 'product', entityId: p.code });
  return Response.json({ ok: true });
});
