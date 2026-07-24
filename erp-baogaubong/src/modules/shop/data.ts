// Du lieu cho gian hang online (cong khai). Chi lay san pham DANG BAN (ACTIVE),
// gia = bang gia ban le (PriceRule kind=RETAIL, minQty=1).
import { prisma } from '@/lib/db';
import type { PromoView } from './promo';

export type PriceTier = { minQty: number; price: number };
export type ShopVariant = { id: number; sku: string; size: string | null; color: string | null;
  weightGr: number | null; price: number | null; stock: number; tiers: PriceTier[] };
export type ShopCard = { id: number; code: string; name: string; categoryId: number | null;
  categoryName: string | null; cover: string | null; hasVideo: boolean; minPrice: number | null; stock: number };
export type ShopGroup = { name: string; options: string[]; optionImages?: (string | null)[] };
export type QtyTier = { minQty: number; discount: number };
export type ShopDetail = ShopCard & { desc: string | null; videoUrl: string | null;
  images: string[]; unitName: string; variants: ShopVariant[]; variantGroups: ShopGroup[] | null;
  qtyTiers: QtyTier[] | null };

/** Ban gia ban le (minQty=1) cho danh sach bien the. */
async function priceMap(variantIds: number[]): Promise<Map<number, number>> {
  if (!variantIds.length) return new Map();
  const rules = await prisma.priceRule.findMany({
    where: { variantId: { in: variantIds }, minQty: 1, priceList: { kind: 'RETAIL' } },
    select: { variantId: true, price: true } });
  return new Map(rules.map((r) => [r.variantId, r.price]));
}

/** Cac bac gia (minQty -> price) cho tung bien the — de gian hang ap gia theo so luong. */
async function tiersMap(variantIds: number[]): Promise<Map<number, PriceTier[]>> {
  if (!variantIds.length) return new Map();
  const rules = await prisma.priceRule.findMany({
    where: { variantId: { in: variantIds }, priceList: { kind: 'RETAIL' } },
    select: { variantId: true, minQty: true, price: true }, orderBy: { minQty: 'asc' } });
  const m = new Map<number, PriceTier[]>();
  for (const r of rules) { const a = m.get(r.variantId) ?? []; a.push({ minQty: r.minQty, price: r.price }); m.set(r.variantId, a); }
  return m;
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
  const vids = p.variants.map((v) => v.id);
  const [pm, sm, tm] = await Promise.all([priceMap(vids), stockMap(vids), tiersMap(vids)]);
  const variants: ShopVariant[] = p.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size,
    color: v.color, weightGr: v.weightGr, price: pm.get(v.id) ?? null, stock: sm.get(v.id) ?? 0, tiers: tm.get(v.id) ?? [] }));
  const prices = variants.map((v) => v.price).filter((x): x is number => x != null && x > 0);
  return { id: p.id, code: p.code, name: p.name, categoryId: p.categoryId,
    categoryName: p.category?.name ?? null, cover: p.imageUrls[0] ?? null, hasVideo: !!p.videoUrl,
    minPrice: prices.length ? Math.min(...prices) : null, desc: p.desc, videoUrl: p.videoUrl,
    images: p.imageUrls, unitName: p.unit.name, variants, stock: variants.reduce((s, v) => s + v.stock, 0),
    variantGroups: (p.variantGroups as unknown as ShopGroup[] | null) ?? null,
    qtyTiers: (p.qtyTiers as unknown as QtyTier[] | null) ?? null };
}

/** Kiem tra 1 storageKey co thuoc anh/video cua san pham ACTIVE nao khong (de phuc vu media cong khai an toan). */
export async function keyBelongsToProduct(key: string): Promise<boolean> {
  const p = await prisma.product.findFirst({
    where: { deletedAt: null, status: 'ACTIVE', OR: [{ imageUrls: { has: key } }, { videoUrl: key }] }, select: { id: true } });
  if (p) return true;
  // Anh cua tung lua chon (mau sac) nam trong variantGroups (JSON) — kiem qua text (key la UUID nen an toan).
  const rows = await prisma.$queryRaw<{ one: number }[]>`
    SELECT 1 AS one FROM "Product"
    WHERE "deletedAt" IS NULL AND status::text = 'ACTIVE' AND "variantGroups"::text LIKE ${'%' + key + '%'} LIMIT 1`;
  if (rows.length > 0) return true;
  // Anh/video cua chuong trinh khuyen mai dang bat.
  const promo = await prisma.promotion.findFirst({
    where: { active: true, OR: [{ imageUrl: key }, { videoUrl: key }] }, select: { id: true } });
  return !!promo;
}

function mapPromo(p: { code: string; name: string; type: string; value: number; minOrder: number;
  maxDiscount: number | null; imageUrl: string | null; videoUrl: string | null }): PromoView {
  return { code: p.code, name: p.name, type: p.type as 'PERCENT' | 'AMOUNT', value: p.value,
    minOrder: p.minOrder, maxDiscount: p.maxDiscount, imageUrl: p.imageUrl, videoUrl: p.videoUrl };
}

/** Cac khuyen mai dang hieu luc (bat + trong khoang thoi gian) — de hien o gian hang. */
export async function listActivePromotions(): Promise<PromoView[]> {
  const now = new Date();
  const rows = await prisma.promotion.findMany({
    where: { active: true,
      AND: [{ OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
            { OR: [{ validTo: null }, { validTo: { gte: now } }] }] },
    orderBy: [{ minOrder: 'asc' }, { id: 'asc' }] });
  return rows.map(mapPromo);
}

/** Tim 1 ma giam gia con hieu luc theo code (khach nhap o thanh toan). */
export async function findActivePromo(code: string): Promise<PromoView | null> {
  const now = new Date();
  const p = await prisma.promotion.findFirst({
    where: { code: code.trim().toUpperCase(), active: true,
      AND: [{ OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
            { OR: [{ validTo: null }, { validTo: { gte: now } }] }] } });
  return p ? mapPromo(p) : null;
}

/** Trang chu 'Tat ca' — chia san pham theo tung nhom hang (moi nhom vai san pham + 'Xem tat ca'). */
export async function shopHomeSections(perCat = 8): Promise<{ category: { id: number; name: string }; cards: ShopCard[] }[]> {
  const cats = await shopCategories();
  const sections = await Promise.all(cats.map(async (c) => {
    const { cards } = await listShopProducts({ categoryId: c.id, take: perCat });
    return { category: c, cards };
  }));
  return sections.filter((s) => s.cards.length > 0);
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
