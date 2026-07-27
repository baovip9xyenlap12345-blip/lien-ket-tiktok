# 🎡 Vòng Quay May Mắn — Nền tảng khuyến mãi giảm giá đa cửa hàng

Ứng dụng web cho phép **bạn (chủ app)** cung cấp dịch vụ "vòng quay may mắn nhận mã giảm giá" cho nhiều chủ cửa hàng (quán cà phê, nhà hàng, shop...). Khách hàng của họ nhập tên, số điện thoại, email để quay và nhận quà — toàn bộ data khách hàng được lưu lại.

## 3 cấp tài khoản

| Vai trò | Quyền |
|---|---|
| **Quản trị viên (bạn)** | Xem/quản lý tất cả cửa hàng, tất cả chủ cửa hàng, **toàn bộ data khách hàng của mọi cửa hàng**, khóa/mở cửa hàng, xuất toàn bộ CSV |
| **Chủ cửa hàng** | Cài đặt tên quán, phần quà, mã giảm giá, tỷ lệ trúng %, số lượng quà, giới hạn lượt quay/ngày; xem khách hàng + lịch sử quay của quán mình; xuất CSV |
| **Khách hàng** | Vào link `/w/ten-quan`, nhập tên + SĐT + email, quay vòng quay, nhận mã giảm giá |

## Tính năng chính

- 🎯 Chủ quán tự đặt **tỷ lệ trúng (%)** và **số lượng** từng phần quà — hết quà tự ngừng trúng
- 🎟️ Khách trúng nhận **mã giảm giá** ngay trên màn hình (bấm để sao chép)
- 🛡️ Kết quả quay xử lý **tại máy chủ** — không thể gian lận; giới hạn lượt quay/SĐT/ngày
- 🔗 Mỗi quán có link riêng + nút tạo mã QR để in dán tại quán
- 📋 Xuất data khách hàng ra **CSV (mở bằng Excel)** — hỗ trợ tiếng Việt
- 📱 Giao diện tiếng Việt, chạy mượt trên điện thoại, không cần cài app

## Chạy thử trên máy (yêu cầu Node.js ≥ 22.13)

```bash
cd lucky-wheel
npm install
npm start
# Mở http://localhost:3000
```

Lần chạy đầu tiên, hệ thống tự tạo tài khoản quản trị viên:
- Email: `admin@vongquay.local` — Mật khẩu: `admin123`

⚠️ **Khi đưa lên mạng, BẮT BUỘC đặt biến môi trường để đổi tài khoản admin:**

```bash
ADMIN_EMAIL=email-cua-ban@gmail.com ADMIN_PASSWORD=mat-khau-manh npm start
```

(Biến này chỉ có tác dụng ở lần khởi động đầu tiên khi chưa có admin. Sau đó đổi mật khẩu trong phần Cài đặt.)

## Đưa lên Internet (chọn 1 trong các cách)

Ứng dụng cần máy chủ Node.js (không chạy được trên GitHub Pages vì cần lưu dữ liệu).

### Cách 1: Render.com (miễn phí, dễ nhất)
1. Đăng ký [render.com](https://render.com) → **New Web Service** → kết nối repo GitHub này
2. Root Directory: `lucky-wheel` — Build: `npm install` — Start: `npm start`
3. Thêm **Persistent Disk** (1GB) gắn vào đường dẫn `/data`, và đặt biến môi trường:
   - `DATA_DIR=/data`
   - `ADMIN_EMAIL=email-cua-ban@gmail.com`
   - `ADMIN_PASSWORD=mat-khau-manh-cua-ban`
   - `SESSION_SECRET=chuoi-ngau-nhien-dai-bat-ky`

### Cách 2: Railway.app / Fly.io
Tương tự Render — trỏ vào thư mục `lucky-wheel`, thêm volume lưu trữ và đặt `DATA_DIR` vào volume đó.

### Cách 3: VPS (Ubuntu) — dùng lâu dài, thương mại
```bash
# Cài Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
git clone <repo-cua-ban> && cd lien-ket-tiktok/lucky-wheel
npm install
# Chạy 24/7 bằng pm2
sudo npm i -g pm2
ADMIN_EMAIL=ban@gmail.com ADMIN_PASSWORD=matkhaumanh pm2 start server.js --name vongquay
pm2 save && pm2 startup
# Trỏ tên miền + cài Nginx/Caddy làm reverse proxy + HTTPS
```

### Cách 4: Docker
```bash
cd lucky-wheel
docker build -t vongquay .
docker run -d -p 3000:3000 -v vongquay-data:/data \
  -e DATA_DIR=/data -e ADMIN_EMAIL=ban@gmail.com -e ADMIN_PASSWORD=matkhaumanh \
  --name vongquay vongquay
```

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | Cổng chạy web |
| `DATA_DIR` | `./data` | Thư mục lưu cơ sở dữ liệu SQLite |
| `ADMIN_EMAIL` | `admin@vongquay.local` | Email admin (chỉ áp dụng lần khởi tạo đầu) |
| `ADMIN_PASSWORD` | `admin123` | Mật khẩu admin (chỉ áp dụng lần khởi tạo đầu) |
| `SESSION_SECRET` | tự sinh | Khóa mã hóa phiên đăng nhập |

## Lưu ý pháp lý khi kinh doanh

- Ứng dụng thu thập thông tin cá nhân (tên, SĐT, email). Khi kinh doanh tại Việt Nam, bạn cần tuân thủ **Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân**: công khai chính sách bảo mật, xin sự đồng ý của khách, và không mua bán dữ liệu.
- Chương trình khuyến mãi quy mô lớn có thể phải đăng ký với Sở Công Thương theo Luật Thương mại.

## Cấu trúc mã nguồn

```
lucky-wheel/
├── server.js          # Toàn bộ backend: API, database SQLite, xử lý quay
├── package.json
├── Dockerfile
└── public/
    ├── index.html     # Trang giới thiệu
    ├── register.html  # Đăng ký chủ cửa hàng
    ├── login.html     # Đăng nhập (chủ cửa hàng + admin)
    ├── dashboard.html # Bảng điều khiển chủ cửa hàng
    ├── admin.html     # Bảng điều khiển quản trị viên
    ├── wheel.html     # Trang vòng quay cho khách (/w/:slug)
    └── style.css
```
