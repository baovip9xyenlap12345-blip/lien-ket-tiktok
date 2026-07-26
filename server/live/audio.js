// Audio Director: bom PCM vao FIFO cho FFmpeg theo NHIP THOI GIAN THUC.
// Nguyen tac chong dut song: cu 20ms ghi dung so byte "no" theo dong ho tuyet doi
// (48 byte/ms voi 24kHz mono 16-bit); het tieng noi thi ghi IM LANG (byte 0)
// -> FIFO khong bao gio can -> FFmpeg khong bao gio doi -> RTMP khong bao gio ho.
// Hang doi 3 muc uu tien: 0 = tra loi binh luan, 1 = kich ban, 2 = cau dem.
import { PCM_BYTES_PER_SEC } from './tts.js';

const BYTES_PER_MS = PCM_BYTES_PER_SEC / 1000; // 48

export class AudioDirector {
  constructor(writable, { onSegmentStart } = {}) {
    this.out = writable;
    this.onSegmentStart = onSegmentStart;
    this.queues = { 0: [], 1: [], 2: [] };
    this.current = null;   // { pcm, offset, meta }
    this.timer = null;
    this.t0 = 0;
    this.written = 0;
    this.stopped = false;
  }

  // meta: { kind, text, productId }
  enqueue(pcm, priority, meta) {
    if (!pcm || !pcm.length) return;
    this.queues[priority in this.queues ? priority : 2].push({ pcm, meta });
  }
  queuedCount(priority) { return priority == null ? this.queues[0].length + this.queues[1].length + this.queues[2].length : this.queues[priority].length; }
  // Tong so giay am thanh dang cho phat (de biet khi nao can sinh them)
  queuedSeconds() {
    let b = this.current ? this.current.pcm.length - this.current.offset : 0;
    for (const q of Object.values(this.queues)) for (const it of q) b += it.pcm.length;
    return b / PCM_BYTES_PER_SEC;
  }

  start() {
    this.t0 = Date.now();
    this.written = 0;
    this.timer = setInterval(() => this.tick(), 20);
  }

  nextSegment() {
    for (const p of [0, 1, 2]) {
      if (this.queues[p].length) {
        const it = this.queues[p].shift();
        this.current = { pcm: it.pcm, offset: 0, meta: it.meta };
        if (this.onSegmentStart) { try { this.onSegmentStart(it.meta || {}); } catch {} }
        return;
      }
    }
    this.current = null;
  }

  tick() {
    if (this.stopped) return;
    // So byte phai ghi tinh tu dau (dong ho tuyet doi, khong bi troi nhu setInterval)
    let owed = Math.floor((Date.now() - this.t0) * BYTES_PER_MS) - this.written;
    owed -= owed % 2; // can chinh 16-bit
    if (owed <= 0) return;
    // Neu tut lai qua xa (may treo/GC), bo qua phan qua han de khong don cuc
    const MAX_BURST = PCM_BYTES_PER_SEC; // toi da 1 giay moi lan
    if (owed > MAX_BURST) { this.written += owed - MAX_BURST; owed = MAX_BURST; }

    const parts = [];
    let need = owed;
    while (need > 0) {
      if (!this.current || this.current.offset >= this.current.pcm.length) {
        this.nextSegment();
        if (!this.current) break; // khong con gi de noi -> phan con lai la im lang
      }
      const take = Math.min(need, this.current.pcm.length - this.current.offset);
      parts.push(this.current.pcm.subarray(this.current.offset, this.current.offset + take));
      this.current.offset += take;
      need -= take;
    }
    if (need > 0) parts.push(Buffer.alloc(need)); // im lang
    try { this.out.write(Buffer.concat(parts)); } catch {}
    this.written += owed;
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    try { this.out.end(); } catch {}
  }
}
