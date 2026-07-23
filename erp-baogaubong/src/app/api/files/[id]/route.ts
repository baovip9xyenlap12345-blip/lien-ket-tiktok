import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError } from '@/lib/auth';
import { inScope } from '@/lib/scope';
import { storageGet } from '@/lib/storage';

/** Tai file — CHI qua day, co kiem quyen + pham vi. Khong co link cong khai. */
export const GET = guarded(async (req) => {
  const user = await requirePerm('partner.view');
  const id = Number(new URL(req.url).pathname.split('/').pop());
  if (!id) throw jsonError(400, 'Thiếu id');
  const row = await prisma.attachment.findFirst({ where: { id, deletedAt: null }, include: { partner: true } });
  // File PHAI gan doi tac va doi tac PHAI trong pham vi nguoi xem — file khong gan doi tac thi tu choi
  // (chan IDOR ngu neu sau nay them attachment cho entity khac voi partnerId null).
  if (!row || !row.partner || !inScope(user, row.partner)) {
    throw jsonError(404, 'Không tìm thấy file trong phạm vi của bạn.');
  }
  let buf: Buffer;
  try { buf = await storageGet(row.storageKey); }
  catch { throw jsonError(404, 'File không còn trên máy chủ.'); }
  return new Response(new Uint8Array(buf), { headers: {
    'Content-Type': row.mime,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.fileName)}`,
    'Cache-Control': 'private, no-store',
  } });
});
