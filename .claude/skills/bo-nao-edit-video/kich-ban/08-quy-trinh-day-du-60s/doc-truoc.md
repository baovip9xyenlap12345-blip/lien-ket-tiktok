# VIDEO 08 — QUY TRÌNH ĐẦY ĐỦ (57 giây)

Dựng ngày 14/08/2026 theo yêu cầu của chủ doanh nghiệp: gộp **quy trình bán hàng** và
**11 công đoạn sản xuất** vào một video dọc khoảng 60 giây.

| Thứ | Số đo |
|---|---|
| File | `quy-trinh-day-du-60s-9x16.mp4` |
| Khung hình | 1080 × 1920, 30 hình/giây |
| Dài | 48,8 giây |
| Nặng | 22,6 MB |
| Số cảnh | 17 (1 bìa + 4 bước bán hàng + 11 công đoạn + 1 câu chốt) |
| Tiếng trung bình | −16,4 dB · đỉnh −1,3 dB (dưới trần, không rè) |
| Nhạc thấp hơn giọng | 21 dB (luật bộ não: 18–25 dB) |
| Giọng đọc | Cartesia, giọng "Bảo Gấu Bông", mẫu `sonic-3`, tốc độ **1,10 lần** |

## Chạy lại

```
export CARTESIA_API_KEY=<chìa giọng nói>
python3 cong-cu/lam_video.py kich-ban/08-quy-trinh-day-du-60s/bang.json <thư-mục-ra>
```

Bảng phân cảnh **cố ý không khai `hinh`** ở cảnh nào cả — mọi hình nền đã được chọn tay và
đặt sẵn vào thư mục `canh/` với tên `canh-01.mp4`, `canh-03.jpg`… Làm vậy để soi mắt từng
hình **trước khi** dựng, đúng Điều cấm số 2 (cấm hình có mặt người cận cảnh).

## Hình nền lấy ở đâu

| Cảnh | Nội dung | Nguồn |
|---|---|---|
| 1 | ẢNH BÌA — dải vàng chữ đen + dải xanh chữ trắng | **Ảnh thật** — gấu áo VNPT HEART |
| 2 | Tiếp nhận logo | Pexels — gõ máy tính |
| 3 | Lên mẫu demo | **Ảnh thật của xưởng** — gấu BlueSky trên tay |
| 4 | Báo giá | Pexels — giấy tờ, máy tính bỏ túi |
| 5 | Vào xưởng | Pexels — nhà xưởng dệt |
| 6 | Chọn vải | Pexels — cuộn vải trong giỏ |
| 7 | Vẽ sơ đồ | Pexels — tay vẽ trên giấy |
| 8 | Thêu logo | Pexels — tường chỉ nhiều màu |
| 9 | May thân gấu | Pexels — máy may cận cảnh |
| 10 | Kiểm đường may | Pexels — tay giữ vải trên máy may |
| 11 | Phụt bông | Pexels — bông trắng trên tay |
| 12 | Gắn mắt mũi | **Ảnh thật** — mặt gấu cận cảnh |
| 13 | In lên áo | **Video thật của xưởng** — máy ép nhiệt |
| 14 | Mặc áo cho gấu | **Video thật của xưởng** — ngồi mặc từng con |
| 15 | Kiểm lần cuối | **Ảnh thật** — gấu áo Angels House trên tay |
| 16 | Đóng hàng | **Ảnh thật** — gấu xếp trong túi |
| 17 | Câu chốt | **Video thật** — gấu áo hồng thành phẩm |

**8 trên 17 cảnh là hình thật của xưởng.** Cảnh Pexels chỉ dùng cho công đoạn chưa có tư liệu quay.

## Còn thiếu gì

Muốn thay hết cảnh Pexels bằng cảnh thật thì cần quay bổ sung, mỗi thứ 10–15 giây, quay dọc:
chọn vải · vẽ sơ đồ cắt · máy thêu chạy trên logo · máy may · kiểm đường may · máy phụt bông.
Có sáu đoạn đó là video này thành 100% cảnh xưởng nhà.
