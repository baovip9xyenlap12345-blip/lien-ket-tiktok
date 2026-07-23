import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Forbidden from '@/components/Forbidden';
import SettingsClient from './ui';

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user?.perms.includes('setting.manage')) return <Forbidden />;
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const company = await prisma.company.findFirst();
  return <SettingsClient
    company={{ name: company?.name ?? '', taxCode: company?.taxCode ?? '', address: company?.address ?? '',
      phone: company?.phone ?? '', web: company?.web ?? '' }}
    settings={{
      vat_percent: Number((map['vat_percent'] as { v?: number } | undefined)?.v ?? 8),
      doc_prefix: String((map['doc_prefix'] as { v?: string } | undefined)?.v ?? 'BG'),
      session_idle_min: Number((map['session_idle_min'] as { v?: number } | undefined)?.v ?? 30),
      max_discount_pct: Number((map['max_discount_pct'] as { v?: number } | undefined)?.v ?? 10),
    }} />;
}
