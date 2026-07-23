-- CreateEnum
CREATE TYPE "CashAccountKind" AS ENUM ('CASH', 'BANK', 'COD');

-- CreateEnum
CREATE TYPE "CashTxKind" AS ENUM ('RECEIPT', 'PAYMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'REFUND');

-- CreateEnum
CREATE TYPE "CashTxStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cashTxId" INTEGER;

-- CreateTable
CREATE TABLE "CashAccount" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CashAccountKind" NOT NULL,
    "openingBalance" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashTransaction" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "CashTxKind" NOT NULL,
    "status" "CashTxStatus" NOT NULL DEFAULT 'APPROVED',
    "accountId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "partnerId" INTEGER,
    "partnerName" TEXT,
    "orderId" INTEGER,
    "reason" TEXT,
    "note" TEXT,
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL,
    "transferGroup" TEXT,
    "refundOfId" INTEGER,
    "idempotencyKey" TEXT,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodLock" (
    "period" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT true,
    "lockedById" INTEGER NOT NULL,
    "lockedByName" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "PeriodLock_pkey" PRIMARY KEY ("period")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashAccount_code_key" ON "CashAccount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CashTransaction_code_key" ON "CashTransaction"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CashTransaction_idempotencyKey_key" ON "CashTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CashTransaction_accountId_period_idx" ON "CashTransaction"("accountId", "period");

-- CreateIndex
CREATE INDEX "CashTransaction_orderId_idx" ON "CashTransaction"("orderId");

-- CreateIndex
CREATE INDEX "CashTransaction_partnerId_idx" ON "CashTransaction"("partnerId");

-- CreateIndex
CREATE INDEX "CashTransaction_happenedAt_idx" ON "CashTransaction"("happenedAt");

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_refundOfId_fkey" FOREIGN KEY ("refundOfId") REFERENCES "CashTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
