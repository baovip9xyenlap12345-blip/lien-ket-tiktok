import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta, hashPassword } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { inScope } from '@/lib/scope';

/** Nhan vien cap/khoa tai khoan cong cho khach/dai ly. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('partner.manage');
  const b = z.object({ partnerId: z.number().int(), username: z.string().trim().min(4),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'), active: z.boolean().default(true) })
    .safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const partner = await prisma.partner.findFirst({ where: { id: d.partnerId, deletedAt: null } });
  if (!partner || !inScope(actor, partner)) throw jsonError(404, 'Không tìm thấy đối tác trong phạm vi của bạn.');
  const username = d.username.toLowerCase();
  const dup = await prisma.portalAccount.findUnique({ where: { username } });
  if (dup && dup.partnerId !== d.partnerId) throw jsonError(400, 'Tên đăng nhập đã có người dùng.');
  await prisma.portalAccount.upsert({ where: { partnerId: d.partnerId },
    update: { username, passwordHash: await hashPassword(d.password), active: d.active },
    create: { partnerId: d.partnerId, username, passwordHash: await hashPassword(d.password), active: d.active } });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'portal_account_set',
    entity: 'partner', entityId: partner.code, after: { username, active: d.active }, ip, ua });
  return Response.json({ ok: true });
});
