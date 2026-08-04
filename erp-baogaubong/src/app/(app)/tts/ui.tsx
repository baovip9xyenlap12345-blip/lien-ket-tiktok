'use client';
// Chuyen van ban -> giong noi tieng Viet: go van ban, chon giong + toc do, tao audio, nghe & tai ve.
import { useEffect, useRef, useState } from 'react';
import { VI_VOICES, TTS_MAX_CHARS, TTS_RATES } from '@/modules/tools/tts';

type Clip = { id: number; name: string; voiceLabel: string; url: string; size: number; at: string; chars: number };

/** Ten file an toan tu doan dau van ban: "Chào mừng đến với..." -> chao-mung-den-voi. */
function slugify(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).slice(0, 6).join('-').toLowerCase() || 'audio';
}

export default function TtsClient() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<string>(VI_VOICES[0].id);
  const [rate, setRate] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [clips, setClips] = useState<Clip[]>([]);
  const nextId = useRef(1);

  // Don blob URL khi roi trang (tranh giu bo nho trinh duyet).
  useEffect(() => () => { clips.forEach((c) => URL.revokeObjectURL(c.url)); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);

  async function generate() {
    if (!text.trim() || busy) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/tools/tts', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), voice, rate }) });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || 'Tạo giọng đọc lỗi — thử lại.');
      }
      const blob = await res.blob();
      const v = VI_VOICES.find((x) => x.id === voice);
      const clip: Clip = { id: nextId.current++, name: slugify(text),
        voiceLabel: v?.label ?? voice, url: URL.createObjectURL(blob), size: blob.size,
        at: new Date().toLocaleString('vi-VN'), chars: text.trim().length };
      setClips((s) => [clip, ...s]);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  function removeClip(id: number) {
    setClips((s) => { const c = s.find((x) => x.id === id); if (c) URL.revokeObjectURL(c.url); return s.filter((x) => x.id !== id); });
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <h1 className="text-xl font-extrabold">🎙️ Chuyển văn bản thành giọng nói</h1>
        <p className="text-sm text-slate-500">Gõ/dán văn bản tiếng Việt → chọn giọng đọc → Tạo audio → nghe thử và tải file MP3 (làm video TikTok, quảng cáo, thuyết minh sản phẩm…).</p>
      </div>

      {/* O van ban */}
      <div className="card p-4">
        <textarea className="inp min-h-[160px] w-full" placeholder="Dán văn bản cần đọc vào đây… (VD: Chào mừng bạn đến với Xưởng Gấu Bảo — gấu bông chính xưởng, giá tốt nhất!)"
          value={text} maxLength={TTS_MAX_CHARS} onChange={(e) => setText(e.target.value)} />
        <div className="mt-1 text-right text-xs text-slate-400">{text.length.toLocaleString('vi-VN')}/{TTS_MAX_CHARS.toLocaleString('vi-VN')} ký tự</div>

        {/* Chon giong */}
        <div className="mt-2">
          <div className="mb-1 text-sm font-bold">Giọng đọc</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {VI_VOICES.map((v) => (
              <button key={v.id} onClick={() => setVoice(v.id)}
                className={`rounded-xl border-2 p-3 text-left transition ${voice === v.id ? 'border-pink-600 bg-pink-50' : 'border-slate-200 bg-white hover:border-pink-300'}`}>
                <div className="font-bold">{v.label}</div>
                <div className="text-xs text-slate-500">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Toc do + nut tao */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Tốc độ</span>
            <select className="inp w-auto" value={rate} onChange={(e) => setRate(+e.target.value)}>
              {TTS_RATES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
            </select>
          </div>
          <button onClick={generate} disabled={busy || !text.trim()}
            className="ml-auto rounded-xl bg-pink-700 px-6 py-2.5 font-bold text-white disabled:opacity-50">
            {busy ? '⏳ Đang tạo giọng đọc…' : '🔊 Tạo audio'}
          </button>
        </div>
        {err && <p className="mt-2 text-sm font-semibold text-red-600">{err}</p>}
        <p className="mt-2 text-xs text-slate-400">💡 Mẹo: viết có dấu chấm/phẩy đầy đủ thì AI đọc ngắt nghỉ tự nhiên hơn. Văn bản dài nên chia thành từng đoạn.</p>
      </div>

      {/* Danh sach audio da tao */}
      <div className="mt-5">
        <h2 className="mb-2 font-extrabold">Danh sách audio ({clips.length})</h2>
        {clips.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-slate-400 ring-1 ring-slate-100">Chưa có audio nào — tạo thử 1 đoạn xem sao! 🎧</div>
        ) : (
          <div className="space-y-2">
            {clips.map((c) => (
              <div key={c.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{c.name}.mp3</div>
                    <div className="text-xs text-slate-400">{c.voiceLabel} · {c.chars.toLocaleString('vi-VN')} ký tự · {(c.size / 1024).toFixed(0)} KB · {c.at}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a href={c.url} download={`${c.name}.mp3`}
                      className="rounded-lg bg-pink-700 px-3 py-1.5 text-sm font-bold text-white">⬇️ Tải về</a>
                    <button onClick={() => removeClip(c.id)} className="px-1 text-slate-400 hover:text-red-500">✕</button>
                  </div>
                </div>
                <audio controls src={c.url} className="w-full" preload="metadata" />
              </div>
            ))}
          </div>
        )}
        {clips.length > 0 && <p className="mt-2 text-xs text-slate-400">⚠️ Danh sách chỉ lưu tạm trên trình duyệt — hãy bấm <b>Tải về</b> file nào cần giữ trước khi rời trang.</p>}
      </div>
    </div>
  );
}
