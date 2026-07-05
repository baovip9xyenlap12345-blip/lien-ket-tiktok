# raw/ — Nguồn gốc (bất biến)

Đặt các tài liệu gốc vào đây: bài viết, PDF, ảnh, dữ liệu thô...

Quy tắc:
- Không sửa/xoá nội dung trong thư mục này sau khi đã thêm vào — đây là
  nguồn sự thật (source of truth) để đối chiếu.
- Ảnh/tệp đính kèm của một nguồn đặt trong `assets/`.
- Sau khi thêm nguồn mới, yêu cầu LLM "ingest" để tích hợp vào `wiki/`.

## Ghi chú

Nguồn ingest đầu tiên (05/07/2026) là các file web đang chạy thực tế ở
root repo (`index.html`, `privacy.html`, `tos.html`, file xác minh TikTok
Developer) — không copy vào đây vì di chuyển sẽ làm hỏng website. Các
trang trong `wiki/sources/` trỏ thẳng tới đường dẫn gốc của chúng. Nguồn
tương lai (bài viết, PDF, ảnh...) nên đặt trực tiếp trong thư mục này.
