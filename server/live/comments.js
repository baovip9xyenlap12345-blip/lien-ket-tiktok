// Doc binh luan TikTok LIVE bang thu vien tiktok-live-connector (khong can API key,
// ket noi theo username dang phat). Day la thu vien KHONG chinh thuc -> moi loi o day
// chi duoc ghi log va thu lai, TUYET DOI khong lam anh huong luong phat.
// Ho tro ca 2 kieu API cua thu vien (WebcastPushConnection cu / TikTokLiveConnection moi).

const RECONNECT_MS = [15000, 30000, 60000, 120000];

export async function startCommentListener({ cfg, buffer, log }) {
  const username = (cfg.targets.find(t => t.platform === 'tiktok' && t.tiktok_username) || {}).tiktok_username;
  if (!username) { log('system', 'Chua dien username TikTok trong kenh phat — khong doc duoc binh luan'); return; }

  const mod = await import('tiktok-live-connector');
  const Conn = mod.TikTokLiveConnection || mod.WebcastPushConnection || (mod.default && (mod.default.TikTokLiveConnection || mod.default.WebcastPushConnection));
  if (!Conn) throw new Error('tiktok-live-connector: khong tim thay lop ket noi');

  let attempts = 0;
  let stopped = false;

  async function connectOnce() {
    if (stopped) return;
    const conn = new Conn(username, { processInitialData: false, enableExtendedGiftInfo: false });
    const onChat = d => {
      const user = d.uniqueId || d.user?.uniqueId || d.nickname || 'khach';
      const text = String(d.comment || d.content || '').trim();
      if (text && buffer.length < 500) buffer.push({ platform: 'tiktok', username: String(user).slice(0, 100), comment: text.slice(0, 500) });
    };
    conn.on('chat', onChat);
    conn.on('disconnected', () => retry('mat ket noi'));
    conn.on('streamEnd', () => retry('phien TikTok ket thuc'));
    conn.on('error', () => {}); // da xu ly qua retry; tranh crash vi unhandled error
    try {
      await conn.connect();
      attempts = 0;
      log('system', `Da ket noi doc binh luan TikTok @${username}`);
    } catch (e) {
      retry('khong ket noi duoc: ' + String(e.message || e).slice(0, 120));
    }

    function retry(reason) {
      if (stopped) return;
      stopped = true; // chan retry chong cheo tu nhieu event
      try { conn.disconnect(); } catch {}
      const delay = RECONNECT_MS[Math.min(attempts, RECONNECT_MS.length - 1)];
      attempts++;
      if (attempts <= 20) {
        log('system', `Doc binh luan TikTok: ${reason} — thu lai sau ${delay / 1000}s`);
        setTimeout(() => { stopped = false; connectOnce(); }, delay);
      } else {
        log('system', 'Doc binh luan TikTok loi lien tuc — da tat trong phien nay (stream van phat binh thuong)');
      }
    }
  }

  connectOnce();
}
