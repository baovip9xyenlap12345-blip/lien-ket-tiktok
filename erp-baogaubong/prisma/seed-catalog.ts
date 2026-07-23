/* Seed GD2 — danh muc san pham that (63 dong tu bang gia si baogaubong.vn)
 * + du lieu demo cho BOM/combo/gau AI (danh dau "demo" ro rang).
 * Idempotent: chay lai khong nhan doi. */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { makeSku } from '../src/modules/catalog/domain';

type Row = { id: string; name: string; cat: string; color: string; size: string;
  si: number; le: number; stock: number; note: string; img: string };

export async function seedCatalog(prisma: PrismaClient) {
  // 1) Don vi tinh
  const unitDefs = [['con', 'Con'], ['cai', 'Cái'], ['m', 'Mét'], ['kg', 'Kilôgam']];
  const units: Record<string, number> = {};
  for (const [code, name] of unitDefs) {
    units[code] = (await prisma.unit.upsert({ where: { code }, update: { name }, create: { code, name } })).id;
  }

  // 2) Bang gia: le (RETAIL) + si (WHOLESALE, uu tien cao hon)
  async function priceList(kind: 'RETAIL' | 'WHOLESALE', name: string, priority: number) {
    const found = await prisma.priceList.findFirst({ where: { kind, deletedAt: null } });
    return found ?? prisma.priceList.create({ data: { kind, name, priority } });
  }
  const retail = await priceList('RETAIL', 'Giá bán lẻ', 0);
  const wholesale = await priceList('WHOLESALE', 'Giá bán sỉ', 10);

  // 3) Nhom hang tu file that (bo emoji dau ten)
  const rows: Row[] = JSON.parse(readFileSync(join(__dirname, 'products_seed.json'), 'utf8'));
  const catNames = [...new Set(rows.map((r) => r.cat.replace(/^[^\p{L}]+/u, '').trim()))];
  const cats: Record<string, number> = {};
  for (const name of catNames) {
    const found = await prisma.category.findFirst({ where: { name, deletedAt: null } });
    cats[name] = (found ?? await prisma.category.create({ data: { name } })).id;
  }

  // 4) Gom 63 dong theo ten goc → san pham + bien the theo size
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const base = r.name.includes(' (') ? r.name.split(' (')[0] : r.name;
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base)!.push(r);
  }
  let seq = 0;
  for (const [base, list] of groups) {
    seq++;
    const code = `SP${String(seq).padStart(3, '0')}`;
    const catName = list[0].cat.replace(/^[^\p{L}]+/u, '').trim();
    const p = await prisma.product.upsert({ where: { code },
      update: { name: base },
      create: { code, name: base, type: 'FINISHED', unitId: units['con'], categoryId: cats[catName],
        desc: list[0].note && list[0].note !== 'xong' ? list[0].note : null } });
    for (const r of list) {
      const sku = makeSku(code, r.size, null);
      const v = await prisma.productVariant.upsert({ where: { sku },
        update: { size: r.size || null, color: r.color || null },
        create: { productId: p.id, sku, size: r.size || null, color: r.color || null, costPrice: 0 } });
      for (const [listId, price] of [[retail.id, r.le], [wholesale.id, r.si]] as const) {
        if (!price) continue;
        await prisma.priceRule.upsert({
          where: { priceListId_variantId_minQty: { priceListId: listId, variantId: v.id, minQty: 1 } },
          update: { price }, create: { priceListId: listId, variantId: v.id, minQty: 1, price } });
      }
    }
  }

  // 5) Nguyen lieu demo (phuc vu BOM) — gia von demo, anh Bao sua lai theo thuc te
  const matDefs: [string, string, string, number][] = [
    ['NL001', 'Vải lông (demo)', 'm', 45000],
    ['NL002', 'Bông gòn (demo)', 'kg', 60000],
    ['NL003', 'Mắt nhựa (demo)', 'cai', 1500],
  ];
  const matVariant: Record<string, number> = {};
  for (const [code, name, unit, cost] of matDefs) {
    const p = await prisma.product.upsert({ where: { code }, update: {},
      create: { code, name, type: 'MATERIAL', unitId: units[unit], note: 'Dữ liệu demo — sửa theo thực tế' } });
    const v = await prisma.productVariant.upsert({ where: { sku: code },
      update: {}, create: { productId: p.id, sku: code, costPrice: cost } });
    matVariant[code] = v.id;
  }

  // 6) 1 BOM demo cho san pham dau tien (neu chua co)
  const firstFinished = await prisma.product.findFirst({ where: { type: 'FINISHED', deletedAt: null }, orderBy: { id: 'asc' } });
  if (firstFinished && !(await prisma.bom.findFirst({ where: { productId: firstFinished.id } }))) {
    const bom = await prisma.bom.create({ data: { productId: firstFinished.id, name: `Định mức ${firstFinished.name} (demo)` } });
    const ver = await prisma.bomVersion.create({ data: { bomId: bom.id, no: 1, status: 'ACTIVE', wastePct: 5, validFrom: new Date() } });
    await prisma.bomItem.createMany({ data: [
      { bomVersionId: ver.id, materialVariantId: matVariant['NL001'], qtyPerUnit: 1.2, note: 'demo' },
      { bomVersionId: ver.id, materialVariantId: matVariant['NL002'], qtyPerUnit: 0.8, note: 'demo' },
      { bomVersionId: ver.id, materialVariantId: matVariant['NL003'], qtyPerUnit: 2, note: 'demo' },
    ] });
  }

  // 7) 1 combo demo + 1 gau AI demo
  const combo = await prisma.product.upsert({ where: { code: 'CB001' }, update: {},
    create: { code: 'CB001', name: 'Combo quà tặng (demo)', type: 'COMBO', unitId: units['cai'],
      deductMode: 'COMPONENTS', note: 'Dữ liệu demo' } });
  const twoVars = await prisma.productVariant.findMany({
    where: { product: { type: 'FINISHED' }, deletedAt: null }, orderBy: { id: 'asc' }, take: 2 });
  for (const v of twoVars) {
    await prisma.bundleItem.upsert({
      where: { comboProductId_componentVariantId: { comboProductId: combo.id, componentVariantId: v.id } },
      update: {}, create: { comboProductId: combo.id, componentVariantId: v.id, qty: 1 } });
  }
  const ai = await prisma.product.upsert({ where: { code: 'AI001' }, update: {},
    create: { code: 'AI001', name: 'Gấu AI kể chuyện (demo)', type: 'AI_BEAR', unitId: units['con'], note: 'Dữ liệu demo' } });
  const aiVar = await prisma.productVariant.upsert({ where: { sku: 'AI001-STD' },
    update: {}, create: { productId: ai.id, sku: 'AI001-STD', costPrice: 0 } });
  await prisma.aiDevice.upsert({ where: { serial: 'DEMO-AI-0001' },
    update: {}, create: { serial: 'DEMO-AI-0001', variantId: aiVar.id, note: 'Thiết bị demo' } });

  const nProducts = await prisma.product.count({ where: { deletedAt: null } });
  const nVariants = await prisma.productVariant.count({ where: { deletedAt: null } });
  console.log(`Seed GD2: ${nProducts} san pham, ${nVariants} bien the, 2 bang gia (le/si).`);
}
