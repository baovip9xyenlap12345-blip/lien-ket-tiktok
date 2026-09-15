---
title: "TikTok API Scopes"
type: concept
created: 2026-07-05
updated: 2026-07-05
sources: [../sources/index-html.md]
tags: [tiktok, api, oauth, scopes]
---

# TikTok API Scopes

"Scope" là quyền truy cập cụ thể mà người dùng cấp cho ứng dụng khi ủy
quyền qua TikTok OAuth. [Lien Ket TikTok](../entities/lien-ket-tiktok-app.md)
sử dụng 3 scope sau (nguồn: [index.html](../sources/index-html.md)):

| Scope | Mô tả | Tính năng tương ứng |
|---|---|---|
| `user.info.profile` | Đọc thông tin hồ sơ | Thông tin người dùng |
| `user.info.stats` | Xem thống kê tài khoản | Thống kê tài khoản |
| `video.list` | Lấy danh sách video | Danh sách video |

Người dùng có thể thu hồi các quyền này bất cứ lúc nào qua
**TikTok → Cài đặt → Bảo mật → Ứng dụng được kết nối** (theo
[Chính sách Bảo mật](../sources/privacy-html.md), mục 6).

## Liên kết liên quan

- Entity: [Lien Ket TikTok (ứng dụng)](../entities/lien-ket-tiktok-app.md)
- Concept: [Xác minh Domain TikTok Developer](tiktok-developer-verification.md)
