# BẢNG KIỂM TRƯỚC KHI ĐĂNG VIDEO LÊN TIKTOK

Soi đủ 12 dòng này rồi mới bấm đăng. Xếp từ nguy hiểm nhất xuống.
Cách soi: mở thư mục `work/soi-ban-cuoi/` xem từng ảnh, và xem lại video thành phẩm một lượt.

| # | Việc phải soi | Thế nào là ĐẠT |
|---|---|---|
| 1 | Xem có lộ tên thật, số điện thoại, mã tài khoản của khách trên màn hình không. | ĐẠT khi cuộn hết đoạn quay màn hình mà không đọc ra được chữ nào của khách. |
| 2 | Nghe lại xem người nói có đọc tên khách ra miệng không. | ĐẠT khi cả video không nghe thấy tên riêng của khách nào. |
| 3 | Đọc chữ phụ đề ở giây đầu tiên, đặc biệt chữ hiện ngay giây 0. | ĐẠT khi không có chữ nào sai chính tả ngay từ câu mở đầu. |
| 4 | Đọc lại tên thương hiệu và tên người trong phụ đề. | ĐẠT khi Zalo, TikTok, tên anh Hoàn... viết đúng từng chữ. |
| 5 | Xem khung hình giây 0,0 — nền tảng lấy đúng khung này làm ảnh đại diện. | ĐẠT khi thấy rõ mặt người nói và chữ tiêu đề không đè lên mặt. |
| 6 | Xem 3 giây đầu và 3 giây cuối có logo lạ không. | ĐẠT khi không thấy logo CapCut, không có màn hình đen thừa ở cuối. |
| 7 | Xem chữ có bị tràn ra ngoài mép khung không. | ĐẠT khi mọi dòng chữ nằm gọn trong khung, còn chừa lề hai bên. |
| 8 | Xem các hình minh hoạ có mặt người lạ cận cảnh không. | ĐẠT khi hình minh hoạ chỉ có đồ vật, bàn tay hoặc khung cảnh. |
| 9 | Xem có hình minh hoạ nào che mất đoạn quay màn hình không. | ĐẠT khi đoạn trình bằng chứng hiện nguyên vẹn, không bị đè. |
| 10 | Xem hình minh hoạ có lộ cảnh nước ngoài không. | ĐẠT khi biển hiệu, đường phố trong hình nhìn ra là Việt Nam. |
| 11 | Đọc dòng máy in ra sau khi dựng để biết nhạc có át giọng không. | ĐẠT khi nhạc thấp hơn giọng 18–25 dB và chỗ to nhất dưới −1 dB. |
| 12 | Đọc lại câu chốt cuối xem có đúng lời người nói trong video không. | ĐẠT khi câu chốt bám nguyên ý người nói và chỉ bảo khách làm MỘT việc. |

---

## Ba dòng nguy hiểm nhất — nếu vội thì soi bằng được 1, 2, 3

- **Dòng 1 và 2** là lộ thông tin khách. Lộ rồi thì gỡ video cũng đã có người xem.
  Nếu lộ: mờ **cả khung hình** suốt đoạn đó, đừng che bằng một ô vuông — trang trôi lúc cuộn là ô che trượt ra ngoài, chắc chắn sót.
  Cách tốt nhất về lâu dài: **quay lại đoạn trình bằng chứng với một khách hàng giả/mẫu**, vừa an toàn vừa dùng lại được mãi.
- **Dòng 3** là chữ đầu tiên khách đọc. Đã từng có video viết *"Thật không thể tin lỗi"* thay vì *"tin nổi"*, chạy suốt nhiều bản dựng mà không ai để ý.

## Sai thì sửa ở đâu

- Sai chữ phụ đề, cần che tên khách trong chữ: sửa ở mục `sua_chu` trong file `work/de-xuat-cat.json`.
- Cần che vùng lộ thông tin: sửa ở mục `lam_mo` trong cùng file đó.
- Có logo lạ đầu/cuối video: ghi mốc giây đó vào mục `khoang_lang` để cắt bỏ.
- Hình minh hoạ không ưng: xoá thư mục `work/broll/` rồi đổi từ khoá, chạy lại.

Sửa xong **chỉ cần chạy lại bước dựng**, không phải làm lại từ đầu.
