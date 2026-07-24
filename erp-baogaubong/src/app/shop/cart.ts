'use client';
// Gio hang luu tren trinh duyet khach (localStorage). Doi tab van con.

export type CartItem = { variantId: number; code: string; name: string; opt: string;
  price: number; qty: number; cover: string | null };

const KEY = 'bgb_shop_cart';

export function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function writeCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart-changed'));
}
export function addToCart(item: CartItem) {
  const c = readCart();
  const i = c.findIndex((x) => x.variantId === item.variantId);
  if (i >= 0) c[i].qty += item.qty; else c.push(item);
  writeCart(c);
}
export function setQty(variantId: number, qty: number) {
  const c = readCart().map((x) => x.variantId === variantId ? { ...x, qty } : x).filter((x) => x.qty > 0);
  writeCart(c);
}
export function removeItem(variantId: number) { writeCart(readCart().filter((x) => x.variantId !== variantId)); }
export function clearCart() { writeCart([]); }
export function cartCount(): number { return readCart().reduce((s, x) => s + x.qty, 0); }
export function cartTotal(): number { return readCart().reduce((s, x) => s + x.qty * x.price, 0); }
