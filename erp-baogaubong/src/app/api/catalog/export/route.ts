import { prisma } from '@/lib/db';
import { requirePerm, guarded } from '@/lib/auth';

export const GET = guarded(async () => {
  const user = await requirePerm('catalog.view');
  const showCost = user.perms.includes('cost.view');
  const rows = await prisma.productVariant.findMany({
    where: { deletedAt: null, product: { deletedAt: null } },
    include: { product: { include: { unit: true } }, priceRules: { include: { priceList: true } } },
    orderBy: { id: 'asc' },
  });
  let csv = 'code,name,type,unit,sku,size,color' + (showCost ? ',cost' : '') + ',price_retail,price_wholesale\n';
  for (const v of rows) {
    const retail = v.priceRules.find((r) => r.priceList.kind === 'RETAIL' && r.minQty === 1)?.price ?? '';
    const ws = v.priceRules.find((r) => r.priceList.kind === 'WHOLESALE' && r.minQty === 1)?.price ?? '';
    csv += [v.product.code, JSON.stringify(v.product.name), v.product.type, v.product.unit.code,
      v.sku, v.size ?? '', v.color ?? '', ...(showCost ? [v.costPrice] : []), retail, ws].join(',') + '\n';
  }
  return new Response('\uFEFF' + csv, { headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="san-pham.csv"' } });
});
