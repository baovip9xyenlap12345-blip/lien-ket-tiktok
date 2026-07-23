import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';

/** Thung rac: liet ke ban ghi xoa mem + khoi phuc (admin). */
export const GET = guarded(async () => {
  await requirePerm('setting.manage');
  const [partners, products, quotes] = await Promise.all([
    prisma.partner.findMany({ where: { deletedAt: { not: null }, mergedIntoId: null },
      select: { id: true, code: true, name: true, deletedAt: true }, orderBy: { deletedAt: 'desc' }, take: 50 }),
    prisma.product.findMany({ where: { deletedAt: { not: null } },
      select: { id: true, code: true, name: true, deletedAt: true }, orderBy: { deletedAt: 'desc' }, take: 50 }),
    prisma.quote.findMany({ where: { deletedAt: { not: null } },
      select: { id: true, code: true, partnerName: true, deletedAt: true }, orderBy: { deletedAt: 'desc' }, take: 50 }),
  ]);
  return Response.json({ ok: true, partners, products, quotes });
});

const In = z.object({ entity: z.enum(['partner', 'product', 'quote']), id: z.number().int() });

export const POST = guarded(async (req) => {
  const actor = await requirePerm('setting.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu không hợp lệ');
  const { entity, id } = b.data;
  let code = '';
  if (entity === 'partner') {
    const r = await prisma.partner.update({ where: { id }, data: { deletedAt: null } });
    code = r.code;
  } else if (entity === 'product') {
    const r = await prisma.product.update({ where: { id }, data: { deletedAt: null } });
    code = r.code;
  } else {
    const r = await prisma.quote.update({ where: { id }, data: { deletedAt: null } });
    code = r.code;
  }
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'trash_restore',
    entity, entityId: code, ip, ua });
  return Response.json({ ok: true, code });
});
