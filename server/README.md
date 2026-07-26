# 🧸 App Của Bảo Gấu Bông — Bản Pro (máy chủ)

Phiên bản trả phí theo gói tháng: khách đăng ký tài khoản, tải video/ghi âm lên, máy chủ
tách âm thanh bằng FFmpeg rồi gọi **OpenAI API** để chuyển thành văn bản (.txt) hoặc phụ đề (.srt).
Nhanh và chuẩn tiếng Việt hơn hẳn bản chạy trên trình duyệt.

## Tính năng

- Đăng ký / đăng nhập bằng email + mật khẩu
- 3 gói tháng (sửa được trong `index.js`, mục `PLANS`):
  - **Miễn phí**: 10 phút/tháng
  - **Cơ bản**: 199.000đ — 300 phút/tháng
  - **Chuyên nghiệp**: 499.000đ — 1.000 phút/tháng
- Theo dõi hạn mức từng tháng, tự đặt lại đầu tháng, gói hết hạn tự về miễn phí
- Thanh toán: khách chuyển khoản → bạn (admin) bấm kích hoạt gói ngay trên web
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

## Ghi chú kỹ thuật

- Dữ liệu (tài khoản, log sử dụng) lưu SQLite tại `server/data/app.db` — nhớ backup/volume
- File khách tải lên bị **xoá ngay** sau khi xử lý xong, không lưu trên máy chủ
- Giới hạn file 300MB; muốn đổi sửa trong `index.js`
- CORS đã mở nên có thể gọi API từ trang GitHub Pages nếu muốn nhúng vào trang cũ
