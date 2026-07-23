import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePerm, guarded, jsonError, reqMeta } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { nextCode } from '@/lib/seq';
import { bomRequirement } from '@/modules/catalog/domain';
import { assertStage, assertQcQty, receiptableQty, progressPct, isLate, materialCost, STAGES } from '@/modules/production/domain';
import { applyMovements, ensureBalance, releaseReserved } from '@/modules/inventory/server';

/** Nhu cau nguyen lieu cua 1 lenh theo BOM (co hao hut) + gia von hien tai. */
async function requirementOf(prodId: number) {
  const prod = await prisma.productionOrder.findUnique({ where: { id: prodId } });
  if (!prod?.bomVersionId) return [];
  const ver = await prisma.bomVersion.findUnique({ where: { id: prod.bomVersionId },
    include: { items: { include: { materialVariant: { include: { product: true } } } } } });
  if (!ver) return [];
  const req = bomRequirement(
    ver.items.map((i) => ({ materialVariantId: i.materialVariantId, qtyPerUnit: Number(i.qtyPerUnit) })),
    prod.qtyPlanned, Number(ver.wastePct));
  return req.map((r) => {
    const item = ver.items.find((i) => i.materialVariantId === r.materialVariantId)!;
    return { ...r, sku: item.materialVariant.sku,
      name: item.materialVariant.product.name, costPrice: item.materialVariant.costPrice,
      qtyInt: Math.ceil(r.qtyNeeded) };  // kho dem so nguyen — lam tron len
  });
}

export const GET = guarded(async (req) => {
  await requirePerm('production.view');
  const url = new URL(req.url);
  const id = Number(url.searchParams.get('id')) || 0;
  if (id) {
    const prod = await prisma.productionOrder.findFirst({ where: { id, deletedAt: null },
      include: { steps: { orderBy: { id: 'asc' } }, designVersion: { include: { design: true } } } });
    if (!prod) throw jsonError(404, 'Không tìm thấy lệnh sản xuất.');
    const variant = await prisma.productVariant.findUnique({ where: { id: prod.variantId },
      include: { product: true } });
    const checklist = variant
      ? await prisma.qcChecklist.findUnique({ where: { productType: variant.product.type } })
      : null;
    const requirement = await requirementOf(id);
    const stageGood: Record<string, number> = {};
    for (const s of prod.steps) {
      stageGood[s.stage] = (stageGood[s.stage] ?? 0) + s.qtyGood;
    }
    return Response.json({ ok: true, prod, requirement,
      variant: variant ? { sku: variant.sku,
        name: [variant.product.name, variant.size, variant.color].filter(Boolean).join(' - '),
        type: variant.product.type } : null,
      checklist: checklist?.items ?? [],
      progress: progressPct(prod.qtyPlanned, stageGood),
      late: isLate(prod.dueDate, prod.status, new Date()) });
  }
  const rows = await prisma.productionOrder.findMany({ where: { deletedAt: null },
    include: { steps: { select: { stage: true, qtyGood: true } } },
    orderBy: { id: 'desc' }, take: 50 });
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.variantId))] } },
    include: { product: { select: { name: true } } } });
  const vMap = new Map(variants.map((v) => [v.id, v]));
  return Response.json({ ok: true, rows: rows.map((r) => {
    const stageGood: Record<string, number> = {};
    for (const s of r.steps) stageGood[s.stage] = (stageGood[s.stage] ?? 0) + s.qtyGood;
    const v = vMap.get(r.variantId);
    return { id: r.id, code: r.code, status: r.status, qtyPlanned: r.qtyPlanned,
      qtyGood: r.qtyGood, qtyDefect: r.qtyDefect, qtyScrap: r.qtyScrap,
      dueDate: r.dueDate, costEstimate: r.costEstimate, costActual: r.costActual,
      name: v ? [v.product.name, v.size].filter(Boolean).join(' - ') : r.variantId,
      sku: v?.sku ?? '', progress: progressPct(r.qtyPlanned, stageGood),
      late: isLate(r.dueDate, r.status, new Date()) };
  }) });
});

const CreateIn = z.object({
  variantId: z.number().int(),
  qtyPlanned: z.number().int().positive('Số lượng phải > 0'),
  warehouseId: z.number().int(),
  orderId: z.number().int().nullable().optional(),
  designVersionId: z.number().int().nullable().optional(),
  overrideNote: z.string().trim().optional().nullable(),  // ly do san xuat khong co mau duyet
  dueDate: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

/** Tao lenh san xuat: BOM ACTIVE cua san pham; mau chua duyet thi phai co ly do + quyen. */
export const POST = guarded(async (req) => {
  const actor = await requirePerm('production.manage');
  const b = CreateIn.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const variant = await prisma.productVariant.findFirst({ where: { id: d.variantId, deletedAt: null },
    include: { product: { include: { boms: { where: { deletedAt: null },
      include: { versions: { where: { status: 'ACTIVE' }, take: 1 } } } } } } });
  if (!variant) throw jsonError(404, 'Không tìm thấy biến thể sản phẩm.');
  const bomVersion = variant.product.boms[0]?.versions[0] ?? null;
  // Quy tac duyet mau: co designVersionId thi phai APPROVED; khong co mau → hang CUSTOM bat buoc mau duyet
  if (d.designVersionId) {
    const dv = await prisma.designVersion.findUnique({ where: { id: d.designVersionId } });
    if (!dv) throw jsonError(404, 'Không tìm thấy bản thiết kế.');
    if (dv.status !== 'APPROVED') {
      if (!actor.perms.includes('sales.approve')) {
        throw jsonError(400, 'Bản thiết kế CHƯA ĐƯỢC DUYỆT — không được sản xuất (cần chủ xưởng dùng quyền ngoại lệ).');
      }
      if (!d.overrideNote?.trim()) {
        throw jsonError(400, 'Sản xuất bằng mẫu chưa duyệt cần ghi RÕ LÝ DO ngoại lệ.');
      }
    }
  } else if (variant.product.type === 'CUSTOM') {
    throw jsonError(400, 'Hàng đặt riêng phải gắn bản thiết kế đã duyệt.');
  }
  const result = await prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, 'SX-');
    let costEstimate = 0;
    if (bomVersion) {
      const ver = await tx.bomVersion.findUnique({ where: { id: bomVersion.id },
        include: { items: { include: { materialVariant: true } } } });
      const reqs = bomRequirement(
        ver!.items.map((i) => ({ materialVariantId: i.materialVariantId, qtyPerUnit: Number(i.qtyPerUnit) })),
        d.qtyPlanned, Number(ver!.wastePct));
      costEstimate = materialCost(reqs.map((r) => ({ qtyNeeded: r.qtyNeeded,
        costPrice: ver!.items.find((i) => i.materialVariantId === r.materialVariantId)!.materialVariant.costPrice })));
    }
    return tx.productionOrder.create({ data: { code,
      orderId: d.orderId ?? null, variantId: d.variantId, bomVersionId: bomVersion?.id ?? null,
      designVersionId: d.designVersionId ?? null, overrideNote: d.overrideNote ?? null,
      warehouseId: d.warehouseId, qtyPlanned: d.qtyPlanned,
      dueDate: d.dueDate ? new Date(d.dueDate) : null, costEstimate,
      note: d.note ?? null, createdById: actor.id, createdByName: actor.name } });
  });
  const { ip, ua } = reqMeta();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'production_create',
    entity: 'production', entityId: result.code,
    after: { qty: d.qtyPlanned, override: !!d.overrideNote }, ip, ua });
  return Response.json({ ok: true, id: result.id, code: result.code, costEstimate: result.costEstimate });
});

const ActIn = z.discriminatedUnion('action', [
  z.object({ action: z.literal('release'), id: z.number().int() }),
  z.object({ action: z.literal('start'), id: z.number().int() }),
  z.object({ action: z.literal('step'), id: z.number().int(),
    stage: z.string(), qtyGood: z.number().int().min(0).default(0),
    qtyDefect: z.number().int().min(0).default(0), qtyRework: z.number().int().min(0).default(0),
    photoUrl: z.string().optional().nullable(), note: z.string().optional().nullable() }),
  z.object({ action: z.literal('qc'), id: z.number().int(),
    inspected: z.number().int().positive(), pass: z.number().int().min(0),
    fail: z.number().int().min(0), scrap: z.number().int().min(0),
    checklist: z.record(z.boolean()).default({}), note: z.string().optional().nullable() }),
  z.object({ action: z.literal('finish'), id: z.number().int() }),
  z.object({ action: z.literal('cancel'), id: z.number().int(), note: z.string().optional().nullable() }),
]);

export const PATCH = guarded(async (req) => {
  const actor = await requirePerm('production.manage');
  const b = ActIn.safeParse(await req.json());
  if (!b.success) throw jsonError(400, b.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ');
  const d = b.data;
  const prod = await prisma.productionOrder.findFirst({ where: { id: d.id, deletedAt: null } });
  if (!prod) throw jsonError(404, 'Không tìm thấy lệnh sản xuất.');
  const { ip, ua } = reqMeta();

  // RELEASE: tinh nhu cau + GIU CHO nguyen lieu (trong pham vi kha dung)
  if (d.action === 'release') {
    if (prod.status !== 'DRAFT') throw jsonError(400, 'Chỉ phát lệnh từ trạng thái Nháp.');
    const reqs = await requirementOf(prod.id);
    await prisma.$transaction(async (tx) => {
      for (const r of reqs) {
        await ensureBalance(tx, prod.warehouseId, r.materialVariantId);
        const n = await tx.$executeRaw`UPDATE "InventoryBalance" SET "reserved" = "reserved" + ${r.qtyInt}
          WHERE "warehouseId" = ${prod.warehouseId} AND "variantId" = ${r.materialVariantId}
            AND "onHand" - "reserved" >= ${r.qtyInt}`;
        if (Number(n) === 0) {
          throw jsonError(400, `${r.sku}: thiếu nguyên liệu — cần ${r.qtyInt}, không đủ khả dụng để giữ chỗ. Nhập kho nguyên liệu trước.`);
        }
        await tx.stockReservation.create({ data: { prodId: prod.id,
          warehouseId: prod.warehouseId, variantId: r.materialVariantId, qty: r.qtyInt } });
      }
      await tx.productionOrder.update({ where: { id: prod.id }, data: { status: 'RELEASED' } });
    });
    await audit({ actorId: actor.id, actorName: actor.name, action: 'production_release',
      entity: 'production', entityId: prod.code, after: { materials: reqs.length }, ip, ua });
    return Response.json({ ok: true });
  }

  // START: CAP PHAT nguyen lieu (xuat kho theo giu cho) + chi phi thuc te
  if (d.action === 'start') {
    if (prod.status !== 'RELEASED') throw jsonError(400, 'Phát lệnh (giữ nguyên liệu) trước khi bắt đầu.');
    if (prod.materialsIssued) throw jsonError(400, 'Nguyên liệu đã cấp phát rồi.');
    const resRows = await prisma.stockReservation.findMany({
      where: { prodId: prod.id, released: false } });
    const mats = await prisma.productVariant.findMany({
      where: { id: { in: resRows.map((r) => r.variantId) } },
      select: { id: true, costPrice: true } });
    const costMap = new Map(mats.map((m) => [m.id, m.costPrice]));
    let costActual = 0;
    await prisma.$transaction(async (tx) => {
      if (resRows.length) {
        await applyMovements(tx, { actor, warehouseId: prod.warehouseId, kind: 'ISSUE',
          lines: resRows.map((r) => ({ variantId: r.variantId, qty: r.qty })),
          refType: 'production', refId: prod.code, note: `Cấp phát NL cho ${prod.code}`,
          guard: 'physical' });
        for (const r of resRows) {
          await releaseReserved(tx, r.warehouseId, r.variantId, r.qty);
          await tx.stockReservation.update({ where: { id: r.id }, data: { released: true } });
          costActual += r.qty * (costMap.get(r.variantId) ?? 0);
        }
      }
      await tx.productionOrder.update({ where: { id: prod.id },
        data: { status: 'IN_PROGRESS', materialsIssued: true, costActual } });
      await tx.productionStep.create({ data: { prodId: prod.id, stage: 'PREP',
        note: 'Cấp phát nguyên liệu, bắt đầu sản xuất', byId: actor.id, byName: actor.name } });
    });
    await audit({ actorId: actor.id, actorName: actor.name, action: 'production_start',
      entity: 'production', entityId: prod.code, after: { costActual }, ip, ua });
    return Response.json({ ok: true, costActual });
  }

  // STEP: ghi nhan cong doan (nguoi, thoi gian, so dat/loi/lam lai, anh)
  if (d.action === 'step') {
    if (prod.status !== 'IN_PROGRESS') throw jsonError(400, 'Lệnh chưa bắt đầu hoặc đã xong.');
    try { assertStage(d.stage); } catch (e) { throw jsonError(400, (e as Error).message); }
    if (d.stage === 'QC') throw jsonError(400, 'Công đoạn QC ghi bằng nút "KCS" riêng (có checklist).');
    if (d.qtyGood + d.qtyDefect + d.qtyRework <= 0) throw jsonError(400, 'Nhập ít nhất 1 số lượng.');
    await prisma.productionStep.create({ data: { prodId: prod.id, stage: d.stage as never,
      qtyGood: d.qtyGood, qtyDefect: d.qtyDefect, qtyRework: d.qtyRework,
      photoUrl: d.photoUrl ?? null, note: d.note ?? null, byId: actor.id, byName: actor.name } });
    return Response.json({ ok: true });
  }

  // QC: checklist + so dat/loi/hong khop nhau; cong don vao lenh
  if (d.action === 'qc') {
    if (prod.status !== 'IN_PROGRESS') throw jsonError(400, 'Lệnh chưa bắt đầu hoặc đã xong.');
    try { assertQcQty({ inspected: d.inspected, pass: d.pass, fail: d.fail, scrap: d.scrap }); }
    catch (e) { throw jsonError(400, (e as Error).message); }
    if (prod.qtyGood + d.pass > prod.qtyPlanned) {
      throw jsonError(400, `QC đạt cộng dồn (${prod.qtyGood + d.pass}) vượt kế hoạch (${prod.qtyPlanned}).`);
    }
    await prisma.$transaction(async (tx) => {
      await tx.productionStep.create({ data: { prodId: prod.id, stage: 'QC',
        qtyGood: d.pass, qtyDefect: d.fail, qtyRework: d.scrap,
        checklist: d.checklist as never, note: d.note ?? null, byId: actor.id, byName: actor.name } });
      await tx.productionOrder.update({ where: { id: prod.id }, data: {
        qtyGood: { increment: d.pass }, qtyDefect: { increment: d.fail },
        qtyScrap: { increment: d.scrap } } });
    });
    await audit({ actorId: actor.id, actorName: actor.name, action: 'production_qc',
      entity: 'production', entityId: prod.code,
      after: { pass: d.pass, fail: d.fail, scrap: d.scrap }, ip, ua });
    return Response.json({ ok: true });
  }

  // FINISH: nhap thanh pham = tong QC dat, DUNG 1 LAN
  if (d.action === 'finish') {
    if (prod.status !== 'IN_PROGRESS') throw jsonError(400, 'Lệnh chưa bắt đầu hoặc đã xong.');
    let qty = 0;
    try { qty = receiptableQty(prod.qtyGood, prod.finishedReceipted); }
    catch (e) { throw jsonError(400, (e as Error).message); }
    await prisma.$transaction(async (tx) => {
      await applyMovements(tx, { actor, warehouseId: prod.warehouseId, kind: 'RECEIPT',
        lines: [{ variantId: prod.variantId, qty }],
        refType: 'production', refId: prod.code, note: `Nhập thành phẩm ${prod.code} (QC đạt ${qty})` });
      await tx.productionOrder.update({ where: { id: prod.id },
        data: { status: 'DONE', finishedReceipted: true } });
      await tx.productionStep.create({ data: { prodId: prod.id, stage: 'PACK',
        qtyGood: qty, note: `Nhập kho ${qty} thành phẩm`, byId: actor.id, byName: actor.name } });
    });
    await audit({ actorId: actor.id, actorName: actor.name, action: 'production_finish',
      entity: 'production', entityId: prod.code, after: { qty }, ip, ua });
    return Response.json({ ok: true, qty });
  }

  // CANCEL: huy lenh — tra giu cho; nguyen lieu da cap phat thi nhap lai kho
  if (prod.status === 'DONE' || prod.status === 'CANCELLED') {
    throw jsonError(400, 'Lệnh đã xong/hủy.');
  }
  await prisma.$transaction(async (tx) => {
    const resRows = await tx.stockReservation.findMany({ where: { prodId: prod.id, released: false } });
    for (const r of resRows) {
      await releaseReserved(tx, r.warehouseId, r.variantId, r.qty);
      await tx.stockReservation.update({ where: { id: r.id }, data: { released: true } });
    }
    // Chua cham vao san xuat (chua co QC) thi tra nguyen lieu ve kho;
    // da lam do → nguyen lieu tieu hao that, thu kho tu kiem ke phan thua qua Nhap/Xuat.
    const touched = prod.qtyGood + prod.qtyDefect + prod.qtyScrap > 0;
    if (prod.materialsIssued && prod.status === 'IN_PROGRESS' && !touched) {
      const issued = await tx.stockMovement.findMany({
        where: { refType: 'production', refId: prod.code, kind: 'ISSUE' } });
      if (issued.length) {
        await applyMovements(tx, { actor, warehouseId: prod.warehouseId, kind: 'RETURN',
          lines: issued.map((m) => ({ variantId: m.variantId, qty: -m.qty })),
          refType: 'production', refId: prod.code, note: `Hủy lệnh ${prod.code} — nhập lại nguyên liệu` });
      }
    }
    await tx.productionOrder.update({ where: { id: prod.id },
      data: { status: 'CANCELLED', note: [prod.note, d.note].filter(Boolean).join(' | ') || null } });
  });
  await audit({ actorId: actor.id, actorName: actor.name, action: 'production_cancel',
    entity: 'production', entityId: prod.code, after: { note: d.note }, ip, ua });
  return Response.json({ ok: true });
});
