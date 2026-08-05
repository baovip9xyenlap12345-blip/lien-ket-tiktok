import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { getPancakeConfig, fetchPancakeOrders, importPancakeOrder } from '@/modules/integrations/pancake';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

/** Keo don tu Pancake ve app (toi da 5 trang ~150 don moi lan bam; don da co thi bo qua). */
export const POST = guarded(async () => {
  const actor = await requirePerm('sales.manage');
  if (!rateLimit(`pancake-sync:${actor.id}`, 6, 10 * 60_000).ok) {
    throw jsonError(429, 'Đồng bộ quá dày — chờ ít phút rồi bấm lại.');
  }
  const cfg = await getPancakeConfig();
  if (!cfg.apiKey) throw jsonError(400, 'Chưa kết nối Pancake — vào phần cấu hình dán mã API trước.');
  if (!cfg.shopId) throw jsonError(400, 'Chưa chọn shop Pancake — vào phần cấu hình chọn shop.');

  let created = 0, skipped = 0, failed = 0;
  const MAX_PAGES = 5;
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { orders, totalPages } = await fetchPancakeOrders(cfg.apiKey, cfg.shopId, page);
      for (const raw of orders) {
        try {
          const r = await importPancakeOrder(raw, actor.id);
          if (r === 'created') created++; else skipped++;
        } catch { failed++; }
      }
      if (page >= totalPages || orders.length === 0) break;
    }
  } catch (e) {
    // Loi giua chung van tra ve nhung gi da keo duoc + ly do
    await prisma.integrationLog.create({ data: { channel: 'pancake', summary: `Đồng bộ lỗi: ${(e as Error).message}`,
      status: 'ERROR', error: (e as Error).message } }).catch(() => {});
    throw jsonError(502, `${(e as Error).message}${created ? ` (đã kịp nhập ${created} đơn mới)` : ''}`);
  }

  await prisma.integrationLog.create({ data: { channel: 'pancake',
    summary: `Đồng bộ đơn Pancake: +${created} mới, ${skipped} đã có${failed ? `, ${failed} lỗi` : ''}`,
    status: 'SENT', payload: { created, skipped, failed } } }).catch(() => {});
  return Response.json({ ok: true, created, skipped, failed });
});
