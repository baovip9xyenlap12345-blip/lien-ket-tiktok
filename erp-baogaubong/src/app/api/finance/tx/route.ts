import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { createCashTx } from '@/modules/finance/server';
import { paymentStatusOf } from '@/modules/sales/domain';

export const GET = guarded(async (req) => {
  await requirePerm('finance.view');
  const url = new URL(req.url);
  const accountId = Number(url.searchParams.get('accountId')) || 0;
  const kind = url.searchParams.get('kind') ?? '';
  const period = url.searchParams.get('period') ?? '';
  const q = url.searchParams.get('q')?.trim() ?? '';
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const take = 20;
  const where: Prisma.CashTransactionWhereInput = {
    ...(accountId ? { accountId } : {}),
    ...(kind ? { kind: kind as never } : {}),
    ...(period ? { period } : {}),
    ...(q ? { OR: [
      { code: { contains: q, mode: 'insensitive' } },
      { partnerName: { contains: q, mode: 'insensitive' } },
      { reason: { contains: q, mode: 'insensitive' } },
    ] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.cashTransaction.findMany({ where, include: { account: { select: { code: true, name: true } } },
      orderBy: { id: 'desc' }, skip: (page - 1) * take, take }),
    prisma.cashTransaction.count({ where }),
  ]);
  return Response.json({ ok: true, rows, total, page, take });
});

const In = z.object({
  kind: z.enum(['RECEIPT', 'PAYMENT']),
  accountId: z.number().int(),
  amount: z.number().int().positive('Số tiền phải > 0'),
  partnerId: z.number().int().nullable().optional(),
  partnerName: z.string().trim().optional().nullable(),
  orderId: z.number().int().nullable().optional(),
  reason: z.string().trim().min(1, 'Nhập lý do thu/chi'),
  note: z.string().optional().nullable(),
  idempotencyKey: z.string().trim().min(8).optional(),
});

/** Tao phieu thu / phieu chi. Phieu thu gan don se cap nhat cong no don do. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('finance.manage');
  const b = In.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const result = await prisma.$transaction(async (tx) => {
    let orderId: number | null = null;
    let amount = d.amount;
    let order = null;
    if (d.kind === 'RECEIPT' && d.orderId) {
      order = await tx.salesOrder.findFirst({ where: { id: d.orderId, deletedAt: null } });
      if (!order) throw jsonError(400, 'Đơn hàng gắn phiếu thu không tồn tại.');
      const remaining = order.total - order.paidAmt;
      if (remaining <= 0) throw jsonError(400, `Đơn ${order.code} đã thu đủ.`);
      amount = Math.min(amount, remaining);
      orderId = order.id;
    }
    const { tx: row, duplicated } = await createCashTx(tx, { actor, kind: d.kind,
      accountId: d.accountId, amount,
      partnerId: d.partnerId ?? order?.partnerId ?? null,
      partnerName: d.partnerName ?? order?.partnerName ?? null,
      orderId, reason: d.reason, note: d.note ?? null,
      idempotencyKey: d.idempotencyKey ?? null });
    if (duplicated) return { row, duplicated };
    if (order && d.kind === 'RECEIPT') {
      await tx.payment.create({ data: { code: row.code, orderId: order.id, partnerId: order.partnerId,
        amount, method: 'CASH', note: d.reason, cashTxId: row.id, createdById: actor.id } });
      const paidAmt = order.paidAmt + amount;
      await tx.salesOrder.update({ where: { id: order.id },
        data: { paidAmt, paymentStatus: paymentStatusOf(order.total, paidAmt) } });
    }
    return { row, duplicated };
  });
  if (!result.duplicated) {
    const { ip, ua } = reqMeta();
    await audit({ actorId: actor.id, actorName: actor.name,
      action: d.kind === 'RECEIPT' ? 'cash_receipt' : 'cash_payment',
      entity: 'cash_tx', entityId: result.row.code,
      after: { amount: result.row.amount, status: result.row.status, reason: d.reason }, ip, ua });
  }
  return Response.json({ ok: true, id: result.row.id, code: result.row.code,
    status: result.row.status, duplicated: result.duplicated });
});
