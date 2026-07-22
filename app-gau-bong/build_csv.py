#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sinh CSV quan ly chi phi 12 thang, cong thuc tinh san, de convert sang Google Sheet."""

N_PURCHASE = 10   # so dong mua hang moi thang
BLOCK = 38        # so dong moi khoi thang (ke ca dong trong)
START = 21        # dong bat dau khoi Thang 1 (1-based)

lines = []
def row(*cells):
    out = []
    for c in cells:
        c = "" if c is None else str(c)
        if any(ch in c for ch in [",", '"', "\n"]):
            c = '"' + c.replace('"', '""') + '"'
        out.append(c)
    lines.append(",".join(out))

def S(m):  # dong dau khoi thang m
    return START + (m - 1) * BLOCK

# ---------- Header + huong dan ----------
row("BẢNG QUẢN LÝ CHI PHÍ NĂM 2026 - BẢO QUÀ TẶNG")
row("Hướng dẫn: chỉ nhập số vào cột C (số lượng) và D (đơn giá/lương); riêng phần III nhập thẳng số tiền vào cột E. Các ô Thành tiền và TỔNG có công thức tự tính - không sửa tay. Tháng 1 có số VÍ DỤ - hãy thay bằng số thật.")
row()

# ---------- TONG HOP ----------
row("TỔNG HỢP CHI PHÍ 12 THÁNG (tự tính - không sửa)")
row("Tháng", "Tiền lương (VNĐ)", "Chi phí mua hàng (VNĐ)", "Điện + nước + mạng (VNĐ)", "Quảng cáo (VNĐ)", "Phát sinh (VNĐ)", "TỔNG CHI PHÍ (VNĐ)")
for m in range(1, 13):
    s = S(m)
    r = 5 + m
    row(f"Tháng {m}",
        f"=E{s+7}",
        f"=E{s+11+N_PURCHASE+1}",              # placeholder, tinh lai ben duoi
        None, None, None, None)
# se dung lai list sau — xoa 12 dong vua them va lam chuan xac:
del lines[-12:]

# offset trong khoi (0-based tu dong dau S):
# +0 title | +1 I. | +2 header | +3..+6 luong | +7 tong luong
# +8 trong | +9 II. | +10 header | +11..+(10+N) mua hang | +(11+N) tong mua hang
# +(12+N) trong | +(13+N) III. | +(14+N) header | +(15+N)..+(21+N) 7 khoan van hanh
# +(22+N) tong van hanh | +(23+N) trong | +(24+N) TONG THANG
OFF_TL = 7                 # tong luong
OFF_MH = 11 + N_PURCHASE   # tong mua hang
OFF_VH0 = 15 + N_PURCHASE  # dong "Tien dien"
OFF_VHT = 22 + N_PURCHASE  # tong van hanh
OFF_TT = 24 + N_PURCHASE   # tong thang

for m in range(1, 13):
    s = S(m)
    r = 5 + m
    row(f"Tháng {m}",
        f"=E{s+OFF_TL}",
        f"=E{s+OFF_MH}",
        f"=E{s+OFF_VH0}+E{s+OFF_VH0+1}+E{s+OFF_VH0+2}",
        f"=E{s+OFF_VH0+3}",
        f"=SUM(E{s+OFF_VH0+4}:E{s+OFF_VH0+6})",
        f"=SUM(B{r}:F{r})")
row("CẢ NĂM", "=SUM(B6:B17)", "=SUM(C6:C17)", "=SUM(D6:D17)", "=SUM(E6:E17)", "=SUM(F6:F17)", "=SUM(G6:G17)")
row()
row()

# ---------- 12 khoi thang ----------
EX_SALARY = [(2, 9000000), (3, 8000000), (2, 7000000), (4, 8500000)]
EX_PURCHASE = [("Hộp quà tặng (ví dụ)", 200, 25000), ("Túi giấy in logo (ví dụ)", 500, 8000)]
EX_OPS = [3500000, 500000, 400000, 15000000, 1200000, None, None]

STAFF = ["Nhân viên marketing", "Nhân viên sale", "Nhân viên đóng hàng", "Nhân viên sản xuất"]
OPS = ["Tiền điện", "Tiền nước", "Tiền mạng (internet)", "Tiền chạy quảng cáo",
       "Chi phí phát sinh 1", "Chi phí phát sinh 2", "Chi phí phát sinh 3"]

for m in range(1, 13):
    s = S(m)
    assert len(lines) + 1 == s, f"thang {m}: dong hien tai {len(lines)+1} != {s}"
    row(f"===== BẢNG CHI PHÍ THÁNG {m}/2026 =====")
    row("I. TIỀN LƯƠNG NHÂN VIÊN")
    row("STT", "Khoản mục", "Số lượng NV", "Lương/người (VNĐ)", "Thành tiền (VNĐ)")
    for i, label in enumerate(STAFF):
        r = s + 3 + i
        sl, luong = EX_SALARY[i] if m == 1 else (None, None)
        row(i + 1, label, sl, luong, f"=C{r}*D{r}")
    row(None, None, None, "TỔNG TIỀN LƯƠNG (1)", f"=SUM(E{s+3}:E{s+6})")
    row()
    row("II. CHI PHÍ MUA HÀNG")
    row("STT", "Tên sản phẩm", "Số lượng", "Đơn giá (VNĐ)", "Thành tiền (VNĐ)")
    for i in range(N_PURCHASE):
        r = s + 11 + i
        ten, sl, gia = EX_PURCHASE[i] if (m == 1 and i < len(EX_PURCHASE)) else (None, None, None)
        row(i + 1, ten, sl, gia, f"=C{r}*D{r}")
    row(None, None, None, "TỔNG CHI PHÍ MUA HÀNG (2)", f"=SUM(E{s+11}:E{s+10+N_PURCHASE})")
    row()
    row("III. CHI PHÍ VẬN HÀNH & CHI PHÍ PHÁT SINH")
    row("STT", "Khoản mục", "Ghi chú", "", "Thành tiền (VNĐ)")
    for i, label in enumerate(OPS):
        val = EX_OPS[i] if m == 1 else None
        row(i + 1, label, None, None, val)
    row(None, None, None, "TỔNG VẬN HÀNH & PHÁT SINH (3)", f"=SUM(E{s+OFF_VH0}:E{s+OFF_VH0+6})")
    row()
    row(None, None, None, f"TỔNG CHI PHÍ THÁNG {m} = (1)+(2)+(3)", f"=E{s+OFF_TL}+E{s+OFF_MH}+E{s+OFF_VHT}")
    for _ in range(BLOCK - (OFF_TT + 1)):
        row()

csv = "\n".join(lines) + "\n"
out = "/tmp/claude-0/-home-user-lien-ket-tiktok/26731859-2296-588b-8705-3fe299e2bd5a/scratchpad/chi-phi-2026.csv"
with open(out, "w", encoding="utf-8") as fh:
    fh.write(csv)
print("rows:", len(lines), "bytes:", len(csv.encode("utf-8")))
# kiem tra nhanh cong thuc thang 1
for i in [S(1)-1, S(1)+OFF_TL-1, S(1)+OFF_MH-1, S(1)+OFF_VHT-1, S(1)+OFF_TT-1, 5, 17]:
    print(i+1, "|", lines[i][:120])
