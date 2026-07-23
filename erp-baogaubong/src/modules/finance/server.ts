// Phan dung DB cua phan he Tai chinh. MOI thao tac tien di qua createCashTx:
// - chay trong database transaction cua nghiep vu goi no
// - idempotency key: request lap tra ve chung tu cu, khong ghi doi
// - chan ghi vao ky da khoa so
// - phieu chi cua nguoi khong co quyen duyet → PENDING (chua tinh vao so du)
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { jsonError, type SessionUser } from '@/lib/auth';
import { nextCode } from '@/lib/seq';
import { periodOf, assertPeriodOpen } from './domain';

type Tx = Prisma.TransactionClient;

export const KIND_PREFIX: Record<string, string> = {
  RECEIPT: 'PT-', PAYMENT: 'PC-', TRANSFER_IN: 'CQ-', TRANSFER_OUT: 'CQ-', REFUND: 'HT-' };

export async function lockedPeriods(tx: Tx): Promise<Set<string>> {
  const rows = await tx.periodLock.findMany({ where: { locked: true }, select: { period: true } });
  return new Set(rows.map((r) => r.period));
}

export async function createCashTx(tx: Tx, opts: {
  actor: SessionUser;
  kind: 'RECEIPT' | 'PAYMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'REFUND';
  accountId: number; amount: number;
  partnerId?: number | null; partnerName?: string | null; orderId?: number | null;
  reason?: string | null; note?: string | null; happenedAt?: Date;
  transferGroup?: string | null; refundOfId?: number | null;
  idempotencyKey?: string | null;
  code?: string;              // dung chung ma voi Payment cua don (neu co)
  forceApproved?: boolean;    // chuyen quy/hoan tien: da qua kiem tra rieng
}) {
  if (!Number.isInteger(opts.amount) || opts.amount <= 0) {
    throw jsonError(400, 'Số tiền phải là số nguyên VND > 0.');
  }
  if (opts.idempotencyKey) {
    const dup = await tx.cashTransaction.findUnique({ where: { idempotencyKey: opts.idempotencyKey } });
    if (dup) return { tx: dup, duplicated: true };
  }
  const acc = await tx.cashAccount.findFirst({ where: { id: opts.accountId, active: true } });
  if (!acc) throw jsonError(400, 'Quỹ không tồn tại hoặc đã khóa.');
  const happenedAt = opts.happenedAt ?? new Date();
  try { assertPeriodOpen(await lockedPeriods(tx), happenedAt); }
  catch (e) { throw jsonError(400, (e as Error).message); }
  const needApproval = opts.kind === 'PAYMENT' && !opts.forceApproved && !opts.actor.perms.includes('finance.approve');
  const code = opts.code ?? await nextCode(tx, KIND_PREFIX[opts.kind]);
  const row = await tx.cashTransaction.create({ data: {
    code, kind: opts.kind, status: needApproval ? 'PENDING' : 'APPROVED',
    accountId: acc.id, amount: opts.amount,
    partnerId: opts.partnerId ?? null, partnerName: opts.partnerName ?? null,
    orderId: opts.orderId ?? null, reason: opts.reason ?? null, note: opts.note ?? null,
    happenedAt, period: periodOf(happenedAt),
    transferGroup: opts.transferGroup ?? null, refundOfId: opts.refundOfId ?? null,
    idempotencyKey: opts.idempotencyKey ?? null,
    approvedById: needApproval ? null : opts.actor.id,
    approvedAt: needApproval ? null : new Date(),
    createdById: opts.actor.id, createdByName: opts.actor.name } });
  return { tx: row, duplicated: false };
}

/** Map phuong thuc thanh toan GD4 → quy mac dinh. */
export async function accountForMethod(tx: Tx, method: 'CASH' | 'TRANSFER'): Promise<number> {
  const kind = method === 'CASH' ? 'CASH' : 'BANK';
  const acc = await tx.cashAccount.findFirst({ where: { kind: kind as never, active: true }, orderBy: { id: 'asc' } });
  if (!acc) throw jsonError(400, `Chưa có quỹ loại ${kind === 'CASH' ? 'tiền mặt' : 'ngân hàng'} — tạo trong Giao dịch & quỹ.`);
  return acc.id;
}
