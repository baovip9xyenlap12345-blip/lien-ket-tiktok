-- Luu cau truc nhom phan loai (Shopee-style): [{name, options[]}]
ALTER TABLE "Product" ADD COLUMN "variantGroups" JSONB;
