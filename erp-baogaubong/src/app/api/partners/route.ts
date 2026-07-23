import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { scopeWhere, inScope } from '@/lib/scope';
import { nextCode } from '@/lib/seq';
import { normalizePhone, normalizeEmail, normalizeTax, dupeReasons } from '@/modules/partners/domain';

export const GET = guarded(async (req) => {
  const user = await requirePerm('partner.view');
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const role = url.searchParams.get('role') ?? '';           // customer | supplier | agent
  const groupId = Number(url.searchParams.get('groupId')) || 0;
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const take = 20;
  const where: Prisma.PartnerWhereInput = {
    deletedAt: null, mergedIntoId: null,
    ...scopeWhere(user),
    ...(role === 'customer' ? { isCustomer: true } : role === 'supplier' ? { isSupplier: true }
      : role === 'agent' ? { isAgent: true } : {}),
    ...(groupId ? { groupId } : {}),
    ...(q ? { AND: [{ OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { code: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { normPhone: { contains: normalizePhone(q) ?? q } },
      { email: { contains: q, mode: 'insensitive' } },
      { taxCode: { contains: q } },
    ] }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.partner.findMany({ where,
      include: { group: true, assignedTo: { select: { id: true, name: true } } },
      orderBy: { id: 'desc' }, skip: (page - 1) * take, take }),
    prisma.partner.count({ where }),
  ]);
  return Response.json({ ok: true, rows, total, page, take });
});

const PartnerIn = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(1, 'Thiếu tên khách/đối tác'),
  type: z.enum(['PERSON', 'COMPANY']).default('PERSON'),
  isCustomer: z.boolean().default(true),
  isSupplier: z.boolean().default(false),
  isAgent: z.boolean().default(false),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().optional().nullable(),
  taxCode: z.string().trim().optional().nullable(),
  groupId: z.number().int().nullable().optional(),
  source: z.string().trim().optional().nullable(),
  channel: z.string().trim().optional().nullable(),
  priceListId: z.number().int().nullable().optional(),
  assignedToId: z.number().int().nullable().optional(),
  creditLimit: z.number().int().min(0).default(0),
  creditDays: z.number().int().min(0).default(0),
  note: z.string().optional().nullable(),
  contacts: z.array(z.object({ id: z.number().int().optional(), name: z.string().trim().min(1),
    phone: z.string().optional().nullable(), email: z.string().optional().nullable(),
    position: z.string().optional().nullable(), note: z.string().optional().nullable() })).default([]),
  addresses: z.array(z.object({ id: z.number().int().optional(), label: z.string().optional().nullable(),
    address: z.string().trim().min(1), isBilling: z.boolean().default(false),
    isShipping: z.boolean().default(false) })).default([]),
  forceDupe: z.boolean().default(false),   // nguoi dung xac nhan "van luu" khi canh bao trung
});

export const POST = guarded(async (req) => {
  const actor = await requirePerm('partner.manage');
  const b = PartnerIn.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  // Phat hien trung SDT/email/MST (bo qua chinh minh khi sua)
  const normPhone = normalizePhone(d.phone), normEmail = normalizeEmail(d.email), normTax = normalizeTax(d.taxCode);
  if (!d.forceDupe && (normPhone || normEmail || normTax)) {
    const cands = await prisma.partner.findMany({
      where: { deletedAt: null, mergedIntoId: null, ...(d.id ? { NOT: { id: d.id } } : {}),
        OR: [
          ...(normPhone ? [{ normPhone }] : []),
          ...(normEmail ? [{ normEmail }] : []),
          ...(normTax ? [{ taxCode: { contains: normTax.split('-')[0] } }] : []),
        ] },
      select: { id: true, code: true, name: true, phone: true, email: true, taxCode: true }, take: 5 });
    const dupes = cands
      .map((c) => ({ ...c, reasons: dupeReasons(d, c) }))
      .filter((c) => c.reasons.length);
    if (dupes.length) {
      return Response.json({ ok: false, dupes,
        error: 'Phát hiện đối tác trùng thông tin — kiểm tra trước khi lưu.' }, { status: 409 });
    }
  }
  const result = await prisma.$transaction(async (tx) => {
    const base = { name: d.name, type: d.type, isCustomer: d.isCustomer, isSupplier: d.isSupplier,
      isAgent: d.isAgent, phone: d.phone ?? null, normPhone, email: d.email ?? null, normEmail,
      taxCode: d.taxCode ?? null, groupId: d.groupId ?? null, source: d.source ?? null,
      channel: d.channel ?? null, priceListId: d.priceListId ?? null,
      assignedToId: d.assignedToId ?? actor.id, creditLimit: d.creditLimit, creditDays: d.creditDays,
      note: d.note ?? null, branchId: actor.branchId ?? null };
    let p;
    if (d.id) {
      const cur = await tx.partner.findFirst({ where: { id: d.id, deletedAt: null } });
      if (!cur || !inScope(actor, cur)) throw jsonError(404, 'Không tìm thấy đối tác trong phạm vi của bạn.');
      p = await tx.partner.update({ where: { id: d.id }, data: base });
    } else {
      const prefix = d.isSupplier && !d.isCustomer ? 'NCC' : 'KH';
      const code = await nextCode(tx, prefix);
      p = await tx.partner.create({ data: { ...base, code, createdById: actor.id } });
    }
    const keepContacts: number[] = [];
    for (const c of d.contacts) {
      const data = { name: c.name, phone: c.phone ?? null, email: c.email ?? null,
        position: c.position ?? null, note: c.note ?? null };
      const saved = c.id
        ? await tx.partnerContact.update({ where: { id: c.id }, data })
        : await tx.partnerContact.create({ data: { ...data, partnerId: p.id } });
      keepContacts.push(saved.id);
    }
    await tx.partnerContact.updateMany({
      where: { partnerId: p.id, id: { notIn: keepContacts }, deletedAt: null },
      data: { deletedAt: new Date() } });
    const keepAddrs: number[] = [];
    for (const a of d.addresses) {
      const data = { label: a.label ?? null, address: a.address, isBilling: a.isBilling, isShipping: a.isShipping };
      const saved = a.id
        ? await tx.partnerAddress.update({ where: { id: a.id }, data })
        : await tx.partnerAddress.create({ data: { ...data, partnerId: p.id } });
      keepAddrs.push(saved.id);
    }
    await tx.partnerAddress.updateMany({
      where: { partnerId: p.id, id: { notIn: keepAddrs }, deletedAt: null },
      data: { deletedAt: new Date() } });
    return p;
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: d.id ? 'partner_update' : 'partner_create',
    entity: 'partner', entityId: result.code, after: { name: d.name, phone: d.phone, email: d.email }, ip, ua });
  return Response.json({ ok: true, id: result.id, code: result.code });
});

export const DELETE = guarded(async (req) => {
  const actor = await requirePerm('partner.manage');
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) throw jsonError(400, 'Thiếu id');
  const cur = await prisma.partner.findFirst({ where: { id, deletedAt: null } });
  if (!cur || !inScope(actor, cur)) throw jsonError(404, 'Không tìm thấy đối tác trong phạm vi của bạn.');
  const p = await prisma.partner.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ actorId: actor.id, actorName: actor.name, action: 'partner_delete', entity: 'partner', entityId: p.code });
  return Response.json({ ok: true });
});
