import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const GET = guarded(async () => {
  await requirePerm('finance.view');
  const rows = await prisma.periodLock.findMany({ orderBy: { period: 'desc' } });
  return Response.json({ ok: true, rows });
});

const In = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Kỳ phải dạng YYYY-MM'),
  lock: z.boolean(),
  note: z.string().trim().optional(),
});

/** Khoa/mo khoa so ky. Mo khoa BAT BUOC co ly do + ghi audit. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('finance.approve');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  if (!d.lock && !d.note?.trim()) throw jsonError(400, 'Mở khóa sổ bắt buộc ghi lý do.');
  const before = await prisma.periodLock.findUnique({ where: { period: d.period } });
  await prisma.periodLock.upsert({ where: { period: d.period },
    update: { locked: d.lock, lockedById: actor.id, lockedByName: actor.name,
      lockedAt: new Date(), note: d.note ?? null },
    create: { period: d.period, locked: d.lock, lockedById: actor.id,
      lockedByName: actor.name, note: d.note ?? null } });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name,
    action: d.lock ? 'period_lock' : 'period_unlock', entity: 'period', entityId: d.period,
    before: before ? { locked: before.locked } : null,
    after: { locked: d.lock, note: d.note }, ip, ua });
  return Response.json({ ok: true });
});
