// Gioi han tan suat trong BO NHO (fixed window) — chong spam/flood/do mat khau co ban.
// Luu y: theo tung tien trinh (container). Voi 1 container la du; muon manh hon thi dat
// Cloudflare/WAF phia truoc (xem huong dan bao mat).
type Bucket = { n: number; reset: number };
const store = new Map<string, Bucket>();

/** Tra { ok, retryAfter(giay) }. Moi lan goi tinh la 1 luot trong cua so windowMs. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (store.size > 20_000) {   // chan phinh bo nho: don cac cua so da het han
    for (const [k, v] of store) if (v.reset <= now) store.delete(k);
  }
  const b = store.get(key);
  if (!b || b.reset <= now) { store.set(key, { n: 1, reset: now + windowMs }); return { ok: true, retryAfter: 0 }; }
  b.n += 1;
  if (b.n > limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((b.reset - now) / 1000)) };
  return { ok: true, retryAfter: 0 };
}
