# KẾ HOẠCH KIỂM THỬ
- **Unit (vitest)**: công thức tiền/VAT/chiết khấu/làm tròn, ưu tiên bảng giá, quy đổi ĐVT,
  BOM tính nhu cầu, tuổi nợ, hoa hồng, tiến độ SX.
- **Integration (vitest + testcontainers PostgreSQL)**: transaction + idempotency cho thanh toán,
  xuất kho, duyệt đơn, hoàn tiền, webhook; RBAC/data-scope từng endpoint; khóa kỳ; concurrency
  (2 request song song xuất cùng SKU → 1 thành công hoặc cả hai đúng tồn).
- **E2E (Playwright)**: 12 kịch bản nghiệm thu trong SPEC_GOC + đăng nhập/chặn quyền + portal IDOR.
- **Hiệu năng**: seed ≥ 10.000 đơn, đo trang danh sách + dashboard (mục tiêu <1.5s server time).
- **Cổng chất lượng mỗi GĐ**: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` xanh.
- Quy tắc: sửa lỗi phải kèm regression test; cấm tắt test/nới validation để cho qua.
