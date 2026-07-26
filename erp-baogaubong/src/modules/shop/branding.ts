// THUONG HIEU GIAN HANG — doc tu bang Setting (key 'branding'), co gia tri mac dinh.
// Muc dich: doi ten xuong / hotline / Zalo / logo... bang GIAO DIEN cai dat, khong sua code
// → nhan ban app cho xuong khac chi can vao Cai dat go lai thong tin.
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';
export { fmtPhone } from './util';   // tien import chung tu phia server

export type Branding = {
  shopName: string;        // Ten hien thi: "Xưởng Gấu Bảo"
  slogan: string;          // Cau gioi thieu ngan tren banner
  domain: string;          // Ten mien hien o footer
  phone: string;           // Hotline (so lien, VD 0376533857)
  messengerLink: string;   // Link Facebook/Messenger
  zaloLink: string;        // Link Zalo ca nhan/OA
  zaloGroupLink: string;   // Nhom Zalo chuyen khach sau khi dat hang ('' = khong chuyen)
  logoUrl: string;         // storageKey hoac link http ('' = dung emoji 🧸)
  address: string;         // Dia chi xuong (footer)
};

export const BRANDING_DEFAULTS: Branding = {
  shopName: 'Xưởng Gấu Bảo',
  slogan: 'Gấu bông chính xưởng · Nhận in thêu logo theo yêu cầu · Giao tận nơi toàn quốc, thanh toán khi nhận hàng.',
  domain: 'muagaubong.com',
  phone: '0376533857',
  messengerLink: 'https://www.facebook.com/xuonggaubaobao99',
  zaloLink: 'https://zalo.me/0376533857',
  zaloGroupLink: 'https://zalo.me/g/qolxci436',
  logoUrl: '',
  address: '',
};

async function getBrandingImpl(): Promise<Branding> {
  const row = await prisma.setting.findUnique({ where: { key: 'branding' } }).catch(() => null);
  const saved = (row?.value ?? {}) as Partial<Branding>;
  // Gop voi mac dinh: thieu truong nao dung mac dinh truong do (an toan khi nang cap them truong moi).
  const merged = { ...BRANDING_DEFAULTS } as Branding;
  for (const k of Object.keys(BRANDING_DEFAULTS) as (keyof Branding)[]) {
    const v = saved[k];
    if (typeof v === 'string' && v.trim() !== '') merged[k] = v.trim();
  }
  return merged;
}

/** Doc thuong hieu (co cache — dong khach khong doi CSDL; luu cai dat se lam moi ngay qua tag 'shop'). */
export const getBranding = unstable_cache(getBrandingImpl, ['shop-branding-v1'], { revalidate: 120, tags: ['shop'] });
