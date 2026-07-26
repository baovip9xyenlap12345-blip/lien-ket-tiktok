# Kiểm thử Livestream AI cục bộ (không cần tài khoản Shopee/TikTok)

## Chuẩn bị

```bash
cd server && npm install
export JWT_SECRET=test SECRET_KEY_BASE=test-key ADMIN_EMAIL=admin@test.vn \
       TTS_PROVIDER=mock MAX_CONCURRENT_SESSIONS=3 PORT=3111
node index.js
```

`TTS_PROVIDER=mock` tạo tiếng bíp thay giọng đọc — test được toàn bộ đường ống mà không cần mạng.
Muốn nghe giọng thật: `TTS_PROVIDER=edge` (cần mạng ra internet).

## Máy thu RTMP giả lập (2 "sàn")

```bash
ffmpeg -y -listen 1 -timeout 120 -i rtmp://0.0.0.0:19351/live/a -c copy /tmp/sink_a.flv &
ffmpeg -y -listen 1 -timeout 120 -i rtmp://0.0.0.0:19352/live/b -c copy /tmp/sink_b.flv &
```

Trong dashboard `http://localhost:3111/live.html`:
1. Đăng ký tài khoản bằng email admin → tự thấy khu quản trị → kích hoạt gói Live cho chính mình.
2. Thêm 1 sản phẩm, tải 1 clip video, thêm 2 kênh phát `custom`:
   - `rtmp://127.0.0.1:19351/live` / key `a`
   - `rtmp://127.0.0.1:19352/live` / key `b`
3. Tạo phiên chọn đủ 3 thứ → bấm **▶ Phát**.

## Ma trận kiểm thử

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | Bấm Phát | 2 file sink cùng lớn dần; state `live`; nhật ký hiện câu kịch bản |
| 2 | `kill -9 <pid ffmpeg phiên>` | Nhật ký "tự phát lại sau 5s"; state quay lại `live`; restart_count +1 |
| 3 | Tắt 1 sink | Sink còn lại vẫn nhận dữ liệu (tee onfail=ignore) |
| 4 | Xem file sink | `ffprobe`: h264 720x1280@30 + aac; âm lượng ≠ im lặng |
| 5 | Khung hình | `ffmpeg -sseof -2 -i sink.flv -frames:v 1 f.png` — có tên/giá/CTA đủ dấu |
| 6 | Restart server khi đang live | Phiên tự phát lại (reconcile) |
| 7 | Hẹn `schedule_start` quá khứ | Tick trong ≤60s tự phát; `schedule_end` đến giờ tự dừng |
| 8 | Set `used_stream_seconds` gần trần | Cảnh báo còn <10 phút; hết giờ tự dừng sạch |
| 9 | Bơm bình luận giả: `POST /api/admin/live/sessions/:id/test-comment` | Xuất hiện trong nhật ký bình luận; có OPENAI_API_KEY thì được đọc to câu trả lời |
| 10 | Soak 2h | RAM phẳng, lệch A/V < 500ms |

## Trước khi nhận khách thật

Chạy 1 phiên smoke test lên tài khoản Shopee + TikTok của chính mình (key thật) ít nhất 30 phút.
