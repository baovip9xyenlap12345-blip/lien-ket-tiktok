import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guarded, jsonError, verifyPassword } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { createPortalSession, destroyPortalSession, getPortalUser } from '@/modules/portal/server';

const attempts = new Map<string, { n: number; at: number }>();

/** Dang nhap cong khach/dai ly (tach biet nhan vien). */
export const POST = guarded(async (req) => {
  const b = z.object({ u: z.string().trim().min(1), p: z.string().min(1) }).safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Thiếu tài khoản/mật khẩu.');
  const key = b.data.u.toLowerCase();
  const a = attempts.get(key);
  if (a && a.n >= 5 && Date.now() - a.at < 5 * 60000) {
    throw jsonError(429, 'Sai quá 5 lần — thử lại sau 5 phút.');
  }
  const acc = await prisma.portalAccount.findUnique({ where: { username: key } });
  const ok = acc && acc.active && (await verifyPassword(b.data.p, acc.passwordHash));
  if (!ok) {
    attempts.set(key, { n: (a?.n ?? 0) + 1, at: Date.now() });
    throw jsonError(401, 'Sai tài khoản hoặc mật khẩu.');
  }
  attempts.delete(key);
  await createPortalSession(acc.id);
  await audit({ actorId: null, actorName: `portal:${acc.username}`, action: 'portal_login',
    entity: 'portal', entityId: String(acc.partnerId) });
  return Response.json({ ok: true });
});

export const DELETE = guarded(async () => {
  await destroyPortalSession();
  return Response.json({ ok: true });
});

export const GET = guarded(async () => {
  const u = await getPortalUser();
  return Response.json({ ok: true, user: u });
});
