# KIẾN TRÚC — MODULAR MONOLITH

## Stack
- **Web + API**: Next.js 14 (App Router) + TypeScript. API qua route handlers `/api/*`.
- **DB**: PostgreSQL 16. **ORM/migration**: Prisma.
- **Cache/queue**: Redis + BullMQ (thông báo, sync nền, adapter tích hợp).
- **File**: MinIO (S3-compatible) — logo/demo/hợp đồng, signed URL có hạn.
- **Auth**: session cookie HTTP-only (iron-session/lucia), RBAC + data-scope kiểm ở SERVER.
- **PDF**: server-side render (playwright-chromium hoặc react-pdf) từ document_template.
- **Triển khai**: Docker + docker-compose (dev & prod), Caddy/Nginx reverse proxy HTTPS.

## Ranh giới module (src/modules/*)
`auth` · `org` (company/branch/warehouse) · `catalog` (sản phẩm/biến thể/bảng giá/BOM)
· `partner` (khách/NCC/CRM) · `sales` (báo giá/đơn/POS) · `inventory` · `production`
· `shipping` · `finance` (quỹ/thu chi/công nợ/khóa sổ) · `hr` (nhân viên/KPI/lương)
· `report` · `portal` · `integration` (adapter+queue) · `settings` · `audit`.
Mỗi module: `domain/` (logic thuần, unit-test được) → `service/` (transaction, quyền)
→ `repo/` (Prisma) → `api/` (validation zod) → `ui/`. Module khác chỉ gọi qua service公開.

## Nguyên tắc xuyên suốt
- Mọi mutation tiền/kho/nợ: `prisma.$transaction` + idempotency key (bảng `idempotency_key`).
- Audit log middleware ở tầng service; correlation id mỗi request; structured logging (pino).
- Adapter pattern: `integration/adapters/{facebook,zalo,shipping,einvoice,email,sms,sheets}`
  đều implement interface chung + sandbox adapter mặc định (đánh dấu CHƯA GỬI THẬT).
- Số chứng từ: bảng `document_sequence` khóa row-level khi cấp số.
- Theme/branding từ bảng `setting`, Admin đổi được logo/màu.

## Môi trường
dev: docker-compose (pg, redis, minio, mailhog). prod: compose + backup cron (pg_dump + minio mirror).
Secrets qua `.env` — không commit.
