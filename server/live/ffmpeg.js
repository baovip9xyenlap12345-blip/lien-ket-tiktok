// Dung va giam sat tien trinh FFmpeg BEN VUNG cho 1 phien live:
// video lap (-stream_loop -1 -re) + am thanh PCM tu FIFO + overlay drawtext(reload=1)
// -> encode H.264/AAC -> tee ra nhieu dich RTMP (1 dich loi khong keo sap dich khac).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { PCM_RATE } from './tts.js';

const FONT_CANDIDATES = [
  '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
  '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
];
export function findFont() {
  return FONT_CANDIDATES.find(f => fs.existsSync(f)) || null;
}

export function makeFifo(fifoPath) {
  try { fs.unlinkSync(fifoPath); } catch {}
  const r = spawnSync('mkfifo', [fifoPath]);
  if (r.status !== 0) throw new Error('Khong tao duoc FIFO am thanh');
}

// Ghep URL day: rtmp_url + '/' + stream_key (nhu OBS lam)
export function fullRtmpUrl(t) {
  const base = t.rtmp_url.replace(/\/+$/, '');
  return base + '/' + t.stream_key;
}
// Escape ky tu dac biet cua tee muxer trong URL
const teeEscape = u => u.replace(/([\[\]|])/g, '\\$1');

export function buildFfmpegArgs({ sceneFile, fifoPath, overlayFiles, targets, bitrateK = 2000 }) {
  const font = findFont();
  const draw = (file, size, color, y, boxColor) =>
    `drawtext=textfile='${file}':reload=1:fontsize=${size}:fontcolor=${color}:borderw=2:bordercolor=black@0.6` +
    `:box=1:boxcolor=${boxColor}:boxborderw=10:x=(w-text_w)/2:y=${y}` + (font ? `:fontfile='${font}'` : '');

  const filters = [
    draw(overlayFiles.title, 34, 'white', 70, 'black@0.45'),
    draw(overlayFiles.price, 32, '0xFFE14D', 1090, 'black@0.55'),
    draw(overlayFiles.cta, 26, 'white', 1180, '0xB03060@0.55'),
  ].join(',');

  const args = [
    '-hide_banner', '-loglevel', 'warning',
    '-stream_loop', '-1', '-re', '-i', sceneFile,
    '-f', 's16le', '-ar', String(PCM_RATE), '-ac', '1', '-i', fifoPath,
    '-filter_complex', `[0:v]${filters}[v]`,
    '-map', '[v]', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'superfast', '-tune', 'zerolatency',
    '-b:v', `${bitrateK}k`, '-maxrate', `${Math.round(bitrateK * 1.1)}k`, '-bufsize', `${bitrateK * 2}k`,
    '-g', '60', '-r', '30', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-ac', '1',
    '-flags', '+global_header',
  ];
  if (targets.length === 1) {
    args.push('-f', 'flv', fullRtmpUrl(targets[0]));
  } else {
    args.push('-f', 'tee', targets.map(t => `[f=flv:onfail=ignore]${teeEscape(fullRtmpUrl(t))}`).join('|'));
  }
  return args;
}

// spawn + bao cao stderr; callback onTargetError(targetId) khi thay loi mang/key cua 1 dich
export function spawnFfmpeg({ args, targets, onLine, onTargetError, onExit }) {
  const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let tail = '';
  p.stderr.on('data', d => {
    tail = (tail + d.toString()).slice(-8000);
    for (const line of d.toString().split('\n')) {
      const l = line.trim();
      if (!l) continue;
      if (onLine) onLine(l);
      if (/(failed|error|refused|denied|timed? ?out|broken pipe|unauthorized)/i.test(l)) {
        for (const t of targets) {
          const host = (t.rtmp_url.match(/^rtmps?:\/\/([^/]+)/) || [])[1];
          if (host && l.includes(host) && onTargetError) onTargetError(t.id, l.slice(0, 300));
        }
      }
    }
  });
  p.on('exit', (code, sig) => onExit && onExit(code, sig, tail));
  return p;
}
