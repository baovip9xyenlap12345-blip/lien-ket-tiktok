-- Nhan vien kiem nhieu vai tro: bang noi User <-> Role (nhieu-nhieu) — Prisma implicit M2M.
-- A = Role.id, B = User.id (Prisma sap xep theo ten model: Role < User).
CREATE TABLE "_UserExtraRoles" (
  "A" INTEGER NOT NULL,
  "B" INTEGER NOT NULL
);
CREATE UNIQUE INDEX "_UserExtraRoles_AB_unique" ON "_UserExtraRoles"("A", "B");
CREATE INDEX "_UserExtraRoles_B_index" ON "_UserExtraRoles"("B");
ALTER TABLE "_UserExtraRoles" ADD CONSTRAINT "_UserExtraRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_UserExtraRoles" ADD CONSTRAINT "_UserExtraRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
