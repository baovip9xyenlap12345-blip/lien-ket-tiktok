import { guarded } from '@/lib/auth';
import { listActivePromotions } from '@/modules/shop/data';

/** Danh sach khuyen mai dang hieu luc — cong khai cho gian hang hien thi. */
export const GET = guarded(async () => {
  const promos = await listActivePromotions();
  return Response.json({ ok: true, promos });
});
