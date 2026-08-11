# 03 — QUY TRÌNH BỐN BƯỚC

> Trang quan trọng nhất. Claude đọc kỹ trang này trước khi chạy.

Mở cửa sổ đen, vào đúng thư mục bộ não, rồi gõ:
```
set PYTHONUTF8=1
```
⚠️ Thiếu dòng này là **sập ngay** khi gặp chữ có dấu tiếng Việt. Mỗi lần mở cửa sổ mới phải gõ lại.

---

## BƯỚC 0 — `soi` · soát logo lạ ở đầu và cuối

```
python cong-cu\edit_video_giaoduc.py soi video-tho\video-ngan-9-16\ten-video.mp4
```

Nó trích 7 khung hình (3 giây đầu + 3 giây cuối) ra ảnh trong `video-tho/_du-an/<tên>/work/soi-video-tho/`.

**Claude PHẢI mở từng ảnh ra xem.** Tìm: logo CapCut, logo TikTok, màn hình đen thừa, khung nhắm mắt.

> *Đã dính thật:* một video thô có **2 giây cuối là màn hình đen logo CapCut** (đuôi thừa từ lần xuất trước). Không ai để ý cho tới khi có bước này. Nền tảng bị cho là hạ thứ hạng video dính logo của nền tảng khác.

Thấy logo thì ghi mốc đó vào `khoang_lang` ở bước 2 để cắt bỏ.

---

## BƯỚC 1 — `transcribe` · bóc lời

```
python cong-cu\edit_video_giaoduc.py transcribe video-tho\video-ngan-9-16\ten-video.mp4
```

Ra ba file trong `work/`:
- `words.json` — mốc giây của **từng chữ một**
- `goc.srt` — phụ đề dạng chuẩn
- `transcript-doc.txt` — **bản dễ đọc, Claude đọc file này**

⏱ Video 2 phút mất khoảng 1–3 phút. Lần chạy đầu tiên trong đời máy sẽ lâu hơn nhiều (tải bộ nghe 1,5 GB).

---

## BƯỚC 2 — `dexuat` · máy tự dò chỗ cắt

```
python cong-cu\edit_video_giaoduc.py dexuat video-tho\video-ngan-9-16\ten-video.mp4
```

Máy tự tìm hai loại:
- **Khoảng lặng dài hơn 0,5 giây** — chừa lại 0,12 giây mỗi đầu cho tự nhiên
- **Tiếng đệm đứng riêng một mình**: à, ừ, ừm, ờ, ơ, ê, ừa, hửm

⚠️ Danh sách tiếng đệm **cố ý làm bảo thủ** — chỉ cắt từ đệm đứng độc lập, không đụng vào từ vừa là đệm vừa có nghĩa ("thì", "kiểu", "dạ"), để tránh cắt nhầm nội dung thật.

Ra file `work/de-xuat-cat.json`.

---

## BƯỚC 2B — PHẦN VIỆC TRÍ ÓC ⭐ (máy không làm thay được)

**Claude đọc `work/transcript-doc.txt` rồi tự điền bốn mục vào `work/de-xuat-cat.json`.**

### `lap_y` — đoạn nói lặp ý
Người nói nhắc lại đúng ý đã nói rồi (không phải nhấn mạnh có chủ đích) → cắt.
```json
"lap_y": [[38.0, 42.3, "nói lại y hệt câu ví dụ ở trên"]]
```

### `broll` — chèn ảnh/video minh hoạ
`[giây_đầu, giây_cuối, "từ khoá tiếng Anh", "video" hoặc "anh"]`
```json
"broll": [
 [12.1, 13.9, "cluttered messy desk stack of paperwork", "video"],
 [16.5, 18.5, "morning coffee cup laptop desk sunlight", "video"]
]
```
📖 Luật chọn hình ở `04-chon-hinh-minh-hoa.md` — **đọc trước khi chọn**.

### `sua_chu` — sửa chữ máy nghe nhầm ⭐
`[["chữ sai", "chữ đúng"], ...]`
```json
"sua_chu": [["tin lỗi", "tin nổi"], ["gia lô", "Zalo"]]
```

**Đây là mục dễ bị bỏ quên nhất mà lại hại nhất.** Máy bóc lời nghe nhầm rất nhiều tên riêng, và chữ sai đó **được đốt thẳng lên màn hình** cho khách đọc.

> *Đã dính thật:* một video có **7 lỗi** chạy suốt nhiều bản dựng mà không ai để ý. Nặng nhất: *"Thật không thể **tin lỗi**"* ở **giây 0** (chữ đầu tiên khách đọc), và *"điều khiển được **gia lô**"* ở giây 1,4 — **sai tên sản phẩm Zalo**.

⚠️ **Chỉ đổi chữ hiện lên, KHÔNG động vào tiếng nói.** Cấm dùng mục này để sửa Ý người nói.
👉 Cũng dùng mục này để **che tên người thật** trong phụ đề: `["Nguyễn Văn A", "[ẩn tên]"]`.

### `lam_mo` — che vùng riêng tư
`[giây_đầu, giây_cuối, x%, y%, rộng%, cao%, độ_mờ]`
```json
"lam_mo": [[50.5, 110.5, 0, 0, 100, 100, 14]]
```
Toạ độ theo **phần trăm khung hình**. `[0,0,100,100]` là mờ cả khung.

> *Đã dính thật:* một video demo lộ tên thật + mã tài khoản khách hàng. Soi 6 khung hình mới phát hiện nó hiện ở **ba chỗ khác nhau** và **trôi theo lúc cuộn trang**. Che bằng ô cố định là **chắc chắn sót** → phải mờ cả khung suốt đoạn đó.

### `nhan_manh` — để trống
Mục này của kiểu phóng to, hiện **đã tắt**. Xem mục 10 của `CLAUDE.md` để hiểu vì sao.

---

## BƯỚC 3 — `dung` · dựng ra video

```
python cong-cu\edit_video_giaoduc.py dung video-tho\video-ngan-9-16\ten-video.mp4 ^
   --nhac cong-cu\assets\nhac-video-ngan-2.mp3 ^
   --hook "DÒNG MỘT\nDÒNG HAI" ^
   --cta "CÂU CHỐT\nDÒNG HAI"
```

⚠️ **Chữ trong `--hook` và `--cta` là NỘI DUNG.** Claude không được tự bịa — lấy từ chủ não, hoặc bám sát bản bóc lời rồi **hỏi lại xác nhận**.

### Các nút vặn thêm

| Nút | Làm gì | Mặc định |
|---|---|---|
| `--toc-do` | Tua nhanh | 1.15 |
| `--cta-giay` | Câu chốt hiện mấy giây cuối | 3 |
| `--sang` | Độ sáng thêm | 0.045 |
| `--gamma` | Nâng vùng tối | 1.08 |
| `--net` | Mài nét | 0.85 |
| `--broll-kieu` | `toanman` hoặc `goc` | toanman |
| `--khong-nhac` | Bỏ nhạc, chỉ tiếng gốc | tắt |
| `--khong-tieng-dong` | Bỏ tiếng động chuyển cảnh | tắt |
| `--hook-nghieng` | Nghiêng hộp chữ, độ | 0 (thẳng) |

`--broll-kieu goc` thu nhỏ hình minh hoạ nằm góc trên, **vẫn thấy mặt người nói** — hợp khi cần giữ lòng tin.

---

## BƯỚC 4 — TỰ KIỂM ⭐ (bắt buộc, không được bỏ)

Chạy xong, script tự làm hai việc:

**1. Trích 7 khung hình** vào `work/soi-ban-cuoi/` — giây 0,0 · 0,6 · 1,8 · 35% · 62% · gần cuối · cuối.
**Claude PHẢI mở từng ảnh ra xem.** Soi: hook có che mặt không · phụ đề có tràn khung không · chữ có sai không · vùng riêng tư đã mờ kín chưa.
Khung **giây 0,0** đặc biệt quan trọng: nền tảng lấy đúng khung này làm **ảnh đại diện**.

**2. Đo độ to bằng số** — vì Claude không nghe được:
```
Video thành phẩm: trung bình -19.6 dB · to nhất -1.1 dB
Giọng nói -21.1 dB · nhạc nền -48.3 dB → cách nhau 27.2 dB
✔ Khoảng cách giọng/nhạc nằm trong vùng hợp lý
```
Nhạc nên thấp hơn giọng **18–25 dB**. Đỉnh nên dưới **−1 dB** cho khỏi rè.

⚠️ **Mốc tự soi mặc định không rơi đúng chỗ chèn hình minh hoạ.** Muốn kiểm hình thì trích riêng:
```
ffmpeg -y -ss 10.8 -i video-ra\<thang>\<ten>-giaoduc.mp4 -frames:v 1 xem.png
```

---

## Chạy lại lần hai cho nhanh

Sửa vài chữ rồi dựng lại thì **chỉ chạy lại bước 3**. Bước 1 và 2 giữ nguyên kết quả cũ.
Muốn đổi hình minh hoạ thì xoá thư mục `work/broll/` để nó tải lại.
