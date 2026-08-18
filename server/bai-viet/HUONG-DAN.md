# Cách viết bài trong thư mục này

Mỗi file `.md` trong thư mục này = một bài viết trên web.
Chép file `MAU-bai-viet.md` ra, đổi tên, sửa nội dung là xong.

## Khối thông tin ở đầu bài

Đặt ngay dưới dòng tiêu đề, mỗi dòng một mục, hết khối thì để một dòng trống:

| Dòng | Tác dụng | Bắt buộc |
|---|---|---|
| `Chuyên mục:` | Chuyên mục blog. Chưa có thì tự tạo. Nhiều mục ngăn bằng dấu phẩy | Không |
| `Thẻ:` | Các thẻ, ngăn bằng dấu phẩy. Chưa có thì tự tạo | Không |
| `Mô tả:` | Đoạn tóm tắt hiện trên Google | Nên có |
| `Ảnh bìa:` | Tên file ảnh trong thư mục ảnh | Không |
| `Đường dẫn:` | Địa chỉ bài. Bỏ trống thì tự tạo từ tiêu đề | Không |

## Cách viết nội dung

| Gõ | Ra web |
|---|---|
| `## Tiêu đề mục` | Tiêu đề lớn |
| `### Tiêu đề nhỏ` | Tiêu đề nhỏ |
| `- gạch đầu dòng` | Danh sách |
| `**chữ đậm**` | Chữ in đậm |
| `> câu trích` | Khối trích dẫn |
| `[ANH]` | Chèn ảnh vào đúng chỗ đó |

## Chạy lệnh

Đăng một bài, lưu nháp để xem trước:

```
node wp-dang-bai.js --bai bai-viet\ten-file.md --anh "F:\Ảnh sản phẩm"
```

Đăng cả thư mục, mỗi file một bài:

```
node wp-dang-bai.js --thu-muc bai-viet --anh "F:\Ảnh sản phẩm"
```

Thêm `--dang` để công khai ngay, hoặc `--lich "2026-09-01 08:00"` để hẹn giờ.
Thêm `--thu` để xem trước mà không đụng vào website.

Chạy lại **không tạo bài trùng** — nó cập nhật đúng bài cũ theo đường dẫn.
