---
title: Tổng quan
type: synthesis
created: 2026-07-05
updated: 2026-07-05
sources: [sources/index-html.md, sources/privacy-html.md, sources/tos-html.md, sources/tiktok-site-verification.md]
tags: []
---

# Tổng quan

**Lien Ket TikTok** là một ứng dụng web tĩnh (landing page + 2 trang pháp
lý) giới thiệu tích hợp với TikTok API chính thức. Đây là toàn bộ nội
dung hiện có trong repo tại thời điểm ingest đầu tiên (05/07/2026).

## Các thực thể chính

- [Lien Ket TikTok (ứng dụng)](entities/lien-ket-tiktok-app.md) — sản
  phẩm trung tâm: landing page + chính sách bảo mật + điều khoản dịch vụ
  + xác minh domain TikTok Developer.

## Các khái niệm chính

- [TikTok API Scopes](concepts/tiktok-api-scopes.md) — 3 quyền
  (`user.info.profile`, `user.info.stats`, `video.list`) mà app yêu cầu.
- [Xác minh Domain TikTok Developer](concepts/tiktok-developer-verification.md)
  — cơ chế TikTok xác minh quyền sở hữu domain trước khi cấp quyền dùng API.

## Nhận định tổng hợp

- Repo hiện tại **chỉ chứa frontend tĩnh** (HTML/CSS thuần, không có
  backend/JS xử lý OAuth thực tế) — đây là landing page giới thiệu +
  trang pháp lý bắt buộc để đăng ký ứng dụng với TikTok for Developers.
- Cả `privacy.html` và `tos.html` nhất quán về mô hình dữ liệu: **không
  lưu trữ dữ liệu TikTok của người dùng lâu dài**, chỉ đọc trực tiếp từ
  API theo phiên.
- **Khoảng trống cần theo dõi**: chưa có mã nguồn backend/OAuth callback,
  chưa có thông tin liên hệ cụ thể trong 2 trang pháp lý.

## Nhật ký ingest liên quan

Xem [log.md](log.md) — mục `[2026-07-05] ingest | ...`.
