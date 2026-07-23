import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const GET = guarded(async () => {
  await requirePerm('catalog.view');
  const boms = await prisma.bom.findMany({
    where: { deletedAt: null },
    include: { product: true, versions: { include: { items: { include: { materialVariant: { include: { product: true } } } } }, orderBy: { no: 'desc' } } },
  });
  return Response.json({ ok: true, boms });
});

const In = z.object({
  productId: z.number().int(), name: z.string().min(1),
  wastePct: z.number().min(0).max(100).default(0),
  activate: z.boolean().default(false),
  items: z.array(z.object({ materialVariantId: z.number().int(), qtyPerUnit: z.number().positive(), note: z.string().optional() })).min(1),
});

export const POST = guarded(async (req) => {
  const actor = await requirePerm('catalog.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'BOM không hợp lệ');
  const d = b.data;
  const out = await prisma.$transaction(async (tx) => {
    let bom = await tx.bom.findFirst({ where: { productId: d.productId, deletedAt: null } });
    if (!bom) bom = await tx.bom.create({ data: { productId: d.productId, name: d.name } });
    const last = await tx.bomVersion.findFirst({ where: { bomId: bom.id }, orderBy: { no: 'desc' } });
    const ver = await tx.bomVersion.create({ data: {
      bomId: bom.id, no: (last?.no ?? 0) + 1, wastePct: d.wastePct,
      status: d.activate ? 'ACTIVE' : 'DRAFT', validFrom: d.activate ? new Date() : null } });
    if (d.activate && last) {
      await tx.bomVersion.updateMany({ where: { bomId: bom.id, no: { lt: ver.no }, status: 'ACTIVE' }, data: { status: 'RETIRED' } });
    }
    await tx.bomItem.createMany({ data: d.items.map((i) => ({
      bomVersionId: ver.id, materialVariantId: i.materialVariantId, qtyPerUnit: i.qtyPerUnit, note: i.note })) });
    return ver;
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'bom_version_create', entity: 'bom',
    entityId: String(d.productId), after: { version: out.no, items: d.items.length }, ip, ua });
  return Response.json({ ok: true, versionNo: out.no });
});
