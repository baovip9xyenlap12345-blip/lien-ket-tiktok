// Khung chu de len video (drawtext textfile + reload=1): ghi file ATOMIC (tmp + rename)
// de ffmpeg khong bao gio doc phai file dang ghi do.
import fs from 'node:fs';
import path from 'node:path';

export function createOverlay(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const files = { title: path.join(dir, 'ov_title.txt'), price: path.join(dir, 'ov_price.txt'), cta: path.join(dir, 'ov_cta.txt') };

  function writeAtomic(file, text) {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, String(text ?? ''), 'utf8');
    fs.renameSync(tmp, file);
  }

  const money = v => v == null ? '' : Number(v).toLocaleString('vi-VN') + 'đ';
  // Font he thong khong co emoji -> bo emoji/ky tu ngoai BMP de khong hien o vuong;
  // gioi han do dai de chu khong tran mep man hinh 720px
  const clean = (s, max) => String(s ?? '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}️]/gu, '').trim().slice(0, max);

  return {
    files,
    // Hien thi 1 san pham: ten + gia (gach gia goc neu co khuyen mai) + CTA
    showProduct(p, cta) {
      writeAtomic(files.title, clean(p ? p.name : '', 36));
      if (p && p.promo_price != null && p.price != null) writeAtomic(files.price, `CHỈ ${money(p.promo_price)} (giá gốc ${money(p.price)})`);
      else if (p && (p.promo_price ?? p.price) != null) writeAtomic(files.price, money(p.promo_price ?? p.price));
      else writeAtomic(files.price, '');
      writeAtomic(files.cta, clean(cta || 'Bấm theo dõi shop để nhận ưu đãi', 60));
    },
    setCta(text) { writeAtomic(files.cta, clean(text, 60)); },
    clear() { writeAtomic(files.title, ''); writeAtomic(files.price, ''); writeAtomic(files.cta, ''); },
  };
}
