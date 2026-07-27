# 🖥️ Hướng dẫn chạy thử Vòng Quay May Mắn trên máy tính của bạn

Chỉ cần làm 1 lần, khoảng 10 phút. Làm theo đúng thứ tự.

## Bước 1: Cài Node.js (nền tảng để chạy app)

1. Vào trang: **https://nodejs.org**
2. Bấm nút tải bản **LTS** (bản ổn định — cần bản 22 trở lên)
3. Mở file vừa tải, bấm **Next → Next → Install** cho đến khi xong (không cần chỉnh gì)

## Bước 2: Tải mã nguồn app về máy

1. Mở link này để tải file ZIP của app:
   **https://github.com/baovip9xyenlap12345-blip/lien-ket-tiktok/archive/refs/heads/claude/lucky-wheel-discount-app-j3lxpb.zip**
2. Giải nén file ZIP (chuột phải → Extract All)
3. Mở thư mục vừa giải nén → vào tiếp thư mục **`lucky-wheel`**

## Bước 3: Chạy app

**Trên Windows:**
1. Vào trong thư mục `lucky-wheel`, bấm vào thanh địa chỉ của cửa sổ thư mục, gõ `cmd` rồi Enter (mở cửa sổ lệnh ngay tại thư mục này)
2. Gõ lệnh sau rồi Enter (chỉ cần chạy lần đầu):
   ```
   npm install
   ```
3. Gõ tiếp rồi Enter:
   ```
   npm start
   ```
4. Khi thấy dòng `Vòng Quay May Mắn chạy tại http://localhost:3000` là thành công. **Đừng tắt cửa sổ đen này** khi đang dùng app.

**Trên Mac:** mở Terminal, gõ `cd ` (có dấu cách) rồi kéo thả thư mục `lucky-wheel` vào, Enter. Sau đó chạy `npm install` rồi `npm start` như trên.

## Bước 4: Mở app và test

Mở trình duyệt, vào: **http://localhost:3000**

### Tài khoản quản trị viên (của bạn — chủ app):
- Email: `admin@vongquay.local`
- Mật khẩu: `admin123`

### Kịch bản test đầy đủ (5 phút):

1. **Đăng ký 1 cửa hàng thử**: bấm "Đăng ký cửa hàng" → điền tên quán (VD: Cà phê Test), tên, email bất kỳ (VD: `test@quan.com`), mật khẩu → vào ngay trang quản lý
2. **Cài phần quà**: tab "🎁 Phần quà & tỷ lệ" — sửa/thêm quà, đặt tỷ lệ % (thử đặt tổng vượt 100% xem hệ thống chặn)
3. **Chọn màu quán**: tab "⚙️ Cài đặt quán" → đổi màu chủ đạo → Lưu
4. **Quay thử như khách**: bấm "Mở thử ↗" cạnh link vòng quay (hoặc copy link mở trên tab ẩn danh) → bấm QUAY NGAY → trúng thì nhập tên + SĐT → nhận ảnh mã
5. **Xác nhận mã như nhân viên**: quay lại trang quản lý → tab "🎫 Xác nhận mã" → nhập mã vừa nhận → Kiểm tra → Xác nhận sử dụng → thử nhập lại lần 2 xem bị chặn
6. **Xem data khách**: tab "👥 Khách hàng" thấy khách vừa nhập; đăng xuất, đăng nhập admin để xem toàn hệ thống
7. **Test chế độ mã đơn hàng**: Cài đặt quán → đổi sang "Quay theo mã đơn hàng" → tab "📦 Mã đơn hàng" dán vài mã đơn (VD: DH001, DH002) → mở trang vòng quay, nhập mã quay thử

### Test trên điện thoại (cùng mạng WiFi với máy tính):

1. Trên máy tính, mở cmd gõ `ipconfig` (Windows) — tìm dòng **IPv4 Address**, VD `192.168.1.5`
2. Trên điện thoại mở trình duyệt vào: `http://192.168.1.5:3000` (thay IP của bạn)
3. Quét thử QR, quay, xem hiệu ứng đèn + pháo giấy + âm thanh trên điện thoại

## Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `npm` không phải lệnh hợp lệ | Chưa cài Node.js hoặc chưa mở lại cmd sau khi cài — cài Bước 1, mở lại cmd |
| Điện thoại không vào được | Tắt thử tường lửa Windows, hoặc kiểm tra 2 máy cùng WiFi |
| Muốn xóa hết dữ liệu test làm lại | Tắt app (Ctrl+C), xóa thư mục `data` trong `lucky-wheel`, chạy lại `npm start` |

## Khi test xong, muốn có link thật cho khách dùng

Xem phần **"Đưa lên Internet"** trong file `README.md` — nhanh nhất là Render.com (miễn phí). Khi đưa lên mạng thật, **bắt buộc đổi email/mật khẩu admin** bằng biến môi trường `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
