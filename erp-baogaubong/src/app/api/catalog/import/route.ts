import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { validateImportRow, makeSku } from '@/modules/catalog/domain';

/** Nhap san pham tu CSV: code,name,type,unit,size,color,sku,cost,price_retail
 *  ?atomic=1 → 1 dong loi la huy toan bo. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('catalog.manage');
  const atomic = new URL(req.url).searchParams.get('atomic') === '1';
  const text = await req.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw jsonError(400, 'File trống hoặc thiếu dòng tiêu đề.');
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  for (const req_ of ['code','name','type','unit']) {
    if (idx(req_) < 0) throw jsonError(400, `Thiếu cột bắt buộc: ${req_}`);
  }
  const rowErrors: { line: number; errors: string[] }[] = [];
  type Row = { code: string; name: string; type: string; unit: string; size?: string; color?: string; sku?: string; cost?: string; price_retail?: string };
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(',').map((x) => x.trim());
    const row: Row = { code: c[idx('code')] ?? '', name: c[idx('name')] ?? '', type: c[idx('type')] ?? '',
      unit: c[idx('unit')] ?? '', size: idx('size') >= 0 ? c[idx('size')] : undefined,
      color: idx('color') >= 0 ? c[idx('color')] : undefined, sku: idx('sku') >= 0 ? c[idx('sku')] : undefined,
      cost: idx('cost') >= 0 ? c[idx('cost')] : undefined,
      price_retail: idx('price_retail') >= 0 ? c[idx('price_retail')] : undefined };
    const errs = validateImportRow({ ...row, price: row.price_retail });
    if (errs.length) rowErrors.push({ line: i + 1, errors: errs });
    else rows.push(row);
  }
  if (atomic && rowErrors.length) {
    return Response.json({ ok: false, error: 'Chế độ toàn vẹn: có dòng lỗi, không nhập dòng nào.', rowErrors }, { status: 400 });
  }
  let created = 0;
  const retail = await prisma.priceList.findFirst({ where: { kind: 'RETAIL', deletedAt: null } });
  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      const unit = await tx.unit.upsert({ where: { code: r.unit }, update: {}, create: { code: r.unit, name: r.unit } });
      const p = await tx.product.upsert({ where: { code: r.code },
        update: { name: r.name },
        create: { code: r.code, name: r.name, type: r.type as never, unitId: unit.id } });
      const sku = r.sku || makeSku(r.code, r.size, r.color);
      const v = await tx.productVariant.upsert({ where: { sku },
        update: { costPrice: r.cost ? parseInt(r.cost, 10) : undefined },
        create: { productId: p.id, sku, size: r.size || null, color: r.color || null,
          costPrice: r.cost ? parseInt(r.cost, 10) : 0 } });
      if (retail && r.price_retail) {
        await tx.priceRule.upsert({
          where: { priceListId_variantId_minQty: { priceListId: retail.id, variantId: v.id, minQty: 1 } },
          update: { price: parseInt(r.price_retail, 10) },
          create: { priceListId: retail.id, variantId: v.id, minQty: 1, price: parseInt(r.price_retail, 10) } });
      }
      created++;
    }
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'catalog_import', entity: 'product',
    after: { created, errors: rowErrors.length, atomic }, ip, ua });
  return Response.json({ ok: true, created, rowErrors });
});
