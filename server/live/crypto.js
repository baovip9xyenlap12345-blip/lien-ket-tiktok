// Ma hoa/giai ma bi mat (stream key) bang AES-256-GCM
// Khoa lay tu bien moi truong SECRET_KEY_BASE (chuoi bat ky, se duoc bam SHA-256)
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const SECRET_KEY_BASE = process.env.SECRET_KEY_BASE || '';

function key() {
  if (!SECRET_KEY_BASE) throw new Error('Chua cau hinh SECRET_KEY_BASE');
  return createHash('sha256').update(SECRET_KEY_BASE).digest();
}

export function hasSecretKey() {
  return !!SECRET_KEY_BASE;
}

// Tra ve chuoi base64(iv | tag | ciphertext)
export function encryptSecret(plain) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
}

export function decryptSecret(enc) {
  const buf = Buffer.from(String(enc), 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const d = createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

// Hien thi an toan: chi lo 4 ky tu cuoi
export function maskSecret(plainOrLast4) {
  const s = String(plainOrLast4);
  return '••••••••' + s.slice(-4);
}
