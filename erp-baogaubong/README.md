# ERP Bảo Gấu Bông — Giai đoạn 1 (nền móng)

## Chạy local
```bash
pnpm install
# PostgreSQL: tạo db erp_dev, sửa DATABASE_URL trong .env
pnpm db:migrate      # tạo bảng
pnpm db:seed         # 5 tài khoản demo, mật khẩu Baobao@2026 (CHỈ local)
pnpm dev             # http://localhost:3000
```
Tài khoản demo: admin / sale1 / ketoan1 / kho1 / cskh1 — mật khẩu `Baobao@2026`.

## Kiểm thử
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm dev &            # rồi:
node e2e/login.e2e.mjs
```

## Triển khai thật
Xem `docker-compose.yml` + docs/ARCHITECTURE.md. Secrets đặt trong biến môi trường.
