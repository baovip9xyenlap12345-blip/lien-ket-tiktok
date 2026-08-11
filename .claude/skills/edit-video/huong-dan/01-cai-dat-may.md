# 01 — CÀI PHẦN MỀM NỀN

> Làm **một lần duy nhất**, mất khoảng **20–30 phút** (phần lớn là ngồi chờ máy tải).
> Không rành máy tính thì mở Claude lên gõ: *"đọc file này rồi dắt tôi cài từng bước"*.

---

## Cần cài ba thứ

| Thứ | Nó là gì | Không có thì sao |
|---|---|---|
| **Python** | Ngôn ngữ chạy công cụ trong bộ này | Không chạy được gì cả |
| **ffmpeg** | Bộ đồ nghề cắt ghép video | Không cắt, không ghép, không xuất được video |
| **faster-whisper** | Máy nghe và bóc lời nói thành chữ | Không có phụ đề, không biết cắt chỗ nào |

---

## 1. PYTHON

**Nó là cái gì:** một phần mềm chạy nền, giống như động cơ. Công cụ trong bộ này viết bằng Python nên máy phải có nó.

**Tại sao cần:** không có Python thì gõ lệnh nào máy cũng báo *"python is not recognized"*.

**Làm thế nào:**
1. Vào **python.org/downloads**
2. Bấm nút vàng to giữa trang, tải bản mới nhất
3. Mở file vừa tải
4. ⚠️ **QUAN TRỌNG NHẤT:** ở màn hình đầu tiên, tích vào ô **"Add python.exe to PATH"** ở **phía dưới cùng**. Bỏ qua ô này là bước sau chắc chắn lỗi, và phải gỡ ra cài lại.
5. Bấm **"Install Now"**, chờ khoảng 3 phút

✔ **Dấu hiệu đúng:** mở cửa sổ đen (bấm phím Windows, gõ `cmd`, Enter), gõ `python --version` → hiện ra số phiên bản kiểu `Python 3.12.4`.

---

## 2. FFMPEG

**Nó là cái gì:** bộ đồ nghề xử lý video. Ví von: nó là **con dao, cái kéo và cái máy khâu** của nghề dựng phim. Không có giao diện, chỉ chạy bằng lệnh — nhưng công cụ trong bộ này gọi nó hộ bạn.

**Tại sao cần:** mọi việc cắt, ghép, tua nhanh, chèn nhạc, xuất video đều do nó làm. Thiếu nó là bộ này thành đống giấy vụn.

**Làm thế nào — cách dễ nhất:**
1. Mở cửa sổ đen (phím Windows → gõ `cmd` → Enter)
2. Gõ đúng dòng này rồi Enter:
   ```
   winget install ffmpeg
   ```
3. Chờ khoảng 5 phút
4. **Đóng cửa sổ đen rồi mở lại** — không mở lại thì máy chưa nhận

⚠️ Máy báo *"winget không tồn tại"* thì cài tay: vào **ffmpeg.org/download.html** → mục Windows → tải bản `full` → giải nén ra `C:\ffmpeg` → rồi nhờ Claude thêm `C:\ffmpeg\bin` vào PATH.

✔ **Dấu hiệu đúng:** gõ `ffmpeg -version` → hiện ra một đống chữ bắt đầu bằng `ffmpeg version`.

---

## 3. FASTER-WHISPER (máy bóc lời)

**Nó là cái gì:** một cái tai máy. Nghe file tiếng rồi gõ ra chữ, **kèm mốc giây từng chữ một**.

**Tại sao cần:** không có nó thì máy không biết bạn nói gì, không biết chỗ nào im lặng để cắt, và không có phụ đề.

**Làm thế nào:**
1. Mở cửa sổ đen
2. Gõ:
   ```
   pip install faster-whisper
   ```
3. Chờ khoảng 5–10 phút (tải khá nặng)

⚠️ **Lần chạy đầu tiên sẽ chậm bất thường** — nó phải tải thêm bộ nghe khoảng 1,5 GB về máy. **Đừng tắt giữa chừng.** Từ lần thứ hai trở đi nhanh hẳn.

✔ **Dấu hiệu đúng:** gõ `python -c "import faster_whisper; print('ok')"` → hiện chữ `ok`.

---

## 4. THƯ VIỆN VẼ CHỮ

Gõ một dòng, chờ 1 phút:
```
pip install pillow
```
Đây là thứ vẽ chữ phụ đề và hộp chữ lên khung hình.

---

## KIỂM TRA CẢ BỘ

Mở cửa sổ đen, dán nguyên khối này vào:

```
python --version && ffmpeg -version && python -c "import faster_whisper, PIL; print('DU BO, SAN SANG')"
```

✔ Hiện chữ **`DU BO, SAN SANG`** ở dòng cuối là xong hết.
❌ Báo lỗi ở đâu thì quay lại đúng mục đó ở trên. Hoặc chụp màn hình đưa Claude xem.

---

## Máy yếu thì sao

Bộ này chạy được trên máy thường, không cần card đồ hoạ. Chỉ là chậm hơn:

| Máy | Video 2 phút mất khoảng |
|---|---|
| Máy khoẻ | 3–5 phút |
| Máy văn phòng thường | 8–15 phút |

⚠️ Bộ này **cố ý dùng CPU chứ không dùng card đồ hoạ**, kể cả máy có card. Lý do: đã thử bật card thì ffmpeg **sập thẳng** ở một số hiệu ứng. Chậm mà chắc.
