import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';

const Body = z.object({
  company: z.object({ name: z.string().min(1), taxCode: z.string(), address: z.string(), phone: z.string(), web: z.string() }),
  settings: z.object({
    vat_percent: z.number().min(0).max(100), doc_prefix: z.string().min(1).max(8),
    session_idle_min: z.number().min(5).max(480),
    max_discount_pct: z.number().min(0).max(100),
  }),
});

export const PATCH = guarded(async (req) => {
  const actor = await requirePerm('setting.manage');
  const b = Body.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const company = await prisma.company.findFirst();
  const before = { company: { name: company?.name, taxCode: company?.taxCode } };
  await prisma.$transaction(async (tx) => {
    if (company) await tx.company.update({ where: { id: company.id }, data: b.data.company });
    for (const [k, v] of Object.entries(b.data.settings)) {
      await tx.setting.upsert({ where: { key: k }, update: { value: { v } }, create: { key: k, value: { v } } });
    }
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'settings_update', entity: 'setting',
    before, after: { company: b.data.company, settings: b.data.settings }, ip, ua });
  return Response.json({ ok: true });
});
