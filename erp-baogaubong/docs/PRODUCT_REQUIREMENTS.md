# YÊU CẦU SẢN PHẨM — HỆ THỐNG QUẢN TRỊ BẢO GẤU BÔNG
Nguồn chuẩn: bộ câu lệnh của chủ doanh nghiệp (bản 22/07/2026, lưu tại `docs/SPEC_GOC.md`).
Tài liệu này tóm tắt phạm vi để đối chiếu nghiệm thu; khi mâu thuẫn, SPEC_GOC thắng.

## Mục tiêu
Hệ thống web quản trị bán hàng + CRM + kho + sản xuất + tài chính + nhân sự dùng thật cho
10–30 nhân viên, >100 đơn/ngày; 1 xưởng 1 kho hiện tại, kiến trúc sẵn sàng đa chi nhánh/đa kho.
Chạy trình duyệt desktop, tối ưu mobile. Có cổng riêng cho đại lý/khách.

## Người dùng & vai trò
Admin/Chủ DN · Sale · Kế toán · Kho · CSKH · (portal) Đại lý/Khách.

## 13 phân hệ (menu bắt buộc)
1. Tổng quan  2. Bán hàng (Báo giá, Đơn, POS, Giao hàng, Đổi trả)
3. Sản phẩm (danh mục, biến thể, combo, bảng giá, gấu AI + bảo hành)
4. Kho (tồn, nhập, xuất, chuyển, kiểm, cảnh báo)
5. Sản xuất (yêu cầu thiết kế, demo/duyệt mẫu, lệnh SX, BOM, cấp phát NVL, công đoạn, QC)
6. Đối tác (khách, đại lý, NCC, lịch sử chăm sóc)
7. Giao dịch (thu, chi, thanh toán đơn, công nợ)
8. Sổ quỹ (tiền mặt, ngân hàng, COD chờ đối soát, đối soát)
9. Nhân viên (hồ sơ, phân quyền, giao việc, KPI/hoa hồng, chấm công, lương, nhật ký)
10. Báo cáo (9 nhóm bắt buộc)  11. Cổng đại lý/khách  12. Tích hợp  13. Cài đặt

## Quy tắc nghiệp vụ bất di bất dịch
- Tiền VND lưu số nguyên; múi giờ Asia/Ho_Chi_Minh; ngày dd/MM/yyyy.
- VAT mặc định 8%, cấu hình được; mỗi đơn chọn Lấy/Không lấy VAT; báo cáo tách 2 nhóm.
- Mã chứng từ duy nhất, tiền tố cấu hình theo chi nhánh (vd BG-202607-000001).
- 4 trục trạng thái đơn TÁCH RIÊNG: đơn / thanh toán / sản xuất / giao hàng.
- Mọi thao tác tiền-kho-công-nợ: DB transaction + kiểm quyền server + validation + audit log + idempotency.
- Không xóa cứng (soft delete/thùng rác); chứng từ đã ghi sổ chỉ hủy/điều chỉnh.
- Tồn kho chỉ đổi qua stock_movement bất biến; mặc định cấm âm kho; tồn khả dụng = thực tế − giữ chỗ.
- Công nợ tính từ ledger chứng từ, cấm gõ đè số dư. COD chưa đối soát ≠ tiền ngân hàng.
- Snapshot dòng hàng (tên/SKU/ĐVT/giá/thuế/CK) tại thời điểm chốt chứng từ.
- Khóa sổ theo kỳ; sửa trong kỳ khóa cần quyền đặc biệt + lý do + audit.

## 12 kịch bản nghiệm thu end-to-end
(giữ nguyên như SPEC_GOC mục "ĐIỀU KIỆN NGHIỆM THU" — là căn cứ nghiệm thu cuối cùng)
