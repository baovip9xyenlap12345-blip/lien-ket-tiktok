# Hướng dẫn phiên âm video thành TXT trên máy Windows

Bộ công cụ này chuyển toàn bộ video khóa học (file `.ts`, `.mp4`, `.mkv`...) trong ổ E
thành file chữ `.txt` tiếng Việt, **chạy hoàn toàn trên máy của bạn**, miễn phí.

Chỉ cần làm 1 lần theo 5 bước dưới đây.

---

## Bước 1 — Tải công cụ Faster-Whisper-XXL (miễn phí)

1. Mở trang: **https://github.com/Purfview/whisper-standalone-win/releases/latest**
2. Kéo xuống phần **Assets**, tải file có tên dạng:
   `Faster-Whisper-XXL_rXXX_windows.7z` (khoảng 1GB)
3. Giải nén file vừa tải (nếu máy chưa có phần mềm giải nén, cài **7-Zip**
   tại https://www.7-zip.org — miễn phí).
4. Sau khi giải nén sẽ có thư mục chứa file **`faster-whisper-xxl.exe`**.
   Ví dụ bạn để ở: `E:\whisper\`

## Bước 2 — Đặt script vào cùng thư mục

Chép file **`phien-am-video.bat`** (nằm cạnh file hướng dẫn này) vào **cùng thư mục**
với `faster-whisper-xxl.exe` (ví dụ `E:\whisper\`).

## Bước 3 — Sửa 3 dòng cấu hình

Bấm **chuột phải** vào `phien-am-video.bat` → chọn **Edit** (hoặc mở bằng Notepad), sửa:

| Dòng | Ý nghĩa | Sửa thành |
|------|---------|-----------|
| `set "VIDEO_DIR=E:\video hoc long"` | Thư mục chứa video | Đường dẫn thật đến thư mục video của bạn trong ổ E |
| `set "OUT_DIR=E:\raw"` | Nơi lưu file txt | Để nguyên cũng được |
| `set "MODEL=large-v3"` | Model AI | Xem bảng dưới |

**Chọn model theo máy của bạn:**

| Máy của bạn | Nên dùng | Tốc độ (video 1 giờ) |
|---|---|---|
| Có card NVIDIA từ 8GB VRAM (RTX 3060 12GB, 4070...) | `large-v3` | ~5–10 phút |
| Có card NVIDIA 4–6GB (GTX 1650, RTX 3050...) | `medium` | ~10–15 phút |
| Không có card rời (chỉ CPU) | `medium` hoặc `small` | ~1–2 giờ (medium) |

> Không biết máy có card gì? Bấm `Ctrl+Shift+Esc` mở Task Manager → tab
> **Performance** → nhìn mục **GPU** ở cột trái.

## Bước 4 — Chạy

**Nháy đúp** vào `phien-am-video.bat`.

- Lần chạy đầu tiên, công cụ sẽ **tự tải model AI** (~1–3GB) — cần mạng, chỉ tải 1 lần.
- Script sẽ tự quét toàn bộ video trong thư mục (kể cả thư mục con), phiên âm từng
  file và lưu `.txt` vào `E:\raw` — **giữ nguyên cấu trúc thư mục** khóa học/chương/bài.
- **Có thể tắt máy giữa chừng thoải mái**: lần sau chạy lại, script tự bỏ qua các
  video đã làm xong, tiếp tục từ chỗ dở dang.
- Kho video nhiều thì cứ để máy chạy qua đêm.

## Bước 5 — Gửi kết quả cho Claude

Khi chạy xong (hoặc xong một phần):

1. Mở **drive.google.com**, vào thư mục **`hoc long`**.
2. Tạo thư mục con tên **`raw`**, rồi kéo-thả toàn bộ nội dung `E:\raw` vào đó
   (file txt rất nhẹ, tải lên nhanh).
3. Quay lại Claude và nhắn: *"đã tải txt lên drive rồi, làm wiki đi"*.

Claude sẽ đọc các file txt, sắp xếp vào thư mục `raw/` trong repo và **phân chia
kiến thức thành wiki** cho bạn.

---

## Câu hỏi thường gặp

**Chạy bị lỗi "Khong tim thay faster-whisper-xxl.exe"?**
→ File `.bat` chưa nằm cùng thư mục với `faster-whisper-xxl.exe` (xem Bước 2).

**Chạy bị lỗi "Khong tim thay thu muc video"?**
→ Sửa dòng `VIDEO_DIR` cho đúng đường dẫn thật (xem Bước 3). Mẹo: mở thư mục video
trong File Explorer, bấm vào thanh địa chỉ, copy nguyên đường dẫn.

**Muốn phiên âm lại 1 video (kết quả kém)?**
→ Xóa file `.txt` tương ứng trong `E:\raw` rồi chạy lại script.

**Máy quá yếu, chạy chậm quá?**
→ Đổi `MODEL` thành `small`. Chất lượng thấp hơn nhưng vẫn dùng được để làm wiki.

**Windows chặn không cho chạy file .bat?**
→ Nếu hiện cảnh báo "Windows protected your PC", bấm **More info** → **Run anyway**.
