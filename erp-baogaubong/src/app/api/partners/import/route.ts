import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { nextCode } from '@/lib/seq';
import { normalizePhone, normalizeEmail, validatePartnerRow } from '@/modules/partners/domain';

/** Nhap doi tac tu CSV: name,phone,email,tax_code,type,supplier,group,source,credit_limit,credit_days,note
 *  ?atomic=1 → 1 dong loi la huy toan bo. Dong trung SDT voi doi tac co san se bao loi dong do. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('partner.manage');
  const atomic = new URL(req.url).searchParams.get('atomic') === '1';
  const text = await req.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw jsonError(400, 'File trống hoặc thiếu dòng tiêu đề.');
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  if (idx('name') < 0) throw jsonError(400, 'Thiếu cột bắt buộc: name');
  type Row = { name: string; phone?: string; email?: string; tax_code?: string; type?: string;
    supplier?: string; group?: string; source?: string; credit_limit?: string; credit_days?: string; note?: string };
  const rows: Row[] = []; const rowErrors: { line: number; errors: string[] }[] = [];
  const get = (c: string[], k: string) => (idx(k) >= 0 ? c[idx(k)]?.trim() : undefined);
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(',');
    const row: Row = { name: get(c, 'name') ?? '', phone: get(c, 'phone'), email: get(c, 'email'),
      tax_code: get(c, 'tax_code'), type: get(c, 'type'), supplier: get(c, 'supplier'),
      group: get(c, 'group'), source: get(c, 'source'),
      credit_limit: get(c, 'credit_limit'), credit_days: get(c, 'credit_days'), note: get(c, 'note') };
    const errs = validatePartnerRow(row);
    const normPhone = normalizePhone(row.phone);
    if (!errs.length && normPhone) {
      const dupe = await prisma.partner.findFirst({ where: { normPhone, deletedAt: null, mergedIntoId: null } });
      if (dupe) errs.push(`Trùng SĐT với ${dupe.code} — ${dupe.name}`);
    }
    if (errs.length) rowErrors.push({ line: i + 1, errors: errs });
    else rows.push(row);
  }
  if (atomic && rowErrors.length) {
    return Response.json({ ok: false, error: 'Chế độ toàn vẹn: có dòng lỗi, không nhập dòng nào.', rowErrors }, { status: 400 });
  }
  let created = 0;
  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      let groupId: number | null = null;
      if (r.group) {
        const g = await tx.partnerGroup.upsert({ where: { name: r.group }, update: {}, create: { name: r.group } });
        groupId = g.id;
      }
      const isSupplier = r.supplier === '1' || r.supplier?.toLowerCase() === 'x';
      const code = await nextCode(tx, isSupplier ? 'NCC' : 'KH');
      await tx.partner.create({ data: {
        code, name: r.name, type: r.type === 'COMPANY' ? 'COMPANY' : 'PERSON',
        isCustomer: !isSupplier, isSupplier,
        phone: r.phone ?? null, normPhone: normalizePhone(r.phone),
        email: r.email ?? null, normEmail: normalizeEmail(r.email),
        taxCode: r.tax_code ?? null, groupId, source: r.source ?? null,
        creditLimit: r.credit_limit ? parseInt(r.credit_limit, 10) : 0,
        creditDays: r.credit_days ? parseInt(r.credit_days, 10) : 0,
        note: r.note ?? null, assignedToId: actor.id, createdById: actor.id,
        branchId: actor.branchId ?? null } });
      created++;
    }
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'partner_import', entity: 'partner',
    after: { created, errors: rowErrors.length, atomic }, ip, ua });
  return Response.json({ ok: true, created, rowErrors });
});
