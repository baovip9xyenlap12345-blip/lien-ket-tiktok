import Link from 'next/link';
import { fmtVND } from '@/lib/format';
import { listShopProducts, shopCategories } from '@/modules/shop/data';
import { shopImg } from '@/modules/shop/util';

export const dynamic = 'force-dynamic';

export default async function ShopHome({ searchParams }: { searchParams: { q?: string; cat?: string; page?: string } }) {
  const q = searchParams.q?.trim() || undefined;
  const categoryId = searchParams.cat ? Number(searchParams.cat) : undefined;
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const [{ cards, total, take }, cats] = await Promise.all([
    listShopProducts({ q, categoryId, page }), shopCategories(),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));
  const activeCat = cats.find((c) => c.id === categoryId);

  return (
    <div>
      {/* Banner + cam ket (chi hien o trang chu, khong loc/tim) */}
      {!q && !categoryId && (
        <section className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-pink-600 to-rose-500 p-5 text-white shadow-sm sm:p-8">
          <h1 className="text-2xl font-extrabold sm:text-3xl">🧸 Xưởng Gấu Bảo</h1>
          <p className="mt-1 max-w-xl text-pink-100">Gấu bông chính xưởng · Nhận in thêu logo theo yêu cầu · Giao tận nơi toàn quốc, thanh toán khi nhận hàng.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">✅ Chính xưởng, giá gốc</span>
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">🚚 Giao toàn quốc</span>
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">💵 Nhận hàng trả tiền (COD)</span>
            <a href="tel:0376533857" className="rounded-full bg-white px-3 py-1 font-bold text-pink-700">📞 0376.533.857</a>
          </div>
        </section>
      )}

      {/* Danh muc */}
      {cats.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-sm font-extrabold text-slate-700">Danh mục sản phẩm</div>
          <div className="flex flex-wrap gap-2">
            <Link href="/shop" className={`rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm ${!categoryId ? 'bg-pink-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-pink-300'}`}>Tất cả</Link>
            {cats.map((c) => (
              <Link key={c.id} href={`/shop?cat=${c.id}`}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm ${categoryId === c.id ? 'bg-pink-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-pink-300'}`}>{c.name}</Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-lg font-extrabold text-slate-800">
          {q ? `Kết quả cho “${q}”` : activeCat ? activeCat.name : '🔥 Sản phẩm nổi bật'}
        </h2>
        <span className="text-sm text-slate-400">{total} sản phẩm</span>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center text-slate-400 shadow-sm">
          <div className="text-4xl">🧸</div>
          <p className="mt-2">Chưa có sản phẩm nào{q ? ' khớp tìm kiếm' : ''}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((p) => (
            <Link key={p.id} href={`/shop/${encodeURIComponent(p.code)}`}
              className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="relative aspect-square overflow-hidden bg-slate-100">
                {p.cover
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={shopImg(p.cover)!} alt={p.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  : <div className="flex h-full items-center justify-center text-5xl text-slate-200">🧸</div>}
                {p.hasVideo && <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">🎬 Video</span>}
                {p.stock > 0
                  ? <span className="absolute left-1.5 top-1.5 rounded bg-green-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">Còn hàng</span>
                  : p.minPrice != null && <span className="absolute left-1.5 top-1.5 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">Đặt trước</span>}
              </div>
              <div className="flex flex-1 flex-col p-2.5">
                <div className="line-clamp-2 min-h-[2.5rem] text-sm text-slate-700 group-hover:text-pink-700">{p.name}</div>
                <div className="mt-auto pt-1">
                  {p.minPrice != null
                    ? <span className="text-base font-extrabold text-pink-700">{fmtVND(p.minPrice)}đ</span>
                    : <span className="text-sm font-semibold text-slate-400">Liên hệ</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link className="rounded-lg bg-white px-4 py-2 font-semibold shadow-sm ring-1 ring-slate-200" href={`/shop?${new URLSearchParams({ ...(q ? { q } : {}), ...(categoryId ? { cat: String(categoryId) } : {}), page: String(page - 1) })}`}>← Trước</Link>}
          <span className="px-2 font-bold text-slate-600">{page}/{pages}</span>
          {page < pages && <Link className="rounded-lg bg-white px-4 py-2 font-semibold shadow-sm ring-1 ring-slate-200" href={`/shop?${new URLSearchParams({ ...(q ? { q } : {}), ...(categoryId ? { cat: String(categoryId) } : {}), page: String(page + 1) })}`}>Sau →</Link>}
        </div>
      )}
    </div>
  );
}
