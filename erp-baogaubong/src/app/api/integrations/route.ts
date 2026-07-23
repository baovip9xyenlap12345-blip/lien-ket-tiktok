import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError } from '@/lib/auth';
import { CHANNELS, channelReady, sendVia, type Channel } from '@/modules/integrations/adapters';

/** Man tich hop: trang thai tung kenh + nhat ky gui + webhook loi de xu ly lai. */
export const GET = guarded(async () => {
  await requirePerm('setting.manage');
  const [logs, webhookErrors] = await Promise.all([
    prisma.integrationLog.findMany({ orderBy: { id: 'desc' }, take: 30 }),
    prisma.webhookEvent.findMany({ where: { status: 'ERROR' }, orderBy: { id: 'desc' }, take: 20 }),
  ]);
  return Response.json({ ok: true,
    channels: (Object.keys(CHANNELS) as Channel[]).map((ch) => ({
      channel: ch, name: CHANNELS[ch].name, envKeys: CHANNELS[ch].envKeys,
      ready: channelReady(ch) })),
    logs, webhookErrors });
});

/** Gui thu 1 thong diep (sandbox neu chua cau hinh) / danh dau webhook loi da xu ly. */
export const POST = guarded(async (req) => {
  await requirePerm('setting.manage');
  const b = z.union([
    z.object({ action: z.literal('test'), channel: z.string() }),
    z.object({ action: z.literal('resolve_webhook'), id: z.number().int() }),
  ]).safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu không hợp lệ');
  if (b.data.action === 'test') {
    if (!(b.data.channel in CHANNELS)) throw jsonError(400, 'Kênh không hợp lệ.');
    const r = await sendVia(b.data.channel as Channel, 'Tin nhắn thử từ màn Tích hợp');
    return Response.json({ ok: true, sandbox: r.sandbox });
  }
  await prisma.webhookEvent.update({ where: { id: b.data.id },
    data: { status: 'RESOLVED' } });
  return Response.json({ ok: true });
});
