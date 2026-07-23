import { Prisma } from '@prisma/client';
import { prisma } from './db';
type Json = Prisma.InputJsonValue | null;
export async function audit(opts: {
  actorId?: number | null; actorName: string; action: string; entity: string;
  entityId?: string; before?: Json; after?: Json; ip?: string; ua?: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: opts.actorId ?? null, actorName: opts.actorName, action: opts.action,
      entity: opts.entity, entityId: opts.entityId,
      before: opts.before ?? undefined,
      after: opts.after ?? undefined,
      ip: opts.ip, ua: opts.ua,
    },
  });
}
