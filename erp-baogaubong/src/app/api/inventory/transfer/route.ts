import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { applyMovements } from '@/modules/inventory/server';

const In = z.object({
  fromWarehouseId: z.number().int(), toWarehouseId: z.number().int(),
  lines: z.array(z.object({ variantId: z.number().int(), qty: z.number().int().positive() })).min(1),
  note: z.string().optional(),
});

/** Chuyen kho: cap chung tu OUT + IN trong 1 transaction (tuc thoi — xuong 1 dia diem). */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('inventory.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, 'Dữ liệu chuyển kho không hợp lệ');
  const d = b.data;
  if (d.fromWarehouseId === d.toWarehouseId) throw jsonError(400, 'Chọn 2 kho khác nhau.');
  const ref = `TK${Date.now().toString(36)}`;
  await prisma.$transaction(async (tx) => {
    await applyMovements(tx, { actor, warehouseId: d.fromWarehouseId, kind: 'TRANSFER_OUT',
      lines: d.lines, refType: 'transfer', refId: ref, note: d.note ?? undefined });
    await applyMovements(tx, { actor, warehouseId: d.toWarehouseId, kind: 'TRANSFER_IN',
      lines: d.lines, refType: 'transfer', refId: ref, note: d.note ?? undefined });
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'stock_transfer', entity: 'stock',
    entityId: ref, after: { from: d.fromWarehouseId, to: d.toWarehouseId, lines: d.lines.length }, ip, ua });
  return Response.json({ ok: true, ref });
});
