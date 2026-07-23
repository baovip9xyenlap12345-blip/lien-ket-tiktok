/* Seed du lieu GD1 — CHI DUNG CHO MOI TRUONG DEV/DEMO */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSIONS, ROLE_DEFAULTS } from '../src/lib/rbac';
import { seedCatalog } from './seed-catalog';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { id: 1 }, update: {},
    create: { name: 'Bảo Gấu Bông', phone: '0876.123.333', web: 'baogaubong.vn',
      address: 'Phủ Yên 3, Yên Lập, Vĩnh Tường, Vĩnh Phúc' },
  });
  const branch = await prisma.branch.upsert({
    where: { code: 'CN1' }, update: {},
    create: { companyId: company.id, code: 'CN1', name: 'Xưởng chính' },
  });
  await prisma.warehouse.upsert({
    where: { code: 'K1' }, update: {}, create: { branchId: branch.id, code: 'K1', name: 'Kho xưởng' },
  });
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({ where: { code: p.code }, update: { name: p.name }, create: p });
  }
  const allPerms = await prisma.permission.findMany();
  for (const [code, def] of Object.entries(ROLE_DEFAULTS)) {
    const role = await prisma.role.upsert({
      where: { code }, update: { name: def.name }, create: { code, name: def.name, isSystem: true },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: allPerms.filter((p) => def.perms.includes(p.code)).map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }
  const roles = Object.fromEntries((await prisma.role.findMany()).map((r) => [r.code, r.id]));
  const demoPass = await bcrypt.hash('Baobao@2026', 10); // MAT KHAU DEMO — chi dung local!
  const demo: [string, string, string, 'OWN'|'ALL'|'BRANCH'][] = [
    ['admin', 'Chủ xưởng', 'admin', 'ALL'],
    ['sale1', 'NV Sale demo', 'sale', 'OWN'],
    ['ketoan1', 'NV Kế toán demo', 'ketoan', 'ALL'],
    ['kho1', 'NV Kho demo', 'kho', 'BRANCH'],
    ['cskh1', 'NV CSKH demo', 'cskh', 'OWN'],
  ];
  for (const [username, name, role, scope] of demo) {
    await prisma.user.upsert({
      where: { username }, update: { roleId: roles[role] },
      create: { username, name, passwordHash: demoPass, roleId: roles[role], branchId: branch.id, scope },
    });
  }
  const defaults: Record<string, string | number> = { vat_percent: 8, doc_prefix: 'BG', session_idle_min: 30, max_discount_pct: 10 };
  for (const [k, v] of Object.entries(defaults)) {
    await prisma.setting.upsert({ where: { key: k }, update: {}, create: { key: k, value: { v } } });
  }
  console.log('Seed xong: 5 tai khoan demo (mat khau Baobao@2026 — CHI DUNG LOCAL).');
  await seedCatalog(prisma);
  // GD3: nhom khach mac dinh (khong seed khach gia — CRM bat dau rong)
  for (const name of ['Khách lẻ', 'Khách sỉ', 'Đại lý']) {
    await prisma.partnerGroup.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log('Seed GD3: 3 nhom khach mac dinh.');
}
main().finally(() => prisma.$disconnect());
