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

# ---------------------------------------------------------------------------
# TÌM FONT — CHẠY ĐƯỢC TRÊN CẢ WINDOWS, MAC VÀ LINUX
# Trước đây hai đường dẫn font viết cứng kiểu Linux (/usr/share/fonts/...).
# Đem sang máy Windows là hỏng ngay: không có thư mục đó, bộ dựng chết từ dòng đầu.
# Nay font ĐI KÈM LUÔN trong cong-cu/fonts/ nên máy nào cũng ra chữ giống hệt nhau.
# ---------------------------------------------------------------------------
def tim_font(ten_tep, *du_phong):
    """Tìm file font: ưu tiên bản đi kèm trong bộ não, không có thì mò trong máy."""
    goc = os.path.dirname(os.path.abspath(__file__))
    bo_nao = os.path.dirname(os.path.dirname(goc))          # .../bo-nao-edit-video
    cho_tim = [os.path.join(bo_nao, "cong-cu", "fonts", ten_tep)] + list(du_phong)
    for d in cho_tim:
        if d and os.path.exists(d):
            return d
    print("   (!) Không thấy font %s. Đã tìm ở:" % ten_tep)
    for d in cho_tim:
        print("       - %s" % d)
    return None


FONT = tim_font("DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                r"C:\Windows\Fonts\arialbd.ttf",
                "/System/Library/Fonts/Supplemental/Arial Bold.ttf")
if FONT is None:
    print("!! Không có font chữ nào dùng được. Chép DejaVuSans-Bold.ttf vào cong-cu/fonts/")
    sys.exit(1)

# Font riêng cho ẢNH BÌA — chủ doanh nghiệp chốt 14/08: bìa chữ font Anton.
# Đã thử 50 ký tự tiếng Việt khó (ộ ầ ế ữ ợ ẫ ể ỗ ừ ẹ ọ ụ ỹ): Anton đủ hết, không ô vuông.
FONT_BIA = tim_font("Anton-Regular.ttf",
                    "/usr/share/fonts/truetype/anton/Anton-Regular.ttf")
if FONT_BIA is None:
    print("   (!) Ảnh bìa sẽ dùng tạm font thường — chữ bìa sẽ không giống mẫu đã chốt.")
    FONT_BIA = FONT

# NHỊP HIỆN CHỮ — chủ doanh nghiệp chốt 14/08: "tỷ lệ chuyển cảnh nhanh hơn".
# Cảnh nay ngắn hơn hẳn, chữ mà còn hiện thong thả thì vừa đọc xong đã đổi cảnh.
# Ba con số này là thời gian (giây) để chữ hiện ĐỦ kể từ lúc vào cảnh.
HIEN_CHU_TO  = 0.22   # chữ to + nhãn nhỏ, trước để 0,35
HIEN_GACH    = 0.34   # gạch chân vàng chạy ra, trước để 0,55
HIEN_PHU_DE  = 0.18   # phụ đề dưới đáy, trước để 0,30
# Qua mốc này thì mọi thứ trong lớp chữ đã đứng yên hoàn toàn -> dựng một lần rồi
# dùng lại cho các khung sau. Đây là mẹo làm nhanh gấp mấy lần, xem ghi chú ở main().
XONG_HIEN    = 0.40

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
XANH_BIA  = (32, 130, 245)     # xanh dương của dải chữ thứ hai trên ẢNH BÌA

# ẢNH BÌA — chủ doanh nghiệp chốt 14/08, gửi kèm ảnh mẫu.
# Nền là MỘT KHUNG HÌNH ĐẸP LẤY TỪ CHÍNH VIDEO, đè lên hai dải chữ chạy hết bề ngang:
#   dải trên  = nền VÀNG,  chữ ĐEN
#   dải dưới  = nền XANH DƯƠNG, chữ TRẮNG
# Hai dải nằm ở khoảng giữa-dưới khung để không che mặt/chủ thể ở nửa trên.
BIA_BAT_DAU = 0.505            # dải vàng bắt đầu ở 50,5% chiều cao
BIA_CAO_DAI = 0.140            # mỗi dải cao 14% chiều cao khung

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
 # ẢNH BÌA: nền là khung hình thật, chữ nằm trong hai dải màu. Màu ở đây chỉ dùng
 # khi KHÔNG tìm được file hình cho cảnh bìa — lúc đó nền lùi về màu thương hiệu.
 "bia":  (TOI,      TRANG,    VANG,     TRANG,    (0, 0, 0, 150)),
}


def fit(chu, co_toi_da, rong_toi_da, duong_font=None):
    co = co_toi_da
    while co > 20:
        f = ImageFont.truetype(duong_font or FONT, co)
        if max(f.getbbox(d)[2] - f.getbbox(d)[0] for d in chu.split("\n")) <= rong_toi_da:
            return f
        co -= 4
    return ImageFont.truetype(duong_font or FONT, 20)


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


def giua(d, y, chu, font, mau, giay_mo=1.0, gian=1.42, vien=0):
    """Vẽ khối chữ căn giữa, trả về chiều cao khối.

    gian=1.42 vì dấu tiếng Việt chồng tầng (Ử, Ấ, Ộ) cần chỗ thở.
    vien: bề dày viền tối quanh chữ. Bố cục mới để khoảng giữa sáng cho thấy sản phẩm,
    nên chữ ở đỉnh dễ rơi trúng vùng sáng và chìm mất — đã soi ảnh thấy thật ở câu
    "ÉP XONG KIỂM NGAY" nằm trên cánh tay sáng. Có viền thì đọc được trên mọi nền.
    """
    dong = chu.split("\n")
    buoc = int(font.size * gian)
    if giay_mo > 0:
        a = int(255 * min(1.0, giay_mo))
        for i, dg in enumerate(dong):
            bb = font.getbbox(dg)
            x = (W - (bb[2] - bb[0])) // 2 - bb[0]
            d.text((x, y + i * buoc), dg, font=font, fill=mau + (a,),
                   stroke_width=vien, stroke_fill=(6, 12, 9, int(a * 0.78)) if vien else None)
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


def mo_nen_canh(duong_dan, so_khung):
    """Mở file cảnh, trả về MỘT DÒNG khung hình nền 1080x1920 đọc dần.

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

    # ĐỌC TỚI ĐÂU DÙNG TỚI ĐÓ — không nuốt cả cảnh vào bộ nhớ.
    # Một khung 1080x1920 nặng 6,2 MB. Cảnh 4 giây là 120 khung = 750 MB. Video 69 cảnh
    # thì máy phải cõng đi cõng lại từng ấy, chậm tới mức quá 1800 giây bị cắt ngang.
    # Đã dính thật ở video 25 năm Luật Gia Phạm.
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error"] + dau_vao + ["-i", duong_dan,
         "-t", "%.3f" % (so_khung / FPS),      # -t ở mức lệnh, chốt chặn thứ nhất
         "-vf", loc + ",fps=%d" % FPS,
         "-frames:v", str(so_khung),           # chốt chặn thứ hai: đếm đủ khung là dừng
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

    n = W * H * 3
    dau = p.stdout.read(n)
    if len(dau) < n:                           # không đọc nổi cả một khung -> hỏng
        p.kill()
        print("   (!) Không đọc được %s — cảnh này dùng lại màu thương hiệu." % duong_dan)
        return None

    def dong_khung():
        cuoi = dau
        try:
            yield dau
            for _ in range(so_khung - 1):
                k = p.stdout.read(n)
                if len(k) < n:                 # file ngắn hơn cảnh thì giữ khung cuối
                    k = cuoi
                cuoi = k
                yield k
        finally:
            # Dọn kể cả khi bị đóng sớm. Không dọn thì mỗi cảnh bỏ lại một tiến trình
            # ffmpeg đứng chờ với một ống đầy dữ liệu chưa ai đọc — 69 cảnh là 69 cái.
            try:
                p.stdout.close()
            except Exception:
                pass
            p.kill()
            p.wait()

    return dong_khung()


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
        # BỐ CỤC MỚI (chủ doanh nghiệp chốt 14/08): chữ dồn lên ĐỈNH và xuống ĐÁY,
        # KHÚC GIỮA ĐỂ TRỐNG cho nhìn rõ sản phẩm. Nên màn tối cũng phải đảo lại:
        # đậm ở hai đầu nơi có chữ, gần như trong suốt ở giữa nơi có hàng.
        DINH_HET, DAY_BAT = 620, 1340
        for y in range(H):
            if y < DINH_HET:                       # đỉnh: đậm 165 rồi nhạt dần xuống 25
                a = 165 - 140 * (y / DINH_HET)
            elif y < DAY_BAT:                      # giữa: gần trong suốt, thấy rõ hàng
                a = 25
            else:                                  # đáy: nhạt 25 rồi đậm dần lên 170
                a = 25 + 145 * ((y - DAY_BAT) / (H - DAY_BAT))
            d.line([(0, y), (W, y)], fill=(6, 12, 9, int(a)))
        _MAN = m
    return _MAN


def ve_bia(d, to, mo):
    """Vẽ hai dải chữ của ẢNH BÌA lên khung hình thật.

    Dòng 1 của `to` -> dải VÀNG chữ ĐEN. Dòng 2 -> dải XANH DƯƠNG chữ TRẮNG.
    Dải chạy hết bề ngang khung, chữ căn giữa theo cả hai chiều, font Anton.
    Đây là kiểu bìa chủ doanh nghiệp gửi ảnh mẫu ngày 14/08 — bắt chước đúng.
    """
    dong = (to.split("\n") + ["", ""])[:2]
    cao = int(H * BIA_CAO_DAI)
    y0 = int(H * BIA_BAT_DAU)
    a = int(255 * min(1.0, mo))
    for k, (chu, nen, mau) in enumerate(((dong[0], VANG,     (16, 16, 16)),
                                         (dong[1], XANH_BIA, TRANG))):
        chu = chu.strip()
        if not chu:
            continue
        y = y0 + k * cao
        d.rectangle([0, y, W, y + cao], fill=nen + (a,))
        # Cỡ chữ chặn theo CẢ chiều cao dải lẫn bề ngang khung — dải cao 268 điểm ảnh
        # thì chữ tối đa 168, còn thiếu chỗ cho dấu tiếng Việt là chạm mép dải.
        ft = fit(chu, int(cao * 0.62), W - 70, FONT_BIA)
        bb = ft.getbbox(chu)
        x = (W - (bb[2] - bb[0])) // 2 - bb[0]
        # Căn giữa theo chiều dọc bằng hộp bao THẬT của chuỗi, không lấy cỡ font.
        # Lấy cỡ font thì dòng có dấu (Ấ, Ộ) tụt xuống, dòng không dấu lại nhô lên.
        y_chu = y + (cao - (bb[3] - bb[1])) // 2 - bb[1]
        d.text((x, y_chu), chu, font=ft, fill=mau + (a,))


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

    # Cảnh đầu hiện đủ ngay khung 0,0 — nền tảng lấy khung này làm ảnh đại diện.
    mo = 1.0 if i == 0 else min(1.0, trong_canh / HIEN_CHU_TO)
    nhich = int((1 - mo) * 26)

    if kieu == "bia":
        # ẢNH BÌA đi đường riêng: KHÔNG phủ màn tối (che mất khung hình đẹp),
        # KHÔNG có nhãn nhỏ, KHÔNG có phụ đề. Chỉ hai dải màu + tên thương hiệu.
        ve_bia(d, to, mo)
        fb = ImageFont.truetype(FONT, 40)
        if nen_that:
            bb = fb.getbbox("BẢO GẤU BÔNG")
            d.rounded_rectangle([50, 80, 70 + (bb[2] - bb[0]) + 20, 96 + fb.size + 14], 14,
                                fill=(0, 0, 0, 140))
        d.text((70, 96), "BẢO GẤU BÔNG", font=fb, fill=VANG + (240,))
        return ov

    # Màn tối phủ lên video thật: đậm ở hai đầu khung nơi có chữ, nhạt ở giữa
    # để vẫn nhìn rõ sản phẩm. Không có lớp này thì chữ chìm mất trên cảnh sáng.
    if nen_that:
        ov.paste(man_toi(), (0, 0))

    # Chữ to nằm ở ĐỈNH khung, ngay dưới tên thương hiệu. Cỡ hạ 150 -> 118
    # để đỡ chiếm chỗ — khúc giữa phải để trống cho thấy sản phẩm.
    ft = fit(to, 118, W - 140)
    y_to = 300 + nhich

    if nhan:
        nhan_gian = " ".join(nhan)          # phải đo đúng chuỗi sắp vẽ
        giua(d, y_to - 74, nhan_gian, fit(nhan_gian, 40, W - 200), m_nhan, mo, gian=1.2,
             vien=3 if nen_that else 0)

    cao_to = giua(d, y_to, to, ft, m_to, mo, vien=4 if nen_that else 0)

    if kieu != "cta":
        rong_max = min(int((W - 150) * 0.62), 620)
        rw = int(rong_max * min(1.0, trong_canh / HIEN_GACH))
        if rw >= 6:
            y_g = y_to + cao_to + 22
            d.rectangle([(W - rw) // 2, y_g, (W + rw) // 2, y_g + 9], fill=VANG + (int(235 * mo),))

    if phu:
        fp = ImageFont.truetype(FONT, 50)
        dong = boc_dong(phu, fp, W - 190, 5)
        cao = len(dong) * int(fp.size * 1.34)
        # Phụ đề xuống ĐÁY khung. Bộ não gốc ghi 58-64% chiều cao, nhưng chủ doanh
        # nghiệp chốt đổi ngày 14/08 để chừa khoảng giữa cho sản phẩm. Đây là đổi
        # theo lệnh chủ, không phải tự đổi.
        y0 = H - cao - 230 - (len(dong) - 2) * 10
        mo_p = 1.0 if i == 0 else min(1.0, max(0.0, (trong_canh - 0.06) / HIEN_PHU_DE))
        # hộp nền mờ dần CÙNG chữ — trước đây hộp hiện trước, thấy một dải tối trống trơn
        d.rounded_rectangle([70, y0 - 34, W - 70, y0 + cao + 20], 26,
                            fill=m_hop[:3] + (int(m_hop[3] * mo_p),))
        giua(d, y0, "\n".join(dong), fp, m_phu, mo_p, gian=1.34, vien=3 if nen_that else 0)

    # Tên thương hiệu góc trên. Trên cảnh quay thật PHẢI có nền lót — soi ảnh thấy chữ vàng
    # nằm trên ô cửa sáng thì chìm hẳn, đọc không ra.
    fb = ImageFont.truetype(FONT, 40)
    mau_ten = VANG if (nen_that or kieu in ("dau", "hook", "hieu", "giai")) else XANH_SAU
    if nen_that:
        bb = fb.getbbox("BẢO GẤU BÔNG")
        d.rounded_rectangle([50, 80, 70 + (bb[2] - bb[0]) + 20, 96 + fb.size + 14], 14,
                            fill=(0, 0, 0, 140))
    d.text((70, 96), "BẢO GẤU BÔNG", font=fb, fill=mau_ten + (240,))
    return ov


def ve_thanh_tien_do(im, t):
    """Vẽ thanh tiến độ đáy khung, vẽ thẳng lên ảnh nền.

    Trước đây thanh này nằm trong lớp chữ. Mà nó đổi từng khung, nên lớp chữ không
    bao giờ đứng yên, không dùng lại được — mỗi khung phải vẽ lại toàn bộ chữ.
    Tách nó ra đây là chìa khoá để dùng lại lớp chữ.
    """
    d = ImageDraw.Draw(im)
    d.rectangle([0, H - 12, W, H], fill=(214, 214, 214))
    d.rectangle([0, H - 12, int(W * t / DAI), H], fill=VANG)


def main():
    # ⚠️ BÁO LỖI CỦA MÁY NÉN PHẢI GHI RA FILE, TUYỆT ĐỐI KHÔNG DÙNG ĐƯỜNG ỐNG.
    # Đã dính thật ở video 69 cảnh: để stderr=PIPE thì ta chỉ đọc ống đó lúc CUỐI,
    # nên khi máy nén in đủ 64 KB cảnh báo là ống đầy -> máy nén đứng chờ ta đọc,
    # còn ta thì đứng chờ máy nén nuốt khung hình. Hai bên chờ nhau, treo vĩnh viễn.
    # Nhìn ra bằng cách xem /proc/<pid>/wchan: cả hai đều là anon_pipe_write.
    tep_loi = open(RA + ".loi.txt", "w+b")
    p = subprocess.Popen(
        ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "%dx%d" % (W, H),
         "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium",
         "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart", RA],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=tep_loi)

    co_that = 0
    for i, (a, b, nhan, to, phu, kieu) in enumerate(CANH):
        so_khung = int(round((b - a) * FPS))
        f = tim_file_canh(i + 1)
        dong_nen = mo_nen_canh(f, so_khung) if f else None
        co_nen = dong_nen is not None
        if co_nen:
            co_that += 1
            print("   cảnh %02d: dùng %s" % (i + 1, os.path.basename(f)), flush=True)
        mau_nen = NEN[kieu][0]
        lop_chu_dung_yen = None
        for k in range(so_khung):
            t = a + k / FPS
            # DỰNG LỚP CHỮ MỘT LẦN RỒI DÙNG LẠI.
            # Chữ chỉ nhúc nhích trong 0,4 giây mờ dần đầu cảnh. Qua mốc đó là đứng yên
            # tuyệt đối, mà vẽ lại chữ có viền trên khung 1080x1920 là việc nặng nhất
            # trong cả bộ dựng. Cảnh 3 giây có 90 khung thì 78 khung dùng lại được.
            if t - a >= XONG_HIEN:
                if lop_chu_dung_yen is None:
                    lop_chu_dung_yen = ve_chu(i, t, co_nen)
                lop_chu = lop_chu_dung_yen
            else:
                lop_chu = ve_chu(i, t, co_nen)

            nen = (Image.frombytes("RGB", (W, H), next(dong_nen)) if co_nen
                   else Image.new("RGB", (W, H), mau_nen))
            # Dán thẳng lớp chữ lên ảnh nền, lấy chính nó làm mặt nạ. Cách này bỏ được
            # hai lần đổi màu tốn kém: nền RGB -> RGBA rồi kết quả RGBA -> RGB.
            nen.paste(lop_chu, (0, 0), lop_chu)
            ve_thanh_tien_do(nen, t)
            p.stdin.write(nen.tobytes())
        if dong_nen is not None:
            dong_nen.close()                   # đóng ngay, đừng để tiến trình rác

    p.stdin.close()
    ma = p.wait()
    tep_loi.seek(0)
    loi = tep_loi.read().decode("utf-8", "replace")
    tep_loi.close()
    if ma != 0:
        print(loi[-1500:]); sys.exit(1)
    os.remove(RA + ".loi.txt")
    print(">> Xong phần hình: %s — %.1f giây, %d cảnh (%d cảnh có video thật)"
          % (RA, DAI, len(CANH), co_that))


if __name__ == "__main__":
    main()
