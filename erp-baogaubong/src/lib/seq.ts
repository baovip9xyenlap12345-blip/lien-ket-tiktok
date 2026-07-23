// Cap ma tuan tu (KH0001, NCC0001, BG-...) — chong trung bang unique + transaction.
import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** Lay so tiep theo cho 1 day ma. Goi TRONG transaction cua nghiep vu de khong "chay so" khi rollback. */
export async function nextCode(tx: Tx, prefix: string, pad = 4, branchCode = '*', period = '*'): Promise<string> {
  // upsert tra ve ban ghi SAU khi tang → so vua cap = nextNo - 1 (ca 2 truong hop tao moi/tang).
  const row = await tx.documentSequence.upsert({
    where: { prefix_branchCode_period: { prefix, branchCode, period } },
    update: { nextNo: { increment: 1 } },
    create: { prefix, branchCode, period, nextNo: 2 },
  });
  return `${prefix}${String(row.nextNo - 1).padStart(pad, '0')}`;
}
