# -*- coding: utf-8 -*-
"""Dựng video quảng cáo 9:16 cho Bảo Gấu Bông — nỗi đau: đặt gấp mà sợ không kịp.

CÁCH DÙNG
  python dung-lai-video.py <file-ra.mp4> [thư-mục-cảnh]

  Không đưa thư mục cảnh  -> nền là màu thương hiệu (bản đang có).
  Có đưa thư mục cảnh     -> lấy video thật làm nền, chữ đè lên trên.

ĐẶT TÊN FILE CẢNH
  Trong thư mục cảnh, đặt tên theo số cảnh: canh-01.mp4, canh-08.mp4, canh-15.mp4...
  Cảnh nào không có file thì tự dùng lại màu thương hiệu, không lỗi.
  Nhận cả .mp4 .mov .jpg .png. Video ngang sẽ được cắt thông minh về khung dọc.
"""
import os, subprocess, sys, glob
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
RA = sys.argv[1] if len(sys.argv) > 1 else "video-ra.mp4"
THU_MUC_CANH = sys.argv[2] if len(sys.argv) > 2 else None
# Thêm chữ "mo" ở cuối lệnh -> làm nhoè cảnh quay thật (giấu khẩu hình khi lồng giọng khác)
MO_NEN = "mo" in sys.argv[3:]

XANH      = (25, 135, 84)      # #198754 màu chủ đạo
XANH_SAU  = (11, 61, 38)
TOI       = (14, 20, 17)
TRANG     = (255, 255, 255)
VANG      = (255, 193, 7)
XAM       = (150, 168, 158)

# Bảng phân cảnh — bám hồ sơ khách hàng chuyên sâu (bản 11/08/2026).
# Nỗi đau lấy từ mục 5.4 "Nỗi đau về tiến độ" và 5.6 "sợ bị quy trách nhiệm cá nhân".
# Câu chữ lấy từ mục 13.1 "cụm từ đã có giá trị" và 13.2 "hướng content đánh trúng".
# Số liệu lấy từ mục 14.1 và 14.3. KHÔNG dùng cam kết "đơn gấp 24-72 giờ" vì hồ sơ
# ghi rõ: "không nên dùng như lời hứa vô điều kiện".
# MỐC GIÂY BÁM THEO GIỌNG ĐỌC THẬT (Cartesia, giọng "Bảo Gấu Bông", mẫu sonic-3).
# Trước đây mốc là lưới cố định 2,8 giây/cảnh rồi ép giọng vào. Nay làm ngược lại:
# đọc trước, cắt khoảng lặng thừa, đo từng câu, rồi cắt cảnh theo đúng câu nói.
# Đây mới đúng tinh thần bộ não — hình chạy theo lời, không phải lời chạy theo hình.
# Cảnh ngắn nhất ép tối thiểu 2,0 giây để không loé lên khó chịu.
CANH = [
 (0.00, 3.12, "", "BANNER GỠ XUỐNG\nLÀ HẾT NGƯỜI NHỚ", "", "hook"),
 (3.12, 5.75, "QUẢNG CÁO NGẮN HẠN", "HẾT TIỀN LÀ HẾT", "Tháo banner xuống, không ai nhớ mình là ai nữa.", "dau"),
 (5.75, 7.78, "", "CON GẤU THÌ KHÁC", "Nhưng con gấu mang logo thì khác.", "hieu"),
 (7.78, 10.69, "KHÁCH GIỮ LẠI", "ĐỂ BÀN · ÔM NGỦ", "Khách để trên bàn làm việc. Ôm đi ngủ. Mang đi khắp nơi.", "giai"),
 (10.69, 13.71, "", "MỖI LẦN NHÌN\nLÀ MỘT LẦN NHỚ", "Mỗi lần nhìn thấy là một lần nhớ tới thương hiệu của mình.", "giai"),
 (13.71, 16.00, "", "KHÔNG PHẢI QUẢNG CÁO", "Nó không phải quảng cáo. Nó là món quà.", "hieu"),
 (16.00, 18.58, "ĐẸP VÀ DÙNG ĐƯỢC", "KHÁCH THẤY ĐƯỢC TRỌNG", "Quà đẹp, dùng được, khách thấy mình được trân trọng.", "giai"),
 (18.58, 21.30, "", "THIỆN CẢM GIỮ KHÁCH", "Thiện cảm đó mới là thứ giữ khách ở lại.", "giai"),
 (21.30, 23.72, "IN MỘT LẦN", "THEO KHÁCH NHIỀU NĂM", "Một lần in logo, thương hiệu theo khách nhiều năm.", "giai"),
 (23.72, 26.33, "SO VỚI CHẠY QUẢNG CÁO", "CHI PHÍ RẺ HƠN HẲN", "Chi phí lại rẻ hơn hẳn chạy quảng cáo dài ngày.", "giai"),
 (26.33, 29.77, "XƯỞNG TRỰC TIẾP", "BẢO GẤU BÔNG", "Bảo Gấu Bông là xưởng trực tiếp, in thêu logo theo yêu cầu.", "hieu"),
 (29.77, 32.66, "MIỄN PHÍ", "GỬI LOGO, CÓ DEMO", "Gửi logo, bên em lên demo miễn phí.", "giai"),
 (32.66, 36.09, "", "NHẮN TIN\nGỬI LOGO", "Nhắn tin gửi logo, bên em lên demo và báo giá ngay.", "cta"),
]
DAI = CANH[-1][1]

NEN = {
 "hook": (TOI,      VANG,     XAM,      TRANG,    (0, 0, 0, 150)),
 "dau":  (TOI,      TRANG,    VANG,     TRANG,    (0, 0, 0, 150)),
 "hieu": (XANH,     TRANG,    VANG,     TRANG,    (0, 0, 0, 110)),
 "giai": (XANH_SAU, TRANG,    VANG,     TRANG,    (0, 0, 0, 120)),
 "cta":  (VANG,     XANH_SAU, XANH_SAU, XANH_SAU, (255, 255, 255, 170)),
}


def fit(chu, co_toi_da, rong_toi_da):
    co = co_toi_da
    while co > 20:
        f = ImageFont.truetype(FONT, co)
        if max(f.getbbox(d)[2] - f.getbbox(d)[0] for d in chu.split("\n")) <= rong_toi_da:
            return f
        co -= 4
    return ImageFont.truetype(FONT, 20)


def boc_dong(chu, font, rong, max_tu=5):
    tu, dong, cur = chu.split(), [], []
    for t in tu:
        thu = cur + [t]
        if len(thu) > max_tu or font.getbbox(" ".join(thu))[2] > rong:
            if cur: dong.append(" ".join(cur)); cur = [t]
            else:   dong.append(t); cur = []
        else:
            cur = thu
    if cur: dong.append(" ".join(cur))
    return dong


def giua(d, y, chu, font, mau, giay_mo=1.0, gian=1.42):
    """Vẽ khối chữ căn giữa, trả về chiều cao khối.
    gian=1.42 vì dấu tiếng Việt chồng tầng (Ử, Ấ, Ộ) cần chỗ thở."""
    dong = chu.split("\n")
    buoc = int(font.size * gian)
    if giay_mo > 0:
        a = int(255 * min(1.0, giay_mo))
        for i, dg in enumerate(dong):
            bb = font.getbbox(dg)
            d.text(((W - (bb[2] - bb[0])) // 2 - bb[0], y + i * buoc), dg, font=font, fill=mau + (a,))
    return (len(dong) - 1) * buoc + int(font.size * 1.15)


# ---------- LỚP NỀN: video thật nếu có, không thì màu thương hiệu ----------

def tim_file_canh(so):
    if not THU_MUC_CANH:
        return None
    for duoi in ("mp4", "mov", "MP4", "MOV", "jpg", "jpeg", "png", "webm"):
        g = glob.glob(os.path.join(THU_MUC_CANH, "canh-%02d.%s" % (so, duoi)))
        if g:
            return g[0]
    return None


def nap_nen_canh(duong_dan, so_khung):
    """Đọc file cảnh ra danh sách ảnh nền 1080x1920.

    Video/ảnh NGANG được cắt thông minh: phóng cho đầy chiều ngang khung dọc rồi
    cắt phần thừa theo chiều cao, lấy hơi lệch lên trên — vì chủ thể (người, sản phẩm)
    hầu như luôn nằm ở nửa trên khung, cắt giữa hay mất đầu.
    """
    loc = ("scale=%d:%d:force_original_aspect_ratio=increase,"
           "crop=%d:%d:(iw-%d)/2:(ih-%d)*0.35,"
           "eq=brightness=-0.06" % (W, H, W, H, W, H))   # tối nhẹ để chữ nổi lên trên
    # Chế độ "mo": làm nhoè cảnh quay thật. Dùng khi giọng đọc KHÔNG phải giọng thu cùng lúc
    # với hình — nhoè đi thì không còn thấy môi, hết cảnh miệng nói một đằng tiếng một nẻo.
    if MO_NEN:
        loc += ",gblur=sigma=14,eq=brightness=-0.10"

    # ⚠️ ẢNH TĨNH VÀ VIDEO PHẢI LẶP BẰNG HAI CÁCH KHÁC NHAU — đã treo máy thật vì chỗ này.
    # `-stream_loop -1` dùng cho video. Đem áp cho ảnh tĩnh thì mốc thời gian không tiến,
    # nên `-t` KHÔNG BAO GIỜ tới hạn: ffmpeg quay vô tận. Đã đo được 607 giây CPU cho một
    # cảnh 2,4 giây, phải tắt tay.
    # Bài học 2 của bộ não nói "có nguồn sinh vô hạn thì phải có -t" — đúng, nhưng CHƯA ĐỦ:
    # với ảnh tĩnh thì `-t` vô tác dụng, phải dùng `-loop 1 -framerate` mới chặn được.
    if duong_dan.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".bmp")):
        dau_vao = ["-loop", "1", "-framerate", str(FPS), "-t", "%.3f" % (so_khung / FPS)]
    else:
        dau_vao = ["-stream_loop", "-1"]

    try:
        p = subprocess.run(
            ["ffmpeg", "-v", "error"] + dau_vao + ["-i", duong_dan,
             "-t", "%.3f" % (so_khung / FPS),      # -t ở mức lệnh, chốt chặn thứ nhất
             "-vf", loc + ",fps=%d" % FPS,
             "-frames:v", str(so_khung),           # chốt chặn thứ hai: đếm đủ khung là dừng
             "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
            capture_output=True, timeout=90)       # chốt chặn thứ ba: quá 90 giây là cắt
    except subprocess.TimeoutExpired:
        print("   (!) %s xử lý quá 90 giây — bỏ qua, cảnh này dùng màu thương hiệu."
              % os.path.basename(duong_dan))
        return None

    n = W * H * 3
    khung = [p.stdout[i * n:(i + 1) * n] for i in range(len(p.stdout) // n)]
    if not khung:
        print("   (!) Không đọc được %s — cảnh này dùng lại màu thương hiệu." % duong_dan)
        return None
    while len(khung) < so_khung:      # file ngắn hơn cảnh thì giữ khung cuối
        khung.append(khung[-1])
    return khung


_MAN = None


def man_toi():
    """Màn tối mờ dần, dựng một lần rồi dùng lại cho mọi khung.

    Chia thành từng dải cứng thì lộ hai vệt ngang rất thô — đã soi ảnh thấy. Nên chuyển
    sang mờ dần: nhạt ở mép trên (còn thấy cảnh), đậm nhất ở dải giữa nơi có chữ to và
    phụ đề, rồi nhạt lại ở đáy.
    """
    global _MAN
    if _MAN is None:
        m = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(m)
        DAU, GIUA_1, GIUA_2 = 70, 560, 1460      # mờ ở mép, đậm 168 ở dải giữa
        for y in range(H):
            if y < GIUA_1:
                a = DAU + (168 - DAU) * (y / GIUA_1)          # 70 -> 168, liền mạch
            elif y < GIUA_2:
                a = 168
            else:
                a = 168 - 78 * ((y - GIUA_2) / (H - GIUA_2))  # 168 -> 90, liền mạch
            d.line([(0, y), (W, y)], fill=(6, 12, 9, int(a)))
        _MAN = m
    return _MAN


def ve_chu(i, t, nen_that=False):
    """Vẽ lớp chữ trong suốt cho một khung.

    nen_that=True: cảnh này đang đè lên video/ảnh thật. Không đoán trước được nền sáng hay tối,
    nên phủ một lớp tối lên rồi luôn dùng bộ màu chữ-sáng-trên-nền-tối. Đã soi ảnh thấy thật:
    để nguyên bộ màu gốc thì nhãn vàng nằm trên nền vàng, mất hẳn chữ.
    """
    a, b, nhan, to, phu, kieu = CANH[i]
    _, m_to, m_nhan, m_phu, m_hop = NEN[kieu]
    if nen_that:
        m_to, m_nhan, m_phu, m_hop = TRANG, VANG, TRANG, (0, 0, 0, 160)
    trong_canh = t - a
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)

    # Màn tối phủ lên video thật: đậm ở giữa khung nơi có chữ, nhạt dần ra hai đầu
    # để vẫn nhìn rõ cảnh quay. Không có lớp này thì chữ chìm mất trên cảnh sáng.
    if nen_that:
        ov.paste(man_toi(), (0, 0))

    # Cảnh đầu hiện đủ ngay khung 0,0 — nền tảng lấy khung này làm ảnh đại diện.
    mo = 1.0 if i == 0 else min(1.0, trong_canh / 0.35)
    nhich = int((1 - mo) * 26)

    ft = fit(to, 150, W - 150)
    so_dong = len(to.split("\n"))
    y_to = 762 - (so_dong - 1) * int(ft.size * 0.71) + nhich

    if nhan:
        nhan_gian = " ".join(nhan)          # phải đo đúng chuỗi sắp vẽ
        giua(d, y_to - 92, nhan_gian, fit(nhan_gian, 44, W - 200), m_nhan, mo, gian=1.2)

    cao_to = giua(d, y_to, to, ft, m_to, mo)

    if kieu != "cta":
        rong_max = min(int((W - 150) * 0.62), 620)
        rw = int(rong_max * min(1.0, trong_canh / 0.55))
        if rw >= 6:
            y_g = y_to + cao_to + 22
            d.rectangle([(W - rw) // 2, y_g, (W + rw) // 2, y_g + 9], fill=VANG + (int(235 * mo),))

    if phu:
        fp = ImageFont.truetype(FONT, 52)
        dong = boc_dong(phu, fp, W - 190, 5)
        cao = len(dong) * int(fp.size * 1.34)
        y0 = int(H * 0.60)                 # đúng luật: phụ đề ở 58-64% chiều cao
        d.rounded_rectangle([70, y0 - 34, W - 70, y0 + cao + 20], 26, fill=m_hop)
        mo_p = 1.0 if i == 0 else min(1.0, max(0.0, (trong_canh - 0.12) / 0.3))
        giua(d, y0, "\n".join(dong), fp, m_phu, mo_p, gian=1.34)

    # Tên thương hiệu góc trên. Trên cảnh quay thật PHẢI có nền lót — soi ảnh thấy chữ vàng
    # nằm trên ô cửa sáng thì chìm hẳn, đọc không ra.
    fb = ImageFont.truetype(FONT, 40)
    mau_ten = VANG if (nen_that or kieu in ("dau", "hook", "hieu", "giai")) else XANH_SAU
    if nen_that:
        bb = fb.getbbox("BẢO GẤU BÔNG")
        d.rounded_rectangle([50, 80, 70 + (bb[2] - bb[0]) + 20, 96 + fb.size + 14], 14,
                            fill=(0, 0, 0, 140))
    d.text((70, 96), "BẢO GẤU BÔNG", font=fb, fill=mau_ten + (240,))

    d.rectangle([0, H - 12, W, H], fill=(255, 255, 255, 46))
    d.rectangle([0, H - 12, int(W * t / DAI), H], fill=VANG + (255,))
    return ov


def main():
    p = subprocess.Popen(
        ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "%dx%d" % (W, H),
         "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium",
         "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart", RA],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

    co_that = 0
    for i, (a, b, nhan, to, phu, kieu) in enumerate(CANH):
        so_khung = int(round((b - a) * FPS))
        f = tim_file_canh(i + 1)
        nen_that = nap_nen_canh(f, so_khung) if f else None
        if nen_that:
            co_that += 1
            print("   cảnh %02d: dùng %s" % (i + 1, os.path.basename(f)), flush=True)
        mau_nen = NEN[kieu][0]
        for k in range(so_khung):
            t = a + k / FPS
            nen = (Image.frombytes("RGB", (W, H), nen_that[k]) if nen_that
                   else Image.new("RGB", (W, H), mau_nen))
            im = Image.alpha_composite(nen.convert("RGBA"),
                                       ve_chu(i, t, nen_that is not None)).convert("RGB")
            p.stdin.write(im.tobytes())

    p.stdin.close()
    if p.wait() != 0:
        print(p.stderr.read().decode()[-1500:]); sys.exit(1)
    print(">> Xong phần hình: %s — %.1f giây, %d cảnh (%d cảnh có video thật)"
          % (RA, DAI, len(CANH), co_that))


if __name__ == "__main__":
    main()
