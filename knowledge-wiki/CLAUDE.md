# Knowledge Wiki — Sơ đồ (Schema)

Thư mục này là một **persistent wiki**: thay vì tra cứu lại tài liệu gốc mỗi lần
có câu hỏi (kiểu RAG truyền thống), LLM đọc nguồn mới, rút ra thông tin quan
trọng, rồi **tích hợp** vào một wiki markdown có cấu trúc, liên kết chéo và
được cập nhật liên tục. Kiến thức được tổng hợp một lần và giữ cho luôn mới,
thay vì suy luận lại từ đầu mỗi câu hỏi.

## 3 lớp dữ liệu

1. **`raw/`** — Nguồn gốc, **bất biến**. Bài viết, PDF, ảnh, dữ liệu thô.
   LLM chỉ đọc, **không bao giờ sửa** nội dung trong thư mục này.
2. **`wiki/`** — Do LLM tạo và duy trì toàn bộ. Gồm trang tổng quan, trang
   thực thể (entity), trang khái niệm (concept), trang so sánh/tổng hợp.
   Người dùng đọc; LLM viết.
3. **`CLAUDE.md`** (file này) — Quy ước và quy trình làm việc. Cùng người
   dùng chỉnh sửa dần khi tìm ra cách vận hành phù hợp.

## Cấu trúc thư mục

```
knowledge-wiki/
├── CLAUDE.md            # file này
├── raw/                 # nguồn gốc, bất biến
│   ├── README.md
│   └── assets/          # ảnh/tệp đính kèm tải về local
└── wiki/
    ├── index.md         # mục lục nội dung — cập nhật mỗi lần ingest
    ├── log.md           # nhật ký theo thời gian — append-only
    ├── overview.md       # trang tổng hợp cấp cao nhất
    ├── sources/         # 1 trang tóm tắt / nguồn đã ingest
    ├── entities/        # trang cho người, tổ chức, sản phẩm...
    ├── concepts/        # trang cho khái niệm, chủ đề
    └── synthesis/       # so sánh, phân tích, câu trả lời đáng lưu lại
```

## Quy ước trang wiki

- Mỗi trang là 1 file `.md`, tên file dùng `kebab-case` (vd: `nguyen-van-a.md`).
- Đầu mỗi trang có YAML frontmatter tối thiểu:
  ```yaml
  ---
  title: <tên trang>
  type: source | entity | concept | synthesis
  created: YYYY-MM-DD
  updated: YYYY-MM-DD
  sources: [<tên file trong raw/ hoặc trang khác>]
  tags: []
  ---
  ```
- Liên kết chéo giữa các trang dùng link markdown tương đối, vd:
  `[Trang X](../entities/trang-x.md)`. Mỗi trang nên có ít nhất 1 liên kết
  đến/từ trang khác — tránh orphan page.
- Khi thông tin mới mâu thuẫn với thông tin cũ, **không xoá** thông tin cũ —
  ghi chú rõ mâu thuẫn (nguồn nào nói gì, ngày nào) rồi để người dùng quyết
  định cách giải quyết.

## Quy trình (Operations)

### 1. Ingest (nạp nguồn mới)
1. Nguồn mới được thêm vào `raw/` (và ảnh liên quan vào `raw/assets/`).
2. LLM đọc nguồn, tóm tắt các điểm chính, thảo luận với người dùng nếu cần.
3. Viết/cập nhật trang tóm tắt trong `wiki/sources/`.
4. Cập nhật các trang `entities/` và `concepts/` liên quan (có thể chạm
   10–15 trang với 1 nguồn).
5. Cập nhật `wiki/index.md`.
6. Thêm 1 dòng vào `wiki/log.md` theo định dạng:
   `## [YYYY-MM-DD] ingest | <tên nguồn>`

### 2. Query (trả lời câu hỏi)
1. Đọc `wiki/index.md` trước để tìm trang liên quan, sau đó mở trang cụ thể.
2. Tổng hợp câu trả lời kèm trích dẫn (link tới trang/nguồn).
3. Nếu câu trả lời có giá trị lâu dài (so sánh, phân tích, phát hiện mới),
   đề xuất lưu lại thành trang mới trong `wiki/synthesis/` thay vì để mất
   trong lịch sử chat.
4. Ghi 1 dòng vào `log.md`: `## [YYYY-MM-DD] query | <câu hỏi ngắn gọn>`

### 3. Lint (kiểm tra sức khoẻ wiki)
Định kỳ, khi được yêu cầu "lint wiki" hoặc "health-check", kiểm tra:
- Mâu thuẫn giữa các trang.
- Thông tin cũ đã bị nguồn mới thay thế nhưng chưa cập nhật.
- Trang mồ côi (không có liên kết đến/từ trang nào khác).
- Khái niệm quan trọng được nhắc tới nhiều lần nhưng chưa có trang riêng.
- Thiếu liên kết chéo giữa các trang liên quan.
- Ghi kết quả lint vào `log.md`: `## [YYYY-MM-DD] lint | <tóm tắt phát hiện>`

## `index.md` và `log.md`

- **`index.md`** hướng theo nội dung: liệt kê mọi trang theo nhóm
  (sources / entities / concepts / synthesis), mỗi dòng gồm link + tóm tắt
  1 câu + ngày cập nhật.
- **`log.md`** hướng theo thời gian, append-only. Mỗi mục bắt đầu bằng
  `## [YYYY-MM-DD] <ingest|query|lint> | <mô tả ngắn>` để có thể lọc bằng
  lệnh đơn giản, vd: `grep "^## \[" wiki/log.md | tail -5`.
