# -*- coding: utf-8 -*-
"""Dựng video quảng cáo 9:16 cho Bảo Gấu Bông — nỗi đau: đặt gấp mà sợ không kịp.

Không có tư liệu quay thật và không tải được kho ảnh (mạng bị chặn), nên video này dựng
bằng chữ và màu thương hiệu. Mọi cảnh đều là thật, không có cảnh giả vờ là ảnh xưởng.
"""
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
RA = sys.argv[1]

# ---- Màu thương hiệu (chị đưa: xanh lá #198754, trắng, vàng) ----
XANH      = (25, 135, 84)      # #198754 màu chủ đạo
XANH_SAU  = (11, 61, 38)       # xanh đậm hơn, nền lúc nói nỗi đau
TOI       = (14, 20, 17)       # gần đen, ngả xanh — nền phần nỗi đau
TRANG     = (255, 255, 255)
VANG      = (255, 193, 7)      # vàng thương hiệu
XAM       = (150, 168, 158)    # xám ngả xanh, dùng cho chữ phụ

# ---- BẢNG PHÂN CẢNH ----
# (giay_bat_dau, giay_ket_thuc, nhãn nhỏ, CHỮ TO, phụ đề = lời đọc, kiểu nền)
CANH = [
 (0.0,  3.0,  "",                    "TUẦN SAU SỰ KIỆN\nQUÀ VẪN CHƯA CÓ MẪU", "", "hook"),
 (3.0,  5.8,  "NỖI LO THỨ NHẤT",     "BÁO GIÁ CAO",            "Gọi mấy nơi thì nơi báo giá cao,",        "dau"),
 (5.8,  8.6,  "NỖI LO THỨ HAI",      "HẸN TỚI HẸN LUI",        "nơi thì hẹn tới hẹn lui.",                "dau"),
 (8.6,  11.4, "NỖI LO LỚN NHẤT",     "HÀNG VỀ SÁT NGÀY",       "Sợ nhất là hàng về sát ngày.",            "dau"),
 (11.4, 14.2, "",                    "LOGO IN LỆCH MÀU",       "Mở thùng ra thì logo in lệch màu.",       "dau"),
 (14.2, 17.0, "",                    "KHÔNG KỊP LÀM LẠI",      "Lúc đó không kịp làm lại nữa.",           "dau"),
 (17.0, 19.8, "",                    "NGƯỜI CHỊU LÀ MÌNH",     "Người đứng ra chịu là mình.",             "dau"),
 (19.8, 23.0, "XƯỞNG SẢN XUẤT TRỰC TIẾP", "BẢO GẤU BÔNG",      "Bảo Gấu Bông là xưởng sản xuất trực tiếp.", "hieu"),
 (23.0, 25.8, "GIÁ TẬN XƯỞNG",       "KHÔNG QUA TRUNG GIAN",   "Không qua trung gian nên giá tận xưởng.",  "giai"),
 (25.8, 28.6, "MIỄN PHÍ",            "THIẾT KẾ MẪU",           "Bên em thiết kế mẫu miễn phí,",           "giai"),
 (28.6, 31.4, "",                    "DUYỆT RỒI MỚI MAY",      "gửi anh chị duyệt trước khi may.",        "giai"),
 (31.4, 34.2, "SỐ LƯỢNG LỚN",        "IN VÀ THÊU LOGO",        "Nhận in, thêu logo, làm số lượng lớn.",   "giai"),
 (34.2, 37.0, "",                    "NHẬN ĐƠN GẤP",           "Đơn gấp bên em nhận riêng.",              "giai"),
 (37.0, 39.8, "",                    "GIAO TOÀN QUỐC",         "Giao hàng toàn quốc.",                    "giai"),
 (39.8, 42.2, "",                    "NHẮN TIN\nGỬI LOGO",     "Nhắn tin gửi logo và ngày cần hàng,",     "cta"),
 (42.2, 44.6, "",                    "NHẬN MẪU\nVÀ BÁO GIÁ",   "bên em lên mẫu và báo giá ngay.",         "cta"),
]
DAI = CANH[-1][1]

NEN = {  # kiểu nền -> (màu nền, màu chữ to, màu nhãn nhỏ, màu phụ đề, nền phụ đề)
 "hook": (TOI,      VANG,  XAM,   TRANG, (0, 0, 0, 150)),
 "dau":  (TOI,      TRANG, VANG,  TRANG, (0, 0, 0, 150)),
 "hieu": (XANH,     TRANG, VANG,  TRANG, (0, 0, 0, 110)),
 "giai": (XANH_SAU, TRANG, VANG,  TRANG, (0, 0, 0, 120)),
 "cta":  (VANG,     XANH_SAU, XANH_SAU, XANH_SAU, (255, 255, 255, 170)),
}


def fit(chu, co_toi_da, rong_toi_da, dam=True):
    """Thu nhỏ cỡ chữ cho tới khi vừa bề ngang — lỗi số 7 của bộ não: phải đo bề rộng
    THẬT của chữ, không được đếm số từ."""
    co = co_toi_da
    while co > 20:
        f = ImageFont.truetype(FONT, co)
        if max(f.getbbox(d)[2] - f.getbbox(d)[0] for d in chu.split("\n")) <= rong_toi_da:
            return f
        co -= 4
    return ImageFont.truetype(FONT, 20)


def boc_dong(chu, font, rong, max_tu=5):
    """Bẻ dòng phụ đề: tối đa 5 từ mỗi dòng (luật bộ não) VÀ không tràn khung."""
    tu, dong, cur = chu.split(), [], []
    for t in tu:
        thu = cur + [t]
        w = font.getbbox(" ".join(thu))[2]
        if len(thu) > max_tu or w > rong:
            if cur: dong.append(" ".join(cur)); cur = [t]
            else:   dong.append(t); cur = []
        else:
            cur = thu
    if cur: dong.append(" ".join(cur))
    return dong


def giua(d, y, chu, font, mau, giay_mo=1.0, gian=1.42):
    """Vẽ một khối chữ căn giữa, trả về chiều cao khối.

    gian=1.42: dấu tiếng Việt chồng tầng (Ử, Ấ, Ộ) cần chỗ thở. Để 1.22 thì dấu của
    dòng dưới đâm vào chân dòng trên — đã soi ảnh thấy thật ở chữ "GỬI LOGO".
    """
    dong = chu.split("\n")
    buoc = int(font.size * gian)
    if giay_mo > 0:
        a = int(255 * min(1.0, giay_mo))
        for i, dg in enumerate(dong):
            bb = font.getbbox(dg)
            x = (W - (bb[2] - bb[0])) // 2 - bb[0]
            d.text((x, y + i * buoc), dg, font=font, fill=mau + (a,))
    return (len(dong) - 1) * buoc + int(font.size * 1.15)


def ve_khung(t):
    i = min(range(len(CANH)), key=lambda k: (t < CANH[k][0], -CANH[k][0]))
    for k, (a, b, *_ ) in enumerate(CANH):
        if a <= t < b: i = k; break
    a, b, nhan, to, phu, kieu = CANH[i]
    nen, m_to, m_nhan, m_phu, m_hop = NEN[kieu]
    trong_canh = t - a

    im = Image.new("RGB", (W, H), nen)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)

    # Nổi dần 0,35 giây đầu mỗi cảnh. RIÊNG CẢNH ĐẦU hiện đủ ngay từ khung 0,0 —
    # nền tảng lấy đúng khung giây 0,0 làm ảnh đại diện, để mờ là ra cái ảnh bìa trống trơn.
    mo = 1.0 if i == 0 else min(1.0, trong_canh / 0.35)
    nhich = int((1 - mo) * 26)

    # ---- chữ to: tính chỗ trước, vì nhãn nhỏ phải nằm NGAY TRÊN nó ----
    ft = fit(to, 150, W - 150)
    so_dong = len(to.split("\n"))
    y_to = 762 - (so_dong - 1) * int(ft.size * 0.71) + nhich

    # ---- nhãn nhỏ (giãn chữ cho ra dáng nhãn), neo theo chữ to để không bao giờ đè lên ----
    if nhan:
        nhan_gian = " ".join(nhan)      # PHẢI đo đúng chuỗi sắp vẽ, không đo chuỗi gốc
        fn = fit(nhan_gian, 44, W - 200)
        giua(d, y_to - 92, nhan_gian, fn, m_nhan, mo, gian=1.2)

    cao_to = giua(d, y_to, to, ft, m_to, mo)

    # gạch chân vàng dưới chữ to, chạy dần ra — thứ duy nhất động trong cảnh
    if kieu != "cta":
        rong_max = min(int((W - 150) * 0.62), 620)
        rw = int(rong_max * min(1.0, trong_canh / 0.55))
        if rw >= 6:      # rw=0 vẫn vẽ ra một vệt 1 pixel — soi ảnh khung 0,0 mới thấy
            y_g = y_to + cao_to + 22
            d.rectangle([(W - rw) // 2, y_g, (W + rw) // 2, y_g + 9], fill=VANG + (int(235 * mo),))

    # ---- phụ đề: đặt ở 60% chiều cao, đúng luật 58-64% ----
    if phu:
        fp = ImageFont.truetype(FONT, 52)
        dong = boc_dong(phu, fp, W - 190, 5)
        cao = len(dong) * int(fp.size * 1.34)
        y0 = int(H * 0.60)
        d.rounded_rectangle([70, y0 - 34, W - 70, y0 + cao + 20], 26, fill=m_hop)
        mo_p = 1.0 if i == 0 else min(1.0, max(0.0, (trong_canh - 0.12) / 0.3))
        giua(d, y0, "\n".join(dong), fp, m_phu, mo_p, gian=1.34)

    # ---- tên thương hiệu góc trên, luôn hiện (nhận diện) ----
    fb = ImageFont.truetype(FONT, 40)
    d.text((70, 96), "BẢO GẤU BÔNG", font=fb,
           fill=(VANG if kieu in ("dau", "hook", "hieu", "giai") else XANH_SAU) + (240,))

    # ---- thanh tiến độ dưới đáy: cho người xem biết còn bao lâu ----
    d.rectangle([0, H - 12, W, H], fill=(255, 255, 255, 46))
    d.rectangle([0, H - 12, int(W * t / DAI), H], fill=VANG + (255,))

    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


def main():
    n = int(DAI * FPS)
    p = subprocess.Popen(
        ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-an",
         "-c:v", "libx264", "-preset", "medium", "-crf", "19",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", RA],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    for k in range(n):
        p.stdin.write(ve_khung(k / FPS).tobytes())
        if k % 150 == 0:
            print(f"   ... {k}/{n} khung", flush=True)
    p.stdin.close()
    if p.wait() != 0:
        print(p.stderr.read().decode()[-1500:]); sys.exit(1)
    print(f">> Xong phần hình: {RA} — {DAI:.1f} giây, {len(CANH)} cảnh")


if __name__ == "__main__":
    main()
