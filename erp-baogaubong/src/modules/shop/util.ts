// Tien ich dung chung (server + client) cho gian hang.

/** Nguon anh/video: key noi bo -> API cong khai; link http -> giu nguyen. */
export function shopImg(key: string | null | undefined): string | null {
  if (!key) return null;
  return /^https?:\/\//.test(key) ? key : `/api/shop/media/${encodeURIComponent(key)}`;
}

/** Gia ap dung theo so luong mua: chon bac co minQty lon nhat <= qty; khong co thi lay gia goc. */
export function priceForQty(tiers: { minQty: number; price: number }[], qty: number, base: number | null): number | null {
  const hit = tiers.filter((t) => t.minQty <= qty).sort((a, b) => b.minQty - a.minQty)[0];
  return hit ? hit.price : base;
}

/** So dien thoai dang de doc: 0376533857 → 0376.533.857 (giu nguyen neu la dang la). */
export function fmtPhone(p: string): string {
  const d = p.replace(/\D/g, '');
  if (d.length === 10) return `${d.slice(0, 4)}.${d.slice(4, 7)}.${d.slice(7)}`;
  return p;
}

/** Bam chuoi -> so nguyen on dinh (cung 1 ma san pham luon ra cung 1 so). */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** So lieu 'xa hoi' on dinh cho tung san pham: danh gia (4.7-4.9 sao) + da ban (>5000).
 *  On dinh theo ma san pham nen khong nhay so moi lan tai trang. */
export function socialProof(code: string): { rating: number; sold: number } {
  const h = hashCode(code || 'x');
  const rating = (47 + (h % 3)) / 10;      // 4.7 / 4.8 / 4.9
  const sold = 5000 + (h % 4980);          // 5000 - 9979
  return { rating, sold };
}

/** Dinh dang so 'da ban' kieu Viet: 9869 -> "9.869". */
export function fmtSold(n: number): string {
  return n.toLocaleString('vi-VN');
}

/** Nhan dien link video de nhung (YouTube/TikTok) hoac phat truc tiep (file). */
export function videoEmbed(url: string | null | undefined): { kind: 'iframe' | 'file' | 'link'; src: string } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  if (/^https?:\/\//.test(url)) return { kind: 'link', src: url };
  return { kind: 'file', src: `/api/shop/media/${encodeURIComponent(url)}` };
}
