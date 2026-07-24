-- Gio hang cua khach: theo doi "da them gio nhung chua mua"
CREATE TABLE "ShopCartActivity" (
  "id" SERIAL PRIMARY KEY,
  "partnerId" INTEGER,
  "partnerName" TEXT NOT NULL,
  "phone" TEXT,
  "variantId" INTEGER NOT NULL,
  "productCode" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "optLabel" TEXT,
  "qty" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" INTEGER NOT NULL DEFAULT 0,
  "converted" BOOLEAN NOT NULL DEFAULT false,
  "convertedCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ShopCartActivity_converted_updatedAt_idx" ON "ShopCartActivity"("converted", "updatedAt");
CREATE INDEX "ShopCartActivity_partnerId_idx" ON "ShopCartActivity"("partnerId");

-- Khuyen mai / ma giam gia
CREATE TYPE "PromoType" AS ENUM ('PERCENT', 'AMOUNT');
CREATE TABLE "Promotion" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "PromoType" NOT NULL DEFAULT 'AMOUNT',
  "value" INTEGER NOT NULL DEFAULT 0,
  "minOrder" INTEGER NOT NULL DEFAULT 0,
  "maxDiscount" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "validFrom" TIMESTAMP(3),
  "validTo" TIMESTAMP(3),
  "imageUrl" TEXT,
  "videoUrl" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");
CREATE INDEX "Promotion_active_idx" ON "Promotion"("active");
