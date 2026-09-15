---
title: "Xác minh Domain TikTok Developer"
type: concept
created: 2026-07-05
updated: 2026-07-05
sources: [../sources/tiktok-site-verification.md]
tags: [tiktok, verification, developer-platform]
---

# Xác minh Domain TikTok Developer

Trước khi một ứng dụng được phép dùng TikTok API (OAuth, đọc hồ sơ/thống
kê/video...), TikTok for Developers yêu cầu chủ sở hữu chứng minh quyền
kiểm soát domain lưu trữ ứng dụng — thường bằng cách đặt một file tĩnh
có tên chứa mã xác minh do TikTok cấp tại root domain, để hệ thống TikTok
quét và đối chiếu.

Trong repo này, việc xác minh thể hiện qua cặp file
[`tiktoki4gDgwanAG67EIbhPzlByG1xcXSSwbmS.html/.txt`](../sources/tiktok-site-verification.md),
mỗi file chỉ chứa dòng:
`tiktok-developers-site-verification=i4gDgwanAG67EIbhPzlByG1xcXSSwbmS`.

## Liên kết liên quan

- Entity: [Lien Ket TikTok (ứng dụng)](../entities/lien-ket-tiktok-app.md)
- Concept: [TikTok API Scopes](tiktok-api-scopes.md)
