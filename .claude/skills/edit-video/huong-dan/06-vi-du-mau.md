# 06 — VÍ DỤ MẪU: MỘT VIDEO THẬT TỪ ĐẦU ĐẾN CUỐI

> Đây là số liệu **thật** của một video đã dựng xong. Để bạn hình dung đầu vào đầu ra ra sao.

---

## Đầu vào

Một video quay dọc bằng điện thoại, người nói giới thiệu một công cụ chăm sóc khách hàng.
**Dài 148,2 giây.** Nói tự nhiên, có nhiều đoạn ngập ngừng, có đoạn quay màn hình để trình bằng chứng.

## Đầu ra

**Dài 99,7 giây** — gọn hơn **48,5 giây (giảm 33%)**.

| Việc | Kết quả |
|---|---|
| Đoạn cắt bỏ | 20 đoạn, tổng 33,5 giây |
| Tua nhanh | 1,15 lần |
| Hình minh hoạ chèn | 9 chỗ |
| Chữ phụ đề sửa lại | 7 lỗi máy nghe nhầm |
| Vùng làm mờ | 43 giây (đoạn quay màn hình lộ dữ liệu khách) |
| Giọng / nhạc | cách nhau 27,2 dB — hợp lý |

---

## File `de-xuat-cat.json` đã điền — mẫu thật

```json
{
 "tu_dong": {
   "khoang_lang": [[19.8, 24.9], [27.5, 31.4], [145.5, 148.3]],
   "tu_dem": []
 },

 "lap_y": [
   [38.0, 42.3, "nói lại y hệt câu ví dụ vừa nói ở trên"]
 ],

 "broll": [
   [6.8,   8.8, "hands typing message on smartphone bright screen", "video"],
   [12.1, 13.9, "cluttered messy desk stack of paperwork",          "video"],
   [16.5, 18.5, "morning coffee cup laptop desk sunlight",          "video"],
   [25.5, 27.5, "notebook checklist pen writing list",              "video"],
   [33.6, 36.2, "parcel boxes online order delivery",               "video"],
   [45.9, 48.1, "magnifying glass over documents on desk",          "anh"],
   [113.5, 115.8, "vietnam hanoi street motorbikes traffic crowd",  "video"],
   [121.7, 124.0, "hand holding phone chat messages",               "anh"],
   [140.2, 143.5, "hourglass sand flowing time",                    "video"]
 ],

 "sua_chu": [
   ["tin lỗi",    "tin nổi"],
   ["gia lô",     "Zalo"],
   ["Hoàng ơi",   "Hoàn ơi"],
   ["hàng tráng", "hàng trăm"],
   ["tức dậy",    "thức dậy"],
   ["gắn nhắn",   "nhắn tin"],
   ["hành trì",   "hành động"],
   ["Nguyễn Văn A", "[ẩn tên]"]
 ],

 "lam_mo": [[50.5, 110.5, 0, 0, 100, 100, 14]],

 "nhan_manh": []
}
```

---

## Đọc kỹ mấy chỗ này

**Mục `broll` — để ý chỗ TRỐNG từ giây 48 đến 113.**
Đó **không phải quên**. Đoạn đó là người nói đang quay màn hình trình bằng chứng — **vùng cấm chèn hình** (Luật 2).

**Mục `sua_chu` — hai dòng đầu là hai lỗi nặng nhất.**
`tin lỗi → tin nổi` nằm ở **giây 0**, là chữ đầu tiên khách đọc. `gia lô → Zalo` ở giây 1,4, **sai tên sản phẩm**.

**Dòng cuối `Nguyễn Văn A → [ẩn tên]` là che tên khách thật**, không phải sửa lỗi nghe nhầm.

**Mục `lam_mo` mờ CẢ KHUNG suốt 60 giây.**
Nghe có vẻ quá tay, nhưng tên khách và mã tài khoản hiện ở **ba chỗ** và **trôi theo lúc cuộn trang** — ô cố định là chắc chắn sót.

⚠️ Cái giá phải trả: đoạn trình bằng chứng dài 43 giây giờ chỉ còn tờ giấy nhoè — gần **nửa video**. Đây chính là lý do lời khuyên tốt nhất là **quay lại đoạn demo với khách hàng giả/mẫu**.

---

## Lệnh dựng đã dùng

```
set PYTHONUTF8=1
python cong-cu\edit_video_giaoduc.py dung video-tho\video-ngan-9-16\ten.mp4 ^
   --nhac cong-cu\assets\nhac-video-ngan-2.mp3 ^
   --hook "CHĂM 10.000 KHÁCH\nKHÔNG SÓT AI" ^
   --cta "LINK NHÓM ZALO Ở DƯỚI\nTHAM GIA NGAY"
```

**Câu chốt cuối bám nguyên văn lời người nói** ở giây 130–136: *"ở trong cái nhóm Zalo của tôi, ở bên dưới đường link… Tham gia ngay"*.

> ⚠️ Trước đó từng soạn câu *"Comment CROSS để mình gửi link"* — **sai hoàn toàn**, vì trong video người ta nói link để sẵn bên dưới, không hề bảo khách bình luận.
> **Bài học:** soạn câu chốt phải mở bản bóc lời ra đọc, đừng soạn theo cảm tính.
