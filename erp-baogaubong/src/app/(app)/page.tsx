import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export default async function Dashboard() {
  const user = await getSessionUser();
  const [users, branches, warehouses, audits] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.branch.count({ where: { deletedAt: null } }),
    prisma.warehouse.count({ where: { deletedAt: null } }),
    prisma.auditLog.count(),
  ]);
  const cards = [
    ['👥 Tài khoản', users], ['🏢 Chi nhánh', branches], ['📦 Kho', warehouses], ['📜 Sự kiện nhật ký', audits],
  ] as const;
  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold">Tổng quan</h1>
      <p className="mb-4 text-sm text-slate-500">Xin chào <b>{user?.name}</b> ({user?.roleName}).
        Số liệu bán hàng sẽ hiển thị khi phân hệ Bán hàng hoàn thành (GĐ4) — hệ thống không hiển thị số liệu giả.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([label, v]) => (
          <div key={label} className="card p-4">
            <div className="text-xs font-bold text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
