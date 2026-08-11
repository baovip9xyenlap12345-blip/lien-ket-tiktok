# 02 — LẤY CHÌA KHOÁ KHO ẢNH

> Mất khoảng **10 phút**, làm **một lần duy nhất**. **Cả ba kho đều miễn phí.**
> 🟢 Bỏ qua trang này cũng được — video vẫn ra, chỉ là không có ảnh/video minh hoạ chèn vào.

---

## 1. NÓ LÀ CÁI GÌ

**Chìa khoá** ở đây là một **dãy chữ số dài** do trang web cấp cho riêng bạn. Ví von: nó là **thẻ thư viện**. Bạn đưa thẻ ra, thư viện cho bạn mượn ảnh.

Ba kho này là ba thư viện ảnh/video **miễn phí, dùng cho mục đích kinh doanh được**.

## 2. TẠI SAO CẦN

Không có chìa thì lúc người trong video nói *"tôi mất rất nhiều thời gian"*, màn hình vẫn chỉ là mặt người nói suốt. Có chìa thì máy tự tìm được cảnh **bàn giấy bừa bộn** chèn vào đúng câu đó — người xem vừa nghe vừa thấy, đỡ chán hẳn.

## 3. LÀM THẾ NÀO

### Kho 1 — PEXELS *(quan trọng nhất, có cả ảnh lẫn video)*

1. Vào **pexels.com** → bấm **Join** góc trên bên phải → đăng ký bằng email
2. Đăng nhập xong, vào thẳng **pexels.com/api/**
3. Bấm nút **"Get Started"** (nút xanh giữa trang)
4. Nó hỏi bạn dùng để làm gì — điền đại một câu tiếng Anh, ví dụ `personal video editing`
5. Xong là hiện ra một **dãy chữ dài khoảng 56 ký tự** → bấm copy

⏱ Mất khoảng 4 phút. **Có ngay, không phải chờ duyệt.**

### Kho 2 — PIXABAY *(dự phòng, cũng có cả ảnh lẫn video)*

1. Vào **pixabay.com** → **Join** → đăng ký
2. Đăng nhập xong vào **pixabay.com/api/docs/**
3. Cuộn xuống, chìa khoá của bạn **hiện sẵn ngay trong trang**, trong khung ví dụ — dãy có dạng `một-dãy-số-gạch-ngang-rồi-một-dãy-chữ-số`

⏱ Mất khoảng 3 phút.

### Kho 3 — UNSPLASH *(chỉ có ảnh, không có video — làm cuối)*

1. Vào **unsplash.com/developers** → **Register as a developer**
2. Bấm **New Application** → tích hết các ô cam kết → đặt tên đại
3. Cuộn xuống mục **Keys**, lấy dãy ở dòng **Access Key**
   ⚠️ Bên dưới còn dòng **Secret key** — **cái đó KHÔNG dùng ở đây**. Lấy nhầm là báo lỗi 401.

⏱ Mất khoảng 4 phút.

---

## 4. DÁN CHÌA VÀO ĐÂU

Mở file **`chia-khoa.txt`** ở thư mục gốc bộ não, dán vào đúng chỗ, thay cả phần `<...>`:

```
PEXELS_KEY=dán dãy chữ Pexels vào đây
PIXABAY_KEY=dán dãy chữ Pixabay vào đây
UNSPLASH_ACCESS_KEY=dán dãy chữ Unsplash vào đây
```

⚠️ **Không để khoảng trắng quanh dấu `=`.** ✅ `PEXELS_KEY=abc123` ❌ `PEXELS_KEY = abc123`

✔ **Dấu hiệu đúng:** chạy bước dựng video, thấy dòng báo kiểu `+ 12.1-13.9s "..." ← Pexels (video)`.

---

## 5. GIỮ CHÌA CHO AN TOÀN ⚠️

**Chìa khoá là của riêng bạn, đừng đưa ai.** Ai cầm được thì họ tra ảnh bằng suất của bạn, dùng hết lượt miễn phí.

- ❌ **Đừng gửi file `chia-khoa.txt` cho ai**, kể cả bạn bè.
- ❌ Đừng đăng lên mạng, đừng dán vào nhóm chat.
- ⚠️ **Muốn tặng lại bộ não này cho người khác thì XOÁ nội dung `chia-khoa.txt` trước** — để lại dòng mẫu trống thôi.
- 😱 Lỡ lộ? Vào lại đúng trang đó, xoá chìa cũ tạo chìa mới. Chìa cũ coi như bỏ.

---

## Ghi chú về bản quyền ảnh

| Kho | Dùng kinh doanh | Bắt ghi tên tác giả |
|---|---|---|
| Pexels | ✅ Được | Không bắt |
| Pixabay | ✅ Được | Không bắt |
| Unsplash | ✅ Được | **Điều khoản đòi ghi tên** khi lấy qua chìa khoá |

👉 Vì vậy bộ này **ưu tiên Pexels trước, Pixabay sau, Unsplash cuối cùng**.
