import { z } from 'zod';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { getPancakeConfig, savePancakeConfig, listPancakeShops } from '@/modules/integrations/pancake';

export const dynamic = 'force-dynamic';

/** Trang thai ket noi Pancake (ma API duoc che bot, khong tra ve day du). */
export const GET = guarded(async () => {
  await requirePerm('sales.view');
  const cfg = await getPancakeConfig();
  return Response.json({ ok: true,
    connected: !!cfg.apiKey, shopId: cfg.shopId, shopName: cfg.shopName,
    apiKeyMasked: cfg.apiKey ? `${cfg.apiKey.slice(0, 4)}••••${cfg.apiKey.slice(-4)}` : null });
});

const Body = z.object({
  apiKey: z.string().trim().min(10, 'Dán mã API Pancake (lấy trong Pancake POS → Cài đặt → API)').optional(),
  shopId: z.number().int().optional(),
  shopName: z.string().trim().optional(),
});

/** Luu ma API (kiem tra bang cach goi Pancake) va/hoac chon shop. Tra ve danh sach shop. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('setting.manage');
  const b = Body.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const cur = await getPancakeConfig();
  const apiKey = b.data.apiKey ?? cur.apiKey;
  if (!apiKey) throw jsonError(400, 'Chưa có mã API Pancake.');

  // Kiem tra ma bang cach goi that sang Pancake — sai la bao ngay, khong luu mo.
  let shops;
  try { shops = await listPancakeShops(apiKey); }
  catch (e) { throw jsonError(400, (e as Error).message); }

  const shopId = b.data.shopId ?? cur.shopId ?? (shops.length === 1 ? shops[0].id : null);
  const shopName = b.data.shopName ?? shops.find((s) => s.id === shopId)?.name ?? cur.shopName ?? null;
  await savePancakeConfig({ apiKey, shopId, shopName });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'pancake_config',
    entity: 'integration', entityId: 'pancake', after: { shopId, shopName }, ip, ua });
  return Response.json({ ok: true, shops, shopId, shopName });
});
