# 🎓 Hướng dẫn DẠY NGƯỜI KHÁC tạo app như Vòng Quay May Mắn

Tài liệu này dành cho bạn — người đã tự tạo ra app này — muốn hướng dẫn lại cho người khác.

## Sự thật quan trọng cần nói với học viên ngay buổi đầu

Bạn KHÔNG dạy họ "học lập trình". Bạn dạy họ **kỹ năng chỉ huy AI xây phần mềm**:

> Người tạo app thời AI = người biết MÔ TẢ RÕ mình muốn gì + biết KIỂM TRA kết quả + biết YÊU CẦU SỬA đến khi đúng ý. AI (Claude) mới là người gõ code.

Cả app Vòng Quay May Mắn được tạo đúng theo cách đó: mô tả ý tưởng → AI xây → chạy thử → chụp màn hình lỗi gửi AI → AI sửa → lặp lại. Không tự viết một dòng code nào.

---

## 2 lộ trình dạy — chọn theo mục tiêu học viên

| Lộ trình | Dành cho ai | Thời lượng |
|---|---|---|
| **A. Triển khai app có sẵn** (dùng chính app này) | Người muốn CÓ APP DÙNG/KINH DOANH ngay | 1 buổi (2-3 giờ) |
| **B. Tự xây app mới bằng AI** | Người muốn tạo app theo ý tưởng riêng của họ | 4-5 buổi |

---

# LỘ TRÌNH A: Triển khai app có sẵn (1 buổi)

Học viên sẽ có bản Vòng Quay May Mắn CỦA RIÊNG HỌ chạy trên Internet.

### Bước 1: Lập 2 tài khoản (15 phút)
1. **GitHub.com** — nơi chứa mã nguồn (như Google Drive cho code). Đăng ký bằng email.
2. **Render.com** — máy chủ chạy app. Đăng nhập bằng nút "Sign in with GitHub".

### Bước 2: Sao chép mã nguồn về tài khoản của họ (5 phút)
1. Mở repo mã nguồn của bạn trên GitHub (bạn có thể tạo 1 repo mẫu công khai từ thư mục `lucky-wheel`)
2. Học viên bấm **Fork** (hoặc **Use this template**) → mã nguồn nằm trong tài khoản GitHub của họ

### Bước 3: Đưa lên Render (15 phút)
1. Render → **New + → Blueprint** → chọn repo vừa fork → chọn đúng nhánh có file `render.yaml`
2. Điền **ADMIN_EMAIL** (email của học viên) + **ADMIN_PASSWORD** (mật khẩu mạnh, ghi lại)
3. Bấm **Deploy** → chờ 2-3 phút → có link `.onrender.com` chạy thật

### Bước 4: Cấu hình kinh doanh thật (30 phút — có thể làm sau)
1. **Nâng gói Starter + gắn ổ đĩa** `/data` + biến `DATA_DIR=/data` → dữ liệu vĩnh viễn (7$/tháng)
2. **Tên miền riêng**: mua tên miền → Render Custom Domains → thêm bản ghi CNAME phía DNS
3. **Bật email**: Gmail App Password → 4 biến SMTP trong Environment

### Bước 5: Dạy sử dụng app (45 phút)
Dùng luôn trang `/huong-dan.html` có sẵn trong app: tạo quán mẫu → cài quà + tỷ lệ → quay thử trên điện thoại → xác nhận mã → xuất data. Kèm mục "Chiến lược cài quà tối ưu".

---

# LỘ TRÌNH B: Tự xây app mới bằng AI (4-5 buổi)

## Buổi 1: Tư duy + công cụ

### Dạy tư duy "3 vai trò khi ra lệnh cho AI"
Mỗi yêu cầu gửi AI cần nói được 3 điều:
1. **AI LÀ AI**: "Hãy xây cho tôi một web app..."
2. **NGƯỜI DÙNG LÀ AI, LÀM GÌ**: mô tả từng loại người dùng và luồng thao tác của họ
3. **TÔI KIỂM TRA THẾ NÀO**: kết quả đúng trông ra sao

### Công cụ cần lập tài khoản
- **Claude** (claude.ai — gói Pro để dùng Claude Code): AI xây app
- **GitHub**: chứa mã nguồn, nối với Claude Code
- **Render.com**: chạy app lên Internet

### Bài tập buổi 1
Mỗi học viên viết ra giấy: app của mình dành cho AI? Có mấy loại người dùng? Mỗi loại làm được gì? — chưa cần đụng máy tính.

## Buổi 2: Ra lệnh đầu tiên — có app chạy được

### Công thức "câu lệnh khai sinh app" (dạy học viên điền vào mẫu)
```
Tôi muốn tạo một app web tên là [TÊN APP].
App có [SỐ] loại tài khoản:
1. [Quản trị viên] — quản lý được [những gì]
2. [Người dùng loại 2] — làm được [những gì]
3. [Khách] — làm được [những gì], phải nhập [thông tin gì]
Luồng chính của khách: [bước 1] → [bước 2] → [bước 3]
Dữ liệu cần lưu: [danh sách]
Giao diện tiếng Việt, chạy tốt trên điện thoại.
Hãy xây hoàn chỉnh, tự test, rồi hướng dẫn tôi chạy thử.
```

**Ví dụ thật — chính là câu lệnh đã tạo ra Vòng Quay May Mắn:** "Tôi muốn tạo app vòng quay may mắn nhận quà giảm giá. Tôi là chủ app cung cấp cho các chủ cửa hàng. Chủ cửa hàng tự cài % tỷ lệ trúng, quà gì, mã giảm giá gì. Khách nhập SĐT/email để quay. Tôi quản lý được tất cả cửa hàng và toàn bộ khách của họ..."

### Quy tắc vàng khi AI trả kết quả
- AI làm xong → **chạy thử NGAY** theo hướng dẫn của AI
- Sai ở đâu → **chụp màn hình** + mô tả "tôi bấm X, mong muốn Y, nhưng ra Z" → gửi AI sửa
- **Mỗi lần chỉ yêu cầu 1-2 tính năng.** Đừng dồn 10 yêu cầu vào 1 tin nhắn.

## Buổi 3: Vòng lặp hoàn thiện tính năng

Dạy học viên cách mô tả tính năng mới theo mẫu **"luồng người dùng"** — ví dụ thật từ app này:
> "Lộ trình khách đi như sau: 1 khách quét QR ở quán, 2 bấm vô link, sau đó quay trúng thưởng, quay xong sẽ có mã giảm giá, khách phải nhập tên bắt buộc + SĐT hoặc email (1 trong 2) mới nhận được mã..."

AI đọc mô tả luồng như vậy là tự biết phải sửa database, API, giao diện. Học viên KHÔNG cần biết 3 thứ đó là gì.

Các dạng yêu cầu cho học viên luyện:
- Thêm tính năng: "khi khách mua thêm đơn, nhập mã đơn hàng thì được quay tiếp"
- Sửa giao diện: "chữ trên vòng quay bị che, hãy cho xuống dòng"
- Chống gian lận: "mỗi mã chỉ được dùng 1 lần, nhân viên xác nhận tại quầy"

## Buổi 4: Đưa app lên Internet (làm theo Lộ trình A bước 3-4)

GitHub → Render Blueprint → biến môi trường → (sau này) gói trả phí + ổ đĩa + tên miền riêng.

**Nhấn mạnh 3 bài học xương máu (bạn đã trải qua, kể lại cho học viên):**
1. **Gói miễn phí không có ổ cứng** → dữ liệu mất khi máy chủ khởi động lại. Kinh doanh thật phải gắn ổ đĩa.
2. **Tên miền miễn phí `.onrender.com` dễ bị Google gắn cờ "Nguy hiểm"** → tên miền riêng vừa hết cảnh báo vừa chuyên nghiệp.
3. **Luôn có nút sao lưu/phục hồi dữ liệu** — yêu cầu AI làm ngay từ đầu.

## Buổi 5: Vận hành + tăng trưởng

- Đọc log khi lỗi: vào Render → Logs → chụp dòng đỏ gửi AI là sửa được
- Cập nhật app: yêu cầu AI thêm tính năng → đẩy code → Render tự cập nhật
- Nội dung trang bán hàng: yêu cầu AI "viết lại trang chủ theo cấu trúc trang bán hàng, nêu rõ lợi ích, xử lý nghi ngờ, nhiều nút đăng ký"
- Vòng lan truyền: gắn nút "Đăng ký dùng app" trên trang mà khách của khách nhìn thấy

---

## 5 sai lầm học viên hay mắc (dặn trước để tránh)

1. **Yêu cầu mơ hồ**: "làm cho đẹp hơn" → AI đoán mò. Đúng: "chữ tên quà bị cắt, cho xuống 2 dòng, cỡ chữ tự co theo số ô".
2. **Dồn quá nhiều yêu cầu 1 lần** → rối, khó kiểm tra. Mỗi lần 1-2 tính năng, test xong mới yêu cầu tiếp.
3. **Không chạy thử sau mỗi lần AI sửa** → lỗi chồng lỗi, không biết hỏng từ đâu.
4. **Không mô tả bằng luồng người dùng** — kể "khách bấm gì thấy gì" tốt hơn gấp 10 lần cố nói chuyện kỹ thuật.
5. **Quên chuyện tiền và dữ liệu**: nhắc học viên ngay từ đầu về chi phí máy chủ (~7$/tháng khi chạy thật), sao lưu dữ liệu, và bảo vệ thông tin cá nhân khách hàng theo Nghị định 13/2023/NĐ-CP.

## Gợi ý cách đóng gói thành khóa học/nội dung

- **Video từng buổi** quay màn hình thao tác thật (đăng ký tài khoản → ra lệnh → app chạy) — người xem tin ngay vì thấy kết quả thật
- **Kèm bộ mẫu**: mẫu "câu lệnh khai sinh app", mẫu mô tả luồng người dùng, checklist đưa app lên mạng
- Học viên tốt nghiệp = có app CỦA HỌ chạy trên link thật + biết tự yêu cầu AI sửa/thêm tính năng
