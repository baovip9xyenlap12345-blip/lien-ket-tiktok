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

## [GĐ2] 23/07/2026 — Sản phẩm, biến thể, BOM, bảng giá HOÀN THÀNH
- Schema + migration `gd2_catalog`: Category, Unit, UnitConversion, Product (7 loại: thành phẩm/nguyên liệu/bán thành phẩm/dịch vụ/combo/đặt riêng/gấu AI), ProductVariant (SKU duy nhất, barcode, size/màu/chất liệu, giá vốn, cân nặng), PriceList (lẻ/sỉ/đại lý/công ty/tùy chỉnh + priority + hiệu lực), PriceRule (giá bậc thang theo SL tối thiểu), BundleItem (combo), Bom/BomVersion (phiên bản, hao hụt %, ACTIVE thay bản cũ)/BomItem, AiDevice (serial duy nhất).
- Lõi nghiệp vụ thuần (unit-test được): pickTierPrice, resolvePrice (ưu tiên bảng chỉ định → sỉ theo priority → lẻ; hết hiệu lực bị loại; không có giá → null, KHÔNG bịa 0), convertQty, bomRequirement (hao hụt %), makeSku (bỏ dấu), validateImportRow (lỗi tiếng Việt).
- API: products (tìm kiếm tên/mã/SKU, phân trang, tạo/sửa transaction + chặn SKU trùng, xóa mềm), meta, prices (bậc giá CRUD), resolve-price, bom (tạo phiên bản mới, kích hoạt thay bản cũ), import CSV (chế độ toàn vẹn ?atomic=1, lỗi từng dòng), export CSV (cột giá vốn CHỈ khi có quyền cost.view). Tất cả kiểm quyền server + audit.
- UI /catalog: 2 tab (Danh sách sản phẩm · Định mức BOM); tìm kiếm + lọc loại + phân trang; form sản phẩm với biến thể động; modal bảng giá bậc thang từng SKU; nhập/xuất CSV; tạo phiên bản BOM. Vai trò không có cost.view không thấy giá vốn; không có catalog.manage chỉ xem.
- Seed dữ liệu THẬT: 63 dòng bảng giá sỉ baogaubong.vn → 33 sản phẩm + biến thể theo size, giá lẻ + giá sỉ; 4 nhóm hàng; ĐVT con/cái/m/kg; kèm demo (ghi rõ "demo"): 3 nguyên liệu, 1 BOM, 1 combo, 1 gấu AI + thiết bị.
- Kiểm thử: lint ✅ · typecheck ✅ · unit 20/20 ✅ · build ✅ (29 routes) · E2E GĐ1 6/6 ✅ + GĐ2 14/14 ✅ (dữ liệu thật hiển thị, SKU trùng bị chặn, giá bậc thang sỉ/lẻ đúng, kho bị ẩn giá vốn + 403 khi tạo).
- Chưa làm (đúng kế hoạch): in tem mã vạch (GĐ6), upload ảnh MinIO (GĐ3 — tạm lưu URL), màn quản lý thiết bị gấu AI (schema đã sẵn).
