# Hướng dẫn sử dụng Knowledge Wiki (dành cho bạn)

File này viết hoàn toàn bằng tiếng Việt, giải thích cách dùng wiki này
mà không cần biết tiếng Anh.

## Wiki này là gì?

Đây là một "bộ nhớ dài hạn" cho AI (Claude). Thay vì mỗi lần hỏi AI phải
đọc lại tài liệu từ đầu, AI sẽ:

1. Đọc tài liệu bạn đưa **một lần**,
2. Ghi lại kiến thức thành các trang wiki có liên kết với nhau,
3. Lần sau bạn hỏi gì, AI tra trong wiki — nhanh hơn và nhớ được lâu dài.

Càng thêm nhiều tài liệu, wiki càng "khôn" lên — kiến thức tích luỹ dần
chứ không mất đi sau mỗi cuộc trò chuyện.

## Cấu trúc thư mục (giải thích đơn giản)

| Thư mục / File | Nghĩa là gì |
|---|---|
| `raw/` | **Kho tài liệu gốc** — nơi bạn bỏ file vào. AI chỉ đọc, không bao giờ sửa. |
| `raw/assets/` | Nơi chứa ảnh đi kèm tài liệu. |
| `wiki/` | **Phần AI viết** — bạn chỉ cần đọc, không cần sửa. |
| `wiki/index.md` | Mục lục — muốn biết wiki có gì thì mở file này. |
| `wiki/log.md` | Nhật ký — ghi lại AI đã làm gì, vào ngày nào. |
| `wiki/overview.md` | Trang tổng quan — tóm tắt toàn bộ kiến thức hiện có. |
| `CLAUDE.md` | Quy tắc làm việc cho AI (bạn không cần đọc). |
| `HUONG-DAN.md` | Chính là file này. |

## Cách đưa tài liệu cho AI (3 cách, chọn cách dễ nhất)

**Cách 1 — Gửi thẳng trong khung chat (dễ nhất):**
Kéo thả file (ảnh, PDF, Word, txt...) vào khung chat, hoặc dán nội dung
bài viết / đường link vào tin nhắn, rồi nói: **"ingest cái này"** hoặc
**"xử lý tài liệu này vào wiki"**.

**Cách 2 — Tải lên GitHub:**
1. Mở repo trên GitHub, vào thư mục `knowledge-wiki/raw/`
2. Bấm nút **"Add file"** → **"Upload files"**
3. Chọn file từ máy tính → bấm **"Commit changes"** (nút màu xanh)
4. Quay lại chat, nói: **"tôi đã tải file lên raw rồi, ingest đi"**

**Cách 3 — Nếu bạn quen dùng git trên máy:**
Chép file vào thư mục `knowledge-wiki/raw/`, rồi chạy:
```
git add .
git commit -m "them tai lieu moi"
git push
```
Sau đó báo AI: **"ingest file mới trong raw đi"**.

## Các câu lệnh nói với AI (bằng tiếng Việt bình thường)

| Bạn muốn gì | Nói với AI thế nào |
|---|---|
| Thêm kiến thức mới | "Ingest tài liệu này" / "Đọc và ghi vào wiki" |
| Hỏi đáp | Cứ hỏi bình thường, ví dụ: "App này xin những quyền gì?" |
| Kiểm tra wiki | "Lint wiki đi" / "Kiểm tra wiki có lỗi gì không" |
| Xem wiki có gì | "Trong wiki có gì?" |
| Lưu câu trả lời hay | "Lưu câu trả lời này vào wiki" |

## Lưu ý quan trọng

- **Đừng sửa tay** các file trong `wiki/` — để AI quản lý, tránh mâu thuẫn.
- **Đừng xoá** file trong `raw/` — đó là nguồn gốc để đối chiếu.
- Kiến thức chỉ được lưu lâu dài khi đã **push lên GitHub** — nếu làm
  việc trong phiên Claude Code trên web, AI sẽ tự commit + push giúp bạn.
