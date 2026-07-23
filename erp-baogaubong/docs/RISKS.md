# DANH SÁCH RỦI RO CÒN LẠI (sau GĐ10) — cập nhật 23/07/2026

> Trung thực theo yêu cầu spec: không tuyên bố "sẵn sàng production" khi chưa nêu rõ rủi ro.
> Trạng thái kiểm thử tại thời điểm lập: lint 0 lỗi · typecheck 0 lỗi · unit 81/81 · E2E 8 phân hệ
> toàn xanh (đối chiếu tính tay, concurrency, idempotency, IDOR) · build production OK ·
> thử khôi phục backup THÀNH CÔNG (DISASTER_RECOVERY_TEST.md).

## CRITICAL (phải xử lý trước khi vận hành thật)
| # | Rủi ro | Kế hoạch |
|---|---|---|
| C1 | Mật khẩu demo `Baobao@2026` và seed dev nếu lỡ chạy trên production | Dùng `scripts/create-admin.ts` (từ chối chạy khi đã có user); KHÔNG chạy `db:seed` trên prod — đã ghi to trong DEPLOYMENT.md; anh Bảo đổi mật khẩu admin ngay lần đầu đăng nhập |
| C2 | Backup nằm cùng máy chủ — cháy/mất VPS là mất cả backup | Mỗi tuần tải bản backup về máy khác (đã hướng dẫn); bước tiếp: đẩy tự động lên cloud lưu trữ (cần tài khoản của anh Bảo) |

## HIGH
| # | Rủi ro | Kế hoạch |
|---|---|---|
| H1 | File uploads lưu đĩa cục bộ (volume Docker) — chưa dùng MinIO/S3 như kiến trúc đích | Volume đã được backup hằng ngày kèm DB; chuyển S3/MinIO khi có nhu cầu nhiều máy chủ (adapter storage đã tách sẵn, đổi driver không đổi API) |
| H2 | Webhook mới có khung nhận + idempotency + màn lỗi; CHƯA có logic nghiệp vụ per-kênh (cập nhật vận đơn tự động…) vì chưa có tài khoản nhà cung cấp | Khi anh Bảo ký GHN/GHTK…, điền API key vào .env và viết handler cho từng sự kiện (khung đã sẵn) |
| H3 | Rate limit mới có ở đăng nhập (nhân viên + portal); API khác chưa giới hạn tần suất | Đặt sau reverse proxy (Caddy có thể bật rate limit); bổ sung limiter chung nếu mở Internet rộng |

## MEDIUM
| # | Rủi ro | Kế hoạch |
|---|---|---|
| M1 | Giá vốn xuất kho chưa tính bình quân gia quyền tự động (đang dùng giá vốn khai trên biến thể — quyết định #6 chờ anh Bảo xác nhận) | Khi xác nhận, thêm cột giá trị vào StockMovement và job tính lại |
| M2 | Hoa hồng chưa có căn cứ LỢI NHUẬN (phụ thuộc M1) | Làm cùng M1 |
| M3 | TEAM scope = OWN (chưa có mô hình tổ nhóm) | Thêm bảng Team khi xưởng đông người |
| M4 | PDF sinh phía server chưa có (in/Lưu PDF qua trình duyệt hoạt động tốt) | Thêm thư viện PDF khi cần gửi file tự động qua email/Zalo |
| M5 | Hiệu năng mới kiểm với dữ liệu vài nghìn bản ghi (dashboard 53ms, báo cáo 47ms) — chưa thử mức 100 đơn/ngày × 2 năm | Index đã đặt ở các cột lọc chính; hẹn kiểm lại khi dữ liệu thật ~50k đơn, thêm phân trang/pre-aggregate nếu chậm |
| M6 | 2FA chưa có cho tài khoản admin | Cân nhắc TOTP ở bản nâng cấp bảo mật |

## LOW
| # | Rủi ro | Kế hoạch |
|---|---|---|
| L1 | Vị trí kệ trong kho chưa quản (xưởng 1 kho) | Thêm cột location khi cần |
| L2 | Trạng thái "đang chuyển" giữa 2 kho (chuyển tức thời — quyết định #24) | Làm khi mở chi nhánh 2 |
| L3 | Thùng rác mới phủ đối tác/sản phẩm/báo giá | Mở rộng dần các thực thể khác (đều đã soft-delete sẵn) |
| L4 | Email tự phục vụ "quên mật khẩu" chưa có (admin cấp lại — quyết định #7) | Làm khi cấu hình SMTP_URL |

## Ghi chú bảo mật đã rà (GĐ10)
- RBAC server-side mọi API + data scope (E2E tấn công thử: sale xem chéo, IDOR id/file, portal gọi API nội bộ — đều bị chặn).
- Cookie httpOnly + SameSite=Lax (chặn CSRF cơ bản); API nhận JSON, không dùng form action.
- Upload: giới hạn 10MB, whitelist định dạng, chặn path traversal, tải về chỉ qua API có quyền.
- Secret chỉ trong biến môi trường (.env không commit — đã kiểm tra .gitignore); log không in mật khẩu/token/PII.
- Tiền & kho: idempotency key, chứng từ bất biến, cấm âm quỹ/âm kho ở mức UPDATE có điều kiện (concurrency-safe).
