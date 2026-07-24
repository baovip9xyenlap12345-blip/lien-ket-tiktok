// Tinh tien giam tu 1 khuyen mai — dung chung server (checkout) + client (hien thi).
export type PromoView = {
  code: string; name: string; type: 'PERCENT' | 'AMOUNT';
  value: number; minOrder: number; maxDiscount: number | null;
  imageUrl: string | null; videoUrl: string | null;
};

/** So tien duoc giam khi ap ma cho don co tong = subtotal. Tra 0 neu chua du dieu kien. */
export function promoDiscount(p: Pick<PromoView, 'type' | 'value' | 'minOrder' | 'maxDiscount'>, subtotal: number): number {
  if (subtotal <= 0 || subtotal < p.minOrder) return 0;
  let d = p.type === 'PERCENT' ? Math.round((subtotal * p.value) / 100) : p.value;
  if (p.maxDiscount != null && p.maxDiscount > 0) d = Math.min(d, p.maxDiscount);
  return Math.max(0, Math.min(d, subtotal));
}

/** Mo ta ngan gon 1 ma giam gia de hien nhan (chip). VD "Giảm 10% (tối đa 50k)" / "Giảm 20k". */
export function promoLabel(p: Pick<PromoView, 'type' | 'value' | 'minOrder' | 'maxDiscount'>): string {
  const money = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  const head = p.type === 'PERCENT'
    ? `Giảm ${p.value}%${p.maxDiscount ? ` (tối đa ${money(p.maxDiscount)})` : ''}`
    : `Giảm ${money(p.value)}`;
  return p.minOrder > 0 ? `${head} · đơn từ ${money(p.minOrder)}` : head;
}
