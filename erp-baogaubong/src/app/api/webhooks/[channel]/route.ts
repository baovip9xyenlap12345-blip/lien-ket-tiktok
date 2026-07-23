import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { guarded } from '@/lib/auth';

/** So sanh chuoi bi mat theo thoi gian hang so (chong timing attack). */
function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Nhan webhook tu kenh ngoai (van chuyen, thanh toan, chat...).
 *  - XAC MINH: header x-webhook-secret phai khop env WEBHOOK_SECRET (chua cau hinh → tu choi het).
 *  - IDEMPOTENT: eventId trung (cung kenh) → tra ve ket qua cu, khong xu ly lai.
 *  - Loi xu ly → luu status ERROR de man Tich hop xu ly lai; nguon gui co the retry (gioi han phia nguon). */
export const POST = guarded(async (req: Request) => {
  const url = new URL(req.url);
  const channel = url.pathname.split('/').pop() ?? 'unknown';
  const secret = process.env.WEBHOOK_SECRET;
  const given = req.headers.get('x-webhook-secret');
  if (!secret || !given || !safeEq(given, secret)) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  let body: { eventId?: string } & Record<string, unknown> = {};
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: 'bad_json' }, { status: 400 }); }
  const eventId = String(body.eventId ?? '');
  if (!eventId) return Response.json({ ok: false, error: 'missing_eventId' }, { status: 400 });
  const existed = await prisma.webhookEvent.findUnique({
    where: { channel_eventId: { channel, eventId } } });
  if (existed) return Response.json({ ok: true, duplicated: true, id: existed.id });
  try {
    const row = await prisma.webhookEvent.create({ data: {
      channel, eventId, payload: body as never, status: 'OK' } });
    return Response.json({ ok: true, duplicated: false, id: row.id });
  } catch {
    // race: 2 request cung eventId dong thoi — unique constraint do 1 cai
    const again = await prisma.webhookEvent.findUnique({
      where: { channel_eventId: { channel, eventId } } });
    if (again) return Response.json({ ok: true, duplicated: true, id: again.id });
    const row = await prisma.webhookEvent.create({ data: {
      channel, eventId: eventId + ':err', payload: body as never,
      status: 'ERROR', error: 'write_failed' } });
    return Response.json({ ok: false, id: row.id }, { status: 500 });
  }
});
