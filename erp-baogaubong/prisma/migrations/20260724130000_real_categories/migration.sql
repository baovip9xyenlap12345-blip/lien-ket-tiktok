-- Bo cac nhom hang mau (neu chua gan san pham nao) va nap dung 5 nhom hang that cua xuong.
UPDATE "Category" SET "deletedAt" = now()
WHERE "name" IN ('Gấu bông', 'Thú nhồi bông', 'Gấu in logo', 'Quà tặng')
  AND "deletedAt" IS NULL
  AND "id" NOT IN (SELECT DISTINCT "categoryId" FROM "Product" WHERE "categoryId" IS NOT NULL);

INSERT INTO "Category" ("name")
SELECT v.name FROM (VALUES
  ('Gấu bông Quảng Châu'),
  ('Gấu bông sản xuất tại xưởng'),
  ('Gấu bông in thêu logo'),
  ('Gấu bông đặt theo yêu cầu'),
  ('Quà tặng in logo')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM "Category" c WHERE c."name" = v.name AND c."deletedAt" IS NULL);
