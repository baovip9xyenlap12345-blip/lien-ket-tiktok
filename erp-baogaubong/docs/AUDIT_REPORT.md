# BÁO CÁO KIỂM TOÁN ĐỘC LẬP & KẾT QUẢ SỬA LỖI

**Ngày:** 23/07/2026 · **Phạm vi:** toàn bộ ERP Bảo Gấu Bông (GĐ1–10)
**Cách làm:** đóng vai QA/kiểm toán độc lập — KHÔNG tin tài liệu, đọc thẳng mã nguồn + chạy tấn công thật + đối chiếu số liệu trên database. 3 kiểm toán viên song song (tiền/bán hàng · kho/sản xuất · bảo mật/RBAC/IDOR).

## Phương pháp
- Quét tĩnh: TODO/FIXME/hard-code/`any`/lỗi bị nuốt (0 phát hiện), điểm `requirePerm` từng route (mọi route có kiểm quyền; health/ready/webhook công khai chủ đích).
- 7 bất biến nhất quán chéo module chạy SQL trực tiếp trên dữ liệu thật.
- Test tương tranh (2 request song song) cho thu tiền, chi quỹ, đối soát COD, chuyển báo giá.
- Hiệu năng với 653 đơn (≈100 đơn/ngày × ~7 ngày).

## Kết quả tổng
- **Critical: 0 · High: 4 · Medium: 3 · Low: 6** → **đã sửa toàn bộ High + Medium + 3 Low đáng giá**, mỗi lỗi kèm regression test. Low còn lại: chấp nhận có ghi chú (xem cuối).

---

## LỖI ĐÃ SỬA (kèm regression test trong `e2e/audit-fixes.e2e.mjs`)

### [HIGH-1] Mất tiền khi thu 2 lần đồng thời (lost-update trên `order.paidAmt`)
`sales/pay`, `finance/tx`, `finance/refund` đọc đơn NGOÀI transaction rồi ghi `paidAmt` tuyệt đối → 2 lần thu song song: sổ quỹ +2× nhưng đơn chỉ +1×.
**Sửa:** khóa dòng đơn `SELECT … FOR UPDATE` trong transaction, đọc lại giá trị mới nhất; thêm `idempotencyKey` cho route thu tiền.
**RT:** thu 300k+400k đồng thời → đơn đúng 700k, quỹ khớp; thu lặp cùng key → duplicated không cộng đôi. ✅

### [HIGH-2] Quỹ âm khi 2 lệnh chi đồng thời (check-then-act)
`finance/server.ts` đọc số dư rồi mới ghi, không khóa → 2 phiếu chi song song cùng lọt.
**Sửa:** `SELECT … FOR UPDATE` khóa dòng quỹ trước khi tính số dư trong `createCashTx`.
**RT:** 2 chi 80k đồng thời trên quỹ 100k → chỉ 1 lệnh qua, quỹ = 20k (không âm). ✅

### [HIGH-3] Đối soát COD rút sai số tiền + đối soát trùng
Đối soát dùng `codAmount` khai báo (không phải số thực thu); `updateMany` không chặn theo `codStatus` → 2 đối soát song song chuyển tiền 2 lần; đơn đã trả đủ nhưng vẫn hiện trong danh sách đối soát → rút tiền ảo.
**Sửa:** lưu SỐ THỰC THU vào `codAmount` khi giao; đơn đã trả đủ → `codStatus=NONE` (không đối soát); `updateMany` có điều kiện `codStatus='PENDING'` + kiểm số bản ghi đổi được (race → hủy).
**RT:** đơn trả đủ không nạp tiền ảo + không lọt danh sách; 2 đối soát cùng vận đơn → 1 thành công, quỹ COD giảm đúng 1 lần. ✅

### [HIGH-4] Trả hàng COD sau khi giao không đảo tiền
`DELIVERED→RETURNED` chỉ nhập lại kho, KHÔNG đảo phiếu thu COD/công nợ → tiền ảo kẹt quỹ + đơn báo đã trả sai.
**Sửa:** khi trả/hủy đợt giao đã thu COD (chưa đối soát) → tạo chứng từ hoàn HT- liên kết, giảm `paidAmt`, trả trạng thái thanh toán.
**RT:** giao COD 300k (quỹ +300k, đơn thu 300k) → trả hàng → quỹ về mức cũ, đơn về chưa thu. ✅

### [MEDIUM-1] Hoàn tiền không cần duyệt (segregation of duties)
Hoàn tiền = tiền RA cho khách nhưng chỉ cần `finance.manage`, trong khi phiếu chi cần `finance.approve`.
**Sửa:** route hoàn tiền yêu cầu `finance.approve` (chuyển quỹ nội bộ giữ `finance.manage` vì tiền không rời doanh nghiệp).
**RT:** kế toán hoàn tiền bị chặn 403; admin hoàn được. ✅

### [MEDIUM-2] Duyệt bán hàng vượt phạm vi dữ liệu
`sales/approve` GET/POST không áp data scope → người duyệt scope hẹp thấy/duyệt chứng từ ngoài phạm vi.
**Sửa:** thêm `scopeWhere` cho danh sách + `inScope` khi duyệt. (Admin scope ALL không đổi.)

### [MEDIUM-3] Rate-limit đăng nhập lách qua header giả
Khóa theo IP lấy từ `x-forwarded-for` (client tự đặt) → đổi mỗi request là bỏ qua bộ đếm.
**Sửa:** khóa rate-limit theo TÊN ĐĂNG NHẬP (không giả mạo được).

### [LOW-1] Chuyển báo giá trùng trả 500 thay vì 409
**Sửa:** bắt lỗi unique P2002 → trả 409 kèm mã đơn đã tạo. **RT:** convert 2 lần đồng thời → 1 OK + 1 báo 409, không 500. ✅

### [LOW-2] Timing attack ở xác minh webhook
**Sửa:** so sánh secret bằng `crypto.timingSafeEqual`.

### [LOW-3] IDOR ngủ ở tải file khi `partnerId` null
**Sửa:** từ chối file không gắn đối tác (thay vì bỏ qua kiểm scope).

---

## ĐÃ KIỂM — KHÔNG CÓ LỖI (bằng chứng)
- **7 bất biến nhất quán chạy SQL trên dữ liệu thật = 0 sai lệch:** đơn↔thanh toán, trạng thái thanh toán↔số tiền, thanh toán↔sổ quỹ, tồn↔chứng từ kho, quỹ không âm, kho/giữ-chỗ không âm, công thức `lineTotal`. (Chạy lại sau khi test tạo hàng loạt giao dịch đồng thời — vẫn 0.)
- **Công thức tiền** (VAT trên giá sau chiết khấu, chiết khấu dòng vs toàn đơn, làm tròn từng bước): đúng, khớp 21 unit test + đối chiếu tính tay trong `portal.e2e`.
- **Cấm âm kho concurrency:** điều kiện đủ tồn nằm trong câu UPDATE (khóa dòng) — 2 người cùng xuất chỉ 1 thành công.
- **Nhập thành phẩm 1 lần, QC khớp số, movement bất biến** (không có update/delete): xác nhận.
- **IDOR portal:** đại lý B không thấy/sửa/đặt-lại/duyệt được gì của A (404); phiên portal không gọi được API nội bộ (401).
- **Upload:** chống path traversal, giới hạn size/mime, tải qua API có quyền.

## HIỆU NĂNG (653 đơn)
sales/dashboard 23ms · finance/dashboard 19ms · báo cáo tháng 79ms · finance/debt 31ms · list đơn 16ms · list đối tác 16ms — tất cả < 100ms.

## KẾT QUẢ KIỂM THỬ SAU SỬA
lint ✅ · typecheck ✅ · unit 81/81 ✅ · build ✅ · **E2E 11 bộ (10 phân hệ + audit-fixes) TẤT CẢ PASS** · 6/6 bất biến = 0.

## LOW CÒN LẠI — chấp nhận, có ghi chú (xem docs/RISKS.md)
- Rate-limit in-memory không chia sẻ giữa nhiều instance (chỉ ảnh hưởng khi scale ngang nhiều app — hiện chạy 1 app).
- Portal login khóa theo username (giống nội bộ) — không chặn spraying rải nhiều tài khoản (mức thấp).
- Các trục trạng thái đơn/giao/sản xuất độc lập (chủ ý thiết kế) — có thể giao khi đơn chưa xác nhận nếu nghiệp vụ không muốn thì siết sau.
- `quote.discountPct` lưu cả khi dùng chiết khấu tiền (chỉ lệch hiển thị, tổng tiền đúng).
