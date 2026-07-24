import { prisma } from '@/lib/db';
import { guarded } from '@/lib/auth';
import { requirePortal } from '@/modules/portal/server';

const ORDER_VI: Record<string, string> = { NEW: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', DONE: 'Hoàn tất', CANCELLED: 'Đã hủy' };
const PAY_VI: Record<string, string> = { UNPAID: 'Chưa thanh toán', PARTIAL: 'Trả một phần', PAID: 'Đã thanh toán' };
const SHIP_VI: Record<string, string> = { NONE: '—', PICKING: 'Đang soạn', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', RETURNED: 'Đã trả' };

/** Lich su don cua khach dang dang nhap (chi don cua chinh minh). */
export const GET = guarded(async () => {
  const me = await requirePortal();
  const orders = await prisma.salesOrder.findMany({
    where: { partnerId: me.partnerId, deletedAt: null },
    include: { lines: true }, orderBy: { createdAt: 'desc' }, take: 50 });
  return Response.json({ ok: true, orders: orders.map((o) => ({
    code: o.code, createdAt: o.createdAt, total: o.total,
    orderStatus: ORDER_VI[o.orderStatus] ?? o.orderStatus,
    paymentStatus: PAY_VI[o.paymentStatus] ?? o.paymentStatus,
    shippingStatus: SHIP_VI[o.shippingStatus] ?? o.shippingStatus,
    items: o.lines.map((l) => ({ name: l.name, qty: l.qty, unitPrice: l.unitPrice, lineTotal: l.lineTotal })),
  })) });
});
