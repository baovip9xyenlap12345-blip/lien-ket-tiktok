import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guarded, jsonError, hashPassword, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { nextCode } from '@/lib/seq';
import { createPortalSession } from '@/modules/portal/server';
import { normalizePhone } from '@/modules/partners/domain';

const Body = z.object({
  name: z.string().trim().min(1, 'Nhập tên của bạn'),
  phone: z.string().trim().min(1, 'Nhập số điện thoại'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});
const tries = new Map<string, { n: number; at: number }>();

/** Khach TU DANG KY (khong can duyet). Tao Partner (khach) + PortalAccount + dang nhap luon.
 *  Tai khoan dang nhap = so dien thoai. */
export const POST = guarded(async (req) => {
  const ip = reqMeta().ip ?? 'unknown';
  const t = tries.get(ip);
  if (t && t.n >= 10 && Date.now() - t.at < 10 * 60000) throw jsonError(429, 'Thử lại sau ít phút.');
  const b = Body.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const normPhone = normalizePhone(b.data.phone);
  if (!normPhone) throw jsonError(400, 'Số điện thoại không hợp lệ.');
  const exist = await prisma.portalAccount.findUnique({ where: { username: normPhone } });
  if (exist) throw jsonError(409, 'Số điện thoại này đã có tài khoản — hãy đăng nhập.');

  const passwordHash = await hashPassword(b.data.password);
  const account = await prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, 'KH');
    const partner = await tx.partner.create({ data: {
      code, name: b.data.name.trim(), type: 'PERSON', isCustomer: true,
      phone: b.data.phone.trim(), normPhone, source: 'online', channel: 'shop' } });
    return tx.portalAccount.create({ data: { partnerId: partner.id, username: normPhone, passwordHash } });
  });
  tries.set(ip, { n: (t?.n ?? 0) + 1, at: Date.now() });
  await createPortalSession(account.id);
  await audit({ actorId: null, actorName: `shop:${normPhone}`, action: 'shop_register',
    entity: 'portal', entityId: String(account.partnerId), ip });
  return Response.json({ ok: true });
});
