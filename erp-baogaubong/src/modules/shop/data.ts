// Du lieu cho gian hang online (cong khai). Chi lay san pham DANG BAN (ACTIVE),
// gia = bang gia ban le (PriceRule kind=RETAIL, minQty=1).
import { prisma } from '@/lib/db';

export type ShopVariant = { id: number; sku: string; size: string | null; color: string | null;
  weightGr: number | null; price: number | null; stock: number };
export type ShopCard = { id: number; code: string; name: string; categoryId: number | null;
  categoryName: string | null; cover: string | null; hasVideo: boolean; minPrice: number | null; stock: number };
export type ShopGroup = { name: string; options: string[]; optionImages?: (string | null)[] };
export type ShopDetail = ShopCard & { desc: string | null; videoUrl: string | null;
  images: string[]; unitName: string; variants: ShopVariant[]; variantGroups: ShopGroup[] | null };

/** Ban gia ban le (minQty=1) cho danh sach bien the. */
async function priceMap(variantIds: number[]): Promise<Map<number, number>> {
  if (!variantIds.length) return new Map();
  const rules = await prisma.priceRule.findMany({
    where: { variantId: { in: variantIds }, minQty: 1, priceList: { kind: 'RETAIL' } },
    select: { variantId: true, price: true } });
  return new Map(rules.map((r) => [r.variantId, r.price]));
}

/** Ton KHA DUNG (onHand - reserved, tong cac kho) — da tru phan khach dang giu cho. */
async function stockMap(variantIds: number[]): Promise<Map<number, number>> {
  if (!variantIds.length) return new Map();
  const b = await prisma.inventoryBalance.groupBy({ by: ['variantId'],
    where: { variantId: { in: variantIds } }, _sum: { onHand: true, reserved: true } });
  return new Map(b.map((x) => [x.variantId, Math.max(0, (x._sum.onHand ?? 0) - (x._sum.reserved ?? 0))]));
}

/** Danh sach san pham cong khai (loc theo tim kiem + nhom hang). */
export async function listShopProducts(opts: { q?: string; categoryId?: number; page?: number; take?: number }) {
  const take = opts.take ?? 24;
  const page = Math.max(1, opts.page ?? 1);
  const where = {
    deletedAt: null, status: 'ACTIVE' as const,
    type: { in: ['FINISHED', 'COMBO', 'CUSTOM', 'AI_BEAR', 'SERVICE'] as never },
    ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
    ...(opts.q ? { OR: [
      { name: { contains: opts.q, mode: 'insensitive' as const } },
      { code: { contains: opts.q, mode: 'insensitive' as const } },
    ] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.product.findMany({ where, include: {
      category: true, variants: { where: { deletedAt: null, status: 'ACTIVE' }, select: { id: true } } },
      orderBy: { updatedAt: 'desc' }, skip: (page - 1) * take, take }),
    prisma.product.count({ where }),
  ]);
  const varIds = rows.flatMap((p) => p.variants.map((v) => v.id));
  const [pm, sm] = await Promise.all([priceMap(varIds), stockMap(varIds)]);
  const cards: ShopCard[] = rows.map((p) => {
    const prices = p.variants.map((v) => pm.get(v.id)).filter((x): x is number => x != null && x > 0);
    const stock = p.variants.reduce((s, v) => s + (sm.get(v.id) ?? 0), 0);
    return { id: p.id, code: p.code, name: p.name, categoryId: p.categoryId,
      categoryName: p.category?.name ?? null, cover: p.imageUrls[0] ?? null,
      hasVideo: !!p.videoUrl, minPrice: prices.length ? Math.min(...prices) : null, stock };
  });
  return { cards, total, page, take };
}

/** Chi tiet 1 san pham cong khai theo ma. */
export async function shopProductByCode(code: string): Promise<ShopDetail | null> {
  const p = await prisma.product.findFirst({
    where: { code, deletedAt: null, status: 'ACTIVE' },
    include: { category: true, unit: true,
      variants: { where: { deletedAt: null, status: 'ACTIVE' }, orderBy: { id: 'asc' } } } });
  if (!p) return null;
  const [pm, sm] = await Promise.all([priceMap(p.variants.map((v) => v.id)), stockMap(p.variants.map((v) => v.id))]);
  const variants: ShopVariant[] = p.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size,
    color: v.color, weightGr: v.weightGr, price: pm.get(v.id) ?? null, stock: sm.get(v.id) ?? 0 }));
  const prices = variants.map((v) => v.price).filter((x): x is number => x != null && x > 0);
  return { id: p.id, code: p.code, name: p.name, categoryId: p.categoryId,
    categoryName: p.category?.name ?? null, cover: p.imageUrls[0] ?? null, hasVideo: !!p.videoUrl,
    minPrice: prices.length ? Math.min(...prices) : null, desc: p.desc, videoUrl: p.videoUrl,
    images: p.imageUrls, unitName: p.unit.name, variants, stock: variants.reduce((s, v) => s + v.stock, 0),
    variantGroups: (p.variantGroups as unknown as ShopGroup[] | null) ?? null };
}

/** Kiem tra 1 storageKey co thuoc anh/video cua san pham ACTIVE nao khong (de phuc vu media cong khai an toan). */
export async function keyBelongsToProduct(key: string): Promise<boolean> {
  const p = await prisma.product.findFirst({
    where: { deletedAt: null, status: 'ACTIVE', OR: [{ imageUrls: { has: key } }, { videoUrl: key }] }, select: { id: true } });
  return !!p;
}

/** San pham cung loai (cung nhom hang) — goi y xem them o trang chi tiet. */
export async function relatedProducts(categoryId: number | null, excludeId: number, limit = 8): Promise<ShopCard[]> {
  const { cards } = await listShopProducts({ categoryId: categoryId ?? undefined, take: limit + 1 });
  return cards.filter((c) => c.id !== excludeId).slice(0, limit);
}

/** Nhom hang co san pham dang ban (cho thanh loc). */
export async function shopCategories() {
  const cats = await prisma.category.findMany({ where: { deletedAt: null,
    products: { some: { deletedAt: null, status: 'ACTIVE' } } }, orderBy: { name: 'asc' },
    select: { id: true, name: true } });
  return cats;
}
