# Lien Ket TikTok

Landing page tích hợp TikTok API kèm backend proxy kết nối Pancake POS API.

## Tích hợp Pancake

API key của Pancake **không** được commit vào repo. Thiết lập trước khi chạy:

```bash
cp .env.example .env
# Mở .env và điền PANCAKE_API_KEY thật của bạn
```

Cài đặt và chạy server:

```bash
npm install
npm start
```

Server chạy tại `http://localhost:3000`:

- `/` — landing page TikTok API
- `/dashboard.html` — dashboard xem shop & đơn hàng lấy từ Pancake POS API
- `/api/pancake/shops` — proxy lấy danh sách shop (backend giữ key, không lộ ra client)
- `/api/pancake/shops/:shopId/orders` — proxy lấy danh sách đơn hàng theo shop

Toàn bộ request tới Pancake API đều đi qua backend (`server.js`) để API key không bao giờ xuất hiện ở phía trình duyệt.

### Lưu ý bảo mật

- File `.env` đã được thêm vào `.gitignore`, không bao giờ commit file này.
- Nếu API key bị lộ (vô tình commit, dán vào nơi công khai...), hãy vào Pancake tạo lại (revoke) key ngay và cập nhật `.env`.
