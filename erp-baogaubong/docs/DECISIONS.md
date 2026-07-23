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
| 20 | 23/07/2026 | Công nợ phải thu = tính trực tiếp từ chứng từ (đơn − phiếu thu/hoàn) thay vì bảng ledger riêng; không tồn tại chỗ nào nhập đè số dư | đơn giản, luôn khớp chứng từ, đúng yêu cầu "không nhập đè"; bảng ledger riêng cân nhắc lại khi có kế toán kép GĐ9 | tài chính |
| 21 | 23/07/2026 | Chứng từ tiền bất biến: không có API sửa/xóa; sai thì lập chứng từ đối ứng (hoàn tiền/chi bù); duyệt là thời điểm tính vào số dư | audit sạch, khớp spec | tài chính |
| 22 | 23/07/2026 | Phiếu thu gắn đơn dùng CHUNG mã với phiếu thu của đơn (PT-) — 1 sự kiện tiền 1 mã, hiện cả ở đơn lẫn sổ quỹ | tránh 2 mã cho 1 lần thu | tài chính, bán hàng |
| 23 | 23/07/2026 | Xuất kho tại thời điểm SOẠN hàng (tạo đợt giao); hủy/trả đợt thì tự nhập lại | hàng rời kệ là phải trừ sổ, khớp thực tế xưởng | kho |
| 24 | 23/07/2026 | Chuyển kho tức thời (cặp chứng từ OUT+IN cùng transaction) — không có trạng thái "đang chuyển" vì xưởng 1 địa điểm; sẽ thêm kho trung chuyển khi mở chi nhánh | tránh phức tạp không cần thiết | kho |
| 25 | 23/07/2026 | POS/đơn bán chưa tự trừ kho ở GĐ6 — trừ kho qua luồng GIAO HÀNG (mọi đơn muốn trừ kho thì tạo đợt giao, kể cả khách mua tại xưởng: giao ngay tại quầy); cân nhắc POS trừ thẳng ở GĐ7 | 1 đường trừ kho duy nhất, không trừ đôi | kho, bán hàng |
| 26 | 23/07/2026 | Duyệt mẫu dùng quyền sales.approve (chủ xưởng) — không thêm quyền mới; nhân viên sản xuất tạo/sửa bản demo, không tự duyệt | ít quyền, đúng người quyết | sản xuất |
| 27 | 23/07/2026 | Hủy lệnh SX: chưa chấm công đoạn nào → tự trả nguyên liệu; đã làm dở → không tự trả (tiêu hao thật), thủ kho kiểm kê phần thừa | tránh tồn kho ảo | sản xuất, kho |
| 28 | 23/07/2026 | Tiến độ = sản lượng công đoạn SAU CÙNG có ghi nhận / kế hoạch (không cộng dồn các công đoạn) | phản ánh số ra thành phẩm thật | sản xuất |
| 29 | 23/07/2026 | Quỹ CẤM ÂM với mọi dòng tiền ra (chi/hoàn/chuyển), kiểm tại lập + tại duyệt | quỹ âm là phi lý; lỗi thật phát hiện khi test lặp | tài chính |
| 30 | 23/07/2026 | Hoa hồng 2 căn cứ (doanh thu/tiền đã thu); căn cứ lợi nhuận lùi GĐ9 khi giá vốn bình quân sẵn sàng | không bịa số lợi nhuận khi giá vốn chưa chuẩn | hr |
| 31 | 23/07/2026 | Chấm công 0/½/1 mỗi ngày, không quản ca giờ; công chuẩn tháng = setting standard_work_days (26) | đủ cho xưởng nhỏ, tránh phức tạp | hr |
