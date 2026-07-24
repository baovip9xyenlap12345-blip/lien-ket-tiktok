// Tien ich dung chung (server + client) cho gian hang.

/** Nguon anh/video: key noi bo -> API cong khai; link http -> giu nguyen. */
export function shopImg(key: string | null | undefined): string | null {
  if (!key) return null;
  return /^https?:\/\//.test(key) ? key : `/api/shop/media/${encodeURIComponent(key)}`;
}

/** Nhan dien link video de nhung (YouTube/TikTok) hoac phat truc tiep (file). */
export function videoEmbed(url: string | null | undefined): { kind: 'iframe' | 'file' | 'link'; src: string } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  if (/^https?:\/\//.test(url)) return { kind: 'link', src: url };
  return { kind: 'file', src: `/api/shop/media/${encodeURIComponent(url)}` };
}
