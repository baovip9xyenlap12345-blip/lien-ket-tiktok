// Doi van ban kieu markdown gon sang "khoi" (block) cua WordPress.
// Dung chung cho trang gioi thieu, bai blog va mo ta san pham.
//
// Cu phap ho tro:
//   ## Tieu de muc        -> h2          ### Tieu de nho   -> h3
//   - gach dau dong       -> danh sach   > cau trich       -> blockquote
//   **dam**  *nghieng*    -> in dam / in nghieng
//   [ANH]                 -> chen tam anh tiep theo vao dung cho do

export const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Escape truoc roi moi doi ** -> the HTML (dau * khong bi escape nen an toan)
export const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

export function khoiAnh(a) {
  return `<!-- wp:image {"id":${a.id},"sizeSlug":"large","linkDestination":"none"} -->\n` +
    `<figure class="wp-block-image size-large">` +
    `<img src="${esc(a.url)}" alt="${esc(a.alt || '')}" class="wp-image-${a.id}"/></figure>\n` +
    `<!-- /wp:image -->`;
}

export function khoiThuVienAnh(ds) {
  if (!ds.length) return '';
  if (ds.length === 1) return khoiAnh(ds[0]);
  return `<!-- wp:gallery {"linkTo":"none"} -->\n` +
    `<figure class="wp-block-gallery has-nested-images columns-default is-cropped">\n` +
    ds.map(khoiAnh).join('\n') + `\n</figure>\n<!-- /wp:gallery -->`;
}

// vanBan -> chuoi khoi WordPress. anh = danh sach anh da tai len, dung cho [ANH].
// Tra ve { noiDung, soAnhDaDung } de ben goi biet anh nao con thua.
export function docSangKhoi(vanBan, anh = []) {
  const khoi = [];
  let stt = 0;

  for (const doan of String(vanBan).split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)) {
    if (doan === '[ANH]') {
      if (anh[stt]) khoi.push(khoiAnh(anh[stt++]));
      continue;
    }
    if (/^###\s+/.test(doan)) {
      khoi.push(`<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading">${inline(doan.replace(/^###\s+/, ''))}</h3>\n<!-- /wp:heading -->`);
      continue;
    }
    if (/^##\s+/.test(doan)) {
      khoi.push(`<!-- wp:heading -->\n<h2 class="wp-block-heading">${inline(doan.replace(/^##\s+/, ''))}</h2>\n<!-- /wp:heading -->`);
      continue;
    }
    if (/^>\s+/.test(doan)) {
      const t = doan.split('\n').map(l => l.replace(/^>\s?/, '')).join(' ');
      khoi.push(`<!-- wp:quote -->\n<blockquote class="wp-block-quote"><p>${inline(t)}</p></blockquote>\n<!-- /wp:quote -->`);
      continue;
    }
    // Ca doan deu la dong gach dau dong -> danh sach
    const dong = doan.split('\n').map(s => s.trim()).filter(Boolean);
    if (dong.length && dong.every(l => /^[-*+]\s+/.test(l))) {
      const li = dong.map(l => `<li>${inline(l.replace(/^[-*+]\s+/, ''))}</li>`).join('');
      khoi.push(`<!-- wp:list -->\n<ul class="wp-block-list">${li}</ul>\n<!-- /wp:list -->`);
      continue;
    }
    khoi.push(`<!-- wp:paragraph -->\n<p>${inline(doan.replace(/\n/g, ' '))}</p>\n<!-- /wp:paragraph -->`);
  }

  return { noiDung: khoi.join('\n\n'), soAnhDaDung: stt };
}
