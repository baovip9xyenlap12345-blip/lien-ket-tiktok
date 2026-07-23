// Xac thuc PORTAL (dai ly/khach) — TACH BIET hoan toan voi phien nhan vien:
// cookie rieng (bgb_portal), bang session rieng, moi API portal chi thay du lieu partner cua minh.
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { jsonError } from '@/lib/auth';

const COOKIE = 'bgb_portal';
const IDLE_MIN = 60;

export type PortalUser = { accountId: number; partnerId: number; username: string;
  partnerName: string; priceListId: number | null };

export async function getPortalUser(): Promise<PortalUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.portalSession.findUnique({ where: { token }, include: { account: true } });
  if (!s || s.expiresAt < new Date() || !s.account.active) return null;
  const partner = await prisma.partner.findFirst({
    where: { id: s.account.partnerId, deletedAt: null } });
  if (!partner) return null;
  // sliding expiry
  await prisma.portalSession.update({ where: { token },
    data: { expiresAt: new Date(Date.now() + IDLE_MIN * 60000) } }).catch(() => {});
  return { accountId: s.accountId, partnerId: partner.id, username: s.account.username,
    partnerName: partner.name, priceListId: partner.priceListId };
}

export async function requirePortal(): Promise<PortalUser> {
  const u = await getPortalUser();
  if (!u) throw jsonError(401, 'Chưa đăng nhập cổng khách hàng.');
  return u;
}

export async function createPortalSession(accountId: number): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await prisma.portalSession.create({ data: { accountId, token,
    expiresAt: new Date(Date.now() + IDLE_MIN * 60000) } });
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/',
    secure: process.env.NODE_ENV === 'production' });
  return token;
}

export async function destroyPortalSession(): Promise<void> {
  const token = cookies().get(COOKIE)?.value;
  if (token) await prisma.portalSession.deleteMany({ where: { token } });
  cookies().delete(COOKIE);
}
