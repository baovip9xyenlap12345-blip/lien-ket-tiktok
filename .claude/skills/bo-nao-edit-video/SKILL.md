---
name: bo-nao-edit-video
description: Bộ não edit video ngắn của anh Hoàn — nạp một video thô (người thật nói) ra một video sẵn đăng TikTok/Reels/Shorts/YouTube. Dùng khi cần dựng/edit video, cắt khoảng lặng và tiếng đệm ("à", "ừm"), cắt đoạn nói lặp ý, bóc lời ra chữ, làm phụ đề chữ nảy, viết chữ hook 3 giây đầu, viết câu chốt cuối (CTA), chèn hình minh hoạ b-roll từ Pexels/Pixabay/Unsplash, làm mờ che thông tin riêng tư của khách, chèn nhạc nền, làm sáng làm nét video, hoặc chạy công cụ edit_video_giaoduc.py với bốn bước soi/transcribe/dexuat/dung. Agent "hoan-editer" là người vận hành bộ này.
---

# BỘ NÃO EDIT VIDEO

> **Đọc `CLAUDE.md` trong thư mục này TRƯỚC TIÊN — đó là file luật, đọc trước khi làm bất cứ việc gì.**
> Muốn giao trọn việc thì gọi agent **`hoan-editer`**, nó đã thuộc toàn bộ luật của bộ này.

## Đọc file nào, khi nào

| Cần gì | Mở file |
|---|---|
| **Luật bắt buộc — đọc đầu tiên** | `CLAUDE.md` |
| **Quy trình tối ưu — hai đường A/B, thời gian thật, bẫy đã dính** | `QUY-TRINH-TOI-UU.md` |
| **Chạy ngay trên máy tính của anh Hoàn (Windows)** | `CHAY-TREN-MAY-TINH.md` |
| Chọn nỗi đau, câu chữ, số liệu được phép nói | `.claude/skills/ho-so-khach-hang/` |
| Người mới, chưa biết bộ này là gì | `BAT-DAU-TU-DAY.md` |
| Cài Python, ffmpeg, máy bóc lời | `huong-dan/01-cai-dat-may.md` |
| Lấy chìa khoá 3 kho ảnh miễn phí | `huong-dan/02-lay-chia-khoa.md` |
| **Quy trình chính — đọc kỹ nhất** | `huong-dan/03-quy-trinh-4-buoc.md` |
| Luật chọn hình minh hoạ | `huong-dan/04-chon-hinh-minh-hoa.md` |
| Máy treo, chữ sai, lộ thông tin | `huong-dan/05-loi-thuong-gap.md` |
| Số liệu thật của một video đã dựng | `huong-dan/06-vi-du-mau.md` |

## Bốn bước, chạy tuần tự

```
set PYTHONUTF8=1

python cong-cu\edit_video_giaoduc.py soi        video-tho\video-ngan-9-16\ten.mp4
python cong-cu\edit_video_giaoduc.py transcribe video-tho\video-ngan-9-16\ten.mp4
python cong-cu\edit_video_giaoduc.py dexuat     video-tho\video-ngan-9-16\ten.mp4
python cong-cu\edit_video_giaoduc.py dung       video-tho\video-ngan-9-16\ten.mp4 ^
        --nhac cong-cu\assets\nhac-video-ngan-2.mp3 ^
        --hook "DÒNG 1\nDÒNG 2" --cta "CÂU CHỐT\nDÒNG 2"
```

Giữa bước `dexuat` và bước `dung` là **phần việc trí óc**, máy không làm thay được: đọc
`work/transcript-doc.txt` rồi điền `lap_y`, `broll`, `sua_chu`, `lam_mo` vào `work/de-xuat-cat.json`.

## Chìa khoá kho ảnh nằm ở đâu

⚠️ **Repo này đang để CÔNG KHAI** nên `chia-khoa.txt` đã bị chặn khỏi git (xem `.gitignore` ở gốc repo).
Chìa thật chỉ nằm trên máy anh Hoàn, không bao giờ đẩy lên GitHub.

| File | Vai trò |
|---|---|
| `chia-khoa.mau.txt` | Bản mẫu trống, có trong git. Máy mới thì **chép file này thành `chia-khoa.txt`** rồi dán chìa vào |
| `chia-khoa.txt` | Chìa thật. **Git không đụng đến** — nằm ngoài repo về mặt theo dõi |

Công cụ tìm chìa theo thứ tự: **biến môi trường trước, file sau**. Nên cách an toàn nhất là đặt
biến môi trường `PEXELS_KEY`, khỏi cần file nào cả:
```
setx PEXELS_KEY dãy-chìa-của-anh
```
(đặt xong phải **mở lại cửa sổ đen** thì máy mới nhận)

## Ba điều nhớ nhất

1. **Chữ hook và câu chốt cuối là NỘI DUNG** — lấy từ anh Hoàn, cấm tự bịa.
2. **Không xem được video, không nghe được gì** — bắt buộc trích khung hình ra ảnh soi bằng mắt, và đo âm lượng bằng số.
3. **Chưa soi vùng riêng tư thì chưa được coi là xong** — lộ tên thật, số điện thoại, mã tài khoản là hỏng cả video.
