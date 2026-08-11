# BỎ VIDEO CẦN EDIT VÀO ĐÂY

Chép video bạn đã quay vào đúng một trong hai thư mục con:

| Thư mục | Dùng cho |
|---|---|
| `video-ngan-9-16/` | Video quay **dọc** (điện thoại cầm đứng) — để đăng TikTok, Reels, Shorts |
| `video-dai-16-9/` | Video quay **ngang** — để đăng YouTube thường, Facebook |

**Không cần đặt tên theo quy tắc gì.** Nhưng nên đặt tên không dấu, không khoảng trắng cho chắc: `video-gioi-thieu.mp4` thay vì `Video giới thiệu.mp4`.

---

## Video như thế nào thì dùng được

✅ Có **tiếng người nói thật** — bộ này dựng quanh lời nói, không dùng cho video không tiếng
✅ Định dạng `.mp4` hoặc `.mov`
✅ Dài từ 30 giây đến khoảng 10 phút

⚠️ **Xuất từ CapCut thì kiểm đuôi video.** CapCut hay gắn thêm 2 giây logo ở cuối. Bước 0 (`soi`) sẽ bắt được, nhưng biết trước thì đỡ mất công.

---

## Thư mục `_du-an/` là gì

Chạy lần đầu xong, máy tự tạo thư mục `_du-an/<tên-video>/`. Trong đó có:

| Thứ | Là gì |
|---|---|
| `work/transcript-doc.txt` | Bản bóc lời dễ đọc — **đọc file này để tìm chỗ cắt và chỗ chèn hình** |
| `work/de-xuat-cat.json` | Nơi ghi chỗ cắt, chỗ chèn hình, chữ cần sửa, vùng cần mờ |
| `work/soi-video-tho/` | Ảnh trích từ video thô — soi logo lạ |
| `work/soi-ban-cuoi/` | Ảnh trích từ video thành phẩm — soi lỗi trước khi đăng |
| `work/broll/` | Ảnh/video minh hoạ đã tải về |

**Đừng xoá thư mục này** giữa các lần chạy — giữ lại thì dựng lại rất nhanh, khỏi bóc lời từ đầu.
Muốn đổi hình minh hoạ thì chỉ xoá riêng `work/broll/`.
