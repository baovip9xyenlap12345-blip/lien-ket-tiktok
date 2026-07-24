-- Nap san don vi tinh thong dung (san pham bat buoc co don vi). Idempotent theo code.
INSERT INTO "Unit" ("code","name") VALUES
  ('CAI','Cái'), ('CON','Con'), ('CHIEC','Chiếc'), ('BO','Bộ'),
  ('HOP','Hộp'), ('BICH','Bịch'), ('KG','Kg'), ('MET','Mét')
ON CONFLICT ("code") DO NOTHING;

-- Nap vai nhom hang goi y (chi khi chua co nhom nao) — khach co the them/sua sau.
INSERT INTO "Category" ("name")
SELECT v.name FROM (VALUES ('Gấu bông'), ('Thú nhồi bông'), ('Gấu in logo'), ('Quà tặng')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "deletedAt" IS NULL);
