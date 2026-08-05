// Ket noi Pancake POS (pos.pancake.vn) — keo don hang tu Pancake ve app.
// Ma API luu trong bang Setting (key 'pancake'), KHONG nam trong code.
import { prisma } from '@/lib/db';

const BASE = 'https://pos.pancake.vn/api/v1';

export type PancakeConfig = { apiKey: string; shopId: number | null; shopName: string | null };

export async function getPancakeConfig(): Promise<PancakeConfig> {
  const row = await prisma.setting.findUnique({ where: { key: 'pancake' } }).catch(() => null);
  const v = (row?.value ?? {}) as Partial<PancakeConfig>;
  return { apiKey: typeof v.apiKey === 'string' ? v.apiKey : '',
    shopId: typeof v.shopId === 'number' ? v.shopId : null,
    shopName: typeof v.shopName === 'string' ? v.shopName : null };
}

export async function savePancakeConfig(cfg: PancakeConfig): Promise<void> {
  await prisma.setting.upsert({ where: { key: 'pancake' },
    update: { value: cfg as object }, create: { key: 'pancake', value: cfg as object } });
}

/** Goi API Pancake (kem timeout + thong bao loi de hieu). */
async function pancakeGet(path: string, apiKey: string, params: Record<string, string | number> = {}): Promise<unknown> {
  const qs = new URLSearchParams({ api_key: apiKey, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}?${qs}`, { signal: AbortSignal.timeout(20_000), cache: 'no-store' });
  } catch {
    throw new Error('Không gọi được máy chủ Pancake — kiểm tra mạng máy chủ rồi thử lại.');
  }
  if (res.status === 401 || res.status === 403) throw new Error('Mã API Pancake sai hoặc hết hạn — kiểm tra lại trong Pancake POS → Cài đặt → API.');
  if (!res.ok) throw new Error(`Pancake trả lỗi ${res.status} — thử lại sau ít phút.`);
  const j = await res.json().catch(() => null);
  if (!j) throw new Error('Pancake trả dữ liệu không đọc được.');
  return j;
}

export type PancakeShop = { id: number; name: string };

/** Danh sach shop cua tai khoan Pancake (dung de kiem tra ma API + chon shop). */
export async function listPancakeShops(apiKey: string): Promise<PancakeShop[]> {
  const j = await pancakeGet('/shops', apiKey) as { success?: boolean; shops?: { id: number; name: string }[] };
  if (j.success === false || !Array.isArray(j.shops)) throw new Error('Mã API không hợp lệ hoặc tài khoản chưa có shop nào.');
  return j.shops.map((s) => ({ id: s.id, name: s.name }));
}

// Trang thai don Pancake (so) -> trang thai don cua app.
function mapStatus(s: number): { order: 'NEW' | 'CONFIRMED' | 'DONE' | 'CANCELLED'; ship: 'NONE' | 'PREPARING' | 'SHIPPING' | 'DELIVERED' | 'RETURNED'; label: string } {
  switch (s) {
    case 1: return { order: 'CONFIRMED', ship: 'NONE', label: 'Đã xác nhận' };
    case 8: return { order: 'CONFIRMED', ship: 'PREPARING', label: 'Đang đóng hàng' };
    case 9: return { order: 'CONFIRMED', ship: 'PREPARING', label: 'Chờ chuyển hàng' };
    case 2: return { order: 'CONFIRMED', ship: 'SHIPPING', label: 'Đã gửi hàng' };
    case 3: return { order: 'DONE', ship: 'DELIVERED', label: 'Đã nhận hàng' };
    case 16: return { order: 'DONE', ship: 'DELIVERED', label: 'Đã thu tiền' };
    case 4: return { order: 'CONFIRMED', ship: 'RETURNED', label: 'Đang hoàn' };
    case 5: return { order: 'CANCELLED', ship: 'RETURNED', label: 'Đã hoàn' };
    case 6: return { order: 'CANCELLED', ship: 'NONE', label: 'Đã hủy' };
    default: return { order: 'NEW', ship: 'NONE', label: `Mới (mã ${s})` };
  }
}

type PancakeOrderRaw = {
  id: number; system_id?: number; status: number; inserted_at?: string;
  bill_full_name?: string; bill_phone_number?: string;
  shipping_address?: { full_address?: string } | null;
  customer?: { name?: string; phone_numbers?: string[] } | null;
  total_price?: number; shipping_fee?: number; total_discount?: number;
  items?: { quantity?: number;
    variation_info?: { name?: string; retail_price?: number; display_id?: string; fields?: { name?: string; value?: string }[] } | null;
  }[];
  page?: { name?: string } | null;
  order_sources_name?: string;
};

/** Keo 1 trang don tu Pancake. */
export async function fetchPancakeOrders(apiKey: string, shopId: number, page: number): Promise<{ orders: PancakeOrderRaw[]; totalPages: number }> {
  const j = await pancakeGet(`/shops/${shopId}/orders`, apiKey, { page_number: page, page_size: 30 }) as
    { success?: boolean; data?: PancakeOrderRaw[]; total_pages?: number };
  if (j.success === false || !Array.isArray(j.data)) throw new Error('Không đọc được danh sách đơn từ Pancake.');
  return { orders: j.data, totalPages: Number(j.total_pages ?? 1) };
}

/** Nhap 1 don Pancake vao app (bo qua neu da nhap roi). Tra ve 'created' | 'skipped'. */
export async function importPancakeOrder(raw: PancakeOrderRaw, actorId: number): Promise<'created' | 'skipped'> {
  const code = `PCK-${raw.system_id ?? raw.id}`;
  const exists = await prisma.salesOrder.findUnique({ where: { code }, select: { id: true } });
  if (exists) return 'skipped';

  const st = mapStatus(Number(raw.status));
  const name = (raw.bill_full_name || raw.customer?.name || 'Khách Pancake').trim();
  const phone = (raw.bill_phone_number || raw.customer?.phone_numbers?.[0] || '').trim();
  const address = raw.shipping_address?.full_address || '';

  // Tim khach theo SDT (chuan hoa so 0/84) — co thi gan, khong tao moi (tranh phinh danh ba vi don rac).
  let partnerId: number | null = null;
  if (phone) {
    const norm = phone.replace(/\D/g, '').replace(/^84/, '0');
    const p = await prisma.partner.findFirst({ where: { normPhone: norm, deletedAt: null }, select: { id: true } });
    partnerId = p?.id ?? null;
  }

  const items = Array.isArray(raw.items) ? raw.items : [];
  const lines = items.map((it) => {
    const v = it.variation_info ?? {};
    const opts = Array.isArray(v.fields) ? v.fields.map((f) => f?.value).filter(Boolean).join(' · ') : '';
    const qty = Math.max(1, Number(it.quantity ?? 1));
    const price = Math.max(0, Math.round(Number(v.retail_price ?? 0)));
    return { variantId: null, sku: String(v.display_id ?? 'PCK'), name: [v.name ?? 'Sản phẩm Pancake', opts].filter(Boolean).join(' - '),
      unit: 'Cái', qty, unitPrice: price, taxPercent: 0, lineTotal: price * qty };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const shippingFee = Math.max(0, Math.round(Number(raw.shipping_fee ?? 0)));
  const discountAmt = Math.max(0, Math.round(Number(raw.total_discount ?? 0)));
  const total = Math.max(0, Math.round(Number(raw.total_price ?? subtotal + shippingFee - discountAmt)));

  const note = [`[PANCAKE #${raw.system_id ?? raw.id}] ${st.label}`,
    phone ? `Người nhận: ${name} · ${phone}` : `Người nhận: ${name}`,
    address ? `Địa chỉ giao: ${address}` : '',
    raw.page?.name ? `Nguồn: ${raw.page.name}${raw.order_sources_name ? ` (${raw.order_sources_name})` : ''}` : '',
    raw.inserted_at ? `Tạo trên Pancake: ${raw.inserted_at}` : ''].filter(Boolean).join('\n');

  await prisma.$transaction(async (tx) => {
    const o = await tx.salesOrder.create({ data: {
      code, partnerId, partnerName: name,
      orderStatus: st.order, paymentStatus: 'UNPAID', shippingStatus: st.ship,
      vatEnabled: false, vatPercent: 0,
      subtotal, discountAmt, taxAmt: 0, shippingFee, total,
      note, isPos: false, createdById: actorId } });
    if (lines.length) await tx.orderLine.createMany({ data: lines.map((l) => ({ ...l, orderId: o.id })) });
  });
  return 'created';
}
