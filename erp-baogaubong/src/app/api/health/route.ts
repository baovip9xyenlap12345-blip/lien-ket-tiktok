/** Liveness — khong cham DB, khong can dang nhap. */
export function GET() {
  return Response.json({ ok: true, service: 'erp-baogaubong', time: new Date().toISOString() });
}
