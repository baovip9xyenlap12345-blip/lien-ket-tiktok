import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, hashPassword, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { normalizePhone } from '@/modules/partners/domain';

/** Danh sach TAI KHOAN DANG NHAP cua khach (PortalAccount + ho so Partner). */
export const GET = guarded(async (req) => {
  await requirePerm('partner.manage');
  const q = new URL(req.url).searchParams.get('q')?.trim() || '';
  // PortalAccount khong co quan he 'partner' truc tiep trong schema → lay account roi lay partner theo id.
  const accounts = await prisma.portalAccount.findMany({ orderBy: { id: 'desc' }, take: 1000 });
  const partnerIds = accounts.map((a) => a.partnerId);
  const partners = await prisma.partner.findMany({ where: { id: { in: partnerIds } },
    select: { id: true, name: true, phone: true, isVip: true } });
  const pMap = new Map(partners.map((p) => [p.id, p]));
  const orderCounts = await prisma.salesOrder.groupBy({ by: ['partnerId'],
    where: { partnerId: { in: partnerIds }, deletedAt: null }, _count: { _all: true } });
  const ocMap = new Map(orderCounts.map((o) => [o.partnerId, o._count._all]));

  let rows = accounts.map((a) => {
    const p = pMap.get(a.partnerId);
    return { id: a.id, partnerId: a.partnerId, username: a.username, active: a.active,
      name: p?.name ?? '(khách)', phone: p?.phone ?? a.username, isVip: p?.isVip ?? false,
      orders: ocMap.get(a.partnerId) ?? 0, createdAt: a.createdAt.toISOString() };
  });
  if (q) {
    const ql = q.toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(ql) || r.username.includes(q) || (r.phone ?? '').includes(q));
  }
  return Response.json({ ok: true, rows });
});

const Patch = z.object({
  id: z.number().int(),
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').optional(),
  active: z.boolean().optional(),
});

/** Sua thong tin tai khoan khach: doi ten, doi SDT (dong bo username), dat lai mat khau, khoa/mo. */
export const PATCH = guarded(async (req) => {
  const actor = await requirePerm('partner.manage');
  const b = Patch.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const acc = await prisma.portalAccount.findUnique({ where: { id: d.id } });
  if (!acc) throw jsonError(404, 'Không tìm thấy tài khoản khách.');

  const accData: Record<string, unknown> = {};
  const partnerData: Record<string, unknown> = {};
  if (d.name !== undefined) partnerData.name = d.name;
  if (d.active !== undefined) accData.active = d.active;
  if (d.password) accData.passwordHash = await hashPassword(d.password);
  if (d.phone !== undefined) {
    const norm = normalizePhone(d.phone);
    if (!norm) throw jsonError(400, 'Số điện thoại không hợp lệ.');
    if (norm !== acc.username) {
      const dup = await prisma.portalAccount.findUnique({ where: { username: norm } });
      if (dup && dup.id !== acc.id) throw jsonError(409, 'Số điện thoại này đã có tài khoản khác dùng.');
      accData.username = norm;   // tai khoan dang nhap = SDT
    }
    partnerData.phone = d.phone; partnerData.normPhone = norm;
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(accData).length) await tx.portalAccount.update({ where: { id: acc.id }, data: accData });
    if (Object.keys(partnerData).length) await tx.partner.update({ where: { id: acc.partnerId }, data: partnerData });
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'customer_account_update',
    entity: 'portal', entityId: String(acc.partnerId),
    after: { changedPassword: !!d.password, active: d.active, phoneChanged: d.phone !== undefined }, ip, ua });
  return Response.json({ ok: true });
});
