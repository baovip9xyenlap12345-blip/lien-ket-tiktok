import { cookies, headers } from 'next/headers';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const SESSION_COOKIE = 'bgb_session';
const DEFAULT_IDLE_MIN = 30;

export async function hashPassword(p: string) { return bcrypt.hash(p, 10); }
export async function verifyPassword(p: string, hash: string) { return bcrypt.compare(p, hash); }

async function idleMinutes(): Promise<number> {
  const s = await prisma.setting.findUnique({ where: { key: 'session_idle_min' } });
  const v = Number((s?.value as { v?: number } | null)?.v);
  return Number.isFinite(v) && v >= 5 ? v : DEFAULT_IDLE_MIN;
}

export async function createSession(userId: number, ip?: string, ua?: string) {
  const token = randomBytes(32).toString('hex');
  const mins = await idleMinutes();
  await prisma.session.create({
    data: { token, userId, ip, ua, expiresAt: new Date(Date.now() + mins * 60_000) },
  });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production',
  });
  return token;
}

export type SessionUser = {
  id: number; username: string; name: string; roleCode: string; roleName: string;
  scope: string; branchId: number | null; perms: string[];
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { role: { include: { perms: { include: { permission: true } } } } } } },
  });
  if (!s || s.expiresAt < new Date() || !s.user.active || s.user.deletedAt) {
    if (s) await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }
  // gia han truot (sliding expiry) — tu dang xuat khi khong hoat dong
  const mins = await idleMinutes();
  await prisma.session.update({
    where: { token }, data: { expiresAt: new Date(Date.now() + mins * 60_000) },
  }).catch(() => {});
  const u = s.user;
  return {
    id: u.id, username: u.username, name: u.name, roleCode: u.role.code, roleName: u.role.name,
    scope: u.scope, branchId: u.branchId,
    perms: u.role.perms.map((rp) => rp.permission.code),
  };
}

export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.delete({ where: { token } }).catch(() => {});
  cookies().delete(SESSION_COOKIE);
}

export function reqMeta() {
  const h = headers();
  return { ip: h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? undefined, ua: h.get('user-agent') ?? undefined };
}

/** Bao ve API: tra ve user neu du quyen, nguoc lai nem Response 401/403. */
export async function requirePerm(perm: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw jsonError(401, 'Chưa đăng nhập hoặc phiên đã hết hạn.');
  if (perm && !user.perms.includes(perm)) {
    throw jsonError(403, 'Tài khoản của bạn không có quyền thực hiện thao tác này.');
  }
  return user;
}

export function jsonError(status: number, message: string): Response {
  return Response.json({ ok: false, error: message }, { status });
}

/** Boc route handler de bat Response nem ra tu requirePerm/validation. */
export function guarded(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try { return await handler(req); }
    catch (e) {
      if (e instanceof Response) return e;
      console.error(JSON.stringify({ level: 'error', msg: (e as Error).message }));
      return jsonError(500, 'Có lỗi hệ thống, vui lòng thử lại.');
    }
  };
}
