import { guarded } from '@/lib/auth';
import { getBranding } from '@/modules/shop/branding';

/** Thong tin thuong hieu gian hang (ten, hotline, Zalo...) — cong khai, co cache. */
export const GET = guarded(async () => {
  const b = await getBranding();
  return Response.json({ ok: true, branding: b }, {
    headers: { 'Cache-Control': 'public, max-age=120' } });
});
