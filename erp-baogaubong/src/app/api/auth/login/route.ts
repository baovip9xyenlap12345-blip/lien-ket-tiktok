import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword, createSession, reqMeta, guarded, jsonError } from '@/lib/auth';
import { audit } from '@/lib/audit';

const Body = z.object({ username: z.string().min(1), password: z.string().min(1) });
const attempts = new Map<string, { n: number; t: number }>();

export const POST = guarded(async (req) => {
  const { ip, ua } = reqMeta();
  const body = Body.safeParse(await req.json());
  if (!body.success) throw jsonError(400, 'Thiếu tài khoản hoặc mật khẩu.');
  // Khoa rate-limit theo TEN DANG NHAP (client khong gia mao duoc), khong theo IP
  // (IP lay tu header x-forwarded-for co the bi doi moi request de lach bo dem).
  const key = body.data.username.trim().toLowerCase();
  const a = attempts.get(key);
  if (a && a.n >= 10 && Date.now() - a.t < 10 * 60_000) {
    throw jsonError(429, 'Sai quá nhiều lần. Vui lòng thử lại sau 10 phút.');
  }
  const u = await prisma.user.findUnique({ where: { username: body.data.username.trim() } });
  const ok = u && u.active && !u.deletedAt && (await verifyPassword(body.data.password, u.passwordHash));
  if (!ok) {
    attempts.set(key, { n: (a?.n ?? 0) + 1, t: Date.now() });
    await audit({ actorName: body.data.username, action: 'login_failed', entity: 'auth', ip, ua });
    throw jsonError(401, 'Sai tài khoản hoặc mật khẩu.');
  }
  attempts.delete(key);
  await createSession(u.id, ip, ua);
  await audit({ actorId: u.id, actorName: u.name, action: 'login', entity: 'auth', ip, ua });
  return Response.json({ ok: true });
});
