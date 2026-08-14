---
name: edit-video
description: Bộ não dựng video ngắn từ video thô có người thật nói — cắt khoảng lặng, cắt tiếng đệm (à, ừm), cắt đoạn lặp ý, tua nhanh, gắn phụ đề chữ nảy, chữ hook 3 giây đầu, câu chốt cuối, tự tải ảnh/video minh hoạ từ Pexels/Pixabay/Unsplash, làm sáng làm nét, chèn nhạc nền và tiếng động chuyển cảnh, làm mờ vùng lộ thông tin riêng tư. LUÔN dùng skill này khi người dùng nói "edit video", "dựng video", "cắt video", "làm video ngắn", "video TikTok/Reels/Shorts", "gắn phụ đề", "bóc lời video", "chèn b-roll / hình minh hoạ", "làm mờ thông tin trong video", "cắt khoảng lặng", "video-tho", "de-xuat-cat.json", hoặc chạy edit_video_giaoduc.py. KHÔNG dùng cho video không có tiếng người nói, và không dùng để viết kịch bản/nội dung — skill này chỉ lo khâu DỰNG.
---

# LUẬT CỦA BỘ NÃO EDIT VIDEO

> **Đọc hết file này trước khi làm bất cứ việc gì trong thư mục skill này.**
> Bộ này được đúc ra từ quy trình đã chạy thật, không phải lý thuyết. Mọi con số trong đây
> đều là con số đã dùng trên video thật và đã được chủ cũ nghe/xem rồi chỉnh lại nhiều lần.
>
> Bản gốc nguyên văn của trang luật này nằm ở `LUAT-GOC.md` (file gốc tên `CLAUDE.md`).

---

## 1. BỘ NÃO NÀY LÀM ĐƯỢC GÌ

Nạp **một video thô đã quay sẵn** (người thật nói, quay điện thoại/máy tính) → ra **một video ngắn sẵn đăng**:

- Cắt bỏ khoảng lặng, tiếng đệm ("à", "ừm"), đoạn nói lặp ý
- Tua nhanh nhẹ cho đỡ lê thê
- Gắn phụ đề kiểu chữ nảy khi đọc tới
- Hiện chữ tiêu đề 3 giây đầu (hook) và câu chốt cuối video
- Tự tải ảnh/video minh hoạ từ kho miễn phí, chèn đúng chỗ người nói tới vật cụ thể
- Làm sáng, làm nét hình
- Chèn nhạc nền + tiếng động nhẹ ở chỗ đổi cảnh
- Làm mờ vùng lộ thông tin riêng tư

**Việc của khâu dựng chỉ có ba: HÚT vào · GIỮ lại · biến thành ĐƠN.** Thứ gì không phục vụ ba việc đó thì đừng thêm vào.

---

## 2. LUẬT NGÔN NGỮ

1. **Viết 100% tiếng Việt**, kể cả tiêu đề và ghi chú.
2. **Viết cho người mới, không viết cho dân kỹ thuật.** Hình dung người đọc là chủ shop 45 tuổi, bận, không rành máy tính.
3. **Cấm chữ Tây đứng một mình.** Bắt buộc dùng thì phải mở ngoặc giải nghĩa ngay lần đầu:
   - ✅ `hook (chữ tiêu đề hiện 3 giây đầu để giữ người xem)`
   - ❌ `hook`, `b-roll`, `ducking`
4. **Câu ngắn, mỗi câu một ý.** Dài quá 25 chữ thì cắt đôi.
5. **Tên file/thư mục: tiếng Việt KHÔNG DẤU, viết thường, nối bằng gạch ngang.** Nội dung bên trong thì có dấu đầy đủ.

---

## 3. LUẬT HƯỚNG DẪN VIỆC — BA CÂU BẮT BUỘC ⭐

**Mỗi khi bảo chủ não tự tay làm gì** (bấm nút, cài phần mềm, lấy chìa khoá), phải trả lời đủ ba câu, đúng thứ tự:

| Câu | Trả lời điều gì |
|---|---|
| **1. NÓ LÀ CÁI GÌ** | Vật sắp làm là thứ gì. Ví von với đồ quen thuộc càng tốt. |
| **2. TẠI SAO CẦN** | Không có nó thì hỏng chỗ nào. Cấm nói "vì nó cần thiết". |
| **3. LÀM THẾ NÀO** | Bấm gì, ở đâu, thứ tự nào. Đánh số từng bước. |

Kèm theo: chỉ rõ chỗ bấm trên màn hình · nói trước mất bao lâu · cảnh báo bẫy ngay tại bước có bẫy (dùng ⚠️) · nói dấu hiệu làm đúng · **việc nào làm hộ được thì làm hộ**.

---

## 4. NĂM ĐIỀU CẤM ⭐

Năm điều này đều đúc ra từ lỗi đã dính thật. Đọc kỹ.

**1. CẤM tự bịa chữ hook và câu chốt cuối.**
Hai câu này **là nội dung, không phải trang trí** — nó quyết định người ta có bấm vào và có mua không. Chỉ được lấy nguyên văn từ chủ não, hoặc bám sát lời trong bản bóc lời rồi **hỏi lại chủ não xác nhận** trước khi coi là bản chốt.
> *Đã dính thật:* soạn hai câu chốt kiểu *"Comment CROSS để mình gửi link"* trong khi trong video người nói rõ ràng *"link ở bên dưới"* — sai hoàn toàn ý người nói.

**2. CẤM dùng ảnh minh hoạ có MẶT NGƯỜI cận cảnh.**
Cắt từ mặt người đang nói sang mặt người lạ làm người xem **tưởng đổi người nói**. Chỉ lấy đồ vật, bàn tay, khung cảnh.

**3. CẤM chèn hình minh hoạ đè lên đoạn quay màn hình.**
Đoạn đó là **bằng chứng** người nói đang trình ra. Che đi là mất sạch sức thuyết phục.

**4. CẤM dùng ô sửa chữ để đổi Ý người nói.**
Chỗ sửa phụ đề chỉ để sửa từ máy nghe nhầm và che thông tin riêng tư. **Giọng nói luôn giữ nguyên 100%.**

**5. CẤM đăng video còn lộ thông tin người thật.**
Tên thật, số điện thoại, mã tài khoản, nội dung trò chuyện riêng — thấy là phải báo chủ não, **không tự quyết**.
> *Đã dính thật:* một video demo lộ tên thật và mã tài khoản một khách hàng, hiện ở **ba chỗ khác nhau** và **trôi theo lúc cuộn trang**.

---

## 5. LUẬT SỰ THẬT — CẤM BỊA

1. **Không bịa số liệu, không bịa lời khách nói, không bịa đường link.**
2. Câu nói thật phải để trong ngoặc kép và ghi rõ lấy ở giây nào của video.
3. Chưa chắc thì gắn nhãn `[CẦN KIỂM]`, đừng nói như thật.

---

## 6. LUẬT TỰ KIỂM ⭐ — thứ quan trọng nhất trong bộ này

**Claude không xem được video và KHÔNG NGHE ĐƯỢC gì cả.** Nếu không tự kiểm thì mọi lỗi đều dồn lên mắt và tai của chủ não.

Nên quy trình **bắt buộc** có hai chốt tự kiểm:

**Chốt 1 — soi bằng mắt.** Script tự trích khung hình ra ảnh PNG. **PHẢI mở từng ảnh ra xem** trước khi báo "xong". Cụ thể soi: hook có che mặt không · phụ đề có tràn khung không · chữ có sai chính tả không · hình minh hoạ có hợp không · vùng riêng tư đã mờ kín chưa.

**Chốt 2 — đo bằng số.** Script tự đo và in ra: độ to trung bình, đỉnh to nhất, khoảng cách giữa giọng nói và nhạc nền. Nhạc nên thấp hơn giọng **18–25 dB**. Đỉnh nên dưới −1 dB.

> **Dấu hiệu làm sai:** chủ não phải là người phát hiện lỗi hình hoặc lỗi chữ → đã bỏ qua chốt tự kiểm.

---

## 7. BẢN ĐỒ THƯ MỤC

```
.claude/skills/edit-video/
├─ SKILL.md                   ← LUẬT (file này) — đọc đầu tiên
├─ LUAT-GOC.md                ← bản gốc nguyên văn của trang luật (file gốc: CLAUDE.md)
├─ BAT-DAU-TU-DAY.md          ← cho người mới mở lần đầu
├─ chia-khoa.txt              ← chỗ dán chìa khoá kho ảnh (tự lấy, xem hướng dẫn)
├─ huong-dan/
│   ├─ 01-cai-dat-may.md      ← cài Python, ffmpeg, thư viện bóc lời
│   ├─ 02-lay-chia-khoa.md    ← lấy chìa khoá 3 kho ảnh miễn phí
│   ├─ 03-quy-trinh-4-buoc.md ← quy trình chính, đọc kỹ nhất
│   ├─ 04-chon-hinh-minh-hoa.md
│   ├─ 05-loi-thuong-gap.md   ← các lỗi đã dính thật + cách chữa
│   └─ 06-vi-du-mau.md        ← một video thật từ đầu đến cuối, số liệu thật
├─ cong-cu/
│   ├─ edit_video_giaoduc.py  ← toàn bộ máy móc dựng video nằm ở đây
│   ├─ doc_giong.py           ← biến chữ thành tiếng bằng giọng nhân bản của anh Bảo
│   ├─ tim_canh.py            ← tra cảnh Pexels: XEM ảnh đại diện trước, tải sau
│   ├─ ghep_canh.py           ← ghép nhiều cảnh (ảnh tĩnh lẫn clip) thành một dải có chuyển cảnh
│   ├─ giai_ma_drive.py       ← lấy ảnh/video từ Google Drive về đĩa mà không tốn bộ nhớ
│   ├─ fonts/                 ← Anton-Regular.ttf, kiểu chữ dùng xuyên suốt video
│   └─ assets/                ← nhạc nền + tiếng động
├─ video-tho/                 ← BỎ VIDEO CẦN EDIT VÀO ĐÂY
│   ├─ video-ngan-9-16/       ← video quay dọc
│   └─ video-dai-16-9/        ← video quay ngang
└─ video-ra/                  ← video thành phẩm tự hiện ra ở đây
```

⚠️ **Chìa khoá kho ảnh phải nằm cạnh thư mục `video-tho/`** (tức ở gốc skill này), vì script lấy
"gốc kho" là thư mục cha của `video-tho/`. Đặt chỗ khác là script không thấy chìa.

---

## 8. QUY TRÌNH — BỐN BƯỚC

Chi tiết ở `huong-dan/03-quy-trinh-4-buoc.md`. Tóm tắt:

```
set PYTHONUTF8=1
cd <thư mục skill edit-video>

python cong-cu\edit_video_giaoduc.py soi        video-tho\video-ngan-9-16\ten.mp4
python cong-cu\edit_video_giaoduc.py transcribe video-tho\video-ngan-9-16\ten.mp4
python cong-cu\edit_video_giaoduc.py dexuat     video-tho\video-ngan-9-16\ten.mp4
python cong-cu\edit_video_giaoduc.py dung       video-tho\video-ngan-9-16\ten.mp4 ^
        --nhac cong-cu\assets\nhac-video-ngan-2.mp3 ^
        --hook "DÒNG 1\nDÒNG 2" --cta "CÂU CHỐT\nDÒNG 2"
```

> Trên máy Linux/macOS thì thay `set PYTHONUTF8=1` bằng `export PYTHONUTF8=1`, thay `\` trong
> đường dẫn bằng `/`, và thay dấu nối dòng `^` bằng `\`.

**Máy nào không tải được bộ nghe của faster-whisper** thì bước `transcribe` **tự quay sang máy bóc lời
của Cartesia** — cùng chìa khoá với giọng đọc, cũng cho mốc giây từng chữ nên khớp với phần còn lại.
Ép chọn bằng `--may-boc-loi whisper` hoặc `--may-boc-loi cartesia`.
> *Đã dính thật 2026-08-13:* faster-whisper tải bộ nghe từ `huggingface.co`; môi trường chạy trên mây
> chặn thẳng host đó (403 policy denial), cả dây chuyền tắc ngay bước 1. Vì vậy mới có đường dự phòng này.

**Giữa bước `dexuat` và bước `dung`, phải TỰ ĐỌC bản bóc lời** rồi điền thêm 4 thứ vào `work/de-xuat-cat.json`:

| Mục | Là gì |
|---|---|
| `lap_y` | Đoạn nói lặp lại ý đã nói rồi → cắt bỏ |
| `broll` | Chỗ chèn hình minh hoạ + từ khoá tìm hình (tiếng Anh) |
| `sua_chu` | Từ máy nghe nhầm → chữ đúng |
| `lam_mo` | Vùng lộ thông tin riêng tư cần che |

Bốn mục này là **phần việc trí óc**, máy không làm thay được.

---

## 9. THÔNG SỐ ĐANG CHẠY — CẤM TỰ ĐỔI

Những con số dưới đây đã qua chỉnh đi chỉnh lại nhiều vòng trên video thật. **Chỉ được ĐỀ XUẤT đổi, phải chờ chủ não gật.**

| Thông số | Giá trị | Vì sao là con số này |
|---|---|---|
| Ngưỡng khoảng lặng | **0,5 giây** | Dưới mức này là nhịp nói tự nhiên, cắt vào nghe cụt |
| Chừa lại mỗi đầu | 0,12 giây | Cắt sát tuyệt đối nghe như bị nuốt chữ |
| Tốc độ tua | **1,15 lần** | Từng để 1,2 — chủ cũ nghe thấy hơi nhanh |
| Phóng to | **TẮT HẲN** | Xem mục 10 bên dưới |
| Nhạc nền | **0,18, một mức đều** | Từng làm nhạc tự lên xuống theo giọng — chủ cũ nghe thấy khó chịu |
| Làm sáng | sáng 0,045 · gamma 1,08 | gamma nâng vùng tối mà không cháy vùng sáng |
| Làm nét | 0,85 | |
| Hook | 3 giây đầu, tối đa 2 dòng | Nhiều dòng thì hộp cao, che mặt người nói |
| Câu chốt cuối | 3 giây cuối, **chỉ MỘT câu** | Nhiều lời kêu gọi thì không ai làm cái nào |
| Phụ đề | tối đa 5 từ/dòng, ở 58-64% chiều cao | |

---

## 10. BÀI HỌC ĐẮT NHẤT — ĐỌC KỸ ⭐

**Tài liệu nghề nói: "cứ 2-3 giây phải có một thay đổi nhìn thấy được, quá 5 giây không đổi gì là chỗ người xem thoát."**

Lần đầu đọc được câu đó, đã dịch nhầm **"thay đổi"** thành **"chuyển động"**, rồi rải **28 mốc phóng to trong 99,7 giây**. Chủ não xem xong nói thẳng: *"mày đang hơi lợi dụng việc zoom out zoom in"*.

**Chỗ sai:** phóng to là chuyển động rẻ tiền — nó làm khung hình động đậy mà **không cho người xem thêm một chút thông tin nào**. Chèn một hình đúng ý thì vừa đổi hình, vừa giải thích thêm điều người ta đang nói. Cùng đạt chỉ số "3 giây một lần", nhưng một cái rỗng, một cái có ruột.

> **Luật rút ra, áp cho mọi kỹ thuật mới học được sau này:** đọc được nguyên tắc nào cũng phải hỏi thêm — *"cách rẻ nhất để đạt chỉ số này là gì, và nó có thật sự phục vụ người xem không?"* Chạy theo con số rất dễ ra thứ đúng chỉ số mà vô ích, thậm chí gây khó chịu.

Vì bài học này mà **phóng to bị tắt hẳn**, việc giữ nhịp chuyển toàn bộ sang **chèn hình minh hoạ đúng ý**.

---

## 11. KHI XONG VIỆC, BÁO GÌ

1. **Gửi thẳng file video vào khung chat**, đừng chỉ đưa đường dẫn.
2. Nói rõ: cắt bao nhiêu đoạn (khoảng lặng / tiếng đệm / lặp ý), chèn bao nhiêu hình, video dài bao nhiêu.
3. **Nói thẳng chỗ còn nghi ngờ** — hình nào chưa ưng, chữ nào chưa chắc, vùng nào có thể còn lộ.
4. Hỏi lại hai câu: **hook và câu chốt cuối đã đúng ý chưa?**

---

## 12. KIỂU CHỮ VÀ GIỌNG ĐỌC — chốt 2026-08-13

### Kiểu chữ: Anton, dùng xuyên suốt

Cả ba chỗ có chữ — hook, câu chốt cuối, phụ đề — đều dùng **Anton**, phông chữ hoa nét đậm thân hẹp.
File đi kèm bộ này ở `cong-cu/fonts/Anton-Regular.ttf`, không phải cài gì thêm.

✔ **Đã kiểm dấu trước khi chốt:** vẽ thử `ộ ầ ễ ữ ợ ỉ ỹ Đ đ` ra ảnh, hiện đủ, không ra ô vuông —
đúng cái lỗi số 6 trong `huong-dan/05-loi-thuong-gap.md` mà Arial Black từng dính.

Muốn ép phông khác thì đặt biến môi trường `FONT_VIDEO` trỏ tới file `.ttf`, **không sửa mã**.
⚠️ Đổi phông nào cũng phải vẽ thử dấu tiếng Việt ra ảnh xem trước.

Nền hộp hook vốn đã là **màu vàng** `(254, 218, 0)` — đo trực tiếp từ ảnh mẫu gốc, không phải tự chọn.

### Giọng đọc: `doc_giong.py`

```
python cong-cu/doc_giong.py giong                                   # xem có những giọng nào
python cong-cu/doc_giong.py thu                                     # đọc thử một câu
python cong-cu/doc_giong.py doc "chữ cần đọc" --ra tieng-ra/loi.mp3
python cong-cu/doc_giong.py doc --tep kich-ban.txt --ra tieng-ra/loi.mp3 --toc-do slow
```

| Thứ | Giá trị đang chốt |
|---|---|
| Giọng mặc định | **giọng 2 bảo gấu bông** (`929e69c2-c9ab-481a-bffb-cd16565f867c`) |
| Giọng dự phòng | giọng của bùi hữu bảo (`b8385199-ee1a-4c65-a48a-4724194c2b2e`) |
| Model | **`sonic-3`** — bản DUY NHẤT đọc được tiếng Việt. sonic-2, sonic-turbo, sonic đều báo lỗi |
| Chìa khoá | `CARTESIA_API_KEY` ở biến môi trường, hoặc một dòng trong `chia-khoa.txt` |

⚠️ **Máy đọc vẫn đọc sai** tên riêng, tên thương hiệu, số điện thoại, chữ viết tắt.
**Nghe lại trước khi dùng.** Sai chỗ nào thì viết lại chữ đó theo cách đọc rồi chạy lại.

⚠️ Giọng nhân bản là **giọng thật của anh Bảo**. Chìa khoá lộ ra là người khác đọc được bất cứ nội dung
gì bằng giọng anh. Giữ chìa như giữ chìa nhà.

---

## 13. BA CÔNG CỤ PHỤ — thêm 2026-08-14

### `tim_canh.py` — tra cảnh minh hoạ trên Pexels

```
python cong-cu/tim_canh.py xem <tep-tu-khoa.txt> <bang-ra.jpg>   # dựng bảng ảnh đại diện để soi
python cong-cu/tim_canh.py tai <tep-chon.txt>    <thu-muc-ra>    # tải đúng clip đã chọn
```

Luật số 4 bắt phải soi hình trước khi dựng. Tải hẳn clip về rồi mới xem thì mỗi lần đổi từ khoá
mất vài phút. Công cụ này lấy **ảnh đại diện** Pexels trả sẵn, ghép thành một bảng để soi một lượt,
chọn xong mới tải. Nhanh hơn nhiều lần.
⚠️ Đừng cắt đầu ra bằng `head` — ống bị đóng sớm làm script chết giữa chừng. Dùng `tail`.

### `ghep_canh.py` — ghép nhiều cảnh thành một dải

```
python cong-cu/ghep_canh.py <thu-muc-canh> <tong-so-giay> <file-ra.mp4>
```

Nhận **lẫn lộn ảnh tĩnh và cảnh quay**, đặt tên `canh-01`, `canh-02`… theo thứ tự muốn hiện.
Chuyển cảnh mờ 0,4 giây. Ảnh tĩnh được lồng nguyên vẹn lên nền là chính nó phóng to làm mờ
(**không cắt về 9:16** — cắt là chặt cụt logo) và cho **trôi chậm 6%**.

> ⚠️ Trôi 6% là **ngoại lệ có phép** cho luật cấm phóng to ở mục 10, chỉ áp cho **ảnh tĩnh**.
> Cảnh quay vẫn cấm phóng to như cũ. Anh Bảo chốt 2026-08-14.

### `giai_ma_drive.py` — lấy ảnh/video từ Google Drive

```
python cong-cu/giai_ma_drive.py <thu-muc-ket-qua> <thu-muc-ra>
```

`drive.google.com` hay bị chính sách mạng chặn, không tải thẳng được. Đường vòng: gọi công cụ Drive
tải từng file — khi kết quả quá lớn, hệ thống **tự lưu ra đĩa và chỉ trả lại đường dẫn**, nội dung
không đi qua bộ nhớ. Công cụ này đọc đúng những file đó rồi giải mã ra ảnh thật, **tốn 0 token**.
Nó in luôn thống kê khung ngang/dọc và cảnh báo ảnh nào quá nhỏ sẽ vỡ khi phóng lên 1080×1920.

---

## 14. ĐỌC THÊM KHI CẦN

| Lúc nào | Mở file nào |
|---|---|
| Máy chưa cài Python / ffmpeg / faster-whisper | `huong-dan/01-cai-dat-may.md` |
| Chưa có chìa khoá kho ảnh | `huong-dan/02-lay-chia-khoa.md` |
| Trước mỗi lần dựng | `huong-dan/03-quy-trinh-4-buoc.md` |
| **Trước khi điền mục `broll`** | `huong-dan/04-chon-hinh-minh-hoa.md` |
| Máy treo, sập, hình xấu, tiếng lệch | `huong-dan/05-loi-thuong-gap.md` |
| Muốn xem một ca thật từ đầu đến cuối | `huong-dan/06-vi-du-mau.md` |
| Người mới lần đầu mở bộ này | `BAT-DAU-TU-DAY.md` |
| **Muốn chạy bộ này trên máy Windows của mình** | `huong-dan/07-chay-tren-may-windows.md` |
