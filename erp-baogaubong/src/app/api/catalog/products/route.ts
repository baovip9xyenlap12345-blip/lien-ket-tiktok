import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { makeSku } from '@/modules/catalog/domain';

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
    prisma.product.findMany({ where, include: { variants: { where: { deletedAt: null } }, unit: true, category: true },
      orderBy: { id: 'asc' }, skip: (page - 1) * take, take }),
    prisma.product.count({ where }),
  ]);
  return Response.json({ ok: true, rows, total, page, take });
});

const VariantIn = z.object({
  id: z.number().int().optional(),
  sku: z.string().trim().optional(), barcode: z.string().trim().optional().nullable(),
  size: z.string().trim().optional().nullable(), color: z.string().trim().optional().nullable(),
  material: z.string().trim().optional().nullable(),
  costPrice: z.number().int().min(0).default(0), weightGr: z.number().int().min(0).nullable().optional(),
});
const ProductIn = z.object({
  id: z.number().int().optional(),
  code: z.string().trim().min(2), name: z.string().trim().min(1),
  type: z.enum(['FINISHED','MATERIAL','SEMI','SERVICE','COMBO','CUSTOM','AI_BEAR']),
  status: z.enum(['ACTIVE','INACTIVE']).default('ACTIVE'),
  categoryId: z.number().int().nullable().optional(),
  unitId: z.number().int(),
  desc: z.string().optional().nullable(), note: z.string().optional().nullable(),
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
      tags: d.tags, taxPercent: d.taxPercent ?? null, deductMode: d.deductMode ?? null };
    const p = d.id
      ? await tx.product.update({ where: { id: d.id }, data: { ...base, version: { increment: 1 } } })
      : await tx.product.create({ data: base });
    const keepIds: number[] = [];
    for (let i = 0; i < d.variants.length; i++) {
      const v = d.variants[i];
      const data = { sku: skus[i], barcode: v.barcode || null, size: v.size ?? null, color: v.color ?? null,
        material: v.material ?? null, costPrice: v.costPrice, weightGr: v.weightGr ?? null };
      const saved = v.id
        ? await tx.productVariant.update({ where: { id: v.id }, data })
        : await tx.productVariant.create({ data: { ...data, productId: p.id } });
      keepIds.push(saved.id);
    }
    await tx.productVariant.updateMany({
      where: { productId: p.id, id: { notIn: keepIds }, deletedAt: null },
      data: { deletedAt: new Date() } });
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
