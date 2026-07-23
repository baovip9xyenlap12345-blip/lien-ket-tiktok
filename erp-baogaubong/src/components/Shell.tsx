'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const MENU: { href: string; label: string; perm?: string; wip?: boolean }[] = [
  { href: '/', label: '🏠 Tổng quan', perm: 'dashboard.view' },
  { href: '/sales', label: '🧾 Bán hàng', perm: 'sales.view', wip: true },
  { href: '/catalog', label: '🧸 Sản phẩm', perm: 'catalog.view', wip: true },
  { href: '/inventory', label: '📦 Kho', perm: 'inventory.view', wip: true },
  { href: '/production', label: '🏭 Sản xuất', perm: 'production.view', wip: true },
  { href: '/partners', label: '🤝 Đối tác', perm: 'partner.view', wip: true },
  { href: '/finance', label: '💰 Giao dịch & quỹ', perm: 'finance.view', wip: true },
  { href: '/hr', label: '👷 Nhân viên', perm: 'hr.manage', wip: true },
  { href: '/reports', label: '📊 Báo cáo', perm: 'report.view', wip: true },
  { href: '/admin/users', label: '👥 Tài khoản', perm: 'user.manage' },
  { href: '/admin/roles', label: '🔑 Phân quyền', perm: 'role.manage' },
  { href: '/audit', label: '📜 Nhật ký', perm: 'audit.view' },
  { href: '/settings', label: '⚙️ Cài đặt', perm: 'setting.manage' },
];

export default function Shell({ user, children }:
  { user: { name: string; roleName: string; perms: string[] }; children: React.ReactNode }) {
  const path = usePathname(); const r = useRouter();
  const items = MENU.filter((m) => !m.perm || user.perms.includes(m.perm));
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); r.push('/login'); }
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 flex-col border-r border-slate-200 bg-white p-3 md:flex">
        <div className="px-2 py-3 text-lg font-extrabold text-brand">🧸 Bảo Gấu Bông</div>
        <nav className="flex-1 space-y-0.5">
          {items.map((m) => (
            <Link key={m.href} href={m.href}
              className={`block rounded-md px-3 py-2 text-sm font-semibold ${path === m.href ? 'bg-brand-soft text-brand' : 'text-slate-600 hover:bg-slate-50'}`}>
              {m.label}{m.wip && <span className="ml-1 text-[10px] text-slate-400">(đang phát triển)</span>}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-2 pt-3 text-xs">
          <div className="font-bold">{user.name}</div>
          <div className="text-slate-400">{user.roleName}</div>
          <button onClick={logout} className="mt-2 font-semibold text-red-600">🚪 Đăng xuất</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 md:hidden">
          <span className="font-extrabold text-brand">🧸 Bảo Gấu Bông</span>
          <button onClick={logout} className="text-sm font-semibold text-red-600">Đăng xuất</button>
        </header>
        <main className="p-4 pb-20 md:p-6">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white md:hidden">
          {items.slice(0, 5).map((m) => (
            <Link key={m.href} href={m.href}
              className={`flex-1 px-1 py-2 text-center text-[10px] font-semibold ${path === m.href ? 'text-brand' : 'text-slate-400'}`}>
              <span className="block text-lg">{m.label.split(' ')[0]}</span>{m.label.split(' ').slice(1).join(' ')}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
