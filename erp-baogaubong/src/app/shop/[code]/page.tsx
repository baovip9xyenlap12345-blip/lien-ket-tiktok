import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fmtVND } from '@/lib/format';
import { shopProductByCode, relatedProducts, listActivePromotions } from '@/modules/shop/data';
import { shopImg } from '@/modules/shop/util';
import ProductView from './ProductView';

export const revalidate = 30;   // trang chi tiet duoc luu 30s → dong khach khong nghen CSDL

export default async function ProductPage({ params }: { params: { code: string } }) {
  const p = await shopProductByCode(decodeURIComponent(params.code));
  if (!p) notFound();
  const [related, promos] = await Promise.all([relatedProducts(p.categoryId, p.id), listActivePromotions()]);
  return (
    <div>
      <Link href="/shop" className="mb-3 inline-block text-sm text-pink-700">← Về gian hàng</Link>
      <ProductView p={p} promos={promos} />

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-extrabold text-slate-800">🧸 Sản phẩm cùng loại</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((r) => (
              <Link key={r.id} href={`/shop/${encodeURIComponent(r.code)}`}
                className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  {r.cover
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={shopImg(r.cover)!} alt={r.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    : <div className="flex h-full items-center justify-center text-5xl text-slate-200">🧸</div>}
                </div>
                <div className="flex flex-1 flex-col p-2.5">
                  <div className="line-clamp-2 min-h-[2.5rem] text-sm text-slate-700 group-hover:text-pink-700">{r.name}</div>
                  <div className="mt-auto pt-1">
                    {r.minPrice != null
                      ? <span className="text-base font-extrabold text-pink-700">{fmtVND(r.minPrice)}đ</span>
                      : <span className="text-sm font-semibold text-slate-400">Liên hệ</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
