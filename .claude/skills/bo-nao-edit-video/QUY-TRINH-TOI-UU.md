# QUY TRÌNH LÀM VIDEO — BẢN TỐI ƯU

> Bản này **cộng thêm** vào `CLAUDE.md`, không thay thế. Mọi luật trong `CLAUDE.md` vẫn giữ nguyên:
> năm điều cấm, luật tự kiểm hai chốt, bảng thông số cấm tự đổi.
>
> Viết lại ngày 13/08/2026 sau khi chạy thật và rút được kinh nghiệm.

---

## 1. CHỌN ĐƯỜNG TRƯỚC — hai đường, đừng lẫn

| | **ĐƯỜNG A — có video quay sẵn** | **ĐƯỜNG B — chưa có video** |
|---|---|---|
| Khi nào dùng | Đã quay người thật nói | Chỉ có ý tưởng, chưa quay |
| Giọng | Giọng thật trong video | Giọng Cartesia "Bảo Gấu Bông" |
| Hình | Cắt từ video quay được | Cảnh quay thật làm nền + nền tự tạo |
| Mạnh ở chỗ | Miệng khớp lời, thật, tin được | Làm được ngay, không cần quay |
| Yếu ở chỗ | Phải quay, phải quay lại nếu sai lời | Miệng không khớp nếu đè lên mặt người |

👉 **Đường A luôn tốt hơn nếu có điều kiện.** Giọng thật của người bán chốt đơn tốt hơn giọng máy.
Đường B là để chạy nhanh, hoặc khi chưa kịp quay.

---

## 2. CHUẨN BỊ — làm một lần, dùng mãi

| Thứ | Trạng thái | Ghi chú |
|---|---|---|
| ffmpeg | ✅ đã có | Bộ đồ nghề cắt ghép |
| Pillow | ✅ đã có | Vẽ chữ lên hình |
| faster-whisper | ✅ đã cài | Máy bóc lời. Cài được nhờ đã mở mạng |
| Chìa Pexels | ✅ đã có | Trong `chia-khoa.txt`, đã chặn khỏi git |
| Chìa Cartesia | ✅ đã có | Giọng "Bảo Gấu Bông", mã `d09b4820-779f-4518-a4a7-cdedcda828a4` |
| Mạng ra ngoài | ✅ đã mở | `api.cartesia.ai`, `api.pexels.com` |

⚠️ **Mẫu giọng bắt buộc là `sonic-3`.** Đã thử `sonic-2`, `sonic-turbo`, `sonic` — cả ba đều từ chối
tiếng Việt, báo *"The language is not supported by this model"*.

---

## 3. SÁU BƯỚC — ĐƯỜNG A (có video quay sẵn)

### Bước 1 — Soi video thô ⏱ 1 phút
```
python cong-cu\edit_video_giaoduc.py soi <video.mp4>
```
Mở từng ảnh ra xem. Tìm logo CapCut, màn hình đen thừa, khung nhắm mắt.

⚠️ **Video quay màn hình thì soi kỹ gấp đôi.** Quay màn hình quản lý quảng cáo hay lộ mã tài khoản,
số tiền đã chi, số điện thoại khách. Đây là Điều cấm số 5, đã dính thật một lần.

### Bước 2 — Bóc lời ⏱ 1–3 phút cho video 2 phút
```
python cong-cu\edit_video_giaoduc.py transcribe <video.mp4>
```
Ra `work/transcript-doc.txt`. **Đọc file này**, đây là nguyên liệu để nghĩ.

### Bước 3 — Máy dò chỗ cắt ⏱ 10 giây
```
python cong-cu\edit_video_giaoduc.py dexuat <video.mp4>
```

### Bước 4 — PHẦN VIỆC TRÍ ÓC ⭐ máy không làm thay được
Đọc bản bóc lời rồi điền 4 mục vào `work/de-xuat-cat.json`: `lap_y` · `broll` · `sua_chu` · `lam_mo`.

**Trước khi viết chữ nào, đọc `.claude/skills/ho-so-khach-hang/SKILL.md`** — chọn nỗi đau, lấy đúng
câu chữ đã chứng minh có sức nặng, kiểm con số nào được phép nói.

### Bước 5 — Dựng ⏱ 4 phút
```
python cong-cu\edit_video_giaoduc.py dung <video.mp4> ^
   --nhac cong-cu\assets\nhac-video-ngan-2.mp3 ^
   --hook "DÒNG 1\nDÒNG 2" --cta "CÂU CHỐT"
```

### Bước 6 — Tự kiểm hai chốt ⏱ 3 phút — **KHÔNG ĐƯỢC BỎ**
Soi ảnh bằng mắt + đo tiếng bằng số. Chi tiết ở mục 6 bên dưới.

---

## 4. SÁU BƯỚC — ĐƯỜNG B (chưa có video)

### Bước 1 — Đọc hồ sơ, chọn MỘT nỗi đau ⏱ 5 phút
Mở `.claude/skills/ho-so-khach-hang/SKILL.md`. Bảy nhóm nỗi đau đã xếp sẵn theo mức nguy hiểm.
**Mỗi video chỉ đánh một nỗi đau.**

### Bước 2 — Viết kịch bản theo cảnh ⏱ 10 phút
Mỗi cảnh một câu nói, một chữ to. Điền vào bảng `CANH` trong bộ dựng:
```
(giay_dau, giay_cuoi, "NHÃN NHỎ", "CHỮ TO", "lời đọc", "kiểu nền")
```
Kiểu nền: `hook` · `dau` (nỗi đau) · `hieu` (bước ngoặt) · `giai` (giải pháp) · `cta`.

⚠️ Mốc giây lúc này cứ điền tạm, bước 4 sẽ tính lại theo giọng thật.

### Bước 3 — Đọc lời bằng giọng Cartesia ⏱ 2 phút
Gọi `api.cartesia.ai/tts/bytes`, mẫu `sonic-3`, giọng `d09b4820-...`, ngôn ngữ `vi`.
Đọc **từng câu ra một file riêng**, đừng đọc cả bài một lần — để còn cắt cảnh theo câu.

### Bước 4 — Cắt khoảng lặng rồi TÍNH LẠI MỐC GIÂY ⭐ ⏱ 1 phút
```
silenceremove=start_periods=1:start_silence=0.12:start_threshold=-45dB:
              stop_periods=-1:stop_silence=0.12:stop_threshold=-45dB
```
Rồi: **độ dài cảnh = độ dài câu nói + 0,32 giây**, tối thiểu 2,0 giây.

👉 **Đây là chỗ quan trọng nhất của đường B.** Lần đầu em kẻ lưới cố định 2,8 giây mỗi cảnh rồi ép
giọng vào — nghe cụt và gượng. Làm ngược lại thì mượt hẳn: **hình chạy theo lời, không phải lời chạy
theo hình.** Đúng tinh thần bộ não.

### Bước 5 — Chuẩn bị nền cảnh ⏱ 5 phút
Đặt tên file theo số cảnh: `canh-03.mp4`, `canh-08.mp4`… Cảnh nào không có file thì tự dùng màu
thương hiệu, không lỗi.

Thứ tự ưu tiên nguồn nền:
1. **Cảnh quay thật ở xưởng** — tốt nhất, chứng minh đúng điều đang nói
2. Cảnh quay người thật nói — thêm chữ `mo` ở cuối lệnh nếu lồng giọng khác, để giấu khẩu hình
3. Kho ảnh Pexels — nhớ ba luật chọn hình ở `huong-dan/04`
4. Nền động tự tạo bằng ffmpeg — dùng khi không có gì khác

### Bước 6 — Dựng và trộn tiếng ⏱ 3 phút
```
python dung-video.py <file-ra.mp4> <thu-muc-canh> [mo]
```
Trộn tiếng: giọng + nhạc + tiếng động. **Nhạc phải thấp hơn giọng 18–25 dB** — tính bằng công thức,
đừng vặn tay:
```
mức_nhạc = 10 ^ ((độ_to_giọng − 21 − độ_to_nhạc_gốc) / 20)
```
Rồi chuẩn hoá cả bản trộn về `loudnorm=I=-14:TP=-1.5`.

---

## 5. THỜI GIAN THẬT — đo được, không phải đoán

| Việc | Mất bao lâu |
|---|---|
| Đọc giọng Cartesia 13 câu | ~90 giây |
| Vẽ hình video 40 giây | ~110 giây |
| Trộn tiếng + ghép | ~20 giây |
| Soi ảnh tự kiểm | ~60 giây |
| **Tổng một video 40 giây** | **khoảng 5 phút máy chạy** |

⚠️ Bộ vẽ hình hiện mất **2,8 giây cho mỗi 1 giây video**. Video 30 phút sẽ mất 84 phút — không dùng được.
Đang nâng cấp: bóc lời video dài, cắt nhanh bằng ffmpeg thuần, và tăng tốc bộ vẽ chữ.

---

## 6. TỰ KIỂM — mười hai dòng, soi đủ mới được đăng

**Chốt 1 — soi bằng mắt.** Trích khung hình rồi **mở từng ảnh ra xem**:

| # | Soi gì | Đạt khi nào |
|---|---|---|
| 1 | Lộ tên thật, số điện thoại, mã tài khoản khách | Cuộn hết đoạn quay màn hình không đọc ra chữ nào của khách |
| 2 | Người nói có đọc tên khách ra miệng | Cả video không nghe thấy tên riêng nào |
| 3 | Chữ ở giây 0, nhất là chữ hiện ngay giây 0,0 | Không sai chính tả ngay câu mở đầu |
| 4 | Tên thương hiệu trong phụ đề | Zalo, VAT, Bảo Gấu Bông viết đúng từng chữ |
| 5 | Khung giây 0,0 — nền tảng lấy làm ảnh đại diện | Thấy rõ chủ thể, chữ tiêu đề không che mặt |
| 6 | Ba giây đầu và ba giây cuối | Không logo CapCut, không màn hình đen thừa |
| 7 | Chữ có tràn mép khung | Mọi dòng nằm gọn, còn chừa lề |
| 8 | Hình minh hoạ có mặt người lạ cận cảnh | Chỉ đồ vật, bàn tay, khung cảnh |
| 9 | Hình có che đoạn quay màn hình | Đoạn trình bằng chứng hiện nguyên vẹn |
| 10 | Hình có lộ cảnh nước ngoài | Biển hiệu, đường phố nhìn ra là Việt Nam |
| 11 | Tên thương hiệu góc trên trên nền sáng | Có nền lót, đọc rõ |
| 12 | Câu chốt cuối | Bám đúng lời người nói, chỉ bảo khách làm MỘT việc |

**Chốt 2 — đo bằng số.** Ba con số phải đạt:

| Đo | Ngưỡng |
|---|---|
| Giọng cách nhạc | **18–25 dB** |
| Đỉnh to nhất | **dưới −1 dB** (nhớ chừa hở, khâu nén AAC làm vọt lên ~0,5 dB) |
| Trung bình | quanh **−14 dB** |

---

## 7. NHỮNG BẪY ĐÃ DÍNH THẬT TRONG PHIÊN NÀY

| Bẫy | Dấu hiệu | Cách tránh |
|---|---|---|
| **Ảnh tĩnh lặp vô tận** | ffmpeg chạy 607 giây không dứt | Ảnh tĩnh dùng `-loop 1 -framerate`, KHÔNG dùng `-stream_loop -1`. Với ảnh tĩnh thì `-t` vô tác dụng vì mốc thời gian không tiến |
| **Khung giây 0,0 trống trơn** | Ảnh đại diện chỉ có nền, chữ đang mờ dần vào | Cảnh đầu phải hiện đủ ngay từ khung 0 |
| **Đo một chuỗi, vẽ chuỗi khác** | Chữ tràn cụt hai đầu | Đo đúng chuỗi sắp vẽ. Chuỗi giãn cách rộng hơn chuỗi gốc nhiều |
| **Giãn dòng quá chặt** | Dấu Ử, Ấ, Ộ bị cắt | Chữ to giãn dòng 1,42, không phải 1,22 |
| **Chữ chìm trên nền sáng** | Tên thương hiệu mất hút | Đè lên cảnh quay thật thì phải có nền lót |
| **Đỉnh tiếng chạm trần** | Rè trên loa điện thoại | Chuẩn hoá về −2,5 dB trước khi nén AAC |
| **Đường dẫn sai âm thầm** | Dùng nhầm tiếng động máy tự chế | Hàm bỏ qua cái gì phải in ra dòng báo |

---

## 8. BA THỨ LÀM VIDEO MẠNH LÊN NGAY

1. **Quay 30 giây tư liệu ở xưởng** — máy may chạy, kim thêu trên logo, gấu xếp thùng, chất lên xe.
   Cảnh thật chứng minh đúng câu "xưởng sản xuất trực tiếp". Quay dọc cho khỏi cắt.
2. **Quay người thật đọc đúng lời thoại** — miệng khớp răm rắp, khỏi cần giọng máy.
3. **Cho số thật** — bao nhiêu ngày sản xuất, số lượng tối thiểu. Con số cụ thể thuyết phục hơn lời hứa chung.
