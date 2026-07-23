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

## [GĐ3] 23/07/2026 — Đối tác & CRM HOÀN THÀNH
- Schema + migration `gd3_partners_crm`: Partner (cá nhân/doanh nghiệp; cờ khách hàng/đại lý/NCC; nhóm, nguồn, kênh, bảng giá riêng, sale phụ trách, hạn mức nợ + số ngày nợ; normPhone/normEmail để bắt trùng), PartnerContact, PartnerAddress (mặc định hóa đơn/giao hàng), PartnerGroup, CareActivity (ghi chú/cuộc gọi/nhiệm vụ/gặp mặt + hạn + nhắc + người phụ trách), Attachment (file đính kèm theo đối tác).
- Mã tự sinh KH0001/NCC0001 qua DocumentSequence (src/lib/seq.ts, cấp trong transaction).
- Phạm vi dữ liệu dùng chung src/lib/scope.ts: OWN/TEAM → của mình; BRANCH → chi nhánh; ALL. Áp cho danh sách, tìm kiếm, chi tiết, sửa/xóa, chăm sóc, file, export — sale KHÔNG thể thấy/đọc/sửa khách người khác kể cả gọi thẳng API.
- Phát hiện trùng SĐT/email/MST khi lưu (chuẩn hóa +84→0, MST 13 số tự tách 10-3): trả 409 kèm danh sách nghi trùng, người dùng xác nhận "vẫn lưu" mới ghi. Gộp khách trùng: chuyển liên hệ/địa chỉ/chăm sóc/file sang bản giữ, điền bù thông tin trống, bản gộp đánh dấu mergedInto + xóa mềm, audit trước/sau.
- File đính kèm (logo, thiết kế, hợp đồng): upload ≤10MB, chỉ ảnh/PDF/Word/Excel/CSV; KHÔNG có link công khai — tải về duy nhất qua /api/files/[id] có kiểm quyền + phạm vi; driver lưu trữ tách riêng (local dev, MinIO/S3 ở GĐ10).
- UI: /partners (tab Khách hàng/Đại lý/NCC/Tất cả, tìm kiếm, nhóm, phân trang, thẻ "Lịch nhắc chăm sóc của tôi" với việc quá hạn đỏ, form đầy đủ liên hệ + địa chỉ + hạn mức, cảnh báo trùng ngay trong form); /partners/[id] (timeline chăm sóc, thêm ghi chú/nhiệm vụ, đánh dấu xong, upload/tải/xóa file, gộp khách). Nhập/xuất CSV theo quyền + phạm vi.
- Seed: chỉ 3 nhóm khách mặc định (Khách lẻ/Khách sỉ/Đại lý) — KHÔNG seed khách giả.
- Kiểm thử: lint ✅ · typecheck ✅ · unit 32/32 ✅ (12 test mới: chuẩn hóa SĐT/MST, bắt trùng, scope) · build ✅ · E2E 41/41 ✅ (GĐ1 6 + GĐ2 14 + GĐ3 21: trùng 409→vẫn lưu, lịch nhắc, file .exe bị chặn, sale không thấy/không tìm/không export/không tải file khách người khác, kho 403, gộp khách + audit, trang chi tiết).
- Chưa làm (đúng kế hoạch): timeline tự gom báo giá/đơn/thanh toán (chờ GĐ4-5, khung đã sẵn); nhắc qua thông báo đẩy/email (GĐ10); MinIO driver (GĐ10).

## [GĐ4] 23/07/2026 — Báo giá, Đơn hàng, POS HOÀN THÀNH
- Schema + migration `gd4_sales`: Quote (phiên bản + QuoteRevision snapshot JSON mỗi lần sửa), QuoteLine/OrderLine (snapshot sku/tên/ĐVT/giá tại thời điểm bán), SalesOrder với 4 TRỤC TRẠNG THÁI RIÊNG (đơn / thanh toán / sản xuất / giao hàng), Payment (PT-…), StatusHistory (lịch sử mọi bước chuyển, ai, lúc nào).
- Công thức tiền trong domain thuần, 21 unit test: thành tiền dòng (CK dòng %, làm tròn VND), CK toàn đơn (% hoặc tiền — tiền ưu tiên, kẹp không âm), VAT bật/tắt + thuế suất cấu hình (mặc định 8 từ Cài đặt), phí khác + vận chuyển, đã thu/còn nợ, máy trạng thái 4 trục (DONE/CANCELLED là cuối).
- Cơ chế XIN DUYỆT: chiết khấu hiệu dụng = MAX(CK khai báo, chênh so với giá tham chiếu bảng giá — bắt cả gõ giá tay thấp) > ngưỡng `max_discount_pct` (Cài đặt, mặc định 10%) HOẶC công nợ sau đơn vượt hạn mức khách → PENDING; quyền mới `sales.approve` (admin); chờ duyệt thì không gửi báo giá/không xác nhận đơn; khay "Chờ anh duyệt" ngay trên dashboard bán hàng.
- Chuyển báo giá → đơn KHÔNG nhập lại; chống chuyển trùng bằng ràng buộc unique quoteId (lần 2 trả 409 kèm mã đơn cũ); đơn từ báo giá tự xét công nợ khách.
- POS bán nhanh: tìm/quét barcode-SKU (Enter), giỏ hàng, khách lẻ hoặc chọn khách (nợ bắt buộc chọn khách), tiền mặt/chuyển khoản, khách đưa thừa tính tiền trả lại, tạo đơn CONFIRMED + phiếu thu trong 1 transaction, tự mở phiếu in K80.
- Thu tiền nhiều lần / đơn: PT-… tự sinh, UNPAID→PARTIAL→PAID (thu thừa bị kẹp về đúng số còn nợ).
- In ấn: /print/quote/[id] (báo giá A4 có chữ ký), /print/order/[id] (đơn A4) + ?k80=1 (phiếu POS 80mm) — in hoặc lưu PDF từ trình duyệt; kiểm quyền + phạm vi cả trang in.
- Dashboard bán hàng SỐ LIỆU THẬT theo phạm vi người xem: doanh thu hôm nay/tháng, khách còn nợ, bán chạy tháng, đơn gần nhất.
- Kiểm thử: lint ✅ · typecheck ✅ · unit 53/53 ✅ (21 test tiền mới) · build ✅ · E2E 72/72 ✅ (31 test GĐ4: tiền đúng từng đồng, nháp không chuyển đơn, chống chuyển trùng 409, sale không tự duyệt 403, chờ duyệt chặn gửi/xác nhận, thu 2 lần PARTIAL→PAID, DONE không hủy được, lịch sử ≥5 bước, CK 25% + gõ giá thấp đều bị bắt, POS trả lại tiền thừa, kho 403, trang in đủ thông tin).
- Sự cố thật đã sửa: (1) chiết khấu chỉ so giá tham chiếu sỉ nên CK 25% trên giá lẻ lọt lưới → đổi thành MAX(khai báo, tham chiếu); (2) server test cũ chiếm cổng làm E2E chạy trên build cũ → diệt đúng PID trước khi test.
- Chưa làm (đúng kế hoạch): trừ tồn kho khi bán (GĐ6 — kho chưa xây); hợp đồng từ template (GĐ7 đi cùng thiết kế/duyệt mẫu); PDF server-side (hiện in/Lưu PDF qua trình duyệt).

## [GĐ5] 23/07/2026 — Thu tiền, công nợ, sổ quỹ HOÀN THÀNH
- Schema + migration `gd5_finance`: CashAccount (quỹ tiền mặt/ngân hàng/COD chờ đối soát), CashTransaction (PT- thu / PC- chi / CQ- chuyển quỹ / HT- hoàn tiền; BẤT BIẾN — không có API sửa/xóa; idempotencyKey unique; kỳ sổ; liên kết hoàn tiền refundOf; liên kết đơn hàng), PeriodLock (khóa sổ theo kỳ).
- MỌI thao tác tiền qua 1 hàm createCashTx: chạy trong database transaction, request lặp (cùng idempotency key) trả về chứng từ cũ — không ghi đôi; chặn ghi vào kỳ đã khóa; phiếu chi của người không có quyền `finance.approve` (quyền mới, admin) → CHỜ DUYỆT, chưa tính vào số dư.
- Số dư quỹ KHÔNG BAO GIỜ nhập tay: luôn = đầu kỳ + tổng chứng từ đã duyệt (balanceOf). Sổ quỹ theo tháng: đầu kỳ, tổng thu, tổng chi, cuối kỳ + drill-down từng chứng từ, đối chiếu cuối kỳ = đầu kỳ + thu − chi (E2E xác nhận).
- Bán hàng GĐ4 nối vào sổ quỹ: thu tiền đơn/POS tự sinh chứng từ PT- cùng mã, vào đúng quỹ theo phương thức (tiền mặt→QTM, chuyển khoản→NH1).
- Hoàn tiền = chứng từ HT- LIÊN KẾT phiếu thu gốc (không sửa/xóa phiếu cũ), không hoàn vượt số đã thu (kể cả cộng dồn nhiều lần hoàn); đơn hàng tự giảm số đã thu, chuyển PARTIAL/REFUNDED.
- Chuyển quỹ = cặp chứng từ CQ- (đi + đến) cùng transferGroup trong 1 transaction; chặn chuyển quá số dư.
- Khóa sổ theo kỳ: kỳ khóa chặn lập + duyệt chứng từ; mở khóa BẮT BUỘC lý do; cả 2 chiều ghi audit (E2E kiểm tra nhật ký).
- Công nợ tính TỪ CHỨNG TỪ (đơn − phiếu thu): tuổi nợ 5 giỏ (chưa đến hạn/1-7/8-30/31-60/>60 ngày) theo hạn = ngày đơn + số ngày được nợ của khách; cảnh báo VƯỢT HẠN MỨC đỏ; nút thu nợ ngay tại chỗ.
- UI /finance 5 tab: Tổng quan (số dư từng quỹ + dòng tiền tháng), Sổ quỹ, Thu/Chi (lập phiếu + duyệt + chuyển quỹ + hoàn tiền), Công nợ, Khóa sổ. In phiếu thu/chi A5 (/print/cash/[id]); xuất CSV sổ quỹ theo quyền.
- Kiểm thử: lint ✅ · typecheck ✅ · unit 60/60 ✅ (7 test tài chính mới) · build ✅ · E2E 104/104 ✅ (GĐ5 thêm 32: idempotency không ghi đôi, phiếu chi chờ duyệt chưa trừ quỹ, chuyển quỹ khớp 2 đầu + chặn quá số dư, hoàn tiền liên kết + chặn hoàn vượt, đối chiếu sổ quỹ, khóa/mở kỳ + audit, tuổi nợ, kho/sale 403, export, trang in).
- Chưa làm (đúng kế hoạch): COD gắn vận đơn thực tế + đối soát tự động (GĐ6 — giao hàng chưa xây, quỹ COD đã sẵn); chi lương (GĐ8); xuất Excel .xlsx (dùng CSV theo quyết định #10).

## [GĐ6] 23/07/2026 — Kho & Giao hàng HOÀN THÀNH
- Schema + migration `gd6_inventory`: StockMovement BẤT BIẾN (8 loại: nhập/xuất/giao bán/chuyển đi-đến/điều chỉnh/nhập lại/hủy hàng; tham chiếu chứng từ nguồn; không có API sửa/xóa), InventoryBalance (projection cập nhật cùng transaction), StockReservation (giữ chỗ), Shipment + ShipmentLine (GH-, đơn vị vận chuyển, mã vận đơn, phí giao, COD), Stocktake (KK-), min/max tồn trên biến thể.
- CẤM ÂM KHO an toàn đồng thời: điều kiện tồn đủ nằm ngay trong câu UPDATE (khóa dòng PostgreSQL) — E2E cho 2 người cùng xuất 5 con khi tồn 7: đúng 1 người thành công. Xuất thường trừ theo KHẢ DỤNG (tồn − giữ chỗ) để không ăn vào hàng đã giữ cho đơn.
- Tồn thực tế / giữ chỗ / khả dụng tính đúng; giữ chỗ theo đơn Đã xác nhận (chỉ trong phạm vi khả dụng), giao từng phần tiêu thụ giữ chỗ đúng phần giao, phần chưa giao vẫn giữ.
- Giao hàng nhiều đợt: xuất kho khi soạn hàng; số giao KHÔNG vượt số còn được giao (muốn vượt cần quyền duyệt sales.approve); trục giao hàng của đơn tự cập nhật (giao đủ mới thành Đã giao).
- COD đúng nghiệp vụ: giao xong → phiếu thu vào quỹ "COD chờ đối soát" (tiền đang ở đơn vị vận chuyển, KHÔNG phải ngân hàng) + đơn ghi nhận đã thu; khi ngân hàng báo có → màn Đối soát chọn vận đơn khớp sao kê → cặp chứng từ chuyển quỹ COD→ngân hàng + đánh dấu đã đối soát.
- Đổi trả/hoàn hàng: đợt giao Bị trả/Hủy hỏi "hàng còn bán được không" → nhập lại kho (RETURN) hoặc ghi nhận + hủy (RETURN+SCRAP có dấu vết); hoàn tiền dùng phân hệ GĐ5 (liên kết phiếu gốc).
- Kiểm kho: nhập số đếm thực tế → tự sinh chứng từ ĐIỀU CHỈNH phần lệch (KK-), theo tồn vật lý.
- Quét barcode/SKU ở nhập/xuất/kiểm kho; chống quét trùng ngoài ý muốn (cùng mã trong 2 giây → hỏi xác nhận).
- Cảnh báo tồn: sắp hết (≤ min) đỏ, vượt max vàng; lọc "chỉ hiện cảnh báo"; thẻ kho từng SKU (drill-down chứng từ).
- UI /inventory 5 tab: Tồn kho, Nhập/Xuất, Giao hàng, Kiểm kho, Đối soát COD (tab tài chính chỉ hiện với người có quyền).
- Kiểm thử: lint ✅ · typecheck ✅ · unit 68/68 ✅ (8 test kho mới) · build ✅ · E2E 131/131 ✅ (GĐ6 thêm 27: cấm âm, CONCURRENCY 2 người cùng xuất, giữ chỗ chặn xuất thường, giao 2 đợt + chặn vượt, COD vào quỹ COD → đối soát sang NH khớp 2 đầu, hoàn hàng nhập lại, kiểm kho tự điều chỉnh, thẻ kho đủ dấu vết, phân quyền).
- Lỗi thật bị test bắt & sửa: giao từng phần ban đầu xóa toàn bộ giữ chỗ của biến thể → sửa thành tiêu thụ đúng số giao, phần còn lại giữ nguyên.
- Chưa làm (đúng kế hoạch): vị trí kệ trong kho (xưởng 1 kho — bổ sung khi cần), "đang chuyển" giữa 2 kho (chuyển kho tức thời vì cùng địa điểm — ghi DECISIONS #24), nhu cầu sản xuất trong cảnh báo tồn (GĐ7), tự trừ kho khi POS (quyết định #25 — POS xưởng chưa gắn kho, sẽ nối ở GĐ7 khi có luồng sản xuất-nhập kho đầy đủ).
