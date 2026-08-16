# CHẠY BỘ NÃO NGAY TRÊN MÁY TÍNH CỦA ANH

> Để anh xử lý thẳng file trong ổ E, không phải đưa lên Google Drive nữa.

---

## TRƯỚC HẾT — NÓI THẲNG MỘT ĐIỀU

Claude đang chạy **trên máy chủ đám mây**, không phải máy anh. Em **không với tới ổ E** của
anh được, và **không tự cài phần mềm vào máy anh** được. Đó là lý do bao lâu nay anh phải
đưa file lên Drive.

Nên việc chuyển sang chạy tại máy có **hai đường**, anh chọn một:

| | Đường A — Claude vào thẳng máy anh | Đường B — Chỉ chạy bộ công cụ |
|---|---|---|
| Cần cài | **Claude Code** trên máy anh | Python + ffmpeg |
| Claude có đọc được ổ E không | **Có** | Không, nhưng anh tự chạy được |
| Claude có tự viết kịch bản, tự soi khung hình không | **Có** | Không |
| Mất bao lâu để cài | 15 phút | 10 phút |

**Em khuyên Đường A.** Vì phần khó nhất của việc làm video không phải bấm nút chạy — mà là
viết kịch bản, chọn hình, soi khung hình, đo tiếng. Đường B anh vẫn phải tự làm hết mấy việc đó.

---

# ĐƯỜNG A — CLAUDE VÀO THẲNG MÁY ANH

## Bước 1. Cài Claude Code

**1. Nó là cái gì**
Là bản Claude chạy **ngay trên máy anh**, không qua trình duyệt. Giống như cài Zalo PC thay vì
dùng Zalo web — cùng một thứ, nhưng bản cài máy thì đọc được file trong máy.

**2. Tại sao cần**
Không có nó thì em vẫn ngồi trên đám mây, không nhìn thấy ổ E, mọi file anh vẫn phải đẩy lên
Drive rồi em tải xuống. Có nó thì em mở thẳng `E:\nao cua toi\raw\` như anh mở File Explorer.

**3. Làm thế nào**
1. Mở trình duyệt, vào **claude.ai/download**
2. Tải bản **Windows**, chạy file vừa tải
3. Đăng nhập bằng đúng tài khoản anh đang dùng ở đây (`baovip9xyenlap12345@gmail.com`)
4. Mở ứng dụng lên, nó hỏi chọn thư mục làm việc → chọn **`E:\nao cua toi`**

⚠️ Bẫy: nếu đăng nhập bằng tài khoản khác thì sẽ không thấy lịch sử trò chuyện này.

**Dấu hiệu làm đúng:** mở ứng dụng lên, gõ *"liệt kê file trong thư mục raw"* — nó phải đọc
ra được tên file thật trong ổ E của anh.

## Bước 2. Kéo bộ não về máy

Trong Claude Code trên máy anh, gõ đúng câu này:

```
Tải kho này về máy:
https://github.com/baovip9xyenlap12345-blip/lien-ket-tiktok
nhánh claude/image-video-api-ubkm1l
rồi chạy .claude/skills/bo-nao-edit-video/cai-dat-may-tinh.bat cho tôi
```

Nó sẽ tự tải và tự cài. Anh chỉ việc bấm CÓ khi Windows hỏi.

## Bước 3. Dán chìa khoá

Mở file `.claude\skills\bo-nao-edit-video\chia-khoa.txt`, thêm hai dòng:

```
PEXELS_KEY=HrFo36zY6EU4iVz4333HYA6JOzTEIABurEs0VeFP3rXUQBqJH1QVy3My
CARTESIA_KEY=<chìa giọng nói của anh>
```

⚠️ File này **đã bị chặn khỏi GitHub** nên chìa không bao giờ lên mạng. Nhưng vẫn đừng gửi
file này cho ai.

## Xong. Từ nay anh chỉ cần nói:

> *"Lấy video trong `E:\nao cua toi\raw\file video thô`, cắt cho tôi một video 60 giây về …"*

Em sẽ tự mở file, tự cắt, tự dựng, tự soi khung hình — không qua Drive nữa.

---

# ĐƯỜNG B — CHỈ CHẠY BỘ CÔNG CỤ, KHÔNG CẦN CLAUDE Ở MÁY

Dùng khi anh chỉ muốn **bấm một cái ra video** từ bảng phân cảnh có sẵn.

## Bước 1. Tải bộ não về máy

1. Mở: `https://github.com/baovip9xyenlap12345-blip/lien-ket-tiktok/tree/claude/image-video-api-ubkm1l`
2. Bấm nút xanh **Code** → **Download ZIP**
3. Giải nén ra, ví dụ `E:\nao cua toi\bo-nao\`

## Bước 2. Chạy file cài đặt

Vào thư mục `.claude\skills\bo-nao-edit-video\`, **bấm đúp** vào:

```
cai-dat-may-tinh.bat
```

Nó tự cài Python, ffmpeg, Pillow. Mất 5–10 phút.

⚠️ **Bẫy hay dính:** cài xong Python hoặc ffmpeg thì nó bắt **đóng cửa sổ đen rồi mở lại file
đó lần nữa**. Đây không phải lỗi — Windows chỉ nhận phần mềm mới khi mở cửa sổ mới. Có thể
phải mở lại 2 lần mới xong hết.

**Dấu hiệu làm đúng:** dòng cuối hiện `XONG. MAY DA SAN SANG DUNG VIDEO.`

## Bước 3. Dán chìa khoá

Mở `chia-khoa.txt` trong cùng thư mục, thêm:
```
PEXELS_KEY=...
CARTESIA_KEY=...
```

## Bước 4. Làm video

**Kéo file `bang.json` thả vào `lam-video.bat`.**

Kết quả ra thư mục `video-ra` nằm cạnh file `bang.json` đó.

| Video dài | Máy chạy khoảng |
|---|---|
| 1 phút | 5 phút |
| 3 phút | 20 phút |

⚠️ **Đừng đóng cửa sổ đen** trong lúc nó chạy.

**Dấu hiệu làm đúng:** chạy xong nó **tự mở thư mục kết quả** ra. Trong đó có file mp4 và
thư mục `soi` chứa các ảnh khung hình.

⚠️ **Việc cuối cùng, không được bỏ:** mở thư mục `soi`, **xem tận mắt từng ảnh** trước khi
đăng. Đây là Luật tự kiểm của bộ não — máy không nhìn được, chỉ có mắt anh nhìn được.

---

## MẤY THỨ ĐÃ SỬA ĐỂ CHẠY ĐƯỢC TRÊN WINDOWS

Bộ này viết ra trên máy Linux, đem sang Windows là hỏng vài chỗ. Đã chữa hết:

| Chỗ hỏng | Đã chữa thế nào |
|---|---|
| Font viết cứng đường dẫn Linux `/usr/share/fonts/...` | **Font đi kèm luôn** trong `cong-cu/fonts/` — máy nào cũng ra chữ giống hệt |
| Chữ tiếng Việt ra dấu hỏi trong cửa sổ đen | `chcp 65001` + `PYTHONUTF8=1` trong file .bat |
| Chìa khoá phải gõ tay mỗi lần | File .bat tự đọc từ `chia-khoa.txt` |

Font đi kèm gồm **Anton** (chữ ảnh bìa) và **DejaVu Sans Bold** (chữ trong video), cả hai đều
là font miễn phí cho dùng thương mại. Giấy phép để cạnh file font.

---

## KHI GẶP LỖI

| Hiện tượng | Nguyên nhân | Cách chữa |
|---|---|---|
| `'python' is not recognized` | Windows chưa nhận Python | Đóng cửa sổ đen, mở lại `cai-dat-may-tinh.bat` |
| `'ffmpeg' is not recognized` | Như trên, với ffmpeg | Như trên |
| `Chua co chia khoa giong doc` | Chưa dán chìa vào `chia-khoa.txt` | Mở file đó, thêm dòng `CARTESIA_KEY=...` |
| Chữ trong video ra ô vuông | Thiếu file font | Kiểm tra `cong-cu\fonts\` có đủ 2 file `.ttf` |
| `TÀI KHOẢN CARTESIA ĐÃ HẾT LƯỢT` | Hết lượt đọc giọng | Nạp thêm ở `play.cartesia.ai` rồi chạy lại |
| Chạy mãi không xong | Video dài, máy yếu | Xem mục 9d của `QUY-TRINH-TOI-UU.md` |

Lỗi nào khác: **chụp nguyên màn hình cửa sổ đen** gửi lại đây, em đọc và chữa.
