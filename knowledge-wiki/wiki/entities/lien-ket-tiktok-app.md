---
title: "Lien Ket TikTok (ứng dụng)"
type: entity
created: 2026-07-05
updated: 2026-07-05
sources: [../sources/index-html.md, ../sources/privacy-html.md, ../sources/tos-html.md, ../sources/tiktok-site-verification.md]
tags: [product, tiktok, api-app]
---

# Lien Ket TikTok (ứng dụng)

Ứng dụng web tích hợp **TikTok API chính thức** ("API App"), cho phép
người dùng kết nối tài khoản TikTok để xem hồ sơ, thống kê và danh sách
video của mình. Giao diện tiếng Việt, theme tối, màu nhận diện đỏ/cyan
theo bộ nhận diện TikTok.

## Tính năng chính

Nguồn: [index.html](../sources/index-html.md)

| Tính năng | Mô tả |
|---|---|
| Thông tin người dùng | Đọc hồ sơ công khai tài khoản TikTok đã xác thực |
| Thống kê tài khoản | Lượt xem, follower, lượt thích tổng hợp |
| Danh sách video | Video đã đăng kèm metadata chi tiết |

Các tính năng này ứng với 3 scope API — xem
[Khái niệm: TikTok API Scopes](../concepts/tiktok-api-scopes.md).

## Pháp lý

- [Chính sách Bảo mật](../sources/privacy-html.md) — không lưu trữ dữ
  liệu TikTok lâu dài, không bán/chia sẻ dữ liệu, HTTPS bắt buộc.
- [Điều khoản Dịch vụ](../sources/tos-html.md) — cung cấp "nguyên trạng",
  không chịu trách nhiệm về thay đổi từ phía TikTok API.
- Cả hai văn bản pháp lý cùng ghi ngày cập nhật lần cuối **01/01/2025**.

## Hạ tầng / Xác minh

- Đã xác minh quyền sở hữu domain với TikTok Developer — xem
  [Xác minh Domain TikTok Developer](../concepts/tiktok-developer-verification.md).

## Cấu trúc trang web

- `/index.html` — trang chủ (landing page)
- `/privacy.html` — chính sách bảo mật
- `/tos.html` — điều khoản dịch vụ
- File xác minh domain TikTok Developer ở root

## Khoảng trống thông tin (cần nguồn bổ sung)

- Chưa rõ backend/API endpoint thực tế xử lý OAuth TikTok (chỉ có landing
  page tĩnh trong repo hiện tại).
- Chưa có thông tin liên hệ cụ thể (email, địa chỉ) — cả `privacy.html`
  và `tos.html` chỉ nói chung chung.
