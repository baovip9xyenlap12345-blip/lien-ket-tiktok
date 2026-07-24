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
  const qs = (o: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q); if (categoryId) p.set('cat', String(categoryId));
    for (const [k, v] of Object.entries(o)) { if (v === undefined) p.delete(k); else p.set(k, String(v)); }
    return `/shop?${p.toString()}`;
  };

  return (
    <div>
      {/* Loc theo nhom hang */}
      {cats.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Link href="/shop" className={`rounded-full px-3 py-1 text-sm font-semibold ${!categoryId ? 'bg-pink-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>Tất cả</Link>
          {cats.map((c) => (
            <Link key={c.id} href={`/shop?cat=${c.id}`}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${categoryId === c.id ? 'bg-pink-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{c.name}</Link>
          ))}
        </div>
      )}

      {q && <p className="mb-2 text-sm text-slate-500">Kết quả cho “<b>{q}</b>”: {total} sản phẩm</p>}

      {cards.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center text-slate-400">Chưa có sản phẩm nào.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {cards.map((p) => (
            <Link key={p.id} href={`/shop/${encodeURIComponent(p.code)}`}
              className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:shadow-md">
              <div className="relative aspect-square bg-slate-100">
                {p.cover
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={shopImg(p.cover)!} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                  : <div className="flex h-full items-center justify-center text-4xl text-slate-300">🧸</div>}
                {p.hasVideo && <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-xs text-white">🎬</span>}
              </div>
              <div className="p-2">
                <div className="line-clamp-2 min-h-[2.5rem] text-sm">{p.name}</div>
                <div className="mt-1 font-extrabold text-pink-700">
                  {p.minPrice != null ? fmtVND(p.minPrice) : <span className="text-sm text-slate-400">Liên hệ</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link className="rounded bg-white px-3 py-1.5 ring-1 ring-slate-200" href={qs({ page: page - 1 })}>← Trước</Link>}
          <span className="px-2 font-bold">{page}/{pages}</span>
          {page < pages && <Link className="rounded bg-white px-3 py-1.5 ring-1 ring-slate-200" href={qs({ page: page + 1 })}>Sau →</Link>}
        </div>
      )}
    </div>
  );
}
