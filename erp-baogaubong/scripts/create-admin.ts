/* Tao Admin DAU TIEN cho production (khong seed du lieu demo):
 *   ADMIN_USER=chuxuong ADMIN_PASS='MatKhauManh!' npx tsx scripts/create-admin.ts
 * Chi tao khi chua co user nao — khong ghi de tai khoan dang ton tai. */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSIONS, ROLE_DEFAULTS } from '../src/lib/rbac';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASS;
  if (!username || !password || password.length < 8) {
    throw new Error('Cần ADMIN_USER và ADMIN_PASS (>= 8 ký tự) trong biến môi trường.');
  }
  const count = await prisma.user.count();
  if (count > 0) throw new Error(`Đã có ${count} tài khoản — không tạo admin đầu tiên nữa.`);
  const company = await prisma.company.findFirst()
    ?? await prisma.company.create({ data: { name: 'Bảo Gấu Bông' } });
  const branch = await prisma.branch.findFirst()
    ?? await prisma.branch.create({ data: { companyId: company.id, code: 'CN1', name: 'Xưởng chính' } });
  await prisma.warehouse.findFirst()
    ?? await prisma.warehouse.create({ data: { branchId: branch.id, code: 'K1', name: 'Kho xưởng' } });
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({ where: { code: p.code }, update: { name: p.name }, create: p });
  }
  const allPerms = await prisma.permission.findMany();
  for (const [code, def] of Object.entries(ROLE_DEFAULTS)) {
    const role = await prisma.role.upsert({ where: { code },
      update: { name: def.name }, create: { code, name: def.name, isSystem: true } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: allPerms.filter((p) => def.perms.includes(p.code)).map((p) => ({ roleId: role.id, permissionId: p.id })) });
  }
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'admin' } });
  await prisma.user.create({ data: { username, name: 'Chủ xưởng',
    passwordHash: await bcrypt.hash(password, 10), roleId: adminRole.id,
    branchId: branch.id, scope: 'ALL' } });
  for (const [k, v] of Object.entries({ vat_percent: 8, doc_prefix: 'BG', session_idle_min: 30,
    max_discount_pct: 10, standard_work_days: 26, payroll_create_pc: 1 })) {
    await prisma.setting.upsert({ where: { key: k }, update: {}, create: { key: k, value: { v } } });
  }
  console.log(`✅ Đã tạo admin "${username}" + vai trò/quyền/cài đặt mặc định. KHÔNG có dữ liệu demo.`);
}
main().finally(() => prisma.$disconnect());
