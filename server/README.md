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

## Ghi chú kỹ thuật

- Dữ liệu (tài khoản, log sử dụng) lưu SQLite tại `server/data/app.db` — nhớ backup/volume
- File khách tải lên bị **xoá ngay** sau khi xử lý xong, không lưu trên máy chủ
- Giới hạn file 300MB; muốn đổi sửa trong `index.js`
- CORS đã mở nên có thể gọi API từ trang GitHub Pages nếu muốn nhúng vào trang cũ

---

# 🔴 Livestream AI — phát live bán hàng tự động 24/7 (Shopee + TikTok)

Tính năng mới: hệ thống tự phát livestream lên Shopee Live / TikTok LIVE **không cần MC** —
giọng đọc AI tiếng Việt sinh theo thời gian thực (không phải video phát lại), tự giới thiệu
sản phẩm theo kịch bản AI, tự trả lời bình luận TikTok, khung giá/CTA đè lên video.

## Cách hoạt động

1. Shop tải lên các **video clip quay sản phẩm** (quay dọc 9:16) — hệ thống chuẩn hóa 720×1280@30fps và phát lặp xen kẽ.
2. AI viết kịch bản MC từ dữ liệu sản phẩm (tên, giá, điểm bán hàng) → chuyển thành **giọng nói tiếng Việt** từng phút một → không phiên nào giống phiên nào.
3. Một tiến trình FFmpeg bền vững ghép video + giọng nói + khung tên/giá/CTA rồi **đẩy đồng thời** lên Shopee và TikTok qua RTMP.
4. Bình luận TikTok được đọc qua thư viện không chính thức, AI chọn câu đáng trả lời và **đọc to câu trả lời ngay trong live**.

## Biến môi trường bổ sung (xem `.env.example`)

| Biến | Ý nghĩa |
|---|---|
| `SECRET_KEY_BASE` | **Bắt buộc** — mã hóa stream key của khách (AES-256-GCM). Không đặt = tính năng live bị tắt |
| `TTS_PROVIDER` | `edge` (miễn phí, mặc định) / `openai` (~$0.015/phút, ổn định hơn) / `mock` (test) |
| `TTS_VOICE` | Giọng Edge: `vi-VN-HoaiMyNeural` (nữ) / `vi-VN-NamMinhNeural` (nam) |
| `SCRIPT_MODEL` | Model viết kịch bản (mặc định `gpt-4o-mini`) — không có key vẫn chạy bằng kịch bản mẫu |
| `MAX_CONCURRENT_SESSIONS` | Số phiên phát đồng thời tối đa trên máy chủ này (mặc định 3) |

## Yêu cầu máy chủ (QUAN TRỌNG — khác hẳn app chuyển giọng nói)

Mỗi phiên live 720p tốn **~1 nhân CPU + ~300MB RAM + ~5Mbps mạng lên** (đẩy 2 sàn cùng lúc).

| Máy chủ | Giá tham khảo | Số phiên đồng thời |
|---|---|---|
| VPS 4 vCPU / 8GB | ~500–600k/tháng | 3 |
| VPS 8 vCPU / 16GB | ~1–1,5tr/tháng | 6–7 |
| Dedicated 32 core (Hetzner...) | ~3–4tr/tháng | 25–30 |

Muốn quy mô 50–70 phiên như các dịch vụ lớn: chạy 2–3 máy, chia khách theo máy
(mỗi máy một bản cài + CSDL riêng), đặt `MAX_CONCURRENT_SESSIONS` đúng theo số nhân CPU.

## Quy trình bán gói Livestream AI

Giống app chuyển giọng nói: khách đăng ký → chuyển khoản → admin bấm kích hoạt gói
(**Live thử** 2h/7 ngày · **Live CB** 600k = 120h/30 ngày · **Live 24/7** 1,5tr = 500h/30 ngày).
Hệ thống tự đếm giờ phát, cảnh báo bằng giọng nói trước khi hết 10 phút và tự dừng khi hết giờ.

## Hướng dẫn khách lấy stream key

- **Shopee**: Kênh Người Bán → Shopee Live → tạo phiên → chọn *Phát trực tiếp từ PC* → copy **URL** + **Stream key** dán vào tab «📡 Kênh phát».
- **TikTok**: tài khoản cần đủ điều kiện LIVE (thường ≥1.000 follower); lấy Server URL + key trong **TikTok LIVE Studio**. Lưu ý key TikTok thường đổi theo phiên — cập nhật trước mỗi lần phát.

## Rủi ro cần nói rõ với khách

Nội dung phát tự động có thể vi phạm chính sách sàn tùy thời điểm; tài khoản của khách
có thể bị hạn chế/khóa live. Điều khoản đã ghi rõ khách tự chịu trách nhiệm (xem `tos.html`).
Hệ thống giảm rủi ro bằng: giọng sinh thời gian thực (không lặp), kịch bản đổi liên tục,
overlay thay đổi, trả lời bình luận thật.

## Kiểm thử không cần tài khoản sàn (xem chi tiết `server/test/rtmp-local.md`)

```bash
# máy thu RTMP giả lập
ffmpeg -y -listen 1 -i rtmp://0.0.0.0:19351/live/a -c copy /tmp/thu.flv
# thêm kênh phát custom trỏ về rtmp://127.0.0.1:19351/live với key "a" rồi bấm Phát
```
