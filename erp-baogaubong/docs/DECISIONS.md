# NHẬT KÝ QUYẾT ĐỊNH & GIẢ ĐỊNH
| # | Ngày | Quyết định | Lý do | Ảnh hưởng |
|---|---|---|---|---|
| 1 | 22/07/2026 | Stack: Next.js14+TS, Prisma, PostgreSQL16, Redis+BullMQ, MinIO, Docker | đúng đề xuất SPEC, 1 codebase dễ bảo trì | toàn dự án |
| 2 | 22/07/2026 | Modular monolith, ranh giới module theo ARCHITECTURE.md | MVP nhanh, tách service sau được | toàn dự án |
| 3 | 22/07/2026 | inventory_balance là projection từ stock_movement (không phải nguồn sự thật) | chống lệch tồn, audit được | kho |
| 4 | 22/07/2026 | Công nợ = ledger receivable_entry | SPEC cấm gõ đè số dư | tài chính |
| 5 | 22/07/2026 | App 1 file hiện tại tiếp tục vận hành song song đến hết GĐ6, sau đó migrate | không gián đoạn kinh doanh | vận hành |
| 6 | 22/07/2026 | GIẢ ĐỊNH tiền tố chứng từ mặc định "BG", giá vốn bình quân gia quyền, doanh thu ghi nhận khi đơn Đã xác nhận | chờ chủ DN xác nhận (câu hỏi GĐ0) | tài chính |
| 7 | 22/07/2026 | "Quên mật khẩu" GĐ1 = Admin cấp lại trong màn Tài khoản; luồng email tự phục vụ làm ở GĐ10 (cần mail adapter) | chưa có hạ tầng email | auth |
| 8 | 22/07/2026 | Build phải chạy NODE_ENV=production (script đã ép); môi trường dev đặt sẵn NODE_ENV=development gây trộn runtime | sự cố thực tế khi build | devops |
| 9 | 22/07/2026 | Hồ sơ nhân sự chi tiết (employee) tách riêng ở GĐ8; GĐ1 gộp vào User | đủ cho phân quyền | hr |
| 10 | 23/07/2026 | Nhập/xuất danh mục dùng CSV (UTF-8 BOM) thay vì xlsx | không thêm thư viện nặng, Excel/Sheets mở tốt | catalog |
| 11 | 23/07/2026 | Giá vốn seed = 0 cho 63 SP thật (chưa có số thật); nguyên liệu/BOM/combo/gấu AI seed là bản demo ghi rõ "demo" | SPEC cấm bịa số liệu; chủ DN sẽ nhập giá vốn thật | catalog, giá vốn |
| 12 | 23/07/2026 | resolvePrice: ưu tiên bảng giá được chỉ định → bảng khác priority cao (sỉ 10 > lẻ 0) → lẻ; không tìm được giá trả null buộc nơi gọi xử lý | tránh bán giá 0 do lỗi cấu hình | bán hàng GĐ5 |
| 13 | 23/07/2026 | Lưu file: adapter local (./uploads) cho dev; mọi luợt tải qua API kiểm quyền + phạm vi, không có URL công khai; driver MinIO/S3 cắm vào GĐ10 | môi trường dev không có MinIO; bảo mật file là bắt buộc ngay | CRM, GĐ7 thiết kế |
| 14 | 23/07/2026 | Scope TEAM tạm xử lý như OWN đến khi có mô hình tổ/nhóm (GĐ8) | chưa có bảng team | phân quyền |
| 15 | 23/07/2026 | Chống trùng: chuẩn hóa SĐT (+84→0), email thường hóa, MST bỏ ký tự — cảnh báo 409 + xác nhận "vẫn lưu", không tự chặn cứng | tránh chặn nhầm 2 khách dùng chung số công ty | CRM |
| 16 | 23/07/2026 | Duyệt vượt quyền: chiết khấu hiệu dụng = MAX(CK khai báo trên giá gõ, chênh lệch so giá tham chiếu resolve từ bảng giá) — bắt cả trò gõ đơn giá thấp thay vì ghi CK | 1 thước đo duy nhất, không lách được | bán hàng |
| 17 | 23/07/2026 | POS không cho bán vượt quyền (báo lỗi hướng dẫn tạo báo giá xin duyệt); bán nợ tại POS bắt buộc chọn khách có hồ sơ | POS phải chốt ngay, không treo chờ duyệt | bán hàng |
| 18 | 23/07/2026 | Doanh thu dashboard = đơn CONFIRMED + DONE (khớp quyết định #6: ghi nhận khi xác nhận) | thống nhất số liệu | báo cáo |
| 19 | 23/07/2026 | In/PDF dùng print của trình duyệt (A4 + K80); PDF server-side + template hợp đồng để GĐ7/GĐ9 | không thêm thư viện nặng khi chưa cần | in ấn |
