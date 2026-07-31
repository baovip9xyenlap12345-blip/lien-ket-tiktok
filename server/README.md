# 🧸 App Của Bảo Gấu Bông — Bản Pro (máy chủ)

Phiên bản trả phí theo gói tháng: khách đăng ký tài khoản, tải video/ghi âm lên, máy chủ
tách âm thanh bằng FFmpeg rồi gọi **OpenAI API** để chuyển thành văn bản (.txt) hoặc phụ đề (.srt).
Nhanh và chuẩn tiếng Việt hơn hẳn bản chạy trên trình duyệt.

## Tính năng

- Đăng ký / đăng nhập bằng email + mật khẩu
- Tính phí theo **số video** (mỗi video tối đa 5 phút — đổi bằng biến `MAX_VIDEO_MINUTES`):
  - **Dùng thử**: miễn phí — 1 video đầu tiên cho mỗi tài khoản mới
  - **Gói tuần**: 59.000đ — 10 video / 7 ngày
  - **Gói tháng**: 199.000đ — 30 video / 30 ngày
  - **Chuyên nghiệp**: 499.000đ — 1.000 video / 30 ngày
  (sửa giá/số lượng trong `index.js`, mục `PLANS`)
- Gói hết hạn tự khoá; khách hết lượt được gợi ý dùng bản miễn phí trên GitHub Pages hoặc mua gói
- Thanh toán: khách chuyển khoản → bạn (admin) bấm kích hoạt gói ngay trên web
- **Trang quản trị** (đăng nhập bằng `ADMIN_EMAIL`): xem toàn bộ khách hàng — email, gói,
  đã dùng/còn lại bao nhiêu video, ngày hết hạn, tổng lượt dùng, ngày đăng ký; tìm theo email;
  kích hoạt gói Tuần/Tháng/Pro chỉ với 1 nút bấm
- Văn bản thuần dùng `gpt-4o-mini-transcribe` (rẻ ~$0.003/phút), phụ đề dùng `whisper-1` (~$0.006/phút)

## Chi phí vận hành (ước tính 2.000 video ~5 phút/video)

- OpenAI API: ~$30–60/tháng (trả theo dùng thật)
- Máy chủ: ~$5–10/tháng (KHÔNG cần GPU)

## Cách triển khai (chọn 1 trong 2)

### Cách 1: Railway.app (dễ nhất, không cần biết kỹ thuật)

1. Tạo tài khoản tại https://railway.app (đăng nhập bằng GitHub)
2. New Project → **Deploy from GitHub repo** → chọn repo này
3. Settings → **Root Directory**: điền `server`
4. Tab **Variables** → thêm các biến trong file `.env.example`
   (quan trọng nhất: `OPENAI_API_KEY`, `JWT_SECRET`, `ADMIN_EMAIL`, `BANK_INFO`)
5. Settings → Networking → **Generate Domain** → nhận link dạng `https://xxx.up.railway.app`
6. Mở link đó — chính là trang cho khách hàng!

Lưu ý: thêm **Volume** gắn vào đường dẫn `/app/data` để không mất dữ liệu tài khoản khi redeploy.

### Cách 2: VPS (DigitalOcean/Vultr ~$6/tháng) bằng Docker

```bash
git clone https://github.com/baovip9xyenlap12345-blip/lien-ket-tiktok.git
cd lien-ket-tiktok/server
cp .env.example .env   # roi sua noi dung .env
docker build -t bao-stt .
docker run -d --name bao-stt --env-file .env -p 80:3000 -v $(pwd)/data:/app/data --restart unless-stopped bao-stt
```

## Lấy OpenAI API key

1. Tạo tài khoản tại https://platform.openai.com
2. Nạp tiền (Billing → Add credit, tối thiểu $5 — dùng thẻ Visa/Mastercard)
3. Vào https://platform.openai.com/api-keys → **Create new secret key** → sao chép chuỗi `sk-...`
4. Dán vào biến `OPENAI_API_KEY`

## Quy trình bán gói cho khách

1. Khách đăng ký tài khoản miễn phí (10 phút/tháng để dùng thử)
2. Khách muốn nâng gói → chuyển khoản theo thông tin trên trang (biến `BANK_INFO`)
3. Bạn đăng nhập bằng email admin (`ADMIN_EMAIL`) → thấy khung **👑 Quản trị**
4. Điền email khách + chọn gói → bấm **Kích hoạt** — xong, gói có hiệu lực 31 ngày

## 🔌 Kết nối tài khoản WordPress

Máy chủ có thể kết nối thẳng vào site WordPress của bạn để **sửa tài khoản** và **cấu hình site**
mà không cần mở trang quản trị WordPress.

### Bước 1 — Tạo "Mật khẩu ứng dụng" trong WordPress

Đăng nhập WordPress → **Người dùng (Users) → Hồ sơ (Profile)** → kéo xuống mục
**Application Passwords** → đặt tên (ví dụ `may-chu-app`) → **Add New Application Password**.
WordPress hiện một chuỗi 24 ký tự dạng `abcd efgh ijkl ...` — **chỉ hiện đúng một lần**, hãy chép lại ngay.

> Đây KHÔNG phải mật khẩu đăng nhập. Nếu không thấy mục này: site phải chạy **HTTPS** và WordPress từ **5.6** trở lên.

### Bước 2 — Điền vào biến môi trường

```
WP_URL=https://ten-mien-cua-ban        # có https://, KHÔNG có dấu / ở cuối
WP_USERNAME=ten_dang_nhap_wordpress
WP_APP_PASSWORD=abcd efgh ijkl mnop qrst uvwx
```

Chạy trên máy: chép `.env.example` thành `.env` rồi điền. Chạy trên Railway: điền vào tab **Variables**.

### Bước 3 — Kiểm tra kết nối

```bash
cd server
npm run wp:check
```

Lệnh này báo từng bước một (tìm thấy REST API → đăng nhập được → có quyền cấu hình) nên hỏng ở đâu biết ngay ở đó.

### Bước 4 — Dùng trang quản lý

Mở `https://<địa-chỉ-máy-chủ>/wordpress.html`, đăng nhập bằng email quản trị (`ADMIN_EMAIL`). Tại đây có thể:

- Xem trạng thái kết nối và vai trò của tài khoản WordPress
- Sửa **tài khoản**: tên hiển thị, biệt danh, họ tên, email, website, giới thiệu
- Sửa **cấu hình site**: tên site, khẩu hiệu, email quản trị, múi giờ, ngôn ngữ, định dạng ngày/giờ, số bài mỗi trang
- Đổi mật khẩu đăng nhập WordPress
- Xem và **thu hồi** mật khẩu ứng dụng (dùng khi bị lộ)
- Xem danh sách thành viên của site

### Các đường dẫn API (đều yêu cầu đăng nhập bằng tài khoản `ADMIN_EMAIL`)

| Đường dẫn | Việc |
|---|---|
| `GET /api/wp/status` | Đã cấu hình đủ chưa (không trả về mật khẩu) |
| `GET /api/wp/test` | Kiểm tra kết nối từng bước |
| `GET/POST /api/wp/account` | Xem / sửa tài khoản WordPress |
| `POST /api/wp/password` | Đổi mật khẩu đăng nhập WordPress |
| `GET/POST /api/wp/settings` | Xem / sửa cấu hình site |
| `GET /api/wp/app-passwords` | Danh sách mật khẩu ứng dụng |
| `DELETE /api/wp/app-passwords/:uuid` | Thu hồi một mật khẩu ứng dụng |
| `GET /api/wp/users` | Danh sách thành viên của site |

### Khi gặp lỗi

| Báo lỗi | Cách xử lý |
|---|---|
| Sai tên đăng nhập hoặc mật khẩu ứng dụng | Tạo lại mật khẩu ứng dụng, chép đủ 24 ký tự |
| Không tìm thấy REST API | Kiểm tra `WP_URL`; vào **Cài đặt → Đường dẫn tĩnh** bấm Lưu |
| Bị từ chối (403) | Plugin bảo mật (Wordfence, iThemes…) hoặc tường lửa/CDN đang chặn REST API |
| Không đủ quyền | Tài khoản cần vai trò **Administrator** mới sửa được cấu hình site |

### ⚠️ An toàn

- **Không** đặt mật khẩu vào mã nguồn hay đưa lên Git. File `.env` đã nằm trong `.gitignore` và `.dockerignore`.
- Nếu mật khẩu ứng dụng từng gửi qua chat/tin nhắn/email thì coi như **đã lộ**: vào trang
  `/wordpress.html` bấm **Thu hồi**, tạo cái mới rồi cập nhật lại `WP_APP_PASSWORD`.
- Mật khẩu ứng dụng có **toàn quyền như tài khoản đó** qua REST API, hãy giữ như mật khẩu thật.

## Ghi chú kỹ thuật

- Dữ liệu (tài khoản, log sử dụng) lưu SQLite tại `server/data/app.db` — nhớ backup/volume
- File khách tải lên bị **xoá ngay** sau khi xử lý xong, không lưu trên máy chủ
- Giới hạn file 300MB; muốn đổi sửa trong `index.js`
- CORS đã mở nên có thể gọi API từ trang GitHub Pages nếu muốn nhúng vào trang cũ
