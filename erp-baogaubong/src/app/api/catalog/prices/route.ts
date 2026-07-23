import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const GET = guarded(async (req) => {
  await requirePerm('catalog.view');
  const variantId = Number(new URL(req.url).searchParams.get('variantId'));
  const rules = await prisma.priceRule.findMany({
    where: variantId ? { variantId } : {},
    include: { priceList: true, variant: { include: { product: true } } },
    orderBy: [{ priceListId: 'asc' }, { minQty: 'asc' }], take: 500,
  });
  return Response.json({ ok: true, rules });
});

const RuleIn = z.object({
  priceListId: z.number().int(), variantId: z.number().int(),
  minQty: z.number().int().min(1), price: z.number().int().min(0),
});

export const POST = guarded(async (req) => {
  const actor = await requirePerm('catalog.manage');
  const b = RuleIn.safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu bảng giá không hợp lệ');
  const r = await prisma.priceRule.upsert({
    where: { priceListId_variantId_minQty: {
      priceListId: b.data.priceListId, variantId: b.data.variantId, minQty: b.data.minQty } },
    update: { price: b.data.price }, create: b.data,
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'price_set', entity: 'price_rule',
    entityId: String(r.id), after: b.data as never, ip, ua });
  return Response.json({ ok: true });
});

export const DELETE = guarded(async (req) => {
  const actor = await requirePerm('catalog.manage');
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) throw jsonError(400, 'Thiếu id');
  await prisma.priceRule.delete({ where: { id } });
  await audit({ actorId: actor.id, actorName: actor.name, action: 'price_delete', entity: 'price_rule', entityId: String(id) });
  return Response.json({ ok: true });
});
