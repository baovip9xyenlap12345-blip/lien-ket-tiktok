# 04 — LUẬT CHỌN HÌNH MINH HOẠ

> Đọc trang này **trước khi** điền mục `broll`. Bốn luật dưới đây đều đúc ra từ hình đã chọn sai thật.

---

## Vì sao chèn hình lại quan trọng đến thế

Tài liệu nghề nói: **cứ 2–3 giây phải có một thay đổi nhìn thấy được**; quá 5 giây không đổi gì thì chỗ đó là **lỗ rò**, người xem thoát ở đấy.

Nhưng **"thay đổi" không phải là "chuyển động"**. Phóng to hình là chuyển động rẻ tiền — khung hình động đậy mà không cho người xem thêm chút thông tin nào. Chèn một hình đúng ý thì vừa đổi hình, **vừa giải thích thêm** điều người ta đang nói. Cùng đạt chỉ số, một cái rỗng một cái có ruột.

👉 Vì vậy bộ này **tắt hẳn phóng to** và dồn toàn bộ việc giữ nhịp sang chèn hình.

---

## BỐN LUẬT — không được phá

### Luật 1 — CẤM hình có mặt người cận cảnh

Cắt từ mặt người đang nói sang mặt người lạ làm người xem **tưởng đổi người nói**. Chỉ lấy **đồ vật, bàn tay, khung cảnh**.

> *Đã dính thật:* tra `busy stressed office worker` ra **mặt cận một cô gái nhắm mắt**. Chèn vào là hỏng cả đoạn.

✅ Từ khoá an toàn: `cluttered desk paperwork` · `hands typing on smartphone` · `morning coffee cup laptop` · `parcel boxes delivery` · `hourglass sand flowing` · `notebook checklist pen writing`

### Luật 2 — CẤM chèn đè lên đoạn quay màn hình

Đoạn quay màn hình là **bằng chứng** người nói đang trình ra. Che đi là mất sạch sức thuyết phục — tự bắn vào chân mình.

👉 Đọc bản bóc lời, tìm câu kiểu *"các bạn nhìn nhá"*, *"đây này"* → từ đó trở đi là vùng cấm chèn.

### Luật 3 — Ưu tiên cảnh Việt Nam khi hình có bối cảnh

> *Đã dính thật:* tra `crowd of people walking busy street` ra một phố đông người — **nhưng là Philippines**, có biển hiệu Jollibee. Người Việt nhìn phát ra ngay.

👉 Thêm chữ `vietnam` hoặc `hanoi` / `saigon` vào từ khoá khi hình có nhà cửa, đường phố, biển hiệu.

### Luật 4 — Hình phải trông sáng, đọc được

> *Đã dính thật:* tra `smartphone chat notification` ra **điện thoại màn hình đen thui** — không nói lên gì cả. Đổi thành `hands typing message on smartphone bright screen` mới ra hình dùng được.

👉 Thêm `bright`, `sunlight`, `closeup` vào từ khoá khi hình bị tối.

---

## CÁCH LÀM — bốn bước

**1. Đọc bản bóc lời, tìm chỗ người nói tới VẬT CỤ THỂ.**
Câu trừu tượng ("tôi nghĩ rằng…") thì không chèn. Câu có vật ("bàn giấy", "danh sách", "điện thoại", "thời gian") thì chèn được.

**2. Mỗi chỗ chèn dài 1,6 – 2,5 giây.** Ngắn quá thì loé lên khó chịu, dài quá thì mất mặt người nói.

**3. Từ khoá viết TIẾNG ANH.** Kho ảnh không hiểu tiếng Việt.

**4. BẮT BUỘC soi hình trước khi dựng cả video.**
Tải hình xong, trích một khung ra ảnh rồi **mở ra xem tận mắt**:
```
ffmpeg -y -ss 0.5 -i work\broll\broll-01.mp4 -frames:v 1 xem-01.jpg
```
Không hợp thì đổi từ khoá, xoá `work/broll/broll-01.mp4` rồi chạy lại.
👉 **Đừng dựng cả video rồi mới xem** — mất 4 phút mỗi lần chạy lại.

---

## Chèn bao nhiêu là vừa

| Video dài | Số chỗ chèn hợp lý |
|---|---|
| 60 giây | 4 – 6 |
| 100 giây | 8 – 10 |
| 150 giây | 12 – 15 |

Đại khái **một chỗ mỗi 10 giây phần người nói**. Nhiều quá thì thành video quảng cáo, mất chất người thật.

---

## Hai kiểu hiện hình

| Kiểu | Cách hiện | Dùng khi nào |
|---|---|---|
| `toanman` | Cắt hẳn sang hình, giọng vẫn chạy | Mặc định. Khi câu nói cần một hình minh hoạ mạnh |
| `goc` | Thu nhỏ nằm góc trên, **vẫn thấy mặt** | Khi đang xây lòng tin, không muốn mất mặt người nói |

Đổi bằng `--broll-kieu goc`.

---

## Sổ ghi hình đã dùng

Bộ này tự ghi mọi hình đã tải vào `cong-cu/assets/broll-da-dung.json`. Lần sau tra cùng từ khoá, nó **tự bỏ qua hình cũ, lấy hình khác**.

**Vì sao cần:** tra cùng một từ khoá thì kho ảnh trả về đúng cái hình cũ. Vài video là khách nhận ra bạn dùng đi dùng lại một hình.

⚠️ Muốn cho phép lấy lại hình cũ thì xoá file đó đi.
