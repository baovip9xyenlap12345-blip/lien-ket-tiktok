// Sinh kich ban MC ban hang bang LLM (OpenAI-compatible chat completions).
// Co du phong template: neu API loi thi stream VAN tiep tuc noi bang kich ban mau + du lieu san pham.
const VN_TIME = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
const money = v => v == null ? '' : Number(v).toLocaleString('vi-VN') + ' đồng';
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ---- Du phong khong can AI: ghep cau tu du lieu san pham ----
const HOOKS = [
  'Xin chào cả nhà, bây giờ là {time}, shop vẫn đang live đây ạ!',
  'Chào mừng các bạn mới vào phòng live, hôm nay shop có deal cực tốt!',
  'Cả nhà ơi, đừng lướt qua, món này đang được săn nhiều nhất phòng live!',
  'Ai đang tìm quà tặng thì dừng lại xem ngay món này nhé!',
];
const CTAS = [
  'Bấm vào giỏ hàng màu cam để chốt đơn ngay nhé, số lượng có hạn!',
  'Thả tim và theo dõi shop để không bỏ lỡ ưu đãi tiếp theo nha!',
  'Nhắn vào bình luận từ CHỐT để được ưu tiên lên đơn liền tay!',
  'Đơn chốt ngay trong live được shop ưu tiên gói và gửi sớm nhất!',
];
export const FILLERS = [
  'Cảm ơn các bạn đang xem live của shop, có thắc mắc gì cứ bình luận bên dưới nhé!',
  'Shop cam kết hàng chính xưởng, có kiểm tra kỹ trước khi gói gửi đi ạ.',
  'Bạn nào mới vào phòng live thì thả tim cho shop biết với nha!',
  'Chương trình ưu đãi chỉ áp dụng trong phiên live này thôi cả nhà ơi.',
];

function templateSegment(p) {
  const parts = [pick(HOOKS).replace('{time}', VN_TIME())];
  parts.push(`Đây là ${p.name}.`);
  if (p.description) parts.push(p.description);
  const points = String(p.selling_points || '').split('\n').map(s => s.trim()).filter(Boolean);
  if (points.length) parts.push('Điểm nổi bật: ' + points.join('. ') + '.');
  if (p.promo_price != null && p.price != null) parts.push(`Giá gốc ${money(p.price)}, trong live này chỉ còn ${money(p.promo_price)} thôi ạ!`);
  else if ((p.promo_price ?? p.price) != null) parts.push(`Giá chỉ ${money(p.promo_price ?? p.price)}.`);
  parts.push(pick(CTAS));
  return parts.join(' ');
}

// ---- Sinh bang LLM ----
async function chat({ apiKey, baseUrl, model, messages, maxTokens = 2500 }) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 90000);
  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.9 }),
      signal: ac.signal,
    });
    if (!resp.ok) throw new Error(`LLM ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    return (await resp.json()).choices?.[0]?.message?.content || '';
  } finally { clearTimeout(t); }
}

export function createScriptGen(cfg) {
  const enabled = !!cfg.openaiKey;
  const model = cfg.scriptModel || 'gpt-4o-mini';

  // -> [{ text, productId }] : lo ~batchSize doan, xoay vong san pham
  async function generateBatch(products, batchSize = 8) {
    const active = products.filter(p => p.active !== 0);
    if (!active.length) return [];
    if (enabled) {
      try {
        const catalog = active.map((p, i) =>
          `#${i}: ${p.name} | gia goc: ${p.price ?? '?'} | gia km: ${p.promo_price ?? 'khong'} | mo ta: ${p.description || ''} | diem ban: ${(p.selling_points || '').replace(/\n/g, '; ')}`).join('\n');
        const content = await chat({
          apiKey: cfg.openaiKey, baseUrl: cfg.openaiBaseUrl || 'https://api.openai.com/v1', model,
          messages: [
            { role: 'system', content: 'Bạn là MC livestream bán hàng người Việt, giọng nói tự nhiên, thân thiện, KHÔNG đọc như văn viết. Chỉ trả về JSON hợp lệ.' },
            { role: 'user', content:
`Bây giờ là ${VN_TIME()} (giờ Việt Nam). Danh sách sản phẩm:
${catalog}

Viết ${batchSize} đoạn thoại MC livestream, mỗi đoạn 50-90 từ tiếng Việt NÓI (không gạch đầu dòng, không emoji, không ký hiệu đặc biệt), xoay vòng đều các sản phẩm, mỗi đoạn một kiểu mở đầu khác nhau (chào người mới, nhấn khuyến mãi, kể công dụng, hỏi tương tác...), thỉnh thoảng nhắc giờ hiện tại và kêu gọi chốt đơn/theo dõi shop. KHÔNG bịa thông số ngoài dữ liệu đã cho.
Trả về JSON: {"segments":[{"product_index":0,"text":"..."}]}` },
          ],
        });
        const jsonStr = (content.match(/\{[\s\S]*\}/) || [content])[0];
        const segs = JSON.parse(jsonStr).segments;
        if (Array.isArray(segs) && segs.length) {
          return segs.map(s => ({
            text: String(s.text || '').trim(),
            productId: (active[+s.product_index] || active[0]).id,
          })).filter(s => s.text.length > 10);
        }
      } catch (e) {
        // roi xuong template ben duoi
        if (cfg.onWarn) cfg.onWarn('LLM loi, dung kich ban mau: ' + e.message);
      }
    }
    // Du phong: template xoay vong
    const out = [];
    for (let i = 0; i < batchSize; i++) {
      const p = active[i % active.length];
      out.push({ text: templateSegment(p), productId: p.id });
    }
    return out;
  }

  // Tra loi 1 lo binh luan -> [{ username, answer }]
  async function answerComments(comments, products, shopTitle) {
    if (!enabled || !comments.length) return [];
    const catalog = products.map(p =>
      `- ${p.name}: gia ${p.promo_price ?? p.price ?? '?'}; ${p.description || ''}; ${(p.selling_points || '').replace(/\n/g, '; ')}`).join('\n');
    const list = comments.map((c, i) => `#${i} ${c.username}: ${c.comment}`).join('\n');
    const content = await chat({
      apiKey: cfg.openaiKey, baseUrl: cfg.openaiBaseUrl || 'https://api.openai.com/v1', model, maxTokens: 800,
      messages: [
        { role: 'system', content: 'Bạn là MC livestream của shop, trả lời bình luận người xem bằng tiếng Việt nói, thân thiện, MỖI câu trả lời 1-2 câu ngắn. Không bịa thông tin ngoài dữ liệu. Câu hỏi ngoài phạm vi (giá sỉ, khiếu nại, thông tin cá nhân) thì mời khách nhắn tin riêng cho shop. Chỉ trả về JSON.' },
        { role: 'user', content: `Shop: ${shopTitle}\nSản phẩm:\n${catalog}\n\nBình luận:\n${list}\n\nChọn tối đa 2 bình luận đáng trả lời nhất (câu hỏi thật về sản phẩm/giá/ship). Trả về JSON: {"answers":[{"index":0,"answer":"..."}]}` },
      ],
    });
    const jsonStr = (content.match(/\{[\s\S]*\}/) || [content])[0];
    const answers = JSON.parse(jsonStr).answers || [];
    return answers.map(a => comments[+a.index] ? ({ username: comments[+a.index].username, comment: comments[+a.index].comment, answer: String(a.answer || '').trim() }) : null).filter(Boolean);
  }

  return { generateBatch, answerComments, enabled };
}
