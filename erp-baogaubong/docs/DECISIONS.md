# NHẬT KÝ QUYẾT ĐỊNH & GIẢ ĐỊNH
| # | Ngày | Quyết định | Lý do | Ảnh hưởng |
|---|---|---|---|---|
| 1 | 22/07/2026 | Stack: Next.js14+TS, Prisma, PostgreSQL16, Redis+BullMQ, MinIO, Docker | đúng đề xuất SPEC, 1 codebase dễ bảo trì | toàn dự án |
| 2 | 22/07/2026 | Modular monolith, ranh giới module theo ARCHITECTURE.md | MVP nhanh, tách service sau được | toàn dự án |
| 3 | 22/07/2026 | inventory_balance là projection từ stock_movement (không phải nguồn sự thật) | chống lệch tồn, audit được | kho |
| 4 | 22/07/2026 | Công nợ = ledger receivable_entry | SPEC cấm gõ đè số dư | tài chính |
| 5 | 22/07/2026 | App 1 file hiện tại tiếp tục vận hành song song đến hết GĐ6, sau đó migrate | không gián đoạn kinh doanh | vận hành |
| 6 | 22/07/2026 | GIẢ ĐỊNH tiền tố chứng từ mặc định "BG", giá vốn bình quân gia quyền, doanh thu ghi nhận khi đơn Đã xác nhận | chờ chủ DN xác nhận (câu hỏi GĐ0) | tài chính |
