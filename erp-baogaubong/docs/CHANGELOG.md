# CHANGELOG
## [GĐ0] 22/07/2026
- Khởi tạo bộ tài liệu: PRODUCT_REQUIREMENTS, ARCHITECTURE, DATABASE_SCHEMA,
  PERMISSIONS_MATRIX, IMPLEMENTATION_PLAN, TEST_PLAN, DECISIONS, CHANGELOG.
- Chưa có mã nguồn — chờ chủ doanh nghiệp duyệt kế hoạch + trả lời câu hỏi GĐ0.

## [GĐ1] 22/07/2026 — Nền móng HOÀN THÀNH
- Next.js 14 + TS + Prisma + PostgreSQL 16; migration `gd1_nen_mong`; docker-compose cho prod.
- Đăng nhập/đăng xuất, phiên DB + cookie httpOnly, tự đăng xuất khi không hoạt động (sliding, cấu hình được), rate-limit đăng nhập.
- Company/Branch/Warehouse/User/Role/Permission/DataScope; 5 vai trò mặc định + 21 quyền; seed 5 tài khoản demo.
- Khung UI responsive (sidebar desktop + bottom nav mobile); trang: Tổng quan (số liệu thật), Tài khoản (CRUD), Phân quyền (gán quyền theo vai trò), Cài đặt (công ty/VAT/tiền tố/idle), Nhật ký; 8 trang phân hệ sau gắn nhãn "đang phát triển" — không số liệu giả.
- Kiểm quyền TẠI SERVER mọi API (requirePerm) + middleware; audit log login/user/role/settings.
- Kiểm thử: lint ✅ · typecheck ✅ · unit 6/6 ✅ · build ✅ (22 routes) · E2E 6/6 ✅ (sai mật khẩu, chặn chưa đăng nhập, admin vào Cài đặt, sale bị chặn trang + API 403).
