# 07 — CHẠY BỘ NÀY TRÊN MÁY WINDOWS CỦA BẠN

> Làm **một lần duy nhất**, tổng khoảng **45–60 phút** (phần lớn là ngồi chờ máy tải).
> Xong rồi thì mọi lần sau chỉ mất 2 phút: bỏ video vào thư mục, gõ một câu, đi pha cà phê.

---

## VÌ SAO PHẢI LÀM CÁI NÀY

Khi bạn chat với Claude trên trang web, nó chạy trên **máy chủ ở trung tâm dữ liệu**, không phải máy bạn.
Nó **không mở được ổ E: của bạn** — dán đường dẫn kiểu `E:\nao cua toi\...` là vô ích.

Cài Claude Code xuống máy thì khác hẳn:

| | Chat trên web | Claude Code trên máy |
|---|---|---|
| Đọc thẳng ổ C:, ổ E: | ❌ Không | ✅ Có |
| Video nặng phải tải lên | Có, chờ lâu | Không, đọc tại chỗ |
| Video dựng xong nằm ở đâu | Phải tải về | Nằm sẵn trên ổ đĩa |
| Kho video 50 GB | Chịu | Bình thường |

---

## CHUẨN BỊ: CẦN GÌ TRƯỚC

- Máy Windows 10 hoặc 11
- Còn trống ít nhất **10 GB** ổ đĩa (bộ nghe tiếng nặng 1,5 GB, video thành phẩm cũng nặng)
- Mạng ổn định — bước tải nặng nhất khoảng 1,5 GB
- Tài khoản Claude bạn đang dùng: `baovip9xyenlap12345@gmail.com`

---

# PHẦN 1 — CÀI CLAUDE CODE (≈10 phút)

**Nó là cái gì:** cũng là Claude bạn đang chat, nhưng chạy *bên trong máy bạn*. Nó mở được mọi thư mục
trên máy, y như File Explorer.

**Tại sao cần:** không có nó thì Claude không thấy kho video của bạn, và bạn phải tải từng file lên chat.

**Làm thế nào:**

1. Mở trình duyệt, vào **claude.ai/download**
2. Bấm nút tải bản **Windows**
3. Mở file vừa tải, bấm **Install**, chờ khoảng 3 phút
4. Mở ứng dụng lên, bấm **Sign in**
5. ⚠️ **Đăng nhập đúng tài khoản `baovip9xyenlap12345@gmail.com`** — đăng nhập tài khoản khác là không thấy
   gì của bạn cả

✔ **Dấu hiệu đúng:** ứng dụng mở ra, có khung chat, góc trên hiện email của bạn.

---

# PHẦN 2 — TẢI BỘ DỰNG VIDEO VỀ MÁY (≈5 phút)

**Nó là cái gì:** thư mục chứa toàn bộ máy móc — công cụ dựng, công cụ đọc giọng, phông chữ Anton,
nhạc nền, và **agent `hoan-editer`** biết chạy đúng quy trình.

**Tại sao cần:** không có nó thì Claude trên máy bạn chỉ là Claude trơn, không biết quy trình 4 bước,
không biết năm điều cấm, không biết thông số nào đã chốt.

**Làm thế nào:**

1. Vào **github.com/baovip9xyenlap12345-blip/lien-ket-tiktok**
2. Phía trên bên trái có ô chọn nhánh, đang ghi `main` — bấm vào, chọn **`claude/video-creation-skill-gxtg9a`**
   ⚠️ **Bước này quan trọng nhất.** Quên đổi nhánh là tải về bản không có bộ dựng video.
3. Bấm nút xanh **`< > Code`** → **Download ZIP**
4. Mở thư mục Downloads, chuột phải file ZIP → **Extract All** (Giải nén)
5. Chọn chỗ giải nén cho dễ nhớ, ví dụ: `E:\nao cua toi\bo-dung-video`
6. Vào xem bên trong, phải thấy một thư mục tên **`.claude`** (có dấu chấm ở đầu)

✔ **Dấu hiệu đúng:** mở đường dẫn `...\bo-dung-video\.claude\skills\edit-video\` thấy các thư mục
`cong-cu`, `huong-dan`, `video-tho`, `video-ra`.

❌ Không thấy thư mục `.claude` → bạn tải nhầm nhánh. Quay lại bước 2.

---

# PHẦN 3 — CÀI BA PHẦN MỀM NỀN (≈25 phút, phần lớn là chờ)

> 💡 **Cách lười mà an toàn:** mở Claude Code, trỏ vào thư mục vừa giải nén, rồi gõ:
> *"đọc file huong-dan/01-cai-dat-may.md rồi dắt tôi cài từng bước"*.
> Nó sẽ tự kiểm tra máy bạn thiếu gì và làm hộ phần làm hộ được. Muốn tự làm thì đọc tiếp.

## 3.1 — PYTHON

**Nó là cái gì:** phần mềm chạy nền, giống động cơ. Công cụ trong bộ này viết bằng Python.

**Tại sao cần:** không có nó thì gõ lệnh nào máy cũng báo `python is not recognized`.

1. Vào **python.org/downloads**
2. Bấm nút vàng to giữa trang
3. Mở file vừa tải
4. ⚠️ **QUAN TRỌNG NHẤT:** ở màn hình đầu tiên, tích vào ô **"Add python.exe to PATH"** ở **dưới cùng**.
   Bỏ qua ô này là các bước sau chắc chắn lỗi, và **phải gỡ ra cài lại từ đầu**.
5. Bấm **Install Now**, chờ khoảng 3 phút

✔ **Kiểm tra:** bấm phím Windows, gõ `cmd`, Enter. Trong cửa sổ đen gõ:
```
python --version
```
Hiện ra kiểu `Python 3.12.4` là đúng.

## 3.2 — FFMPEG

**Nó là cái gì:** bộ đồ nghề xử lý video — con dao, cái kéo và cái máy khâu của nghề dựng phim.

**Tại sao cần:** mọi việc cắt, ghép, tua nhanh, chèn nhạc, xuất video đều do nó làm.

1. Mở cửa sổ đen (phím Windows → gõ `cmd` → Enter)
2. Gõ đúng dòng này rồi Enter:
   ```
   winget install ffmpeg
   ```
3. Chờ khoảng 5 phút
4. ⚠️ **Đóng cửa sổ đen rồi mở lại** — không mở lại thì máy chưa nhận

✔ **Kiểm tra:** gõ `ffmpeg -version` → hiện một đống chữ bắt đầu bằng `ffmpeg version`.

⚠️ Máy báo *"winget không tồn tại"* → vào **ffmpeg.org/download.html**, mục Windows, tải bản `full`,
giải nén ra `C:\ffmpeg`, rồi nhờ Claude Code thêm `C:\ffmpeg\bin` vào PATH hộ.

## 3.3 — MÁY BÓC LỜI VÀ THƯ VIỆN VẼ CHỮ

**Nó là cái gì:** một cái tai máy — nghe file tiếng rồi gõ ra chữ, kèm mốc giây từng chữ một.

**Tại sao cần:** không có nó thì máy không biết bạn nói gì, không biết chỗ nào im lặng để cắt,
và không có phụ đề.

1. Mở cửa sổ đen
2. Gõ:
   ```
   pip install faster-whisper pillow
   ```
3. Chờ 5–10 phút

⚠️ **Lần chạy dựng đầu tiên sẽ chậm bất thường** — nó phải tải thêm bộ nghe khoảng **1,5 GB** về máy.
**Đừng tắt giữa chừng.** Từ lần thứ hai trở đi nhanh hẳn.

## 3.4 — KIỂM TRA CẢ BỘ

Dán nguyên khối này vào cửa sổ đen:
```
python --version && ffmpeg -version && python -c "import faster_whisper, PIL; print('DU BO, SAN SANG')"
```

✔ Hiện chữ **`DU BO, SAN SANG`** ở dòng cuối là xong hết.
❌ Báo lỗi ở đâu thì quay lại đúng mục đó. Hoặc chụp màn hình đưa Claude Code xem.

---

# PHẦN 4 — DÁN CHÌA KHOÁ (≈3 phút)

**Nó là cái gì:** hai dãy chữ số cho phép máy tải hình minh hoạ (Pexels) và đọc giọng của bạn (Cartesia).

**Tại sao cần:** thiếu chìa Pexels thì không có hình minh hoạ chèn vào. Thiếu chìa Cartesia thì không
lồng tiếng được.

⚠️ **Bản tải từ GitHub CỐ Ý không có chìa.** Đó là chủ ý — chìa mà nằm trên GitHub thì ai cũng lấy được,
họ sẽ dùng **giọng nhân bản của bạn** để đọc bất cứ nội dung gì.

1. Vào thư mục `...\bo-dung-video\.claude\skills\edit-video\`
2. Tìm file **`chia-khoa.mau.txt`**
3. Chép ra một bản, đổi tên bản chép thành **`chia-khoa.txt`** (bỏ chữ `.mau`)
4. Mở `chia-khoa.txt` bằng Notepad
5. Thay hai dòng này bằng chìa thật của bạn:
   ```
   PEXELS_KEY=<dán chìa Pexels vào đây>
   CARTESIA_API_KEY=<dán chìa Cartesia vào đây>
   ```
6. ⚠️ **Không để khoảng trắng quanh dấu `=`.** ✅ `PEXELS_KEY=abc123` ❌ `PEXELS_KEY = abc123`
7. Lưu lại

⚠️ **Đừng bao giờ gửi file `chia-khoa.txt` cho ai**, đừng đăng lên mạng, đừng dán vào nhóm chat.

---

# PHẦN 5 — BỎ VIDEO VÀO ĐÚNG CHỖ (≈2 phút)

Chép video thô từ `E:\nao cua toi\nao cua toi\raw\file video thô\video gấu bông thô\` vào:

| Video quay kiểu gì | Bỏ vào thư mục |
|---|---|
| **Dọc** (điện thoại cầm đứng) — TikTok, Reels, Shorts | `.claude\skills\edit-video\video-tho\video-ngan-9-16\` |
| **Ngang** (điện thoại nằm) — YouTube | `.claude\skills\edit-video\video-tho\video-dai-16-9\` |

⚠️ **Đặt tên file không dấu, viết thường, nối bằng gạch ngang.**
✅ `xuong-bong-01.mp4` ❌ `Video Gấu Bông (bản 1).mp4`
Tên có dấu và khoảng trắng rất dễ làm lệnh chạy sai.

Video thành phẩm sẽ **tự hiện ra** ở `video-ra\<tháng>\`, bạn không phải làm gì.

---

# PHẦN 6 — CHẠY THỬ (≈10 phút cho video 1 phút)

1. Mở **Claude Code**
2. Trỏ nó vào thư mục `E:\nao cua toi\bo-dung-video` (mở thư mục / Open folder)
3. Gõ nguyên câu này:

```
Dùng agent hoan-editer dựng giúp tôi video xuong-bong-01.mp4 trong video-tho.
```

Agent sẽ tự chạy đủ bốn bước và **sẽ dừng lại hỏi bạn hai câu** — đây là **cố ý**, không phải nó dốt:

| Nó hỏi gì | Vì sao nó không tự quyết |
|---|---|
| **Chữ hiện 3 giây đầu là gì?** | Đây là câu quyết định người ta có bấm vào xem hay không. Luật cấm nó tự bịa. |
| **Câu chốt cuối là gì?** | Đây là câu quyết định người ta có mua hay không. Cũng cấm tự bịa. |

Trả lời xong là nó dựng tiếp.

⏱ Máy khoẻ: video 2 phút mất 3–5 phút. Máy văn phòng thường: 8–15 phút.
⚠️ **Lần chạy đầu tiên trong đời máy sẽ lâu hơn nhiều** vì phải tải bộ nghe 1,5 GB.

---

# PHẦN 7 — BIẾT MÌNH LÀM ĐÚNG CHƯA

Chạy xong, agent phải tự làm đủ những việc này. Thiếu việc nào là nó làm ẩu:

| Việc | Dấu hiệu |
|---|---|
| Soi logo lạ ở video thô | Nó báo đã trích 7 khung hình và **tự mở ra xem** |
| Đọc bản bóc lời, sửa chữ nghe nhầm | Nó báo *"Sửa N chỗ phụ đề máy nghe nhầm"* |
| Soi bản cuối bằng mắt | Nó báo đã trích 7 khung hình bản cuối và **mô tả nó thấy gì** |
| Đo tiếng bằng số | Nó in ra khoảng cách giọng/nhạc, phải nằm trong **18–25 dB** |
| Nói chỗ còn nghi ngờ | Nó tự nêu hình nào chưa ưng, chữ nào chưa chắc, chỗ nào có thể lộ thông tin |

> **Dấu hiệu nó làm sai:** *bạn* là người phát hiện lỗi hình hoặc lỗi chữ.
> Nghĩa là nó đã bỏ qua chốt tự kiểm. Nhắc nó đọc lại mục 6 trong `SKILL.md`.

---

# PHỤ LỤC — VƯỚNG Ở ĐÂU THÌ XEM ĐÂY

| Máy báo | Nghĩa là gì | Chữa |
|---|---|---|
| `python is not recognized` | Quên tích ô "Add python.exe to PATH" | Gỡ Python ra, cài lại, nhớ tích ô đó |
| `ffmpeg is not recognized` | Chưa đóng mở lại cửa sổ đen | Đóng cửa sổ đen, mở lại |
| `UnicodeEncodeError` | Chữ có dấu làm sập | Gõ `set PYTHONUTF8=1` trước, mỗi cửa sổ mới gõ lại |
| Chạy mãi không xong, file 0 byte | ffmpeg bị treo | Tắt tay, báo Claude Code — có luật xử lý sẵn trong `05-loi-thuong-gap.md` |
| Không tải được hình minh hoạ | Chìa Pexels sai hoặc có khoảng trắng quanh dấu `=` | Mở lại `chia-khoa.txt` kiểm tra |
| Phụ đề ra ô vuông thay vì chữ có dấu | Phông chữ thiếu dấu | Đừng đổi phông. Bộ này dùng Anton, đã kiểm dấu đầy đủ |

**Vướng gì không có trong bảng:** chụp màn hình, kéo vào Claude Code, gõ *"tôi bị lỗi này, chữa giúp tôi"*.

---

# ĐỌC THÊM

| Muốn gì | Mở file nào |
|---|---|
| Hiểu toàn bộ luật của bộ này | `SKILL.md` |
| Hiểu kỹ quy trình 4 bước | `huong-dan/03-quy-trinh-4-buoc.md` |
| Biết cách chọn hình minh hoạ | `huong-dan/04-chon-hinh-minh-hoa.md` |
| Xem một ca thật từ đầu đến cuối | `huong-dan/06-vi-du-mau.md` |
| Lấy thêm chìa kho ảnh | `huong-dan/02-lay-chia-khoa.md` |
