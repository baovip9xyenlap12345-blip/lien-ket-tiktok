-- CreateEnum
CREATE TYPE "DesignStatus" AS ENUM ('OPEN', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DesignVersionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductionStatus2" AS ENUM ('DRAFT', 'RELEASED', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductionStage" AS ENUM ('PREP', 'CUT', 'SEW', 'STUFF', 'FINISH', 'QC', 'PACK');

-- AlterTable
ALTER TABLE "StockReservation" ADD COLUMN     "prodId" INTEGER,
ALTER COLUMN "orderId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "DesignRequest" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "partnerId" INTEGER,
    "partnerName" TEXT,
    "orderId" INTEGER,
    "status" "DesignStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignVersion" (
    "id" SERIAL NOT NULL,
    "designId" INTEGER NOT NULL,
    "no" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "note" TEXT,
    "status" "DesignVersionStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" INTEGER,
    "decidedByName" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decideNote" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignComment" (
    "id" SERIAL NOT NULL,
    "versionId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "byId" INTEGER NOT NULL,
    "byName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "orderId" INTEGER,
    "variantId" INTEGER NOT NULL,
    "bomVersionId" INTEGER,
    "designVersionId" INTEGER,
    "overrideNote" TEXT,
    "warehouseId" INTEGER NOT NULL,
    "qtyPlanned" INTEGER NOT NULL,
    "qtyGood" INTEGER NOT NULL DEFAULT 0,
    "qtyDefect" INTEGER NOT NULL DEFAULT 0,
    "qtyScrap" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductionStatus2" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "materialsIssued" BOOLEAN NOT NULL DEFAULT false,
    "finishedReceipted" BOOLEAN NOT NULL DEFAULT false,
    "costEstimate" INTEGER NOT NULL DEFAULT 0,
    "costActual" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionStep" (
    "id" SERIAL NOT NULL,
    "prodId" INTEGER NOT NULL,
    "stage" "ProductionStage" NOT NULL,
    "qtyGood" INTEGER NOT NULL DEFAULT 0,
    "qtyDefect" INTEGER NOT NULL DEFAULT 0,
    "qtyRework" INTEGER NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "note" TEXT,
    "checklist" JSONB,
    "byId" INTEGER NOT NULL,
    "byName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcChecklist" (
    "id" SERIAL NOT NULL,
    "productType" "ProductType" NOT NULL,
    "items" TEXT[],

    CONSTRAINT "QcChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DesignRequest_code_key" ON "DesignRequest"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DesignVersion_designId_no_key" ON "DesignVersion"("designId", "no");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_code_key" ON "ProductionOrder"("code");

-- CreateIndex
CREATE INDEX "ProductionOrder_status_dueDate_idx" ON "ProductionOrder"("status", "dueDate");

-- CreateIndex
CREATE INDEX "ProductionStep_prodId_stage_idx" ON "ProductionStep"("prodId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "QcChecklist_productType_key" ON "QcChecklist"("productType");

-- AddForeignKey
ALTER TABLE "DesignVersion" ADD CONSTRAINT "DesignVersion_designId_fkey" FOREIGN KEY ("designId") REFERENCES "DesignRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignComment" ADD CONSTRAINT "DesignComment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "DesignVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_designVersionId_fkey" FOREIGN KEY ("designVersionId") REFERENCES "DesignVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionStep" ADD CONSTRAINT "ProductionStep_prodId_fkey" FOREIGN KEY ("prodId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
