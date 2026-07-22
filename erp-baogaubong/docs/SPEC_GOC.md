# BỘ CÂU LỆNH XÂY DỰNG ỨNG DỤNG BÁN HÀNG BẢO GẤU BÔNG

## 1. Cách sử dụng tài liệu

Tài liệu này được thiết kế để đưa cho một AI lập trình như Codex, Claude Code, Cursor hoặc công cụ AI có khả năng đọc và sửa toàn bộ mã nguồn.

Cách làm khuyến nghị:

1. Tạo một thư mục dự án hoặc kho Git mới.
2. Dán **Câu lệnh số 0 – Câu lệnh tổng** cho AI trước.
3. Yêu cầu AI lập kế hoạch và tạo nền móng dự án, chưa làm tất cả trong một lần.
4. Lần lượt dán câu lệnh từ số 1 đến số 10.
5. Sau mỗi giai đoạn, chạy câu lệnh nghiệm thu của chính giai đoạn đó.
6. Chỉ chuyển giai đoạn khi kiểm thử đã đạt và AI đã cập nhật tài liệu tiến độ.

Không nên yêu cầu AI “code toàn bộ app trong một lần”. Hệ thống này có nhiều nghiệp vụ liên quan đến tiền, tồn kho, công nợ và sản xuất; làm theo giai đoạn giúp hạn chế lỗi dây chuyền.

---

# 2. CÂU LỆNH SỐ 0 – CÂU LỆNH TỔNG

Sao chép nguyên khối câu lệnh dưới đây và đưa cho AI lập trình:

```text
Bạn là kiến trúc sư phần mềm, kỹ sư full-stack, chuyên gia cơ sở dữ liệu, kiểm thử và DevOps cấp cao. Hãy xây dựng một ứng dụng web quản trị bán hàng, CRM, kho, sản xuất, tài chính và nhân sự chuyên nghiệp dành riêng cho doanh nghiệp “Bảo Gấu Bông”, hoạt động trong lĩnh vực sản xuất và kinh doanh gấu bông, gấu bông AI và quà tặng in logo theo yêu cầu.

MỤC TIÊU SẢN PHẨM

Xây dựng một hệ thống dùng thật trong doanh nghiệp, không phải trang giao diện mẫu. Hệ thống cần phục vụ 10–30 nhân viên, trên 100 đơn hàng/ngày, hiện tại có một xưởng và một kho nhưng kiến trúc phải sẵn sàng mở rộng nhiều chi nhánh và nhiều kho. Ứng dụng chạy trên trình duyệt máy tính và tối ưu cho điện thoại. Có cổng riêng cho đại lý/khách hàng.

Người sử dụng nội bộ gồm:
- Chủ doanh nghiệp/Admin.
- Nhân viên sale.
- Kế toán.
- Nhân viên kho.
- Nhân viên chăm sóc khách hàng.

Mô hình bán hàng cần hỗ trợ:
- Khách lẻ tại cửa hàng.
- Khách sỉ/đại lý.
- Doanh nghiệp đặt gấu bông và quà tặng in logo.
- Đơn sản xuất theo yêu cầu.
- Gấu bông AI.
- Khách đến từ Facebook, Zalo, website và các nguồn khác.

NGUYÊN TẮC LÀM VIỆC BẮT BUỘC

1. Trước khi code, hãy đọc toàn bộ yêu cầu, kiểm tra mã nguồn hiện có và tạo các tài liệu:
   - docs/PRODUCT_REQUIREMENTS.md
   - docs/ARCHITECTURE.md
   - docs/DATABASE_SCHEMA.md
   - docs/PERMISSIONS_MATRIX.md
   - docs/IMPLEMENTATION_PLAN.md
   - docs/TEST_PLAN.md
   - docs/CHANGELOG.md
2. Chia việc thành các giai đoạn nhỏ. Không giả vờ hoàn thành những phần chưa hoạt động.
3. Nếu có điểm chưa rõ nhưng không làm thay đổi lớn kiến trúc, hãy chọn phương án hợp lý, ghi giả định vào docs/DECISIONS.md và tiếp tục.
4. Nếu một quyết định có thể làm thay đổi dữ liệu, tài chính hoặc luồng nghiệp vụ quan trọng, hãy nêu rõ các lựa chọn và hỏi tôi trước khi code.
5. Không dùng dữ liệu giả cố định trong giao diện sau khi đã có API và cơ sở dữ liệu.
6. Không chỉ tạo UI. Mọi nút thêm, sửa, xóa, duyệt, thu tiền, xuất kho, giao hàng và báo cáo phải hoạt động xuyên suốt từ giao diện tới API và cơ sở dữ liệu.
7. Tất cả chức năng ảnh hưởng đến tiền, tồn kho và công nợ phải chạy trong database transaction, có kiểm tra quyền, validation và audit log.
8. Không xóa cứng dữ liệu nghiệp vụ. Dùng soft delete/thùng rác; các chứng từ đã ghi sổ phải dùng nghiệp vụ hủy hoặc điều chỉnh, không được sửa lịch sử tùy tiện.
9. Tiền tệ mặc định là VND. Lưu tiền bằng số nguyên, không dùng số thực. Múi giờ nghiệp vụ là Asia/Ho_Chi_Minh. Định dạng ngày dd/MM/yyyy, số tiền theo chuẩn Việt Nam.
10. VAT mặc định là 8% nhưng phải cấu hình được. Mỗi đơn có lựa chọn “Lấy VAT” hoặc “Không lấy VAT”. Báo cáo phải tự tách hai nhóm này.
11. Mọi mã chứng từ phải duy nhất, dễ đọc, có thể cấu hình tiền tố theo chi nhánh, ví dụ BG-202607-000001.
12. Có seed dữ liệu mẫu bằng tiếng Việt, nhưng phải tách biệt với dữ liệu sản xuất.
13. Mọi module phải có kiểm thử tự động tương xứng: unit test cho công thức, integration test cho API/database và end-to-end test cho các luồng quan trọng.
14. Sau mỗi giai đoạn, chạy lint, type-check, test và build; sửa hết lỗi trước khi báo hoàn thành.
15. Mọi khóa, mật khẩu và thông tin tích hợp phải nằm trong biến môi trường; không ghi bí mật vào mã nguồn.

KIẾN TRÚC KỸ THUẬT ĐỀ XUẤT

Sử dụng kiến trúc modular monolith để MVP phát triển nhanh nhưng mỗi phân hệ có ranh giới rõ ràng, có thể tách dịch vụ sau này. Ưu tiên một codebase TypeScript rõ ràng, dễ bảo trì.

Stack mặc định, trừ khi mã nguồn hiện có đã dùng stack phù hợp khác:
- Frontend/web: Next.js với TypeScript, phiên bản ổn định; giao diện responsive.
- UI: Tailwind CSS và thư viện component có khả năng truy cập tốt; thiết kế component tái sử dụng.
- Backend: API trong ứng dụng hoặc service Node.js TypeScript có cấu trúc module rõ ràng.
- Database: PostgreSQL.
- ORM/migration: Prisma hoặc công cụ tương đương có migration rõ ràng.
- Cache và hàng đợi tác vụ: Redis, dùng cho thông báo, đồng bộ nền tảng và tác vụ nền khi cần.
- Lưu file: S3-compatible object storage; phát triển local có thể dùng MinIO.
- Xác thực: session an toàn bằng HTTP-only cookie; hỗ trợ RBAC và đăng xuất khi không hoạt động.
- Xuất nhập dữ liệu: Excel/CSV; PDF cho báo giá, đơn hàng, phiếu thu/chi và hợp đồng.
- Triển khai: Docker, docker compose cho môi trường phát triển và tài liệu triển khai máy chủ.

Không phụ thuộc cứng vào nhà cung cấp dịch vụ. Các tích hợp Facebook Messenger, Zalo OA, hóa đơn điện tử, vận chuyển, email và SMS phải đi qua interface/adapter để thay nhà cung cấp không phải sửa nghiệp vụ lõi.

GIAO DIỆN VÀ TRẢI NGHIỆM

- Phong cách hiện đại, chuyên nghiệp, dễ học.
- Dùng màu nhận diện Bảo Gấu Bông theo cấu hình theme; nếu chưa có mã màu chính xác, tạo theme mặc định ấm áp, tin cậy và cho phép Admin đổi màu/logo trong Cài đặt.
- Nút bấm và chữ rõ, đủ lớn; nhân viên có thể thao tác nhanh.
- Responsive tốt trên điện thoại, máy tính bảng và máy tính.
- Chỉ dùng tiếng Việt ở phiên bản đầu, nhưng không hard-code kiến trúc khiến sau này không thể thêm ngôn ngữ.
- Có sidebar trên desktop, bottom navigation hoặc menu tối ưu trên mobile.
- Các bảng dữ liệu phải có tìm kiếm, lọc, sắp xếp, phân trang, chọn cột, lưu bộ lọc và xuất Excel nếu phù hợp.
- Các thao tác nguy hiểm phải xác nhận; lỗi phải giải thích dễ hiểu, không chỉ hiện mã lỗi kỹ thuật.
- Dashboard hiển thị đúng số liệu theo quyền và phạm vi chi nhánh/kho của người đăng nhập.

CẤU TRÚC MENU BẮT BUỘC

1. Tổng quan.
2. Bán hàng:
   - Báo giá.
   - Đơn hàng.
   - Bán hàng nhanh/POS.
   - Giao hàng.
   - Đổi trả/hoàn tiền.
3. Sản phẩm & hàng hóa:
   - Danh mục sản phẩm.
   - Biến thể.
   - Combo/bộ quà tặng.
   - Bảng giá.
   - Mã gấu AI và bảo hành.
4. Kho:
   - Tồn kho.
   - Nhập kho.
   - Xuất kho.
   - Chuyển kho.
   - Kiểm kho.
   - Cảnh báo tồn.
5. Sản xuất:
   - Yêu cầu thiết kế.
   - Demo và duyệt mẫu.
   - Lệnh sản xuất.
   - Định mức BOM.
   - Cấp phát nguyên liệu.
   - Theo dõi công đoạn.
   - Kiểm tra chất lượng.
6. Đối tác:
   - Khách hàng.
   - Đại lý.
   - Nhà cung cấp.
   - Lịch sử chăm sóc.
7. Giao dịch:
   - Phiếu thu.
   - Phiếu chi.
   - Thanh toán đơn hàng.
   - Công nợ.
8. Sổ quỹ:
   - Tiền mặt.
   - Tài khoản ngân hàng.
   - COD chờ đối soát.
   - Sổ quỹ và đối soát.
9. Nhân viên:
   - Hồ sơ và tài khoản.
   - Phân quyền.
   - Giao việc.
   - KPI và hoa hồng.
   - Chấm công/ca làm.
   - Lương, thưởng, phạt.
   - Nhật ký thao tác.
10. Báo cáo:
    - Doanh thu và lợi nhuận.
    - VAT/không VAT.
    - Kênh bán/nhân viên.
    - Sản phẩm và tồn kho.
    - Công nợ.
    - Thu chi và dòng tiền.
    - Khách hàng.
    - Sản xuất.
11. Cổng đại lý/khách hàng.
12. Tích hợp.
13. Cài đặt.

PHÂN HỆ SẢN PHẨM VÀ HÀNG HÓA

Mỗi sản phẩm có mã, tên, nhóm, thương hiệu, trạng thái, nhiều ảnh, mô tả, tag, đơn vị tính, giá vốn tham khảo, thuế mặc định và ghi chú. Sản phẩm có thể là:
- Thành phẩm.
- Nguyên vật liệu: vải, bông, phụ kiện, áo, tem, bao bì...
- Bán thành phẩm.
- Dịch vụ: thiết kế, in/thêu, vận chuyển...
- Combo/bộ quà tặng.
- Sản phẩm đặt riêng theo khách.
- Gấu bông AI có mã thiết bị và bảo hành.

Hỗ trợ biến thể theo kích thước, màu sắc, chất liệu và thuộc tính mở rộng. Mỗi biến thể có SKU và barcode/QR riêng. Hỗ trợ quy đổi nhiều đơn vị tính với hệ số rõ ràng; không cho đổi hệ số nếu đã làm sai lệch chứng từ lịch sử.

Có nhiều bảng giá: giá lẻ, giá sỉ, giá đại lý, giá doanh nghiệp và bảng giá riêng theo khách. Hỗ trợ giá theo bậc số lượng, ngày hiệu lực và ưu tiên áp dụng. Khi tạo đơn phải lưu snapshot tên hàng, SKU, đơn vị, giá, thuế, chiết khấu tại thời điểm chốt để sau này đổi danh mục không làm thay đổi chứng từ cũ.

Combo phải xác định rõ là trừ kho theo combo hay theo các thành phần. BOM hỗ trợ phiên bản, ngày hiệu lực, hao hụt cho phép và định mức theo biến thể.

PHÂN HỆ ĐỐI TÁC/CRM

Hồ sơ khách hàng và nhà cung cấp gồm:
- Cá nhân hoặc doanh nghiệp.
- Tên, mã, mã số thuế, điện thoại, email, website.
- Nhiều người liên hệ và nhiều địa chỉ; đánh dấu địa chỉ hóa đơn/giao hàng mặc định.
- Nhóm khách: lẻ, sỉ, đại lý, doanh nghiệp.
- Nguồn khách: Facebook, Zalo, website, giới thiệu hoặc nguồn cấu hình khác.
- Sale phụ trách.
- Bảng giá áp dụng.
- Hạn mức công nợ, số ngày được nợ và cảnh báo quá hạn.
- Lịch sử tư vấn, cuộc gọi, ghi chú, nhiệm vụ chăm sóc và toàn bộ lịch sử mua hàng.
- File logo, file thiết kế, bản demo, hợp đồng và tài liệu liên quan.

Có tìm kiếm chống trùng theo điện thoại, email, mã số thuế. Việc gộp hai khách trùng phải có quyền riêng và audit log. Sale thường chỉ xem khách mình phụ trách; Admin và vai trò được cấp quyền có thể xem toàn bộ.

PHÂN HỆ BÁO GIÁ VÀ ĐƠN HÀNG

Luồng chuẩn:
1. Chọn hoặc tạo khách hàng.
2. Chọn bảng giá theo nhóm/khách.
3. Thêm sản phẩm, biến thể, số lượng và đơn vị tính.
4. Áp dụng chiết khấu theo dòng hoặc toàn đơn; lưu người duyệt nếu vượt mức quyền của sale.
5. Chọn “Lấy VAT” hoặc “Không lấy VAT”. Nếu lấy VAT, mặc định 8% nhưng có thể chọn mức đã được Admin cấu hình.
6. Tính tiền hàng, chiết khấu, phí khác, phí vận chuyển, thuế, tổng thanh toán, đã thu và còn phải thu.
7. Tạo PDF/in báo giá.
8. Chuyển báo giá thành đơn mà không nhập lại dữ liệu.
9. Thu cọc một hoặc nhiều lần bằng tiền mặt/chuyển khoản.
10. Theo dõi sản xuất, giao nhiều đợt, COD và thu nốt.
11. Ghi nhận hoàn thành hoặc công nợ còn lại.

Trạng thái báo giá tối thiểu: Nháp → Đã gửi → Khách xem → Đang thương lượng → Đã duyệt → Từ chối/Hết hạn → Chuyển thành đơn.

Trạng thái đơn hàng phải tách riêng trạng thái đơn, thanh toán, sản xuất và giao hàng, không dồn tất cả vào một cột:
- Đơn hàng: Nháp, Chờ duyệt, Đã xác nhận, Đang thực hiện, Hoàn thành, Hủy.
- Thanh toán: Chưa thu, Đã cọc, Thu một phần, Đã thu đủ, Hoàn tiền một phần, Đã hoàn tiền.
- Sản xuất: Không cần sản xuất, Chờ thiết kế, Chờ duyệt mẫu, Chờ sản xuất, Đang sản xuất, Chờ QC, Hoàn thành.
- Giao hàng: Chưa giao, Chuẩn bị hàng, Giao một phần, Đang giao, Đã giao, Giao thất bại, Hoàn hàng.

Một đơn có thể có nhiều lần thanh toán, nhiều phiếu xuất và nhiều đợt giao. Không được đánh dấu “đã giao đủ” nếu tổng số lượng giao hợp lệ còn thiếu. Không được đánh dấu “đã thu đủ” nếu số tiền thu hợp lệ trừ hoàn tiền nhỏ hơn số phải thu.

In/xuất PDF: báo giá, phiếu bán hàng, đơn đặt hàng, hợp đồng mẫu, phiếu giao hàng và biên bản bàn giao. Template có logo, thông tin công ty, chữ ký và điều khoản cấu hình được.

PHÂN HỆ SẢN XUẤT THEO YÊU CẦU

Luồng chuẩn cho đơn in logo:
1. Nhận logo và yêu cầu của khách.
2. Tạo yêu cầu thiết kế.
3. Tải bản demo/mẫu.
4. Khách hoặc nhân viên ghi nhận duyệt mẫu; lưu phiên bản, thời điểm, người duyệt và ghi chú.
5. Tạo lệnh sản xuất từ các dòng hàng cần sản xuất.
6. Chọn phiên bản BOM, tính nhu cầu nguyên vật liệu.
7. Giữ chỗ/cấp phát/xuất nguyên vật liệu.
8. Theo dõi công đoạn: chuẩn bị nguyên liệu → cắt → may → nhồi → hoàn thiện → QC → đóng gói.
9. Ghi nhận sản lượng đạt, lỗi, hỏng và làm lại ở từng công đoạn.
10. Nhập kho thành phẩm hoặc chuyển thẳng sang giao hàng theo quyền.

Mỗi lệnh sản xuất có mã, đơn nguồn, khách hàng, sản phẩm, số lượng kế hoạch, hạn hoàn thành, mức ưu tiên, người phụ trách, BOM, nguyên liệu dự kiến/thực tế, tiến độ, chi phí và file liên quan. Hệ thống phải tính được phần trăm tiến độ dựa trên số lượng hoàn thành thực tế, không chỉ dựa trên việc bấm đổi trạng thái.

QC có checklist cấu hình theo loại sản phẩm, ảnh bằng chứng, số lượng đạt/không đạt, lý do lỗi và người kiểm. Không cho nhập kho thành phẩm vượt quá số lượng đạt QC nếu không có quyền điều chỉnh đặc biệt.

PHÂN HỆ KHO

Hỗ trợ nhiều kho/chi nhánh dù giai đoạn đầu chỉ có một kho. Quản lý tồn theo kho, vị trí, sản phẩm, biến thể và đơn vị cơ sở.

Các nghiệp vụ:
- Nhập mua, nhập thành phẩm sản xuất, nhập trả hàng, nhập điều chỉnh.
- Xuất bán, xuất nguyên liệu sản xuất, xuất hủy/hỏng, xuất điều chỉnh.
- Chuyển kho có trạng thái đang chuyển và nhận kho.
- Kiểm kho, lập chênh lệch và duyệt điều chỉnh.
- Giữ chỗ hàng theo đơn đã xác nhận.
- Cảnh báo sắp hết hàng theo mức tối thiểu/tối đa và nhu cầu đơn/lệnh sản xuất.

Mọi thay đổi tồn kho phải tạo stock movement bất biến, tham chiếu chứng từ nguồn và người thao tác. Không cập nhật số tồn trực tiếp từ giao diện. Tồn khả dụng = tồn thực tế - số giữ chỗ hợp lệ. Có cấu hình cho phép hoặc cấm âm kho; mặc định cấm âm kho.

Hỗ trợ in và quét barcode/QR khi nhập, xuất và kiểm kho. Việc quét phải chống ghi nhận trùng ngoài ý muốn.

PHÂN HỆ GIAO HÀNG, ĐỔI TRẢ VÀ HẬU MÃI

Một đơn có thể giao nhiều đợt. Mỗi chuyến giao có địa chỉ, người nhận, điện thoại, đơn vị vận chuyển, mã vận đơn, phí giao, người trả phí, hình thức COD, số tiền COD và lịch sử trạng thái.

Trạng thái giao nhận phải có lịch sử thời gian. Hỗ trợ giao thất bại, giao lại, hoàn hàng và đối soát COD. Tiền COD chưa được đơn vị vận chuyển đối soát phải nằm ở tài khoản “COD chờ đối soát”, không coi là tiền ngân hàng đã nhận.

Đổi trả phải tham chiếu đơn và dòng hàng gốc, có lý do, ảnh, số lượng, cách xử lý, nhập lại kho hay hủy, số tiền hoàn và phương thức hoàn. Hoàn tiền phải tạo giao dịch âm/phiếu chi liên kết, không sửa trực tiếp khoản thu cũ.

Sau giao hàng, tự tạo lịch nhắc xin phản hồi, chăm sóc, bán lại và đề nghị giới thiệu khách theo cấu hình.

PHÂN HỆ GIAO DỊCH, CÔNG NỢ VÀ SỔ QUỸ

Hỗ trợ tiền mặt, tài khoản ngân hàng và COD chờ đối soát. Có danh mục tài khoản quỹ; mọi phiếu thu/chi phải chỉ rõ quỹ, đối tác, loại giao dịch, số tiền, ngày, chứng từ liên quan, người lập, người duyệt và file đính kèm.

Một đơn có thể thu cọc/thu tiền nhiều lần. Một phiếu thu có thể phân bổ cho một hoặc nhiều chứng từ nếu được thiết kế rõ ràng. Công nợ phải thu được tính từ các chứng từ hợp lệ, khoản thu phân bổ, hoàn tiền và điều chỉnh; không cho người dùng gõ đè số dư công nợ.

Có tuổi nợ: chưa đến hạn, quá hạn 1–7 ngày, 8–30 ngày, 31–60 ngày, trên 60 ngày. Gửi cảnh báo theo quyền và tạo danh sách cần thu hồi. Hạn mức công nợ phải được kiểm tra lúc duyệt đơn; vượt hạn mức cần người có quyền duyệt.

Sổ quỹ phải cho xem số đầu kỳ, thu, chi và số cuối kỳ theo từng quỹ. Số liệu báo cáo phải đối chiếu được tới chứng từ gốc. Có quy trình khóa sổ theo kỳ; muốn sửa chứng từ trong kỳ khóa cần quyền đặc biệt và audit log.

PHÂN HỆ NHÂN VIÊN

Quản lý hồ sơ nhân viên, tài khoản đăng nhập, vai trò, chi nhánh/kho, trạng thái làm việc, ca làm và chấm công. Có giao việc, hạn hoàn thành, độ ưu tiên, người liên quan, nhắc việc và lịch sử tiến độ.

RBAC phải hỗ trợ quyền xem/tạo/sửa/xóa mềm/duyệt/xuất dữ liệu cho từng phân hệ; đồng thời có phạm vi dữ liệu: của bản thân, của đội nhóm, của chi nhánh hoặc toàn công ty.

Vai trò mặc định:
- Super Admin/Chủ doanh nghiệp: toàn quyền, trừ các hành động hệ thống cần xác nhận đặc biệt.
- Sale: quản lý khách phụ trách, báo giá, đơn hàng; không tự duyệt chiết khấu vượt ngưỡng; không xem lương người khác.
- Kế toán: thu chi, công nợ, VAT, báo cáo tài chính quản trị, lương theo quyền.
- Kho: nhập/xuất/chuyển/kiểm kho và giao hàng; không xem giá/lợi nhuận nếu chưa được cấp.
- Chăm sóc khách hàng: xem khách được phân công, lịch sử đơn và tạo hoạt động chăm sóc; hạn chế xem giá vốn.

KPI sale/CSKH có chỉ tiêu theo kỳ: doanh thu, doanh thu đã thu, lợi nhuận gộp, số khách mới, tỷ lệ chuyển đổi, số hoạt động chăm sóc và công nợ. Công thức hoa hồng phải có phiên bản/ngày hiệu lực và cho chọn tính theo doanh thu, tiền đã thu hoặc lợi nhuận. Không làm thay đổi hoa hồng đã chốt khi công thức mới được áp dụng.

Lương gồm lương cơ bản, công/ca, phụ cấp, hoa hồng, thưởng, phạt và tạm ứng. Phiếu lương có trạng thái nháp → duyệt → đã thanh toán. Đây là quản trị lương nội bộ, không tự nhận là phần mềm kê khai pháp lý nếu chưa xây đầy đủ yêu cầu luật.

PHÂN HỆ BÁO CÁO

Dashboard và báo cáo phải lấy từ dữ liệu thật, có bộ lọc thời gian, chi nhánh, kho, kênh bán, nhân viên và nhóm khách. Mọi con số tổng hợp cần có khả năng drill-down tới danh sách chứng từ cấu thành.

Báo cáo bắt buộc:
- Doanh thu và lợi nhuận gộp theo ngày/tháng/khoảng thời gian.
- Doanh thu theo nhân viên và kênh bán.
- Doanh thu đơn lấy VAT và không lấy VAT.
- Sản phẩm bán chạy, hàng chậm bán, giá trị tồn và cảnh báo tồn.
- Công nợ phải thu, tuổi nợ và nợ quá hạn.
- Thu, chi, dòng tiền và số dư từng quỹ.
- Hiệu quả khách hàng/nhóm khách: doanh thu, lợi nhuận, tần suất mua, lần mua gần nhất.
- Tiến độ, sản lượng, lỗi, tiêu hao và chi phí sản xuất.
- KPI và hoa hồng nhân viên.

Phải định nghĩa rõ “doanh thu”, “tiền đã thu”, “đơn đã chốt”, “lợi nhuận gộp” và “công nợ” trong tài liệu. Không trộn doanh thu dồn tích với dòng tiền. Mặc định doanh thu được ghi nhận theo quy tắc cấu hình của doanh nghiệp, nhưng phải nhất quán và có giải thích trên báo cáo.

CỔNG ĐẠI LÝ/KHÁCH HÀNG

Khách/đại lý có tài khoản riêng và chỉ xem dữ liệu của mình. Chức năng:
- Đăng nhập, quên mật khẩu và cập nhật hồ sơ.
- Xem danh mục và đúng bảng giá được cấp.
- Tạo yêu cầu báo giá hoặc đơn hàng.
- Tải logo, mô tả yêu cầu thiết kế và file tham khảo.
- Xem, bình luận, yêu cầu sửa và duyệt đúng phiên bản demo/mẫu.
- Theo dõi tiến độ đơn, sản xuất và giao hàng ở mức doanh nghiệp cho phép công khai.
- Xem công nợ, thanh toán, hóa đơn và tải chứng từ.
- Đặt lại đơn cũ và gửi yêu cầu hỗ trợ.

Mọi URL tải file riêng tư phải có quyền truy cập hoặc signed URL hết hạn; không để file hợp đồng/logo khách ở đường dẫn công khai cố định.

TÍCH HỢP VÀ TỰ ĐỘNG HÓA

Thiết kế adapter và hàng đợi cho:
- Facebook Messenger.
- Zalo OA.
- Website bán hàng.
- Đơn vị vận chuyển.
- Hóa đơn điện tử.
- Máy in hóa đơn và máy in mã vạch.
- Excel/Google Sheets.
- Email/SMS.

Giai đoạn MVP có thể cung cấp adapter mẫu/sandbox và giao diện cấu hình nếu chưa có API key hoặc nhà cung cấp cụ thể. Không giả lập rằng đã gửi thật. Mỗi lần đồng bộ phải có sync log, retry có giới hạn, chống xử lý trùng bằng idempotency key và màn hình xem lỗi. Webhook phải kiểm tra chữ ký nếu nhà cung cấp hỗ trợ.

CÀI ĐẶT VÀ THÔNG SỐ

Admin cấu hình được:
- Thông tin công ty, logo, màu thương hiệu.
- Chi nhánh, kho và vị trí kho.
- Tiền tố/mẫu mã chứng từ.
- Thuế suất, mặc định VAT 8%.
- Đơn vị tính và quy đổi.
- Nhóm khách, nguồn khách, kênh bán.
- Trạng thái, lý do hủy/đổi trả/lỗi QC.
- Mức tồn tối thiểu/tối đa.
- Hạn mức chiết khấu theo vai trò.
- Quy tắc công nợ, hoa hồng và KPI.
- Template báo giá, hợp đồng, phiếu in và thông báo.
- Cấu hình tích hợp và thông báo.
- Chính sách phiên đăng nhập/tự đăng xuất.

BẢO MẬT VÀ AN TOÀN DỮ LIỆU

- RBAC chi tiết và kiểm tra quyền ở server, không chỉ ẩn nút ở frontend.
- Mật khẩu băm bằng thuật toán an toàn; rate limit đăng nhập; chống CSRF/XSS/SQL injection theo kiến trúc sử dụng.
- Tự đăng xuất khi không hoạt động theo cấu hình.
- Mã hóa thông tin nhạy cảm và bí mật tích hợp.
- Audit log cho đăng nhập, tạo/sửa/xóa, duyệt/hủy, thu/chi, thay đổi tồn, xuất dữ liệu, thay đổi quyền và cài đặt.
- Audit log lưu trước/sau ở mức phù hợp, người thao tác, thời gian, IP/user agent và mã liên quan; người dùng thường không được sửa/xóa audit log.
- Soft delete và thùng rác có thời hạn; khôi phục phải kiểm tra xung đột.
- Sao lưu PostgreSQL và file hằng ngày; có chính sách giữ bản sao và hướng dẫn kiểm tra phục hồi định kỳ. Một bản sao lưu chưa thử khôi phục không được coi là kế hoạch phục hồi hoàn chỉnh.
- Cho phép xuất dữ liệu Excel theo quyền; dữ liệu nhạy cảm phải được che hoặc loại bỏ nếu vai trò không có quyền.

MÔ HÌNH DỮ LIỆU TỐI THIỂU

Thiết kế ERD chuẩn hóa và migration cho các nhóm bảng sau; được phép đổi tên hợp lý nhưng không được bỏ nghiệp vụ:
- Tenant/company, branch, warehouse, warehouse_location.
- User, employee, role, permission, role_permission, user_scope, session.
- Customer, supplier, partner_contact, partner_address, customer_group, lead_source, crm_activity, task, attachment.
- Product, product_variant, product_image, category, attribute, unit, unit_conversion, price_list, price_rule, bundle, bundle_item, ai_device, warranty.
- BOM, BOM_version, BOM_item.
- Quote, quote_item, quote_version/status_history.
- Sales_order, sales_order_item, approval, discount_approval, order_status_history.
- Design_request, design_version, design_comment, design_approval.
- Production_order, production_step, production_progress, material_requirement, material_issue, qc_check, qc_item.
- Inventory_balance hoặc projection, stock_movement, stock_reservation, stock_count, stock_count_item, stock_transfer.
- Shipment, shipment_item, shipment_status_history, carrier, COD_reconciliation.
- Return, return_item, refund.
- Fund_account, receipt, payment_voucher, transaction, allocation, accounting_period_lock.
- Receivable, receivable_entry hoặc mô hình ledger tương đương, credit_limit_approval.
- Work_shift, attendance, KPI_plan, commission_rule, commission_result, payroll, payroll_item.
- Notification, integration_connection, webhook_event, sync_job, sync_log.
- Setting, document_sequence, document_template, audit_log, trash_record nếu cần.

Các bảng nghiệp vụ phải có created_at, updated_at, created_by/updated_by khi phù hợp, version hoặc cơ chế optimistic locking cho dữ liệu dễ xung đột. Thêm index cho mã, ngày, trạng thái, khóa ngoại và các bộ lọc thường dùng. Dùng unique constraint, check constraint và foreign key để bảo vệ dữ liệu, không chỉ dựa vào code.

API VÀ CHẤT LƯỢNG MÃ

- Thiết kế API có schema validation, lỗi thống nhất, phân trang server-side, filter/sort rõ ràng.
- Các endpoint tạo thanh toán, xuất kho, duyệt đơn, hoàn tiền và webhook phải idempotent.
- Tránh N+1 query; đo và tối ưu các trang danh sách/báo cáo chính.
- Có structured logging, correlation/request ID, health check và readiness check.
- Không ghi PII hoặc token vào log.
- Tách domain/service/repository hoặc cấu trúc tương đương đủ rõ để test nghiệp vụ.
- Viết README mô tả cách chạy local, biến môi trường, migration, seed, test, backup và deploy.

MVP ƯU TIÊN

MVP phải dùng được sớm nhưng vẫn có nền móng cho toàn hệ thống. Thứ tự ưu tiên:
1. Nền tảng, đăng nhập, phân quyền, chi nhánh/kho, cài đặt.
2. Sản phẩm, biến thể, bảng giá, khách hàng/đối tác.
3. Báo giá → đơn hàng → thu cọc/thu tiền → công nợ.
4. Nhập/xuất/tồn kho và giao hàng.
5. Thiết kế/duyệt mẫu và lệnh sản xuất cơ bản.
6. Dashboard và báo cáo cốt lõi.

Các phần nâng cao sau MVP nhưng vẫn nằm trong bản đầy đủ:
- BOM nâng cao, chi phí sản xuất và QC chi tiết.
- Lương, KPI, hoa hồng đầy đủ.
- Cổng đại lý/khách hàng.
- Tích hợp thật với từng nhà cung cấp.
- Đồng bộ, đối soát COD, tự động hóa thông báo.

ĐIỀU KIỆN NGHIỆM THU TOÀN HỆ THỐNG

Ít nhất phải có các kịch bản end-to-end tự động hoặc bán tự động sau:
1. Admin tạo sản phẩm có biến thể, bảng giá sỉ và tồn đầu kỳ.
2. Sale tạo khách doanh nghiệp, tạo báo giá, chọn lấy VAT 8%, giảm giá trong quyền và chuyển thành đơn.
3. Sale ghi nhận hai lần đặt cọc/thanh toán; số đã thu và công nợ cập nhật đúng, không tạo trùng khi gửi lại request.
4. Khách tải logo, nhân viên tải demo, khách duyệt đúng phiên bản; hệ thống tạo được lệnh sản xuất.
5. Kho cấp phát nguyên liệu; sản xuất ghi nhận công đoạn và QC; nhập thành phẩm làm thay đổi tồn đúng một lần.
6. Đơn được giao hai đợt; trạng thái chỉ “đã giao” khi đủ số lượng.
7. Đơn COD đi từ đang giao → đã giao → COD chờ đối soát → tiền vào ngân hàng; số quỹ đúng tại từng thời điểm.
8. Đổi trả một phần, nhập lại hàng hợp lệ và hoàn tiền; doanh thu/công nợ/quỹ/tồn kho cùng cập nhật đúng.
9. Sale không xem được khách của sale khác, giá vốn, lương hoặc chức năng Admin nếu chưa có quyền.
10. Kế toán xem báo cáo VAT/không VAT, công nợ và drill-down được tới chứng từ gốc.
11. Khóa kỳ ngăn sửa chứng từ; Admin có quyền đặc biệt phải ghi lý do và audit log.
12. Sao lưu được tạo và tài liệu phục hồi được kiểm thử trong môi trường thử nghiệm.

ĐẦU RA CỦA MỖI GIAI ĐOẠN

Khi hoàn thành một giai đoạn, hãy trả lời theo cấu trúc:
- Đã hoàn thành chức năng nào.
- File/migration chính đã thay đổi.
- Cách chạy và cách kiểm tra thủ công.
- Kết quả lint, type-check, unit test, integration test, E2E và build.
- Các giả định/quyết định đã ghi vào tài liệu.
- Hạn chế còn lại và công việc của giai đoạn tiếp theo.

Trước mắt, KHÔNG code toàn bộ. Hãy thực hiện Giai đoạn 0:
1. Phân tích yêu cầu.
2. Đề xuất ERD và ranh giới module.
3. Lập ma trận quyền.
4. Lập kế hoạch triển khai MVP và bản đầy đủ theo các mốc có thể nghiệm thu.
5. Nêu tối đa 10 câu hỏi thực sự có thể làm thay đổi kiến trúc hoặc nghiệp vụ. Không hỏi lại thông tin đã có trong yêu cầu này.
6. Chờ tôi duyệt kế hoạch rồi mới tạo mã nguồn.
```

---

# 3. CÁC CÂU LỆNH TRIỂN KHAI THEO GIAI ĐOẠN

## Câu lệnh số 1 – Nền móng, đăng nhập và phân quyền

```text
Hãy tiếp tục dự án Bảo Gấu Bông theo tài liệu yêu cầu và kế hoạch đã duyệt. Thực hiện giai đoạn nền móng:

1. Khởi tạo cấu trúc dự án, PostgreSQL, migration, seed và Docker cho môi trường local.
2. Xây đăng nhập, đăng xuất, quên/đặt lại mật khẩu, quản lý phiên và tự đăng xuất khi không hoạt động.
3. Xây company, branch, warehouse, employee, user, role, permission và data scope.
4. Tạo các vai trò mặc định: Super Admin, Sale, Kế toán, Kho, CSKH.
5. Kiểm tra quyền ở server cho tất cả route/API; frontend chỉ phản ánh lại quyền.
6. Xây giao diện khung responsive: sidebar desktop, menu mobile, header, breadcrumbs, bảng, form, modal, thông báo lỗi.
7. Xây Cài đặt cơ bản: thông tin công ty, logo, màu sắc, VAT mặc định 8%, mẫu mã chứng từ, múi giờ Asia/Ho_Chi_Minh.
8. Xây audit log cho đăng nhập, thay đổi tài khoản, vai trò, quyền và cài đặt.
9. Seed tài khoản demo cho từng vai trò và ghi rõ mật khẩu chỉ dùng local.
10. Viết unit/integration/E2E test cho đăng nhập và ngăn truy cập sai quyền.

Không làm giả các menu chưa triển khai: có thể hiện nhãn “Đang phát triển” nhưng không tạo số liệu giả. Cập nhật tài liệu và chạy toàn bộ lint, type-check, test, build trước khi báo hoàn thành.
```

## Câu lệnh số 2 – Sản phẩm, biến thể, BOM và bảng giá

```text
Thực hiện phân hệ Sản phẩm & hàng hóa theo đặc tả đã duyệt:

1. Danh mục thành phẩm, nguyên vật liệu, bán thành phẩm, dịch vụ, combo, hàng đặt riêng và gấu AI.
2. Nhiều ảnh, danh mục, tag, mô tả, trạng thái.
3. Biến thể kích thước/màu/chất liệu, SKU và barcode/QR duy nhất.
4. Nhiều đơn vị tính và quy đổi an toàn.
5. Giá vốn, giá bán, bảng giá lẻ/sỉ/đại lý/doanh nghiệp/riêng theo khách, giá bậc thang theo số lượng và ngày hiệu lực.
6. Combo và quy tắc trừ kho rõ ràng.
7. BOM có phiên bản, định mức, hao hụt, ngày hiệu lực và áp dụng theo biến thể.
8. Mã thiết bị, ngày kích hoạt và bảo hành gấu AI.
9. Nhập/xuất Excel mẫu với kiểm tra lỗi theo dòng; không nhập nửa chừng nếu chế độ atomic được chọn.
10. Tìm kiếm, lọc, phân trang, in barcode/QR và lịch sử thay đổi.

Viết test cho ưu tiên bảng giá, giá bậc thang, quy đổi đơn vị, SKU trùng, BOM phiên bản và snapshot dữ liệu. Cập nhật tài liệu, chạy kiểm thử và build.
```

## Câu lệnh số 3 – Đối tác và CRM

```text
Thực hiện phân hệ Đối tác/CRM:

1. Khách hàng cá nhân/doanh nghiệp, đại lý và nhà cung cấp.
2. Nhiều người liên hệ, nhiều địa chỉ, địa chỉ hóa đơn/giao hàng mặc định.
3. Nhóm khách, nguồn khách, kênh bán, bảng giá và sale phụ trách.
4. Hạn mức công nợ và số ngày được nợ.
5. Lịch sử tư vấn, ghi chú, cuộc gọi, nhiệm vụ chăm sóc, lịch nhắc và file đính kèm.
6. Upload logo, thiết kế, hợp đồng vào object storage với quyền truy cập an toàn.
7. Phát hiện trùng điện thoại/email/mã số thuế; quy trình gộp khách có quyền và audit log.
8. Sale mặc định chỉ xem dữ liệu thuộc phạm vi của mình; kiểm thử tránh rò rỉ qua API, tìm kiếm, export và file.
9. Trang chi tiết khách có timeline thống nhất: tư vấn, báo giá, đơn, thanh toán, giao hàng và phản hồi.
10. Nhập/xuất Excel theo quyền.

Viết test cho phát hiện trùng, data scope, lịch nhắc và bảo vệ file. Chạy kiểm thử, build và cập nhật tài liệu.
```

## Câu lệnh số 4 – Báo giá, đơn hàng và POS

```text
Thực hiện phân hệ Bán hàng:

1. Tạo báo giá từ khách, bảng giá, sản phẩm/biến thể; hỗ trợ chiết khấu dòng và toàn đơn.
2. Cơ chế xin duyệt khi chiết khấu hoặc công nợ vượt quyền.
3. Chọn lấy VAT/không VAT; VAT mặc định 8% và cấu hình được.
4. Tính đúng tiền hàng, giảm giá, phí khác, vận chuyển, thuế, tổng tiền, đã thu, còn nợ.
5. Lưu snapshot dòng hàng và phiên bản báo giá.
6. Chuyển báo giá thành đơn không nhập lại; chống chuyển trùng.
7. Các trạng thái báo giá, đơn, thanh toán, sản xuất, giao hàng phải tách riêng và có lịch sử.
8. Xây bán hàng nhanh/POS cho khách lẻ: quét barcode, chọn khách, thu tiền, in phiếu.
9. PDF/in báo giá, phiếu bán hàng, đơn đặt hàng và hợp đồng từ template.
10. Tìm kiếm, lọc và dashboard bán hàng cơ bản.

Viết unit test cho mọi công thức tiền và làm tròn; integration test cho transaction/idempotency; E2E cho báo giá → duyệt → đơn hàng. Chạy toàn bộ kiểm thử và build.
```

## Câu lệnh số 5 – Thu tiền, công nợ và sổ quỹ

```text
Thực hiện Giao dịch, công nợ và Sổ quỹ:

1. Danh mục quỹ tiền mặt, ngân hàng và COD chờ đối soát.
2. Phiếu thu, phiếu chi, chuyển quỹ và duyệt chứng từ.
3. Một đơn được đặt cọc/thu tiền nhiều lần; phân bổ khoản thu cho chứng từ.
4. Tính công nợ từ ledger/chứng từ, không cho nhập đè số dư.
5. Tuổi nợ, hạn thanh toán, cảnh báo quá hạn và vượt hạn mức.
6. Sổ quỹ có đầu kỳ, thu, chi, cuối kỳ; drill-down tới chứng từ.
7. Khóa sổ theo kỳ và quy trình mở khóa có quyền, lý do, audit log.
8. Hoàn tiền bằng giao dịch liên kết, không sửa/xóa khoản thu cũ.
9. PDF/in phiếu thu/chi và xuất Excel theo quyền.
10. Dashboard công nợ và dòng tiền.

Tất cả thao tác tiền phải dùng database transaction và idempotency key. Viết test cho thu nhiều lần, gửi request lặp, hoàn tiền, chuyển quỹ, tuổi nợ, khóa kỳ và tính số dư. Chạy kiểm thử, build và đối chiếu thử bằng bộ dữ liệu mẫu.
```

## Câu lệnh số 6 – Kho và giao hàng

```text
Thực hiện phân hệ Kho và Giao hàng:

1. Tồn theo kho, vị trí, sản phẩm/biến thể và đơn vị cơ sở.
2. Nhập, xuất, chuyển kho, kiểm kho, điều chỉnh và giữ chỗ.
3. Stock movement bất biến, tham chiếu chứng từ nguồn; mặc định cấm âm kho.
4. Tồn thực tế, giữ chỗ, khả dụng và đang chuyển phải tính đúng.
5. Cảnh báo sắp hết theo mức tối thiểu/tối đa và nhu cầu đơn/sản xuất.
6. Quét barcode/QR nhập, xuất, kiểm kho và chống quét trùng ngoài ý muốn.
7. Một đơn giao nhiều đợt; số lượng giao không vượt số có thể giao nếu không có quyền đặc biệt.
8. Đơn vị vận chuyển, mã vận đơn, phí giao, COD và lịch sử trạng thái.
9. Đối soát COD: đã giao không đồng nghĩa ngân hàng đã nhận tiền.
10. Đổi trả, hoàn hàng, nhập lại/hủy hàng và liên kết hoàn tiền.

Viết test concurrency cho hai người cùng xuất một mặt hàng; test giao một phần, chuyển kho, kiểm kho, hoàn hàng và COD. Chạy kiểm thử, build và cập nhật tài liệu.
```

## Câu lệnh số 7 – Thiết kế, duyệt mẫu và sản xuất

```text
Thực hiện phân hệ sản xuất theo yêu cầu:

1. Yêu cầu thiết kế từ đơn/khách, file logo và mô tả.
2. Phiên bản demo, bình luận, yêu cầu sửa và ghi nhận người/thời gian duyệt.
3. Không cho sản xuất bằng phiên bản chưa được duyệt, trừ quyền ngoại lệ có lý do.
4. Tạo lệnh sản xuất từ dòng đơn, chọn BOM phiên bản và hạn hoàn thành.
5. Tính nhu cầu, giữ chỗ và cấp phát nguyên liệu.
6. Công đoạn chuẩn bị → cắt → may → nhồi → hoàn thiện → QC → đóng gói.
7. Ghi nhận số đạt, lỗi, hỏng, làm lại, người thực hiện, thời gian và ảnh.
8. QC checklist theo loại hàng; chỉ số đạt mới được nhập thành phẩm.
9. Tiến độ dựa trên số lượng thực tế; cảnh báo chậm tiến độ.
10. Tính tiêu hao và chi phí dự kiến/thực tế ở mức phù hợp.

Viết test cho phiên bản duyệt, BOM, cấp phát, tiêu hao, tiến độ, QC và nhập thành phẩm đúng một lần. Xây bảng tiến độ dễ dùng trên mobile. Chạy kiểm thử, build và cập nhật tài liệu.
```

## Câu lệnh số 8 – Nhân viên, KPI, hoa hồng và lương

```text
Thực hiện phân hệ Nhân viên:

1. Hồ sơ, ca làm, chấm công và bảng công.
2. Giao việc, hạn, ưu tiên, người phụ trách và nhắc việc.
3. KPI sale/CSKH theo kỳ và dashboard theo quyền.
4. Quy tắc hoa hồng có phiên bản, tính theo doanh thu/tiền đã thu/lợi nhuận tùy cấu hình.
5. Chốt hoa hồng theo kỳ để quy tắc mới không sửa lịch sử.
6. Lương cơ bản, ngày công, phụ cấp, hoa hồng, thưởng, phạt và tạm ứng.
7. Phiếu lương nháp → duyệt → đã thanh toán; khi thanh toán tạo phiếu chi liên kết nếu được cấu hình.
8. Nhân viên chỉ xem phiếu lương của mình; kế toán/Admin theo quyền.
9. Audit log cho sửa công, KPI, hoa hồng, thưởng/phạt và duyệt lương.
10. Xuất bảng công, KPI, hoa hồng và lương ra Excel/PDF.

Viết test công thức, phiên bản hoa hồng, khóa kỳ và quyền xem lương. Ghi rõ đây là quản trị nội bộ, không quảng cáo là hệ thống kê khai lương/thuế pháp lý nếu chưa đủ yêu cầu. Chạy kiểm thử và build.
```

## Câu lệnh số 9 – Báo cáo và cổng đại lý/khách hàng

```text
Thực hiện Báo cáo và Cổng đại lý/khách hàng:

1. Xây các báo cáo bắt buộc trong đặc tả, dùng dữ liệu thật và định nghĩa chỉ số rõ ràng.
2. Bộ lọc thời gian, chi nhánh, kho, kênh, nhân viên, nhóm khách; cho drill-down tới chứng từ.
3. Tách doanh thu VAT và không VAT; tách doanh thu khỏi tiền đã thu.
4. Tối ưu query/index và kiểm thử số liệu bằng một bộ dữ liệu đối chiếu tính tay.
5. Xây portal đăng nhập riêng cho đại lý/khách.
6. Hiển thị đúng danh mục/bảng giá được cấp; tạo báo giá/đơn; tải logo.
7. Xem và duyệt đúng phiên bản demo; theo dõi đơn/sản xuất/giao hàng.
8. Xem công nợ, thanh toán, hóa đơn; đặt lại đơn và gửi hỗ trợ.
9. Bảo vệ tuyệt đối dữ liệu giữa hai khách; kiểm thử IDOR cho API và file.
10. Tối ưu trải nghiệm điện thoại và thông báo trạng thái.

Viết E2E cho đại lý tạo yêu cầu → duyệt demo → theo dõi → xem công nợ. Chạy kiểm thử hiệu năng cơ bản cho dashboard và báo cáo, sau đó build.
```

## Câu lệnh số 10 – Tích hợp, bảo mật, sao lưu và triển khai

```text
Hoàn thiện hệ thống cho môi trường production:

1. Xây adapter/interface cho Facebook Messenger, Zalo OA, website, vận chuyển, hóa đơn điện tử, email/SMS, máy in và Google Sheets/Excel.
2. Với tích hợp chưa có thông tin nhà cung cấp/API key, tạo sandbox adapter và đánh dấu rõ chưa gửi thật; không làm dữ liệu giả gây hiểu nhầm.
3. Webhook có xác minh, idempotency, retry giới hạn, dead-letter/error log và màn hình xử lý lỗi.
4. Rà soát RBAC/data scope, IDOR, upload file, rate limit, CSRF/XSS, secret và log PII.
5. Hoàn thiện audit log, thùng rác/khôi phục và export dữ liệu theo quyền.
6. Viết quy trình backup database/file hằng ngày, retention, mã hóa và khôi phục.
7. Thực hiện thử khôi phục trong môi trường staging và ghi bằng chứng/kết quả vào docs/DISASTER_RECOVERY_TEST.md.
8. Tạo Docker production, health/readiness check, migration an toàn, observability và hướng dẫn rollback.
9. Viết tài liệu cài đặt máy chủ, cấu hình tên miền/HTTPS, biến môi trường, tạo Admin đầu tiên, backup và nâng cấp.
10. Chạy lint, type-check, unit, integration, E2E, security checks, build và smoke test production.

Không báo “sẵn sàng production” nếu còn lỗi nghiêm trọng, test đỏ, migration không thử hoặc chưa kiểm tra khôi phục. Lập danh sách rủi ro còn lại theo mức Critical/High/Medium/Low và kế hoạch xử lý.
```

---

# 4. CÂU LỆNH KIỂM TRA VÀ SỬA LỖI TOÀN DIỆN

Sau khi AI báo đã hoàn thành, dùng câu lệnh sau với một phiên AI mới hoặc một agent kiểm thử độc lập:

```text
Bạn đóng vai trò kiểm toán hệ thống và kỹ sư QA độc lập. Không tin vào tuyên bố “đã hoàn thành” trong tài liệu. Hãy trực tiếp kiểm tra mã nguồn và chạy ứng dụng Bảo Gấu Bông.

Nhiệm vụ:
1. Đối chiếu từng yêu cầu trong PRODUCT_REQUIREMENTS với mã nguồn và đánh dấu: Đạt / Đạt một phần / Chưa có / Có nhưng lỗi.
2. Kiểm tra mọi menu, nút, form, API và migration; tìm UI giả, dữ liệu hard-code, TODO, endpoint không hoạt động và lỗi bị nuốt.
3. Kiểm tra công thức VAT 8%, chiết khấu, tiền hàng, đã thu, còn nợ, hoàn tiền, doanh thu và lợi nhuận.
4. Kiểm tra tính nhất quán giữa đơn hàng, thanh toán, công nợ, sổ quỹ, kho, sản xuất, giao hàng và báo cáo.
5. Tấn công thử quyền: sale xem khách sale khác, xem giá vốn/lương, sửa URL/ID, tải file khách khác, gọi API trực tiếp.
6. Kiểm tra gửi request lặp cho thanh toán, xuất kho, hoàn tiền, webhook và chuyển báo giá thành đơn.
7. Kiểm tra concurrency khi hai người xuất kho/thu tiền/cập nhật cùng lúc.
8. Chạy lint, type-check, unit, integration, E2E, build; báo kết quả thực tế.
9. Kiểm tra index/query các danh sách và dashboard với dữ liệu đủ lớn tương đương trên 100 đơn/ngày.
10. Lập báo cáo lỗi theo Critical/High/Medium/Low, gồm bước tái hiện, nguyên nhân, tác động và cách sửa.

Sau báo cáo, hãy sửa lần lượt từ Critical xuống Low. Mỗi lỗi phải có regression test trước hoặc cùng lúc sửa. Không bỏ qua lỗi bằng cách tắt test, nới kiểu dữ liệu, bỏ validation hoặc ẩn tính năng. Sau khi sửa, chạy lại toàn bộ bộ kiểm thử và cập nhật báo cáo bằng bằng chứng kết quả.
```

---

# 5. CÂU LỆNH TẠO DỮ LIỆU MẪU VÀ DEMO NGHIỆP VỤ

```text
Hãy tạo bộ seed/demo tiếng Việt thực tế cho Xưởng Bảo Gấu Bông, tách riêng môi trường production:

- 1 công ty, 2 chi nhánh mẫu, 2 kho và các vị trí kho.
- Người dùng mẫu cho Admin, Sale, Kế toán, Kho và CSKH.
- Khách lẻ, khách sỉ, đại lý và doanh nghiệp; có khách lấy VAT và không VAT.
- Sản phẩm: gấu Teddy nhiều size/màu, gối ôm cổ, móc khóa gấu, áo in logo, túi in logo, gấu bông AI.
- Nguyên liệu: vải, bông, mắt mũi, chỉ, áo, tem và bao bì.
- BOM cho ít nhất hai sản phẩm.
- Bảng giá lẻ/sỉ/đại lý/doanh nghiệp và giá theo bậc số lượng.
- Báo giá, đơn thường, đơn in logo, đơn giao nhiều đợt, đơn COD và đơn có đổi trả.
- Yêu cầu thiết kế có nhiều phiên bản, một bản đã duyệt.
- Lệnh sản xuất ở nhiều trạng thái, dữ liệu công đoạn và QC.
- Phiếu thu/chi, cọc nhiều lần, công nợ đúng hạn/quá hạn và các quỹ.
- KPI, hoa hồng, chấm công và phiếu lương mẫu.

Tạo một tài liệu DEMO_SCENARIOS.md hướng dẫn người trình diễn đi qua từng luồng. Viết script kiểm tra tổng tiền, tồn kho, công nợ và số quỹ của bộ dữ liệu demo bằng các giá trị kỳ vọng cố định để phát hiện sai lệch.
```

---

# 6. CÂU LỆNH YÊU CẦU AI BÁO CÁO TIẾN ĐỘ MỖI NGÀY

```text
Hãy đọc kế hoạch dự án và mã nguồn hiện tại, sau đó báo cáo ngắn gọn:

1. Phần nào thực sự đã chạy được end-to-end.
2. Phần nào mới có giao diện hoặc mới có database/API.
3. Test nào đang đạt, test nào đang lỗi.
4. Lỗi/rủi ro nghiêm trọng nhất hiện tại.
5. Ba việc ưu tiên tiếp theo, mỗi việc có điều kiện hoàn thành rõ ràng.
6. Có migration, dữ liệu hoặc file nào có nguy cơ mất khi triển khai không.

Sau báo cáo, hãy thực hiện việc ưu tiên cao nhất trong phạm vi giai đoạn hiện tại. Không tự ý chuyển sang module khác khi điều kiện nghiệm thu giai đoạn chưa đạt.
```

---

# 7. NHỮNG THÔNG TIN CẦN BỔ SUNG TRƯỚC KHI TÍCH HỢP THẬT

Các thông tin dưới đây chưa cần để dựng MVP, nhưng phải chốt trước khi kết nối production:

1. Logo chính thức và mã màu thương hiệu Bảo Gấu Bông.
2. Tên pháp nhân, địa chỉ, mã số thuế, số điện thoại và website dùng trên chứng từ.
3. Nhà cung cấp hóa đơn điện tử đang sử dụng.
4. Đơn vị vận chuyển cần kết nối đầu tiên.
5. Facebook Page, Zalo OA và quyền/API tương ứng.
6. Nhà cung cấp email và SMS.
7. Mẫu báo giá, hợp đồng, phiếu thu/chi và phiếu giao hàng hiện tại.
8. Quy tắc đánh số chứng từ chính thức.
9. Công thức KPI, hoa hồng và lương chính thức.
10. Chính sách ghi nhận doanh thu và phương pháp tính giá vốn cần kế toán xác nhận.
11. Máy in hóa đơn, máy in mã vạch và khổ tem đang dùng.
12. Tên miền, máy chủ và người chịu trách nhiệm vận hành.

---

# 8. PHẠM VI MVP KHUYẾN NGHỊ

Để đưa vào dùng sớm, bản MVP nên tập trung vào một quy trình khép kín:

**Khách hàng → Báo giá → Đơn hàng → Cọc/thu tiền → Công nợ → Kho → Giao hàng → Báo cáo.**

Đi kèm nền tảng bắt buộc:

- Đăng nhập và phân quyền.
- Sản phẩm, biến thể và bảng giá.
- VAT 8%/không VAT.
- Thiết kế, duyệt mẫu và lệnh sản xuất cơ bản.
- Audit log và sao lưu.

KPI/lương nâng cao, cổng đại lý và kết nối Facebook/Zalo/hóa đơn/vận chuyển nên triển khai sau khi luồng lõi đã được nhân viên dùng thử và xác nhận. Cách chia này không cắt bỏ chức năng; nó giúp doanh nghiệp có giá trị sử dụng sớm và giảm rủi ro khi đổi quy trình.

