# Bộ câu lệnh (prompt) copy-dán cho từng bước

Cách dùng: copy nguyên khối lệnh, thay các chỗ `[trong ngoặc vuông]` bằng thông tin
thật, dán vào AI tương ứng. Chỗ nào chưa có dữ liệu thật thì hỏi chủ, không tự bịa.

---

## PROMPT 1 — Bóc tách video mẫu (dán vào AI xem được ảnh/video)

Dùng khi đã có file video hoặc 5–7 ảnh chụp màn hình các cảnh chính.

```
Bạn là đạo diễn video quảng cáo ngắn. Hãy xem video/các ảnh tôi gửi và bóc tách
thành bảng gồm các cột: Cảnh | Thời gian ước lượng | Thuộc khối nào
(HOOK / VẤN ĐỀ / GIẢI PHÁP / BẰNG CHỨNG / CTA) | Hình trên màn hình | Chữ overlay |
Ước đoán lời đọc | Nhạc/âm thanh | Kỹ thuật đáng học (góc máy, hiệu ứng, nhịp cắt).

Sau bảng, trả lời 3 câu:
1. "Điểm ăn tiền" của video này là gì (thứ khiến người xem dừng lại và tin)?
2. Video dùng nguồn hình nào: quay thật / ảnh tĩnh / AI — nhận biết qua đâu?
3. Muốn làm video tương đương cho sản phẩm khác thì phần nào PHẢI giữ,
   phần nào nên đổi?
```

---

## PROMPT 2 — Viết kịch bản 5 khối + bảng phân cảnh

```
Bạn là copywriter video quảng cáo ngắn cho thị trường Việt Nam.

Thông tin:
- Sản phẩm/dịch vụ: [tên + mô tả ngắn]
- Khách mục tiêu: [ai, nỗi đau chính của họ]
- Điểm mạnh thật (không được bịa thêm): [liệt kê 2–4 điểm]
- Ưu đãi/CTA muốn chốt: [ví dụ: nhắn "BÁO GIÁ" để nhận mẫu]
- Thời lượng: [30 / 45 / 60] giây
- Bảng bóc tách video mẫu (để bám bố cục và "điểm ăn tiền"): [dán bảng từ Prompt 1
  hoặc bảng 10 câu ở Bước 1]

Yêu cầu:
1. Viết kịch bản theo 5 khối HOOK → VẤN ĐỀ → GIẢI PHÁP → BẰNG CHỨNG → CTA,
   phân bổ thời lượng chuẩn video ngắn.
2. Trình bày thành bảng phân cảnh: Cảnh | Thời gian | Khối | Hình trên màn hình |
   Chữ overlay (tối đa 8 từ) | Lời đọc | Âm thanh | Nguồn tài nguyên
   (quay thật / ảnh có sẵn / AI).
3. Lời đọc cả video khớp thời lượng với tốc độ ~2,5 từ/giây.
4. Cột "Hình trên màn hình" mô tả đủ cụ thể để viết prompt ảnh AI hoặc để người
   quay biết đặt máy thế nào.
5. Thông tin nào thiếu (giá, số liệu, tên khách) ghi đúng chữ NEEDS_DATA,
   không tự chế.
6. Viết 2 phương án HOOK khác nhau để tôi chọn (một kiểu nỗi đau, một kiểu tò mò).
```

---

## PROMPT 3 — Tạo ảnh AI cho một cảnh (dán vào Ideogram / Leonardo / Bing)

Prompt ảnh viết tiếng Anh cho ra kết quả ổn định hơn. Công thức:
`[chủ thể + hành động] + [bối cảnh] + [ánh sáng] + [phong cách] + [tỷ lệ khung]`

```
[Chủ thể và hành động — ví dụ: a premium corporate gift box with engraved logo,
lid slightly open, gold ribbon]
[Bối cảnh — ví dụ: on a clean dark walnut desk in a modern office]
[Ánh sáng — ví dụ: soft warm studio lighting, gentle shadows]
[Phong cách — GIỮ NGUYÊN CÂU NÀY CHO MỌI CẢNH — ví dụ: commercial product
photography, photorealistic, rich colors, shallow depth of field]
vertical 9:16 composition, space at top and bottom for text
```

Lưu ý:
- Câu "phong cách" phải giống hệt nhau ở mọi cảnh → cả video đồng màu, nhìn chuyên nghiệp.
- Cần chữ trong ảnh (bảng hiệu, hộp in logo) → dùng Ideogram và ghi rõ:
  `the text "[NỘI DUNG]" printed on the box`.
- Ảnh có người Việt → thêm: `Vietnamese person, natural skin texture`.

---

## PROMPT 4 — Biến ảnh thành video (dán vào Kling / Hailuo / Runway kèm ảnh)

```
[Chuyển động camera — chọn MỘT: slow push-in / slow pull-back / slow pan left
to right / orbit slightly around subject]
[Chuyển động của chủ thể — tả ĐƠN GIẢN, ví dụ: the ribbon sways gently,
soft light particles float in the air]
smooth, cinematic, stable, no distortion, 5 seconds
```

Lưu ý:
- Một cảnh = một chuyển động camera + tối đa một chuyển động chủ thể. Tham lam là méo hình.
- Ra kết quả méo tay/méo chữ → tạo lại và bỏ bớt mô tả chuyển động chủ thể.

---

## PROMPT 5 — Chuẩn hóa lời đọc cho giọng AI

```
Đây là lời đọc video quảng cáo [X] giây: [dán cột "Lời đọc" đã ghép]

Hãy chỉnh để đưa vào công cụ đọc máy tiếng Việt:
1. Câu ngắn, tự nhiên như nói, không văn viết.
2. Số và ký hiệu viết thành âm đọc: "199k" → "một trăm chín chín ca",
   "24/7" → "hai tư trên bảy".
3. Thêm dấu phẩy ở chỗ cần ngắt hơi.
4. Đếm lại tổng số từ và xác nhận khớp [X] giây với tốc độ 2,5 từ/giây;
   dài quá thì cắt ý phụ, giữ nguyên ý bán hàng.
```

---

## PROMPT 6 — Caption và hashtag khi đăng

```
Video quảng cáo của tôi: [1 dòng tóm tắt nội dung + CTA trong video]
Sản phẩm: [tên] — Khách mục tiêu: [ai] — Đăng trên: [TikTok / Reels / Facebook]

Viết 3 phương án caption:
- Mỗi caption ≤ 3 dòng, dòng đầu là câu móc tò mò hoặc nỗi đau (KHÔNG kể lại video).
- Kết bằng đúng CTA trong video.
- Kèm 5–8 hashtag: 2 hashtag ngành, 2–3 hashtag nỗi đau/nhu cầu khách hay tìm,
  1–2 hashtag thương hiệu. Không dùng hashtag triệu view vô liên quan.
```

---

## PROMPT 7 — Chấm điểm bản dựng trước khi đăng (tùy chọn, dán kèm video/ảnh chụp bản dựng)

```
Bạn là người xem TikTok khó tính, lướt rất nhanh. Xem bản dựng này và chấm:
1. 3 giây đầu: bạn có dừng lại không? Vì sao?
2. Đoạn nào bạn sẽ lướt bỏ? Ở giây thứ mấy?
3. Xem xong bạn có hiểu phải làm gì tiếp theo (CTA) không?
4. So với bảng phân cảnh sau: [dán bảng] — bản dựng có phản bội chỗ nào không?
Trả lời thẳng, chỉ ra giây cụ thể, kèm cách sửa ngắn gọn.
```
