import { prisma } from '@/lib/db';
import { requirePerm, guarded } from '@/lib/auth';
import { scopeWhere } from '@/lib/scope';

/** Xuat CSV doi tac — CHI trong pham vi du lieu cua nguoi xuat (chong ro ri qua export). */
export const GET = guarded(async () => {
  const user = await requirePerm('partner.view');
  const rows = await prisma.partner.findMany({
    where: { deletedAt: null, mergedIntoId: null, ...scopeWhere(user) },
    include: { group: true, assignedTo: { select: { name: true } } },
    orderBy: { id: 'asc' }, take: 5000,
  });
  let csv = 'code,name,type,customer,supplier,agent,phone,email,tax_code,group,source,channel,credit_limit,credit_days,sale,note\n';
  const esc = (s: unknown) => JSON.stringify(String(s ?? ''));
  for (const p of rows) {
    csv += [p.code, esc(p.name), p.type, p.isCustomer ? 1 : 0, p.isSupplier ? 1 : 0, p.isAgent ? 1 : 0,
      p.phone ?? '', p.email ?? '', p.taxCode ?? '', esc(p.group?.name ?? ''), esc(p.source ?? ''),
      esc(p.channel ?? ''), p.creditLimit, p.creditDays, esc(p.assignedTo?.name ?? ''), esc(p.note ?? '')].join(',') + '\n';
  }
  return new Response('\uFEFF' + csv, { headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="doi-tac.csv"' } });
});
