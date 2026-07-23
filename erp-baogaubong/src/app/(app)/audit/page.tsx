import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Forbidden from '@/components/Forbidden';
import { fmtDate } from '@/lib/format';

export default async function AuditPage({ searchParams }: { searchParams: { page?: string } }) {
  const user = await getSessionUser();
  if (!user?.perms.includes('audit.view')) return <Forbidden />;
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 50;
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { id: 'desc' }, skip: (page - 1) * take, take }),
    prisma.auditLog.count(),
  ]);
  return (
    <div>
      <h1 className="mb-4 text-xl font-extrabold">Nhật ký thao tác <span className="text-sm font-normal text-slate-400">({total} sự kiện)</span></h1>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th">Thời gian</th><th className="th">Người</th><th className="th">Hành động</th>
            <th className="th">Đối tượng</th><th className="th">IP</th></tr></thead>
          <tbody>{rows.map((a) => (
            <tr key={a.id}><td className="td whitespace-nowrap">{fmtDate(a.at)} {a.at.toTimeString().slice(0,8)}</td>
              <td className="td font-semibold">{a.actorName}</td><td className="td">{a.action}</td>
              <td className="td">{a.entity}{a.entityId ? `#${a.entityId}` : ''}</td>
              <td className="td text-xs text-slate-400">{a.ip ?? ''}</td></tr>))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2 text-sm">
        {page > 1 && <a className="btn-ghost" href={`?page=${page - 1}`}>← Trước</a>}
        {page * take < total && <a className="btn-ghost" href={`?page=${page + 1}`}>Sau →</a>}
      </div>
    </div>
  );
}
