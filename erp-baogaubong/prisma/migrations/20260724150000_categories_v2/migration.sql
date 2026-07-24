-- Don cac nhom hang cu KHONG con san pham nao (giu nguyen nhom da gan san pham).
UPDATE "Category" SET "deletedAt" = now()
WHERE "deletedAt" IS NULL
  AND "id" NOT IN (SELECT DISTINCT "categoryId" FROM "Product" WHERE "categoryId" IS NOT NULL);

-- Nap 10 nhom hang thuc te cua xuong (chi them neu chua co ten do).
INSERT INTO "Category" ("name")
SELECT v.name FROM (VALUES
  ('Gấu bông in logo'),
  ('Gấu bông & thú nhồi bông'),
  ('Gấu bông hội chợ'),
  ('Quà tặng in logo'),
  ('Túi sách in logo'),
  ('Quần áo đồng phục'),
  ('Mũ in logo'),
  ('Gối ôm in logo'),
  ('Gấu bông Quảng Châu'),
  ('Phụ kiện (phi tiêu, bóng bay)')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM "Category" c WHERE c."name" = v.name AND c."deletedAt" IS NULL);
