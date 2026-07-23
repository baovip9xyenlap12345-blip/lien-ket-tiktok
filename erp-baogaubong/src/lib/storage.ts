// Luu tru file (logo, thiet ke, hop dong...). KHONG phuc vu file truc tiep —
// moi luot tai deu qua API co kiem quyen + pham vi du lieu.
// Driver local (dev): luu duoi ./uploads (da gitignore). Khi trien khai that,
// STORAGE_DRIVER=s3 tro sang MinIO/S3 (lam o GD10 — tich hop & trien khai).
import { mkdirSync, existsSync } from 'fs';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';

const ROOT = resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

function keyPath(key: string): string {
  // storageKey chi gom uuid/ten-an-toan do minh sinh ra — van chan vuot thu muc cho chac.
  const p = resolve(ROOT, key);
  if (!p.startsWith(ROOT)) throw new Error('storage key khong hop le');
  return p;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv', 'text/plain',
]);

export async function storagePut(buf: Buffer, fileName: string): Promise<string> {
  if (!existsSync(ROOT)) mkdirSync(ROOT, { recursive: true });
  const safe = fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const key = `${randomUUID()}_${safe}`;
  await writeFile(keyPath(key), buf);
  return key;
}

export async function storageGet(key: string): Promise<Buffer> {
  return readFile(keyPath(key));
}

export async function storageDelete(key: string): Promise<void> {
  try { await unlink(keyPath(key)); } catch { /* file da mat thi bo qua */ }
}
