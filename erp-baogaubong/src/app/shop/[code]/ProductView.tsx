'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtVND } from '@/lib/format';
import { shopImg, videoEmbed } from '@/modules/shop/util';
import type { ShopDetail } from '@/modules/shop/data';
import { addToCart } from '../cart';

export default function ProductView({ p }: { p: ShopDetail }) {
  const router = useRouter();
  const gallery = p.images.length ? p.images : [];
  const [main, setMain] = useState(0);
  const sellable = p.variants.filter((v) => v.price != null && v.price > 0);
  const [variantId, setVariantId] = useState<number | null>(sellable[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const v = p.variants.find((x) => x.id === variantId) ?? null;
  const price = v?.price ?? p.minPrice ?? null;
  const vid = videoEmbed(p.videoUrl);

  function optText(x: typeof p.variants[number]) { return [x.size, x.color].filter(Boolean).join(' · ') || x.sku; }
  function add(goCart: boolean) {
    if (!v || v.price == null || v.price <= 0) { setMsg('Vui lòng chọn phân loại có giá.'); return; }
    addToCart({ variantId: v.id, code: p.code, name: p.name, opt: optText(v),
      price: v.price, qty, cover: gallery[0] ?? null });
    if (goCart) router.push('/shop/cart');
    else { setMsg('✅ Đã thêm vào giỏ!'); setTimeout(() => setMsg(''), 2000); }
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* Thu vien anh */}
      <div>
        <div className="aspect-square overflow-hidden rounded-xl bg-white ring-1 ring-slate-100">
          {gallery[main]
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={shopImg(gallery[main])!} alt={p.name} className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-6xl text-slate-200">🧸</div>}
        </div>
        {gallery.length > 1 && (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {gallery.map((g, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={g + i} src={shopImg(g)!} alt="" onClick={() => setMain(i)}
                className={`h-14 w-14 shrink-0 cursor-pointer rounded-lg object-cover ring-2 ${i === main ? 'ring-pink-600' : 'ring-transparent'}`} />
            ))}
          </div>
        )}
        {vid && (
          <div className="mt-3">
            <div className="mb-1 text-sm font-bold">🎬 Video sản phẩm</div>
            {vid.kind === 'iframe' && <iframe className="aspect-video w-full rounded-lg" src={vid.src} allowFullScreen />}
            {vid.kind === 'file' && <video className="w-full rounded-lg" src={vid.src} controls />}
            {vid.kind === 'link' && <a className="text-pink-700 underline" href={vid.src} target="_blank" rel="noreferrer">Xem video</a>}
          </div>
        )}
      </div>

      {/* Thong tin + mua */}
      <div>
        <h1 className="text-xl font-extrabold">{p.name}</h1>
        {p.categoryName && <div className="mt-1 text-sm text-slate-400">{p.categoryName}</div>}
        <div className="mt-2 text-2xl font-extrabold text-pink-700">
          {price != null ? fmtVND(price) : <span className="text-base text-slate-400">Liên hệ 0876.123.333</span>}
        </div>

        {p.variants.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 text-sm font-bold">Phân loại</div>
            <div className="flex flex-wrap gap-2">
              {p.variants.map((x) => {
                const ok = x.price != null && x.price > 0;
                return (
                  <button key={x.id} disabled={!ok} onClick={() => setVariantId(x.id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${variantId === x.id ? 'border-pink-600 bg-pink-50 font-bold text-pink-700' : 'border-slate-200 bg-white'} ${!ok ? 'cursor-not-allowed opacity-40' : ''}`}>
                    {optText(x)}{!ok && ' (hết)'}
                  </button>);
              })}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm font-bold">Số lượng</span>
          <div className="flex items-center rounded-lg border">
            <button className="px-3 py-1 text-lg" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <input className="w-12 border-x py-1 text-center" inputMode="numeric" value={qty}
              onChange={(e) => setQty(Math.max(1, +e.target.value.replace(/\D/g, '') || 1))} />
            <button className="px-3 py-1 text-lg" onClick={() => setQty(qty + 1)}>＋</button>
          </div>
          <span className="text-sm text-slate-400">{p.unitName}</span>
        </div>

        {msg && <p className="mt-3 text-sm font-semibold text-green-600">{msg}</p>}

        <div className="mt-5 flex gap-3">
          <button onClick={() => add(false)} className="flex-1 rounded-xl border-2 border-pink-600 py-3 font-bold text-pink-700">🛒 Thêm vào giỏ</button>
          <button onClick={() => add(true)} className="flex-1 rounded-xl bg-pink-700 py-3 font-bold text-white">Mua ngay</button>
        </div>

        {p.desc && (
          <div className="mt-6">
            <div className="mb-1 font-bold">Mô tả sản phẩm</div>
            <p className="whitespace-pre-wrap text-sm text-slate-600">{p.desc}</p>
          </div>
        )}
      </div>
    </div>
  );
}
