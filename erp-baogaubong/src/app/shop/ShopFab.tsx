/** Nut lien he noi (goc phai duoi) — Goi / Messenger / Zalo. Thong tin lay tu Cai dat thuong hieu. */
export default function ShopFab({ phone = '0376533857',
  messengerLink = 'https://www.facebook.com/xuonggaubaobao99',
  zaloLink = 'https://zalo.me/0376533857' }:
  { phone?: string; messengerLink?: string; zaloLink?: string }) {
  return (
    <div className="fixed bottom-24 right-3 z-40 flex flex-col items-center gap-3 md:bottom-6 md:right-5">
      {/* Goi dien */}
      <a href={`tel:${phone}`} aria-label="Gọi điện" className="relative flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
        <svg viewBox="0 0 24 24" className="relative h-6 w-6" fill="currentColor"><path d="M6.62 10.79a15.53 15.53 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.02l-2.2 2.2z"/></svg>
      </a>
      {/* Messenger (an neu chua cai link) */}
      {messengerLink && (
        <a href={messengerLink} target="_blank" rel="noreferrer" aria-label="Messenger"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0084FF] text-white shadow-lg">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor"><path d="M12 2C6.5 2 2 6.15 2 11.2c0 2.88 1.42 5.44 3.64 7.13V22l3.33-1.83c.89.25 1.83.38 2.8.38 5.5 0 10-4.15 10-9.2S17.5 2 12 2zm1.03 12.38l-2.55-2.72-4.98 2.72 5.47-5.8 2.61 2.72 4.92-2.72-5.49 5.8z"/></svg>
        </a>
      )}
      {/* Zalo (an neu chua cai link) */}
      {zaloLink && (
        <a href={zaloLink} target="_blank" rel="noreferrer" aria-label="Zalo"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-200">
          <span className="text-sm font-extrabold italic text-[#0068FF]">Zalo</span>
        </a>
      )}
    </div>
  );
}
