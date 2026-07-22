# KẾ HOẠCH TRIỂN KHAI

## Nguyên tắc
Theo đúng 10 câu lệnh giai đoạn của chủ DN. Mỗi giai đoạn: code + test (unit/integration/E2E)
+ lint/type-check/build xanh + cập nhật docs + báo cáo theo mẫu "ĐẦU RA MỖI GIAI ĐOẠN" mới được chuyển tiếp.

## Lộ trình (GĐ = giai đoạn, khớp số câu lệnh)
- **GĐ0 (tài liệu này)**: phân tích, ERD, ma trận quyền, kế hoạch, câu hỏi — CHỜ DUYỆT.
- **GĐ1 Nền móng**: scaffold Next+Prisma+Docker; auth/session/RBAC/scope; khung UI responsive;
  cài đặt cơ bản; audit log; seed tài khoản. ✅Nghiệm thu: đăng nhập 5 vai trò, chặn sai quyền (E2E).
- **GĐ2 Sản phẩm**: catalog, biến thể/SKU/barcode, ĐVT quy đổi, bảng giá 5 loại + bậc số lượng,
  combo, BOM version, gấu AI. ✅: test ưu tiên giá, quy đổi, SKU trùng.
- **GĐ3 Đối tác/CRM**: hồ sơ, liên hệ/địa chỉ, nhóm/nguồn, hạn mức nợ, hoạt động CSKH, file S3,
  chống trùng + gộp, data scope sale. ✅: test scope không rò rỉ qua API/search/export/file.
- **GĐ4 Báo giá→Đơn→POS**: luồng 11 bước, 4 trục trạng thái, duyệt vượt quyền, VAT 8%/không,
  snapshot, PDF, POS. ✅: unit công thức tiền; E2E báo giá→duyệt→đơn; idempotent chuyển đơn.
- **GĐ5 Tiền & công nợ**: quỹ 3 loại, thu/chi/duyệt, thu nhiều lần + phân bổ, ledger công nợ,
  tuổi nợ, khóa sổ, hoàn tiền liên kết. ✅: test request lặp, khóa kỳ, số dư đối chiếu.
- **GĐ6 Kho & giao hàng**: movement bất biến, giữ chỗ, cấm âm kho, chuyển/kiểm kho, barcode,
  giao nhiều đợt, COD đối soát, đổi trả. ✅: test concurrency 2 người cùng xuất.
- **GĐ7 Sản xuất**: thiết kế→demo→duyệt version→lệnh SX→BOM→cấp phát→7 công đoạn→QC→nhập TP.
  ✅: tiến độ theo sản lượng thật; nhập TP đúng 1 lần, ≤ số đạt QC.
- **GĐ8 Nhân sự**: chấm công, giao việc, KPI, hoa hồng version + chốt kỳ, lương draft→duyệt→chi.
- **GĐ9 Báo cáo + Portal**: 9 nhóm báo cáo drill-down; portal đại lý (IDOR test bắt buộc).
- **GĐ10 Tích hợp + production**: adapters sandbox, webhook idempotent, bảo mật, backup+DR test,
  Docker prod, tài liệu vận hành. ✅: 12 kịch bản nghiệm thu tổng + báo cáo rủi ro.

## Phạm vi MVP (dùng sớm) = GĐ1→GĐ6 lõi + GĐ7 cơ bản + dashboard GĐ9 rút gọn
Đúng khuyến nghị mục 8 SPEC: Khách→Báo giá→Đơn→Cọc→Công nợ→Kho→Giao→Báo cáo.

## Ước lượng thực tế (làm bằng AI + nghiệm thu từng bước)
GĐ1: 1-2 phiên làm việc · GĐ2-3: 2-3 phiên · GĐ4-5: 3-4 phiên · GĐ6: 2-3 phiên ·
GĐ7: 2-3 phiên · GĐ8-10: 4-6 phiên. Không cam kết "1 lần xong" — đúng tinh thần SPEC.

## Quan hệ với app hiện tại (app-gau-bong/baobao-app.html)
App 1 file + Google Apps Script tiếp tục DÙNG THẬT trong lúc xây ERP.
Khi ERP đạt GĐ6: viết script migrate (sản phẩm/khách/hóa đơn/quỹ từ JSON backup → PostgreSQL).
