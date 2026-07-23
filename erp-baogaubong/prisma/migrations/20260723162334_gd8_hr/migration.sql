-- CreateEnum
CREATE TYPE "HrTaskStatus" AS ENUM ('OPEN', 'DOING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HrTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "CommissionBasis" AS ENUM ('REVENUE', 'COLLECTED');

-- CreateEnum
CREATE TYPE "CommissionPeriodStatus" AS ENUM ('LOCKED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "userId" INTEGER NOT NULL,
    "position" TEXT,
    "joinDate" TIMESTAMP(3),
    "baseSalary" INTEGER NOT NULL DEFAULT 0,
    "allowance" INTEGER NOT NULL DEFAULT 0,
    "bankAccount" TEXT,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "TimesheetEntry" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "day" DECIMAL(3,2) NOT NULL,
    "note" TEXT,
    "byId" INTEGER NOT NULL,
    "byName" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrTask" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "assigneeId" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3),
    "priority" "HrTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "HrTaskStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiTarget" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "targetRevenue" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "KpiTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" SERIAL NOT NULL,
    "version" INTEGER NOT NULL,
    "basis" "CommissionBasis" NOT NULL DEFAULT 'REVENUE',
    "pct" DECIMAL(5,2) NOT NULL,
    "note" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPeriod" (
    "id" SERIAL NOT NULL,
    "period" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "basis" "CommissionBasis" NOT NULL,
    "pct" DECIMAL(5,2) NOT NULL,
    "status" "CommissionPeriodStatus" NOT NULL DEFAULT 'LOCKED',
    "lockedById" INTEGER NOT NULL,
    "lockedByName" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionLine" (
    "id" SERIAL NOT NULL,
    "periodId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "base" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "CommissionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollSlip" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "baseSalary" INTEGER NOT NULL DEFAULT 0,
    "workDays" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "standardDays" INTEGER NOT NULL DEFAULT 26,
    "salaryByDays" INTEGER NOT NULL DEFAULT 0,
    "allowance" INTEGER NOT NULL DEFAULT 0,
    "commission" INTEGER NOT NULL DEFAULT 0,
    "bonus" INTEGER NOT NULL DEFAULT 0,
    "penalty" INTEGER NOT NULL DEFAULT 0,
    "advance" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "cashTxId" INTEGER,
    "approvedById" INTEGER,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollSlip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetEntry_userId_date_key" ON "TimesheetEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "HrTask_assigneeId_status_idx" ON "HrTask"("assigneeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "KpiTarget_userId_period_key" ON "KpiTarget"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRule_version_key" ON "CommissionRule"("version");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPeriod_period_key" ON "CommissionPeriod"("period");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionLine_periodId_userId_key" ON "CommissionLine"("periodId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollSlip_code_key" ON "PayrollSlip"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollSlip_userId_period_key" ON "PayrollSlip"("userId", "period");

-- AddForeignKey
ALTER TABLE "CommissionLine" ADD CONSTRAINT "CommissionLine_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CommissionPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
