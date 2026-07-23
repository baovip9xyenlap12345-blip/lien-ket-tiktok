import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { balanceOf } from '@/modules/finance/domain';

export const GET = guarded(async () => {
  await requirePerm('finance.view');
  const accounts = await prisma.cashAccount.findMany({ orderBy: { id: 'asc' },
    include: { txs: { select: { kind: true, status: true, amount: true } } } });
  return Response.json({ ok: true, accounts: accounts.map((a) => ({
    id: a.id, code: a.code, name: a.name, kind: a.kind, active: a.active,
    openingBalance: a.openingBalance,
    balance: balanceOf(a.openingBalance, a.txs),
    pendingCount: a.txs.filter((t) => t.status === 'PENDING').length })) });
});

const In = z.object({ code: z.string().trim().min(2).max(10), name: z.string().trim().min(1),
  kind: z.enum(['CASH', 'BANK', 'COD']), openingBalance: z.number().int().min(0).default(0) });

export const POST = guarded(async (req) => {
  const actor = await requirePerm('finance.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const dup = await prisma.cashAccount.findUnique({ where: { code: b.data.code } });
  if (dup) throw jsonError(400, `Mã quỹ ${b.data.code} đã tồn tại.`);
  const a = await prisma.cashAccount.create({ data: b.data });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'cash_account_create',
    entity: 'cash_account', entityId: a.code, after: b.data, ip, ua });
  return Response.json({ ok: true, id: a.id });
});
