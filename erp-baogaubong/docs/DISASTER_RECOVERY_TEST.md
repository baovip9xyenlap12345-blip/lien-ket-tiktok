# BIÊN BẢN THỬ KHÔI PHỤC DỮ LIỆU (DISASTER RECOVERY TEST)

- **Ngày thử:** 23/07/2026 16:58 UTC
- **Người thực hiện:** AI builder (phiên GĐ10), môi trường staging cục bộ
- **Kịch bản:** mất toàn bộ database → khôi phục từ bản sao lưu hằng ngày

## Các bước đã thực hiện (đúng quy trình scripts/backup.sh + restore.sh)

1. **Sao lưu**: `pg_dump -Fc erp_dev > db-20260723-165812.dump` → file **443 KB** tạo thành công.
2. **Đối chiếu số liệu GỐC** trước khi khôi phục (5 chỉ số kiểm soát):

   | Chỉ số | Giá trị gốc |
   |---|---|
   | Số đơn hàng (SalesOrder) | 47 |
   | Số chứng từ tiền (CashTransaction) | 127 |
   | Số chứng từ kho (StockMovement) | 71 |
   | Số đối tác (Partner) | 53 |
   | **Tổng tiền tất cả đơn** | **13.155.840 đ** |

3. **Khôi phục sang database staging mới** `erp_restore_test`:
   `dropdb → createdb → pg_restore --no-owner` — chạy không lỗi.
4. **Đối chiếu số liệu SAU khôi phục:**

   | Chỉ số | Sau khôi phục | Khớp? |
   |---|---|---|
   | Số đơn hàng | 47 | ✅ |
   | Số chứng từ tiền | 127 | ✅ |
   | Số chứng từ kho | 71 | ✅ |
   | Số đối tác | 53 | ✅ |
   | Tổng tiền tất cả đơn | 13.155.840 đ | ✅ |

## Kết luận

- **KHÔI PHỤC THÀNH CÔNG — 5/5 chỉ số khớp tuyệt đối, kể cả tổng tiền.**
- Thời gian khôi phục thực tế: < 1 phút với dữ liệu hiện tại.
- File uploads: sao lưu bằng `tar` trong cùng script (thư mục uploads gắn volume riêng trong compose).

## Ghi chú vận hành

- Backup tự động hằng ngày qua service `backup` trong docker-compose.prod.yml; retention 14 ngày (`BACKUP_RETENTION_DAYS`).
- Bật mã hóa bằng `BACKUP_GPG_PASSPHRASE` khi đưa file backup ra khỏi máy chủ (khuyến nghị bắt buộc nếu đẩy lên cloud).
- Nên chép bản backup ra NƠI THỨ HAI (ổ cứng rời / cloud) — backup nằm cùng máy chủ không chống được cháy/mất máy.
- Lịch thử khôi phục định kỳ khuyến nghị: mỗi quý 1 lần, cập nhật biên bản này.
