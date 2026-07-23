import Forbidden from '@/components/Forbidden';
import { getSessionUser } from '@/lib/auth';
export default async function WIP() {
  const user = await getSessionUser();
  if (!user?.perms.includes('production.view')) return <Forbidden />;
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <div className="text-4xl">🚧</div>
      <h1 className="mt-2 text-lg font-extrabold">Sản xuất</h1>
      <p className="mt-1 text-sm text-slate-500">Phân hệ này thuộc giai đoạn GĐ7 của kế hoạch và chưa được triển khai. Hệ thống không hiển thị dữ liệu giả.</p>
    </div>
  );
}
