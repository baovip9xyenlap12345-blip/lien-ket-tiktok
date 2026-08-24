---
name: edit-video-quang-cao
description: Bộ khung hoàn chỉnh để AI phân tích một video quảng cáo mẫu rồi hướng dẫn (hoặc tự thực hiện) sản xuất video tương tự — bóc tách bố cục, viết kịch bản 5 khối, bảng phân cảnh theo giây, tạo hình ảnh và video bằng AI, giọng đọc, dựng CapCut từng phân đoạn, checklist xuất bản. Dùng khi người dùng gửi link/video quảng cáo và nói "làm video giống video này", "viết kịch bản video quảng cáo", "edit video TikTok/Reels/Facebook", "bộ khung edit video", "tạo video bán hàng", "video quảng cáo sản phẩm".
---

# Bộ khung edit video quảng cáo ngắn (TikTok / Reels / Facebook)

Mục tiêu: từ MỘT video quảng cáo mẫu mà người dùng thích → tạo ra video của riêng họ
có bố cục, nhịp điệu và cảm xúc tương đương, bằng công cụ phổ thông (CapCut + AI),
không cần biết dựng phim chuyên nghiệp.

Khi skill này được kích hoạt, AI đóng vai **đạo diễn kiêm trợ lý sản xuất**: dẫn người
dùng đi đúng 7 bước bên dưới, tự làm tối đa những gì AI làm được (kịch bản, prompt ảnh,
prompt video, lời đọc, caption), và giao việc rõ ràng cho người dùng ở những chỗ cần
tay người (quay, bấm nút trong CapCut, tải file).

## Nguyên tắc bất di bất dịch

1. **Mọi video quảng cáo ngắn hiệu quả đều gồm 5 khối**: HOOK → VẤN ĐỀ → GIẢI PHÁP →
   BẰNG CHỨNG → CTA. Video mẫu nào cũng bóc tách được về 5 khối này; video mới nào
   cũng phải dựng từ 5 khối này.
2. **Bảng phân cảnh là nguồn sự thật duy nhất.** Chưa có bảng phân cảnh (Bước 2) thì
   chưa được mở CapCut, chưa được tạo ảnh AI. Mọi thay đổi sau đó phải sửa vào bảng
   phân cảnh trước.
3. **Không bịa thông số sản phẩm** (giá, chất liệu, số lượng tối thiểu, thời gian giao).
   Thiếu dữ liệu thật → ghi `NEEDS_DATA` vào bảng phân cảnh và hỏi người dùng một lần,
   gom tất cả câu hỏi lại.
4. **3 giây đầu quyết định 80% kết quả.** Hook phải có: một chuyển động mạnh HOẶC một
   câu chữ to gây tò mò HOẶC một cảnh lạ mắt. Không bao giờ mở đầu bằng logo.
5. **Nhịp chuẩn video ngắn**: mỗi cảnh 1,5–3 giây; chữ trên màn hình tối đa 8 từ/dòng,
   tối đa 2 dòng; luôn có phụ đề vì đa số người xem không bật tiếng.
6. **Khung dọc 9:16 (1080×1920)** cho TikTok/Reels/Shorts. Chủ thể đặt giữa khung, chừa
   ~15% mép trên và ~20% mép dưới cho giao diện app đè lên.

## Quy trình 7 bước

| Bước | Việc | Ai làm | Kết quả bàn giao |
|---|---|---|---|
| 1 | Bóc tách video mẫu | AI (hỏi/xem) + người dùng cung cấp | Bảng bóc tách 10 mục |
| 2 | Kịch bản 5 khối + bảng phân cảnh | AI viết, người dùng duyệt | Bảng phân cảnh theo giây |
| 3 | Sản xuất hình ảnh/video cho từng cảnh | AI viết prompt, người dùng bấm tạo/quay | Thư mục tài nguyên đánh số theo cảnh |
| 4 | Giọng đọc + nhạc | AI viết lời đọc, người dùng tạo giọng | File giọng + file nhạc |
| 5 | Dựng trong CapCut | Người dùng, theo chỉ dẫn từng phân đoạn của AI | Bản dựng nháp |
| 6 | Kiểm tra chất lượng | AI đưa checklist, người dùng tự soát | Bản dựng đã sửa |
| 7 | Xuất file + đăng | Người dùng; AI viết caption + hashtag | Video 1080×1920 + caption |

Công cụ cần tải cho từng bước: xem `references/cong-cu.md`.
Toàn bộ câu lệnh (prompt) copy-dán cho từng bước: xem `references/prompt-mau.md`.
Kịch bản phân cảnh mẫu hoàn chỉnh: xem `references/phan-doan-mau.md`.

---

## BƯỚC 1 — Bóc tách video mẫu

AI thường KHÔNG mở được link Facebook/TikTok. Xử lý theo thứ tự ưu tiên:

1. **Người dùng gửi được file video** → yêu cầu họ tải video về (xem mục "Tải video
   mẫu" trong `references/cong-cu.md`) rồi gửi file hoặc 5–7 ảnh chụp màn hình các
   cảnh chính. AI có thị giác thì tự bóc tách.
2. **Không gửi được file** → AI hỏi người dùng đúng 10 câu sau (hỏi MỘT lần, dạng
   danh sách để trả lời nhanh):

| # | Câu hỏi | Ghi vào mục |
|---|---|---|
| 1 | Video dài bao nhiêu giây? | Thời lượng |
| 2 | 3 giây đầu chiếu gì, chữ gì hiện lên? | Hook |
| 3 | Video quay người thật, ảnh sản phẩm, hay hình AI/hoạt hình? | Loại hình ảnh |
| 4 | Có giọng đọc không? Giọng nam/nữ, nhanh/chậm, kể chuyện hay rao bán? | Giọng |
| 5 | Nhạc nền thế nào (sôi động / nhẹ nhàng / kịch tính)? | Nhạc |
| 6 | Chữ trên màn hình nhiều hay ít, màu gì, có nhảy theo lời đọc không? | Chữ |
| 7 | Cắt cảnh nhanh hay chậm (đại khái mấy giây một cảnh)? | Nhịp |
| 8 | Video bán gì, chốt bằng câu kêu gọi nào (mua ngay / nhắn tin / để lại SĐT)? | CTA |
| 9 | Điều gì làm bạn thích video này nhất? | Điểm ăn tiền |
| 10 | Sản phẩm/dịch vụ CỦA BẠN muốn làm video là gì, khách là ai? | Đầu vào Bước 2 |

Kết quả Bước 1 = **bảng bóc tách 10 mục** trên, điền đầy đủ. Mục nào không biết ghi
`KHÔNG RÕ` — không đoán mò. "Điểm ăn tiền" (mục 9) là thứ BẮT BUỘC phải tái tạo được
trong video mới; cả khung dựng xoay quanh nó.

---

## BƯỚC 2 — Kịch bản 5 khối + bảng phân cảnh

Phân bổ thời lượng chuẩn (co giãn theo tổng thời lượng):

| Khối | Video 30s | Video 60s | Nhiệm vụ |
|---|---|---|---|
| HOOK | 0–3s | 0–5s | Giữ chân người xem |
| VẤN ĐỀ | 3–8s | 5–15s | Gọi tên nỗi đau của khách |
| GIẢI PHÁP | 8–18s | 15–35s | Sản phẩm xuất hiện, 2–3 điểm mạnh |
| BẰNG CHỨNG | 18–25s | 35–50s | Cận cảnh thật / phản hồi khách / con số |
| CTA | 25–30s | 50–60s | Một lệnh duy nhất, chữ to, đọc rõ |

AI viết kịch bản bằng prompt số 2 trong `references/prompt-mau.md`, rồi trình bày
thành **bảng phân cảnh** — định dạng bắt buộc:

| Cảnh | Thời gian | Khối | Hình trên màn hình | Chữ overlay | Lời đọc | Âm thanh | Nguồn tài nguyên |
|---|---|---|---|---|---|---|---|
| 1 | 0:00–0:03 | HOOK | (mô tả cảnh cụ thể) | (≤8 từ) | (1 câu) | (nhạc/SFX) | quay thật / ảnh / AI |

Quy tắc điền:
- Cột "Hình trên màn hình" phải mô tả đủ cụ thể để tạo được prompt ảnh AI hoặc để
  người dùng biết quay gì (góc máy, cận/toàn, chủ thể làm gì).
- Cột "Nguồn tài nguyên" chỉ được ghi 1 trong 3: `quay thật` / `ảnh có sẵn` / `AI`.
- Lời đọc toàn video đọc thử phải khớp thời lượng: ~2,5 từ/giây tiếng Việt.
- Xong bảng → đưa người dùng duyệt. Duyệt xong mới sang Bước 3.

Kịch bản mẫu điền sẵn: `references/phan-doan-mau.md`.

---

## BƯỚC 3 — Sản xuất hình ảnh/video cho từng cảnh

Đi theo cột "Nguồn tài nguyên" của bảng phân cảnh. Ba con đường, được trộn lẫn:

**A. Quay thật bằng điện thoại** (đáng tin nhất cho khối BẰNG CHỨNG)
- Quay dọc 9:16, lau ống kính, đủ sáng (gần cửa sổ hoặc đèn kẹp ~200k).
- Mỗi cảnh quay 2–3 lần, mỗi lần 5–10 giây, dư để cắt.
- Cận sản phẩm: để máy cách 20–30cm, chạm màn hình khóa nét, di máy CHẬM.

**B. Ảnh có sẵn + hiệu ứng chuyển động** (nhanh nhất khi đã có ảnh sản phẩm đẹp)
- Trong CapCut: thả ảnh vào, dùng zoom chậm (Ken Burns) 110%→120% cho ảnh "sống".

**C. AI tạo ảnh → AI biến ảnh thành video** (cho cảnh không quay được: mở hộp quà
bay lơ lửng, xưởng sản xuất hoành tráng, hoạt hình 3D…)
1. AI viết prompt ảnh theo mẫu số 3 trong `references/prompt-mau.md` — mỗi cảnh 1 prompt.
2. Người dùng tạo ảnh (công cụ ở `references/cong-cu.md`), chọn ảnh ưng.
3. AI viết prompt image-to-video theo mẫu số 4 (chuyển động camera + hành động, 5 giây).
4. Người dùng đưa ảnh + prompt vào công cụ AI video, tải clip về.

Quy tắc đặt tên file bắt buộc: `canh01_hook.mp4`, `canh02_vande.jpg`… đúng số cảnh
trong bảng phân cảnh, gom vào một thư mục. Sai tên = dựng nhầm.

---

## BƯỚC 4 — Giọng đọc và nhạc

1. AI gom cột "Lời đọc" thành một văn bản liền mạch, chỉnh cho tự nhiên khi đọc to
   (câu ngắn, không viết tắt, số viết thành chữ khi cần đọc: "199k" → "một trăm chín
   chín ka").
2. Người dùng tạo giọng bằng công cụ TTS (danh sách + chỉnh tốc độ trong
   `references/cong-cu.md`) HOẶC tự thu bằng điện thoại ở phòng yên tĩnh, mic cách
   miệng 15cm.
3. Nhạc nền: chọn theo mục "Nhạc" của bảng bóc tách Bước 1. Lấy trong kho nhạc CapCut
   (an toàn bản quyền khi đăng TikTok). Âm lượng nhạc để 15–25%, giọng đọc 100%.
4. Hiệu ứng âm thanh (SFX): mỗi lần chữ to đập vào màn hình thêm 1 tiếng "whoosh"
   hoặc "pop" — kho SFX có sẵn trong CapCut.

---

## BƯỚC 5 — Dựng trong CapCut

Cấu trúc lớp (layer) chuẩn từ dưới lên — luôn dựng theo thứ tự này:

```
Lớp 5  Sticker/hiệu ứng (mũi tên, đốm sáng)   ← thêm cuối cùng
Lớp 4  Chữ overlay + phụ đề tự động
Lớp 3  Giọng đọc
Lớp 2  Nhạc nền + SFX
Lớp 1  Video/ảnh các cảnh (nền)               ← dựng đầu tiên
```

Trình tự thao tác (người dùng làm, AI nhắc từng phân đoạn):

1. **Tạo dự án mới** → tỷ lệ 9:16.
2. **Thả giọng đọc vào trước** (Lớp 3). Giọng đọc là xương sống thời gian; hình phải
   khớp theo giọng, không phải ngược lại.
3. **Thả tài nguyên cảnh theo đúng thứ tự tên file** (Lớp 1). Cắt mỗi cảnh cho khớp
   câu đọc tương ứng — nghe đến đâu, cắt đến đó.
4. **Chuyển cảnh**: trong cùng một khối dùng cắt thẳng (không hiệu ứng); giữa hai khối
   được dùng 1 hiệu ứng nhẹ (zoom nhanh / trượt). Cấm dùng quá 2 kiểu chuyển cảnh
   trong cả video — nhiều kiểu = nghiệp dư.
5. **Chữ overlay** (Lớp 4): gõ đúng cột "Chữ overlay"; font không chân, đậm; màu
   trắng viền đen hoặc vàng viền đen; hiện chữ trễ hơn giọng đọc 0,2 giây.
6. **Phụ đề tự động**: CapCut → Văn bản → Phụ đề tự động → sửa lỗi chính tả từng dòng.
7. **Nhạc + SFX** (Lớp 2) theo Bước 4.
8. **Khối CTA cuối**: chữ to nhất video, đứng yên tối thiểu 2 giây, kèm nút/mũi tên.

---

## BƯỚC 6 — Kiểm tra chất lượng (soát trước khi xuất)

- [ ] Xem 3 giây đầu ở chế độ KHÔNG tiếng: có muốn xem tiếp không?
- [ ] Tổng thời lượng đúng kế hoạch (±2 giây).
- [ ] Không có cảnh nào đứng yên quá 3 giây (trừ CTA cuối).
- [ ] Chữ không bị giao diện TikTok/Reels che (mép trên 15%, mép dưới 20%).
- [ ] Phụ đề khớp giọng, không sai chính tả.
- [ ] Giọng đọc nghe rõ trên loa điện thoại (thử thật bằng điện thoại).
- [ ] Thông tin sản phẩm (giá, ưu đãi) đúng dữ liệu thật — mọi `NEEDS_DATA` đã được thay.
- [ ] CTA chỉ có MỘT hành động duy nhất.
- [ ] Không dùng nhạc/hình có bản quyền lấy ngoài kho an toàn.
- [ ] So với "điểm ăn tiền" ở Bước 1: video mới có tái tạo được nó không?

---

## BƯỚC 7 — Xuất file và đăng

- Xuất: 1080×1920, 30fps (60fps nếu quay 60fps), bitrate mặc định CapCut, định dạng MP4.
- Tắt logo/outro mặc định của CapCut nếu có.
- AI viết caption + 5–8 hashtag theo prompt số 6 trong `references/prompt-mau.md`
  (caption bám cùng nỗi đau và CTA của video, không kể lại video).
- Giờ đăng gợi ý VN: 11h30–13h hoặc 19h–21h30. Đăng xong 48 giờ quay lại đọc số liệu:
  giữ chân 3 giây đầu thấp → sửa hook; xem hết cao nhưng không nhắn tin → sửa CTA.

---

## Công cụ cần tải (tóm tắt — chi tiết trong references/cong-cu.md)

| Việc | Công cụ chính | Miễn phí? |
|---|---|---|
| Dựng video | CapCut (điện thoại hoặc PC) | Có |
| Viết kịch bản, prompt | Claude / ChatGPT | Có |
| Tạo ảnh AI | Ideogram / Leonardo / Bing Image Creator | Có (giới hạn) |
| Ảnh → video AI | Kling / Hailuo / Runway | Có (giới hạn) |
| Giọng đọc AI tiếng Việt | Vbee / TTSMaker / giọng có sẵn trong CapCut | Có |
| Nhạc + SFX | Kho có sẵn trong CapCut | Có |
| Tải video mẫu về | SnapTik (TikTok) / trình tải video FB | Có |

## Khi nào đọc reference nào

- `references/cong-cu.md` — cần biết tải gì, ở đâu, bản miễn phí giới hạn gì, cài đặt
  khuyến nghị từng công cụ. Đọc ở Bước 3–5 hoặc khi người dùng hỏi "tải gì".
- `references/prompt-mau.md` — toàn bộ câu lệnh copy-dán: bóc tách video, viết kịch
  bản, tạo ảnh, ảnh-thành-video, lời đọc, caption. Đọc ở mọi bước có AI sinh nội dung.
- `references/phan-doan-mau.md` — 2 bảng phân cảnh mẫu điền sẵn (30 giây bán sản phẩm,
  15 giây hook nhanh) để lấy làm khuôn. Đọc ở Bước 2.
