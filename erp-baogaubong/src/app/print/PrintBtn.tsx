'use client';
export default function PrintBtn() {
  return (
    <div className="print:hidden fixed right-4 top-4 flex gap-2">
      <button className="rounded-xl bg-pink-700 px-4 py-2 font-bold text-white shadow"
        onClick={() => window.print()}>🖨️ In / Lưu PDF</button>
      <button className="rounded-xl bg-slate-200 px-4 py-2 font-bold shadow"
        onClick={() => window.close()}>Đóng</button>
    </div>
  );
}
