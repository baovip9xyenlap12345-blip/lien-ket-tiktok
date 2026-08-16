# BÀN GIAO TOÀN BỘ — HỆ THỐNG LÀM VIDEO BẢO GẤU BÔNG

> **Đọc file này đầu tiên.** Đây là bản gom hết mọi thứ đã làm, đã chốt, đã dính lỗi.
> Đọc xong file này là làm việc được ngay, không cần xem lại cuộc trò chuyện cũ.
>
> Nhánh chứa toàn bộ: `claude/image-video-api-ubkm1l`
> Cập nhật: 16/08/2026

---

## PHẦN 0 — DÁN CÂU NÀY VÀO PHIÊN LÀM VIỆC MỚI

Mở Claude ở chỗ khác (máy tính, tab mới, người khác), **dán nguyên câu này**:

```
Đọc file BAN-GIAO-TOAN-BO.md ở gốc kho, rồi đọc tiếp:
  .claude/skills/bo-nao-edit-video/CLAUDE.md
  .claude/skills/bo-nao-edit-video/QUY-TRINH-TOI-UU.md
  .claude/skills/ho-so-khach-hang/SKILL.md
Đọc xong thì tóm tắt lại cho tôi 3 điều: luật ảnh bìa, bố cục khung dọc,
và nhịp video đang chạy. Rồi chờ tôi giao việc.
```

Nó đọc xong là biết hết mọi thứ trong file này.

---

## PHẦN 1 — HỆ THỐNG NÀY LÀM ĐƯỢC GÌ

Nạp **một bảng phân cảnh** (file `bang.json`) → ra **một video dọc 9:16 sẵn đăng**, đã có:

- Giọng đọc tiếng Việt thật (không phải giọng máy)
- Hình nền là ảnh/video thật của xưởng, hoặc hình minh hoạ tải từ kho miễn phí
- Ảnh bìa gây chú ý, chữ hiện trên màn hình, phụ đề
- Nhạc nền đã cân âm lượng, tiếng động ở chỗ đổi cảnh
- Tự trích khung hình ra ảnh để soi, tự đo âm lượng bằng số

**Một lệnh duy nhất:**
```
python3 cong-cu/lam_video.py <bang.json> <thư-mục-ra>
```
Trên Windows: **kéo `bang.json` thả vào `lam-video.bat`**.

---

## PHẦN 2 — CHÌA KHOÁ

| Chìa | Dùng để | Lấy ở đâu |
|---|---|---|
| `PEXELS_KEY` | Tải ảnh/video minh hoạ miễn phí | pexels.com/api |
| `CARTESIA_KEY` | Giọng đọc tiếng Việt | play.cartesia.ai → API Keys |

**Dán vào file** `.claude/skills/bo-nao-edit-video/chia-khoa.txt`
(file này **đã bị chặn khỏi GitHub**, chìa không bao giờ lên mạng công khai)

⚠️ **Ba điều về giọng đọc, đừng mò lại:**
1. **Chỉ mẫu `sonic-3` đọc được tiếng Việt.** `sonic`, `sonic-2`, `sonic-turbo` đều từ chối
   với câu *"The language is not supported by this model"*.
2. Mã giọng đang dùng: `929e69c2-c9ab-481a-bffb-cd16565f867c` (giọng "Bảo Gấu Bông")
3. Gọi vào `POST https://api.cartesia.ai/tts/bytes`, kèm hai dòng đầu:
   `X-API-Key` và `Cartesia-Version: 2024-11-13`

---

## PHẦN 3 — BA LUẬT CHỦ DOANH NGHIỆP ĐÃ CHỐT ⭐

Ba luật này **ghi đè** mọi hướng dẫn cũ. Máy đã cắm sẵn, chạy là tự có.

### 3.1 ẢNH BÌA — mọi video dọc đều phải có

Chủ doanh nghiệp gửi ảnh mẫu một video đang chạy tốt và chốt:

| Thứ | Bắt buộc |
|---|---|
| Nền bìa | **một khung hình ĐẸP lấy từ chính video** — không phải nền màu trơn |
| Dải chữ 1 | nền **VÀNG** `(255,193,7)`, chữ **ĐEN** `(16,16,16)` |
| Dải chữ 2 (ngay dưới) | nền **XANH DƯƠNG** `(32,130,245)`, chữ **TRẮNG** |
| Font cả hai dải | **Anton** |
| Nội dung chữ | **câu HOOK gây chú ý** |
| Thời lượng | **2–3 giây** ở đầu video |
| Vị trí dải | bắt đầu 50,5% chiều cao, mỗi dải cao 14% |

Viết trong bảng phân cảnh — **dòng 1 vào dải vàng, dòng 2 vào dải xanh**:
```json
{"to":"1 CON GẤU QUA 11 CÔNG ĐOẠN\nXEM XƯỞNG LÀM TRỰC TIẾP", "nhan":"", "kieu":"bia",
 "loi":"Gấu bông in logo, làm qua mười một công đoạn."}
```

⚠️ **Bốn điều dễ sai:**
1. **Lời cảnh bìa phải NGẮN, dưới 2,7 giây đọc.** Máy chặn cứng cảnh bìa ở 3,0 giây.
2. **Cảnh bìa KHÔNG khai `hinh`** — hình nền bìa chọn tay, đặt vào `canh/canh-01.jpg`.
   Khai từ khoá hình thì máy tải ảnh người lạ về làm bìa.
3. **Chọn khung có chủ thể ở NỬA TRÊN** — hai dải chữ ăn từ 50% xuống 78% chiều cao.
4. Cảnh bìa **phải hiện đủ chữ ngay từ khung 0,0** — nền tảng lấy khung đó làm ảnh đại diện.

### 3.2 BỐ CỤC KHUNG DỌC — chữ ở hai đầu, giữa để trống

Nguyên văn: *"video hiện chữ lên nhiều quá... chữ sẽ nằm ở góc trên và góc dưới màn hình,
hình ảnh video nhìn rõ ảnh sản phẩm"*.

```
┌──────────────────────┐
│ BẢO GẤU BÔNG         │  ← tên thương hiệu
│   NHÃN NHỎ           │
│   CHỮ TO             │  ← cỡ 118 (trước là 150)
│   ────────           │  ← gạch chân vàng
│                      │
│    SẢN PHẨM          │  ← KHÚC GIỮA ĐỂ TRỐNG HẲN
│    HIỆN RÕ           │     màn tối chỉ còn 25/255
│                      │
│  ┌────────────────┐  │
│  │  phụ đề ở đáy  │  │
│  └────────────────┘  │
│▓▓▓▓▓░░░░░░░░░░░░░░░░│  ← thanh tiến độ
└──────────────────────┘
```

Ba thứ kèm theo, đều đúc từ lỗi soi ảnh thấy thật:
1. **Màn tối đảo ngược** — đậm ở hai đầu (165 và 170), gần trong suốt ở giữa (25).
2. **Chữ phải có viền tối** — khoảng giữa sáng lên thì chữ ở đỉnh dễ chìm mất.
   Viền 4 điểm ảnh cho chữ to, 3 cho nhãn và phụ đề, chỉ bật khi đè lên cảnh thật.
3. **Hộp nền phụ đề mờ dần CÙNG chữ** — trước hộp hiện trước, ra một dải tối trống trơn.

⚠️ Luật này **ghi đè** dòng *"phụ đề ở 58-64% chiều cao"* trong `CLAUDE.md`.

### 3.3 NHỊP VIDEO — đọc 1,1 lần, cảnh chuyển nhanh

Nguyên văn: *"tốc độ đọc tăng lên 1.1 và tỷ lệ chuyển cảnh nhanh hơn, tôi thấy giọng tôi
và cảnh đi hơi chậm"*.

| Ở đâu | Tên | Nay | Trước |
|---|---|---|---|
| `cong-cu/lam_video.py` | `TOC_DO_DOC` | **1,10** | 1,00 |
| | `NGHI_CUOI_CAU` | 0,14 giây | 0,32 |
| | `CANH_NGAN_NHAT` | 1,60 giây | 2,00 |
| | `LECH_GIONG` | 0,08 giây | 0,16 |
| | `BIA_DAI_NHAT` | 3,00 giây | — |
| `03-.../dung-video.py` | `HIEN_CHU_TO` | 0,22 giây | 0,35 |
| | `HIEN_GACH` | 0,34 giây | 0,55 |
| | `HIEN_PHU_DE` | 0,18 giây | 0,30 |

⚠️ Tăng tốc giọng **bắt buộc dùng `atempo`** — giữ nguyên cao độ. Đổi tần số lấy mẫu thì
giọng the như chuột. Và phải **cắt khoảng lặng TRƯỚC, tăng tốc SAU**.

⚠️ **Nhịp nhanh làm video ngắn đi** (57 → 48,8 giây trên cùng một kịch bản). Muốn giữ đủ
độ dài thì **thêm cảnh**, tuyệt đối không kéo dài cảnh cũ.

---

## PHẦN 4 — MỞ FILE NÀO, KHI NÀO

### Luật và quy trình
| Cần gì | Mở file |
|---|---|
| **Luật gốc, đọc đầu tiên** | `.claude/skills/bo-nao-edit-video/CLAUDE.md` |
| **Quy trình tối ưu, thông số, mọi bẫy đã dính** | `.../QUY-TRINH-TOI-UU.md` |
| **Cài và chạy trên máy Windows** | `.../CHAY-TREN-MAY-TINH.md` |
| Chọn nỗi đau, câu chữ, số liệu được phép nói | `.claude/skills/ho-so-khach-hang/SKILL.md` |
| Hồ sơ khách hàng đầy đủ (58 KB) | `.claude/skills/ho-so-khach-hang/ho-so-day-du.md` |
| Agent thợ dựng, đã thuộc hết luật | `.claude/agents/hoan-editer.md` |
| Bảng kiểm trước khi đăng | `.../bang-kiem-truoc-khi-dang.md` |

### Công cụ
| File | Làm gì |
|---|---|
| `cong-cu/lam_video.py` | **Dây chuyền chính** — nạp `bang.json` ra video hoàn chỉnh |
| `kich-ban/03-.../dung-video.py` | **Bộ dựng hình** — mọi thứ về chữ, bố cục, ảnh bìa nằm đây |
| `cong-cu/lay_hinh_pexels.py` | Tải hình minh hoạ dọc từ kho Pexels |
| `cong-cu/kiem_chia_khoa.py` | Kiểm chìa khoá đã dán đủ chưa |
| `cong-cu/cat_doan.py` | Cắt đoạn từ video thô |
| `cong-cu/nap_video_dai.py` | Nạp video dài (bóc lời còn kẹt, xem Phần 8) |
| `cong-cu/edit_video_giaoduc.py` | Bộ gốc 4 bước soi/transcribe/dexuat/dung |
| `cong-cu/fonts/` | **Font đi kèm** — Anton + DejaVu Sans Bold |

### Bấm chuột trên Windows
| File | Bấm đúp là gì xảy ra |
|---|---|
| `cai-dat-may-tinh.bat` | Tự cài Python, ffmpeg, Pillow, tạo file chìa khoá |
| `lam-video.bat` | **Kéo `bang.json` thả vào** → ra video, tự mở thư mục kết quả |

---

## PHẦN 5 — CÁCH VIẾT MỘT BẢNG PHÂN CẢNH

```json
{
 "ten": "ten-video-khong-dau",
 "giong": "929e69c2-c9ab-481a-bffb-cd16565f867c",
 "canh": [
  {"to":"DÒNG DẢI VÀNG\nDÒNG DẢI XANH", "nhan":"", "kieu":"bia",
   "loi":"Câu hook ngắn, dưới 2,7 giây."},

  {"to":"CHỮ TO TRÊN MÀN HÌNH", "nhan":"NHÃN NHỎ", "kieu":"hieu",
   "loi":"Lời đọc của cảnh này.",
   "hinh":"english keyword to search"}
 ]
}
```

| Trường | Là gì |
|---|---|
| `to` | Chữ to hiện trên màn hình. `\n` để xuống dòng |
| `nhan` | Nhãn nhỏ giãn chữ, nằm trên chữ to. Để trống được |
| `loi` | Lời đọc. **Đây mới là nội dung**, chữ trên màn hình chỉ là nhắc lại |
| `kieu` | `bia` · `hook` · `dau` (nỗi đau) · `hieu` (bước ngoặt) · `giai` (giải pháp) · `cta` |
| `hinh` | Từ khoá **tiếng Anh** để máy tự tải hình. **Bỏ trống nếu tự đặt hình tay** |

**Đặt hình tay:** để file vào thư mục `canh/` theo đúng số cảnh — `canh-01.jpg`,
`canh-07.mp4`… Nhận cả `.mp4 .mov .jpg .png`. Video ngang tự cắt về khung dọc.

⚠️ **Cách làm đúng là đặt hình TAY**, không khai `hinh`. Vì phải soi mắt từng hình
**trước khi** dựng — Điều cấm số 2 cấm hình có mặt người cận cảnh, mà máy không tự biết.

---

## PHẦN 6 — NĂM ĐIỀU CẤM (rút gọn từ `CLAUDE.md`)

1. **Cấm tự bịa chữ hook và câu chốt cuối.** Hai câu này là nội dung bán hàng, không phải
   trang trí. Lấy từ chủ doanh nghiệp hoặc hỏi lại để xác nhận.
2. **Cấm dùng hình có mặt người cận cảnh** làm hình minh hoạ. Chỉ lấy đồ vật, bàn tay,
   khung cảnh. *(Ngoại lệ: video kể chuyện sự kiện, mặt người CHÍNH LÀ nội dung — nhưng
   vẫn phải báo chủ doanh nghiệp, xem điều 5.)*
3. **Cấm chèn hình minh hoạ đè lên đoạn quay màn hình** — đó là bằng chứng.
4. **Cấm sửa phụ đề để đổi Ý người nói.** Giọng luôn giữ nguyên 100%.
5. **Cấm đăng video còn lộ thông tin người thật.** Tên thật, số điện thoại, mã tài khoản
   — thấy là **báo chủ doanh nghiệp, không tự quyết**.

**Luật tự kiểm — quan trọng nhất:** máy không xem được video và không nghe được gì.
Bắt buộc hai chốt:
- **Soi bằng mắt:** trích khung hình ra ảnh, **mở từng ảnh ra xem** trước khi báo xong.
- **Đo bằng số:** nhạc thấp hơn giọng **18–25 dB**, đỉnh dưới **−1 dB**.

> Dấu hiệu làm sai: **chủ doanh nghiệp là người phát hiện lỗi hình hoặc lỗi chữ.**

---

## PHẦN 7 — MƯỜI BẪY ĐÃ DÍNH THẬT, ĐỪNG DÍNH LẠI ⭐

| Bẫy | Dấu hiệu | Cách tránh |
|---|---|---|
| **Ống báo lỗi đầy → treo vĩnh viễn** | Video dài chạy mãi không ra file | Báo lỗi của máy nén phải **ghi ra FILE**, không dùng đường ống. Nhìn ra bằng `/proc/<pid>/wchan` = `anon_pipe_write` cả hai bên |
| **Nuốt cả cảnh vào bộ nhớ** | Máy chậm dần, video dài là nghẽn | Một khung nặng 6,2 MB. Đọc tới đâu dùng tới đó |
| **Vẽ lại chữ mỗi khung** | Dựng rất chậm | Chữ chỉ động 0,4 giây đầu cảnh → dựng một lần rồi dùng lại |
| **Tiến trình ffmpeg rác** | Máy đầy tiến trình treo | Mỗi cảnh phải đóng máy phát khung hình sau khi dùng xong |
| **Ảnh tĩnh lặp vô tận** | ffmpeg chạy 607 giây không dứt | Ảnh tĩnh dùng `-loop 1 -framerate`, KHÔNG dùng `-stream_loop -1`. Với ảnh tĩnh thì `-t` vô tác dụng |
| **Khung giây 0,0 trống trơn** | Ảnh đại diện chỉ có nền | Cảnh đầu phải hiện đủ chữ ngay khung 0 |
| **Đo một chuỗi, vẽ chuỗi khác** | Chữ tràn cụt hai đầu | Đo đúng chuỗi sắp vẽ. Chuỗi giãn cách rộng hơn chuỗi gốc nhiều |
| **Giãn dòng quá chặt** | Dấu Ử, Ấ, Ộ bị cắt | Chữ to giãn dòng **1,42**, không phải 1,22 |
| **Font viết cứng đường dẫn Linux** | Đem sang Windows chết ngay dòng đầu | **Font đi kèm** trong `cong-cu/fonts/` |
| **Notepad thêm ký tự thừa vào chìa khoá** | Báo "sai chìa khoá" mà nhìn thấy đúng y | Để Python đọc file chìa và `.strip()`, đừng đọc bằng `for /f` của Windows |
| **Đỉnh tiếng chạm trần** | Rè trên loa điện thoại | Chuẩn hoá `loudnorm=I=-14:TP=-1.5` trước khi nén |
| **Đường dẫn sai âm thầm** | Dùng nhầm tiếng động máy tự chế | Hàm bỏ qua cái gì **phải in ra dòng báo** |
| **Hình không khớp lời** | Nói "mặc áo" mà hiện máy ép nhiệt | Trích khung mỗi 4 giây của video thô, soi mắt rồi mới cắt |

### Bài học đắt nhất — về việc chạy theo chỉ số

Tài liệu nói *"cứ 2-3 giây phải có một thay đổi nhìn thấy được"*. Lần đầu đọc, đã dịch nhầm
**"thay đổi"** thành **"chuyển động"** rồi rải **28 mốc phóng to trong 99,7 giây**. Chủ doanh
nghiệp xem xong nói thẳng: *"mày đang hơi lợi dụng việc zoom out zoom in"*.

**Chỗ sai:** phóng to là chuyển động rẻ tiền — khung hình động đậy mà không cho người xem
thêm thông tin nào. Chèn một hình đúng ý thì vừa đổi hình, vừa giải thích. Cùng đạt chỉ số,
nhưng một cái rỗng, một cái có ruột.

> **Luật rút ra:** đọc được nguyên tắc nào cũng phải hỏi thêm — *"cách rẻ nhất để đạt chỉ số
> này là gì, và nó có thật sự phục vụ người xem không?"*

Vì bài học này mà **phóng to bị tắt hẳn**.

---

## PHẦN 8 — CHÍN VIDEO ĐÃ LÀM

| # | Thư mục | Nội dung | Dài |
|---|---|---|---|
| 02 | `kich-ban/02-bao-gau-bong-dat-gap` | Đặt gấp mà sợ không kịp | ~36 giây |
| 03 | `kich-ban/03-qua-in-logo-thuong-hieu` | Quà in logo quảng bá thương hiệu | ~36 giây |
| 04 | `kich-ban/04-qua-tang-nhan-vien` | Quà tặng nhân viên | — |
| 05 | `kich-ban/05-gau-tot-nghiep` | Gấu bông tốt nghiệp | — |
| 06 | `kich-ban/06-xuong-that` | Xưởng thật, cảnh quay thật | — |
| 07 | `kich-ban/07-quy-trinh-san-xuat` | 4 công đoạn sản xuất | — |
| **08** | `kich-ban/08-quy-trinh-day-du-60s` | **11 công đoạn + 4 bước bán hàng** | 48,8 giây |
| **09** | `kich-ban/09-25-nam-luat-gia-pham` | **Kể chuyện dự lễ 25 năm** | 197,7 giây |

⚠️ Video **02 đến 07 làm theo bố cục cũ**, chưa có ảnh bìa kiểu mới. Muốn đồng bộ thì chạy
lại — bảng phân cảnh còn nguyên, chỉ cần thêm cảnh `"kieu":"bia"` vào đầu.

Video **08 và 09** là bản chuẩn mới nhất, có đủ ba luật ở Phần 3.

---

## PHẦN 9 — CÒN DANG DỞ

| Việc | Trạng thái | Cần gì để xong |
|---|---|---|
| Bóc lời video dài (`nap_video_dai.py`) | **Kẹt** | Mở đường mạng tới `huggingface.co` và `cdn-lfs.huggingface.co` để tải máy bóc lời |
| Video 02–07 theo bố cục mới | Chưa làm | Thêm cảnh bìa vào từng `bang.json` rồi chạy lại |
| Sáu công đoạn còn dùng hình Pexels | Chưa có tư liệu | Quay bổ sung mỗi thứ 10–15 giây, **quay dọc**: chọn vải · vẽ sơ đồ cắt · máy thêu chạy trên logo · máy may · kiểm đường may · máy phụt bông |
| Video 09 — chữ "BẢO GẤU BÔNG" góc trên | **Chờ chủ quyết** | Video kể chuyện cá nhân, không bán gấu bông. Bỏ hay đổi tên? |
| Video 09 — mặt người và trẻ nhỏ | **Chờ chủ quyết** | Hỏi ý người lên hình rõ mặt; cân nhắc bỏ ảnh có trẻ em |

---

## PHẦN 10 — CHUYỂN FILE VÀO/RA MÁY CHỦ ĐÁM MÂY

Khi làm việc với Claude trên đám mây (không phải máy anh), file đi qua ba đường:

| Đường | Dùng khi |
|---|---|
| **Kéo thả vào khung chat** | File nhỏ, dưới 30 MB |
| **Google Drive** | File lớn. Đưa link thư mục đã mở công khai |
| **Git** | Thứ cần giữ lâu dài |

⚠️ **Máy chủ đám mây KHÔNG đọc được ổ E của anh.** Muốn nó đọc thẳng ổ E thì phải cài
Claude Code **trên máy anh** — xem `CHAY-TREN-MAY-TINH.md`.

**Mẹo tải ảnh RAW từ Drive không tốn băng thông:** file DNG của iPhone nặng 20–100 MB, nhưng
bên trong có sẵn một ảnh JPEG 4032×3024 nằm ở khoảng 2–6 MB đầu. Chỉ cần xin máy chủ **8 MB
đầu** (`Range: bytes=0-8000000`) rồi cắt ảnh đó ra. Nhanh hơn nhiều lần.
⚠️ Cắt xong **phải mở thử bằng thư viện ảnh** — có khúc dài 1,4 MB mà vẫn hỏng, chỉ xem
kích thước là không đủ.
⚠️ Ảnh chụp điện thoại hay bị **lộn ngược hoặc lật gương** — phải xoay lại theo thẻ hướng
trong file (`exif_transpose`). Đợt vừa rồi 25 trên 36 ảnh phải xoay.

**Đường tải Drive dùng được:** `https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t`
*(đường `drive.google.com/thumbnail` bị chặn)*

---

## PHẦN 11 — KHI XONG VIỆC, BÁO GÌ

1. **Gửi thẳng file video vào khung chat**, đừng chỉ đưa đường dẫn.
   *(Khung chat nhận tối đa 30 MB — video to hơn thì nén bản xem trước, kèm link tải bản gốc.)*
2. Nói rõ: video dài bao nhiêu, bao nhiêu cảnh, bao nhiêu cảnh dùng hình thật.
3. Đưa số đo: **âm lượng trung bình, đỉnh, khoảng cách giọng–nhạc**.
4. **Nói thẳng chỗ còn nghi ngờ** — hình nào chưa ưng, chữ nào chưa chắc, chỗ nào có thể lộ.
5. Hỏi lại: **hook và câu chốt cuối đã đúng ý chưa?**

---

## PHẦN 12 — VỀ DOANH NGHIỆP

**Bảo Gấu Bông** — xưởng sản xuất trực tiếp gấu bông và quà tặng doanh nghiệp in/thêu logo.

**Quy trình bán hàng:** tiếp nhận logo → lên mẫu demo → báo giá → tiến hành làm

**11 công đoạn sản xuất:** chọn vải → vẽ sơ đồ → thêu → may → kiểm tra → phụt bông →
gắn mắt mũi phụ kiện → in lên áo → mặc áo → kiểm lần cuối → đóng hàng gửi khách

**Khách đã làm** (đã được phép dùng hình, khách tự gửi logo sang):
VNPT · VinaPhone · BlueSky · Angels House · AHT Tech · LOMOMS · Bảo Quang Trung

⚠️ **Trước khi viết bất kỳ câu chữ bán hàng nào**, đọc `.claude/skills/ho-so-khach-hang/SKILL.md`
— trong đó có 7 nhóm nỗi đau xếp sẵn theo mức nguy hiểm, 10 tiêu chí khách chọn nhà cung cấp,
và **bảng con số nào được phép nói, con số nào cấm dùng**.

⚠️ Hai thứ **phải hỏi chủ doanh nghiệp trước**, hồ sơ ghi rõ: **tên khách hàng thật** và
**cam kết đơn gấp 24–72 giờ** (không được dùng như lời hứa vô điều kiện).
