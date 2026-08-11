# 05 — LỖI ĐÃ DÍNH THẬT VÀ CÁCH CHỮA

> Mọi lỗi trong trang này đều **đã xảy ra thật** trong lúc dựng bộ này. Đọc trước cho đỡ mất thời gian.

---

## A. LỖI LÀM MÁY TREO HOẶC SẬP

### 1. Chữ có dấu làm sập ngay lúc chạy
**Triệu chứng:** vừa gõ lệnh là báo lỗi `UnicodeEncodeError`.
**Chữa:** gõ `set PYTHONUTF8=1` **trước**, mỗi lần mở cửa sổ đen mới.

### 2. ffmpeg chạy mãi không dứt — TREO THẬT ⚠️
**Triệu chứng:** máy chạy 10 phút, 20 phút, không ra gì, file kết quả 0 byte.
**Nguyên nhân:** trong chuỗi xử lý có **nguồn sinh vô hạn** — nhạc lặp vô tận (`-stream_loop -1`), ảnh lặp (`-loop 1`), đệm im lặng (`apad`). Không chặn thì nó chạy đến hết đời.
**Chữa:** phải chặn bằng `-t <số giây>` **ở mức lệnh**, không được tin vào bộ lọc cắt bên trong.

> **Đã dính HAI LẦN.** Lần một với `-shortest`, lần hai với `apad` — chạy **578 giây CPU** không dứt, phải tắt tay.
> **Luật rút ra:** hễ chuỗi lọc có nguồn sinh vô hạn thì **phải có `-t`**. Kiểm trước khi chạy.

### 3. Card đồ hoạ làm ffmpeg sập
**Triệu chứng:** sập ngay lập tức, báo lỗi truy cập bộ nhớ.
**Chữa:** bộ này **cố ý dùng CPU**, không dùng card. Chậm hơn nhưng ổn định tuyệt đối. Đừng bật lại.

### 4. Mốc thời gian ra số âm làm ffmpeg sập
**Triệu chứng:** sập với công thức chứa `t--0.05` (hai dấu trừ dính nhau).
**Chữa:** đã chặn sẵn trong mã. Nhắc lại đây phòng khi sửa mã.

---

## B. LỖI HÌNH ẢNH

### 5. Chữ tiêu đề che kín mặt người nói
**Nguyên nhân:** chữ dài bị bọc xuống thành 4 dòng, hộp cao gấp đôi.
**Chữa:** đã tự thu nhỏ cỡ chữ cho vừa **tối đa 2 dòng**, và dời hộp lên 22% chiều cao. Vẫn nên viết hook **ngắn dưới 14 chữ**.

### 6. Phụ đề mất dấu tiếng Việt, hiện ra ô vuông
**Nguyên nhân:** dùng phông Arial Black (`ariblk.ttf`) — thiếu ký tự cho vài dấu tổ hợp (ộ, ầ).
**Chữa:** đã đổi sang Arial Bold (`arialbd.ttf`). Đừng đổi phông nếu không kiểm dấu trước.

### 7. Chữ tràn ra ngoài khung
**Nguyên nhân:** bản đầu chỉ đếm **số từ**, không đo **độ rộng thật** của chữ.
**Chữa:** đã đo độ rộng thật. Ghi lại phòng khi sửa mã.

### 8. Hình minh hoạ toàn màn che mất phụ đề
**Nguyên nhân:** xếp sai thứ tự chồng lớp.
**Chữa:** thứ tự đúng là **hình minh hoạ dưới → phụ đề trên → hook/câu chốt trên cùng**.

### 9. Hình minh hoạ tối hơn hẳn phần người nói
**Nguyên nhân:** hình minh hoạ chèn vào **sau** khâu làm sáng nên không ăn theo.
**Chữa:** đã làm sáng riêng cho hình minh hoạ, đúng bằng mức của video chính.

### 10. Hình minh hoạ hiện ra rồi bị câu chốt cuối che ngay
**Chữa:** đã có chốt chặn tự cắt ngắn hình minh hoạ để không lấn vùng câu chốt.

### 11. Video thô có logo CapCut ở cuối
**Chữa:** chạy **bước 0 `soi`** trước mọi thứ. Thấy logo thì thêm mốc đó vào `khoang_lang`.

---

## C. LỖI ÂM THANH

### 12. Nhạc lên xuống theo giọng nói nghe khó chịu
**Chuyện đã xảy ra:** từng thêm tính năng nhạc **tự tụt khi người nói, tự dâng khi nghỉ**. Tài liệu nghề khen kỹ thuật này. Nhưng chủ não nghe thật thì thấy khó chịu, bắt bỏ.
**Chữa:** nhạc để **một mức đều 0,18**, không lên không xuống.
> **Bài học:** tài liệu đúng về kỹ thuật, nhưng **người quyết là người nghe**.

### 13. Nhạc át giọng, hoặc nhạc lí nhí
**Chữa:** script tự đo và in ra. Nhạc nên thấp hơn giọng **18–25 dB**. Ngoài khoảng đó thì nó tự cảnh báo.

### 14. Tiếng động chuyển cảnh nghe rẻ tiền
**Nguyên nhân:** đánh tiếng vào quá nhiều chỗ — từng đánh **28 chỗ trong 100 giây**.
**Chữa:** chỉ đánh vào **chỗ đổi hình minh hoạ**, cỡ 8–10 chỗ. Thấy vẫn nhiều thì `--khong-tieng-dong`.

---

## D. LỖI NGUY HIỂM NHẤT — không kêu tiếng nào

### 15. ⚠️ Phụ đề sai chính tả chạy suốt nhiều bản dựng
**Vì sao nguy hiểm:** máy chạy êm, không báo lỗi gì. Video nhìn đẹp. Nhưng chữ hiện lên sai.

> **Đã dính thật: 7 lỗi.** Nặng nhất là *"Thật không thể **tin lỗi**"* ở **giây 0** (chữ đầu tiên khách đọc, đúng ra là *"tin nổi"*), và *"điều khiển được **gia lô**"* ở giây 1,4 — **sai tên sản phẩm Zalo**. Còn có *"Anh **Hoàng** ơi"* trong khi tên người là **Hoàn**.

**Chữa:** **luôn đọc lại bản bóc lời**, điền `sua_chu`. Máy bóc lời nghe nhầm nhiều nhất ở: tên riêng · tên thương hiệu · từ địa phương.

### 16. ⚠️ Lộ thông tin người thật trên màn hình
> **Đã dính thật:** video demo lộ **tên thật + mã tài khoản + nghề nghiệp + nội dung trò chuyện riêng** của một khách hàng. Soi 6 khung hình mới thấy nó hiện ở **ba chỗ khác nhau** và **trôi theo lúc cuộn trang**.

**Chữa:** trích khung hình rải khắp đoạn quay màn hình rồi **đọc tận mắt**. Có lộ thì:
1. Mờ **cả khung** suốt đoạn đó — ô cố định là chắc chắn sót vì trang trôi
2. Thay tên trong phụ đề bằng `[ẩn tên]` qua `sua_chu`
3. ⚠️ **Kiểm cả tiếng nói** — nếu người nói đọc tên khách ra miệng thì mờ hình không đủ
4. **Cách tốt nhất: quay lại đoạn demo với khách hàng giả/mẫu.** Vừa giữ được sức thuyết phục, vừa an toàn, vừa dùng lại được mãi.

### 17. ⚠️ Khai vùng làm mờ mà không mờ gì cả, không báo lỗi
**Nguyên nhân:** hàm dịch mốc thời gian **im lặng trả về "không có gì"** khi vùng dài cắt qua nhiều đoạn.
**Chữa:** đã sửa.
> **Luật rút ra:** hàm bỏ qua cái gì thì **phải in ra dòng báo**. Bỏ qua im lặng là loại lỗi tệ nhất — không ai biết mà sửa.

---

## E. CÁCH DÒ LỖI CHO NHANH

**Thử riêng từng khâu nhỏ trước, đừng chạy cả bài rồi chờ.**

Ví dụ thật: khâu ghép tiếng động chạy riêng mất **0,1 giây**. Nếu cứ chạy cả video thì phải chờ **10 phút** mới biết nó treo ở đâu.

Trước khi dựng cả video, thử riêng:
- Tải hình minh hoạ → xem hình có hợp không
- Ghép tiếng động → xem file có ra không
- Vẽ hook → trích ảnh xem chữ có che mặt không
