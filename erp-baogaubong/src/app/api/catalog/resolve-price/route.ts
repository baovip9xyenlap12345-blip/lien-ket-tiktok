import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError } from '@/lib/auth';
import { resolvePrice } from '@/modules/catalog/domain';

/** Tra gia ap dung cho 1 bien the theo so luong + bang gia uu tien. */
export const GET = guarded(async (req) => {
  await requirePerm('catalog.view');
  const url = new URL(req.url);
  const variantId = Number(url.searchParams.get('variantId'));
  const qty = Math.max(1, Number(url.searchParams.get('qty') ?? 1));
  const preferListId = url.searchParams.get('listId') ? Number(url.searchParams.get('listId')) : null;
  if (!variantId) throw jsonError(400, 'Thiếu variantId');
  const lists = await prisma.priceList.findMany({
    where: { deletedAt: null, rules: { some: { variantId } } },
    include: { rules: { where: { variantId }, select: { minQty: true, price: true } } },
  });
  const out = resolvePrice({
    lists: lists.map((l) => ({ id: l.id, kind: l.kind, priority: l.priority, active: l.active,
      validFrom: l.validFrom, validTo: l.validTo, rules: l.rules })),
    preferListId, qty,
  });
  return Response.json({ ok: true, result: out });
});
