# Nhật ký (Log)

File append-only, ghi lại lịch sử hoạt động của wiki. Mỗi mục bắt đầu bằng
`## [YYYY-MM-DD] <ingest|query|lint> | <mô tả ngắn>` để có thể lọc bằng
`grep "^## \[" wiki/log.md | tail -5`.

## [2026-07-05] setup | Khởi tạo cấu trúc knowledge-wiki (raw/, wiki/, CLAUDE.md)
## [2026-07-05] ingest | index.html, privacy.html, tos.html, TikTok site verification (4 nguồn từ repo lien-ket-tiktok) → tạo 1 entity (lien-ket-tiktok-app), 2 concept (tiktok-api-scopes, tiktok-developer-verification), cập nhật overview.md và index.md
