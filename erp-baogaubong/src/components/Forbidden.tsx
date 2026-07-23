export default function Forbidden() {
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <div className="text-4xl">🔒</div>
      <h1 className="mt-2 text-lg font-extrabold">Không có quyền truy cập</h1>
      <p className="mt-1 text-sm text-slate-500">Tài khoản của bạn không được cấp quyền vào trang này. Liên hệ Admin nếu bạn cần quyền.</p>
    </div>
  );
}
