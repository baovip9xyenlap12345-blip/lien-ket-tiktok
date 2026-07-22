# App quản lý xưởng gấu bông Bảo Bảo (kiểu KiotViet)

## File chính
- `baobao-app.html` — app hoàn chỉnh (mở bằng trình duyệt). Có: POS bán hàng, hóa đơn, công nợ,
  nhập hàng, sổ quỹ, nhân viên/lương, báo cáo, ĐĂNG NHẬP + PHÂN QUYỀN + ĐỒNG BỘ NHIỀU MÁY.
- `Code.gs` — máy chủ đồng bộ, dán vào script.google.com (hướng dẫn nằm đầu file).
- `app_template.html` + `products_seed.json` — mã nguồn (build: thay __PRODUCTS_JSON__ bằng nội dung products_seed.json).

## Phân quyền
admin (toàn quyền) · sale (POS, hóa đơn, khách, hàng hóa - ẩn giá vốn) · kho (hàng hóa, nhập hàng) · ketoan (sổ quỹ, lương, báo cáo).
Tài khoản do admin tạo trong app: ⚙️ Cài đặt → Tài khoản nhân viên.

## Cài đồng bộ (1 lần)
1. script.google.com → dự án mới → dán Code.gs → đổi ADMIN_PASS.
2. Deploy → New deployment → Web app → Execute as: Me · Access: Anyone → copy link /exec.
3. Mở app → ⚙️ Cài đặt → dán link → Lưu & đăng nhập (admin / mật khẩu đã đổi).
4. Các máy khác + điện thoại: mở cùng file app → dán cùng link → đăng nhập tài khoản được cấp.
Lưu ý: bản đồng bộ phải dùng FILE baobao-app.html (link claude.ai bị chặn gọi ra ngoài).

## Bộ file Excel/Google Sheets đã làm cùng ngày
build_tonghop.py (thu chi + lợi nhuận + mua hàng theo ngày), build_baogia2.py (báo giá khách),
build_chiphi2.py, build_muahang.py, build_csv.py — chạy `python3 <file>.py` là ra file .xlsx.

Dữ liệu giá gốc: `data_gau.py` — trích từ Google Sheet "Bảng Giá Sỉ SP baogaubong.vn" (21/07/2026).
