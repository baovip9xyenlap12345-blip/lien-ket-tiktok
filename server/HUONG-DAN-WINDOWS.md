# Hướng dẫn chạy trên máy Windows

Dành cho: đăng ảnh + trang giới thiệu lên WordPress từ máy tính của bạn.

**Không cần biết lập trình. Không cần chạy `npm install`.** Chỉ cần đã cài Node.js.

---

## Chuẩn bị: kiểm tra Node.js

Mở **Command Prompt** (bấm phím Windows, gõ `cmd`, Enter) rồi gõ:

```
node -v
```

Hiện ra `v20.x` trở lên là được. Nếu báo lỗi "không nhận lệnh", tải Node.js tại https://nodejs.org (chọn bản **LTS**), cài xong mở lại Command Prompt.

---

## Bước 1 — Mở Command Prompt ĐÚNG thư mục

Đây là chỗ hay sai nhất. Lỗi `Cannot find module` nghĩa là bạn đang đứng sai thư mục.

1. Mở thư mục đã giải nén, đi sâu vào cho tới khi thấy thư mục tên **`server`**
2. Mở thư mục `server` — bên trong phải thấy các file `wp-check.js`, `wp-dang-gioi-thieu.js`
3. Bấm chuột vào **thanh địa chỉ** phía trên cùng (chỗ hiển thị đường dẫn)
4. Xoá hết, gõ `cmd`, bấm Enter

Cửa sổ đen mở ra sẵn ngay tại thư mục đó — không phải gõ `cd` gì cả.

> ⚠️ Phải **giải nén** file ZIP trước. Mở xem trực tiếp trong file ZIP thì không chạy được.

Kiểm tra đứng đúng chỗ chưa:

```
dir wp-check.js
```

Thấy tên file hiện ra là đúng. Báo "File Not Found" là còn sai thư mục.

---

## Bước 2 — Tạo file mật khẩu

```
notepad .env
```

Notepad hỏi *"Bạn có muốn tạo tệp mới không?"* → bấm **Có**.

Dán 3 dòng sau vào, thay mật khẩu ứng dụng của bạn vào dòng cuối, rồi **Ctrl+S** để lưu:

```
WP_URL=https://buihuubao.vn
WP_USERNAME=ten_dang_nhap_wordpress_cua_ban
WP_APP_PASSWORD=dan mat khau ung dung vao day
```

Mật khẩu ứng dụng để nguyên khoảng trắng cũng được, phần mềm tự bỏ.

Kiểm tra đã lưu đúng tên chưa:

```
type .env
```

Nội dung hiện ra là đúng. Báo lỗi thì Notepad đã lưu thành `.env.txt` — vào thư mục đổi tên lại thành `.env`.

### Chưa có mật khẩu ứng dụng?

WordPress → **Người dùng → Hồ sơ** → kéo xuống **Application Passwords** → đặt tên (ví dụ `may-cua-toi`) → **Add New Application Password**. Chuỗi 24 ký tự chỉ hiện **một lần duy nhất**, chép ngay.

> Đây không phải mật khẩu đăng nhập. Nếu không thấy mục này: site phải chạy HTTPS và WordPress từ 5.6 trở lên.

---

## Bước 3 — Kiểm tra kết nối

```
node wp-check.js
```

Đúng thì thấy:

```
✅ REST API: Tim thay site "..."
✅ Dang nhap: Dang nhap voi "..." (administrator)
✅ Quyen cau hinh: Doc/sua duoc cau hinh site
✅ KET NOI THANH CONG
```

Nếu báo lỗi, xem bảng ở cuối trang này.

---

## Bước 4 — Viết nội dung

```
notepad gioi-thieu.md
```

File này có sẵn bản thảo. Tìm **hai chỗ nằm trong dấu `{{ }}`** — đó là phần kể về cuộc đời bạn, phải tự viết. Xoá cả dấu `{{ }}` đi, thay bằng lời của bạn. Lưu lại.

> Lệnh đăng sẽ **từ chối chạy** khi còn chỗ `{{ }}` chưa điền — để tránh đăng lên web mà vẫn còn ghi chú nháp.

Cách viết trong file:

| Gõ thế này | Ra web thành |
|---|---|
| `## Tiêu đề mục` | Tiêu đề mục |
| `**chữ đậm**` | **chữ đậm** |
| `> câu trích dẫn` | Khối trích dẫn |
| `[ANH]` | Chèn ảnh tiếp theo vào đúng chỗ đó |

Ảnh không được `[ANH]` gọi tới sẽ gom thành thư viện ảnh ở cuối trang.

---

## Bước 5 — Chạy thử (chưa động đến website)

```
node wp-dang-gioi-thieu.js --anh "F:\Ảnh của tôi" --thu
```

Đường dẫn có dấu cách hoặc tiếng Việt thì **phải bọc trong dấu nháy kép**.

Lệnh này chỉ liệt kê sẽ làm gì, không gửi gì lên website. Xem danh sách ảnh có đúng không.

---

## Bước 6 — Đăng thật

Bỏ `--thu` đi:

```
node wp-dang-gioi-thieu.js --anh "F:\Ảnh của tôi"
```

Ảnh được tải lên Thư viện, trang được tạo ở dạng **nháp** — khách chưa thấy. Lệnh in ra link xem trước, mở lên kiểm tra.

Ưng rồi thì công khai:

```
node wp-dang-gioi-thieu.js --anh "F:\Ảnh của tôi" --dang
```

Chạy lại nhiều lần **không tạo trang trùng** — nó cập nhật đúng trang cũ.

Cuối cùng vào **Giao diện → Menu** thêm trang này vào menu chính.

---

## Gặp lỗi thì tra bảng này

| Báo lỗi | Nghĩa là | Cách sửa |
|---|---|---|
| `Cannot find module` | Đang đứng sai thư mục | Làm lại Bước 1, kiểm bằng `dir wp-check.js` |
| `node` không nhận lệnh | Chưa cài Node.js | Cài tại nodejs.org, mở lại Command Prompt |
| `Chua cau hinh ket noi WordPress` | Thiếu file `.env` hoặc thiếu dòng | Làm lại Bước 2, kiểm bằng `type .env` |
| `Sai ten dang nhap hoac mat khau ung dung` | Sai tài khoản | Tạo lại mật khẩu ứng dụng, chép đủ 24 ký tự |
| `Khong tim thay REST API` | Sai địa chỉ web | Kiểm `WP_URL`; vào **Cài đặt → Đường dẫn tĩnh** bấm Lưu |
| `Bi tu choi (403)` | Tường lửa hoặc plugin bảo mật chặn | Tạm tắt Wordfence/iThemes, hoặc mở khoá `/wp-json/` |
| `Tai khoan khong du quyen` | Tài khoản không phải Administrator | Dùng tài khoản quản trị |
| `Khong tim thay thu muc anh` | Sai đường dẫn ảnh | Bọc trong nháy kép: `--anh "F:\Ảnh của tôi"` |
| `anh nang qua gioi han upload` | Ảnh quá nặng | Giảm dung lượng ảnh, hoặc nhờ hosting nâng `upload_max_filesize` |
| Còn chỗ `{{ }}` chưa điền | Bản thảo chưa viết xong | Làm lại Bước 4 |

---

## An toàn

- File `.env` chứa mật khẩu thật. Nó đã được loại trừ khỏi Git, **đừng gửi nó cho ai**, kể cả qua chat.
- Mật khẩu ứng dụng có **toàn quyền như tài khoản đó** qua REST API — giữ như mật khẩu thật.
- Lỡ gửi ra ngoài rồi thì coi như đã lộ: vào **Người dùng → Hồ sơ → Application Passwords** bấm **Revoke**, tạo cái mới.
