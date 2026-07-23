# HƯỚNG DẪN TRIỂN KHAI PRODUCTION — ERP BẢO GẤU BÔNG

> Dành cho người không chuyên: làm đúng theo thứ tự từng bước. Cần 1 máy chủ Ubuntu 22.04+
> (VPS 2 CPU / 4GB RAM trở lên) và 1 tên miền (VD: app.baogaubong.vn).

## 1. Cài máy chủ (làm 1 lần)

```bash
# Cài Docker
curl -fsSL https://get.docker.com | sh
# Tải mã nguồn
git clone <dia-chi-repo> && cd erp-baogaubong
# Tạo file cấu hình từ mẫu rồi ĐỔI HẾT các mật khẩu
cp .env.example .env && nano .env
```

Bắt buộc đổi trong `.env`: `DB_PASSWORD`, `SESSION_SECRET`, `WEBHOOK_SECRET`, `BACKUP_GPG_PASSPHRASE`.

## 2. Chạy hệ thống

```bash
docker compose -f docker-compose.prod.yml up -d --build
# Kiem tra song/khoe:
curl http://127.0.0.1:3000/api/health   # → {"ok":true,...}
curl http://127.0.0.1:3000/api/ready    # → {"ok":true,"db":true}
```

Migration chạy TỰ ĐỘNG khi container khởi động (`prisma migrate deploy` trong entrypoint —
an toàn, chỉ áp migration mới, không xóa dữ liệu).

## 3. Tạo tài khoản Admin đầu tiên (KHÔNG dùng seed demo!)

```bash
docker compose -f docker-compose.prod.yml exec app sh -c \
  "ADMIN_USER=chuxuong ADMIN_PASS='MatKhauRatManh!' npx tsx scripts/create-admin.ts"
```

Script chỉ chạy khi database CHƯA có người dùng nào — không ghi đè được tài khoản thật.
`prisma/seed.ts` là dữ liệu DEV/DEMO — tuyệt đối không chạy trên production.

## 4. Tên miền + HTTPS (Caddy — tự gia hạn SSL)

```bash
apt install -y caddy
cat > /etc/caddy/Caddyfile << 'EOF'
app.baogaubong.vn {
    reverse_proxy 127.0.0.1:3000
}
EOF
systemctl restart caddy
```

Trỏ DNS A record `app.baogaubong.vn` → IP máy chủ. Xong: nhân viên vào
`https://app.baogaubong.vn`, khách/đại lý vào `https://app.baogaubong.vn/portal`.

## 5. Sao lưu & khôi phục

- Tự động: service `backup` chạy hằng ngày (db + uploads, retention 14 ngày, mã hóa nếu đặt passphrase).
- Khôi phục: `sh scripts/restore.sh /backups/db-YYYYmmdd-HHMMSS.dump` — ĐÃ THỬ THẬT,
  xem bằng chứng tại `docs/DISASTER_RECOVERY_TEST.md`.
- Nên tải bản backup mới nhất về máy khác mỗi tuần.

## 6. Nâng cấp phiên bản

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build   # migration mới tự áp
```

## 7. Rollback khi bản mới lỗi

```bash
git log --oneline           # tìm commit ổn định trước đó
git checkout <commit-cu>
docker compose -f docker-compose.prod.yml up -d --build
# Nếu bản mới đã thêm migration làm hỏng dữ liệu: khôi phục DB từ backup gần nhất
sh scripts/restore.sh /backups/db-<truoc-khi-nang-cap>.dump
```

Quy tắc: LUÔN backup thủ công 1 bản ngay trước khi nâng cấp
(`docker compose -f docker-compose.prod.yml exec backup sh /backup.sh`).

## 8. Giám sát (observability)

- `/api/health` (liveness) + `/api/ready` (DB) — Docker healthcheck đã gắn sẵn; có thể nối UptimeRobot (miễn phí) ping 2 URL này.
- Log ứng dụng: `docker compose -f docker-compose.prod.yml logs -f app` (log JSON từng dòng; KHÔNG chứa mật khẩu/token — lỗi hệ thống chỉ in mã tham chiếu, chi tiết trong audit).
- Nhật ký nghiệp vụ: màn **Nhật ký** trong app (audit log đầy đủ trước/sau).

## 9. Webhook & tích hợp

- Webhook nhận tại `POST /api/webhooks/<kenh>` với header `x-webhook-secret` = `WEBHOOK_SECRET`;
  chống trùng theo `eventId`; sự kiện lỗi xem và xử lý lại qua API `/api/integrations`.
- Các kênh (Messenger, Zalo OA, vận chuyển, hóa đơn điện tử, email/SMS, máy in, Google Sheets)
  đang ở chế độ **SANDBOX** — hệ thống ghi nhật ký và ghi rõ "CHƯA GỬI THẬT" cho tới khi
  điền API key thật vào `.env` (danh sách key trong `.env.example`).
