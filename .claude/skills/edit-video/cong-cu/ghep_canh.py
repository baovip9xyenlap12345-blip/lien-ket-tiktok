# -*- coding: utf-8 -*-
"""Ghép nhiều cảnh ngắn thành một dải hình liền, có chuyển cảnh mềm.

Nhận LẪN LỘN cả ảnh tĩnh (.jpg .png) lẫn cảnh quay (.mp4) trong cùng một thư mục — cứ đặt tên
canh-01, canh-02… theo đúng thứ tự muốn hiện.

  python ghep_canh.py <thư-mục-cảnh> <tổng-số-giây> <file-ra.mp4>

Cách tính: N cảnh, mỗi cảnh dài d, chuyển cảnh dài t thì tổng = N*d - (N-1)*t.
Muốn ra đúng tổng giây yêu cầu thì d = (tổng + (N-1)*t) / N.

--- ẢNH TĨNH XỬ LÝ KHÁC CẢNH QUAY ---

1. KHÔNG CẮT ẢNH VỀ 9:16. Ảnh của xưởng là 4:3 ngang và 3:4 dọc; cắt thẳng về khung dọc thì ảnh
   ngang mất 76% chiều rộng — rất dễ CHẶT CỤT LOGO KHÁCH, đúng thứ cả video muốn khoe.
   Nên: lồng nguyên tấm ảnh lên nền là chính nó phóng to và làm mờ. Giữ trọn ảnh, khung vẫn đầy.

2. CHO ẢNH TRÔI CHẬM (phóng to dần 6%). Mục 10 của SKILL.md cấm phóng to, nhưng luật đó đúc ra từ
   video QUAY THẬT — hình đã động sẵn, thêm zoom là thừa. Ảnh tĩnh thì không có chuyển động nào
   cả, không cho trôi thì 15 ảnh nối nhau thành slideshow đám cưới. Anh Bảo đã chốt cho bật,
   2026-08-14. CẢNH QUAY VẪN GIỮ NGUYÊN LUẬT CẤM PHÓNG TO.

⚠️ `-loop 1` là nguồn sinh vô hạn (huong-dan/05-loi-thuong-gap.md mục 2) — mọi chỗ dùng nó đều
   PHẢI chặn bằng -t. Đã chặn đủ ở dưới.
"""
import os, sys, subprocess, glob

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

CHUYEN_CANH = 0.4      # giây, độ dài mỗi lần chuyển cảnh
BAT_DAU = 0.4          # bỏ 0,4 giây đầu mỗi cảnh quay — nhiều clip nhoè lúc mở
TROI = 0.06            # ảnh tĩnh phóng to dần 6% suốt thời lượng của nó
MO_NEN = 40            # độ mờ của nền phía sau ảnh
ANH = (".jpg", ".jpeg", ".png", ".webp")


def sh(cmd):
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        print("!! ffmpeg hỏng:\n" + r.stderr.decode("utf-8", "replace")[-1200:])
        sys.exit(1)


def lam_canh_tu_anh(nguon, d, ra, tam):
    """Ảnh tĩnh → clip d giây: nền mờ + ảnh nguyên vẹn ở giữa + trôi chậm."""
    ghep = os.path.join(tam, os.path.basename(ra) + ".png")
    sh(["ffmpeg", "-v", "error", "-y", "-i", nguon, "-filter_complex",
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
        "gblur=sigma=%d[nen];"
        "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[hinh];"
        "[nen][hinh]overlay=(W-w)/2:(H-h)/2" % MO_NEN,
        "-frames:v", "1", ghep])
    khung = max(2, int(round(d * 30)))
    buoc = TROI / khung
    # phóng ảnh lên gấp đôi trước khi cho trôi — zoompan làm tròn toạ độ về số nguyên,
    # không phóng trước thì hình giật từng nấc
    sh(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-t", "%.3f" % d, "-i", ghep,
        "-vf", ("scale=2160:3840,zoompan=z='min(zoom+%.6f,%.3f)':d=%d:"
                "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,"
                "setsar=1,format=yuv420p" % (buoc, 1 + TROI, khung)),
        "-t", "%.3f" % d,               # chặn cứng nguồn sinh vô hạn
        "-an", "-c:v", "libx264", "-crf", "17", "-preset", "medium", ra])


def lam_canh_tu_clip(nguon, d, ra):
    """Cảnh quay → cắt đúng d giây, đưa về khung dọc 1080x1920. KHÔNG phóng to."""
    sh(["ffmpeg", "-v", "error", "-y", "-ss", "%.2f" % BAT_DAU, "-t", "%.3f" % d, "-i", nguon,
        "-vf", ("scale=1080:1920:force_original_aspect_ratio=increase,"
                "crop=1080:1920,setsar=1,fps=30,format=yuv420p"),
        "-an", "-c:v", "libx264", "-crf", "17", "-preset", "medium", ra])


def main():
    thu_muc, tong_giay, ra = sys.argv[1], float(sys.argv[2]), sys.argv[3]
    canh = sorted(glob.glob(os.path.join(thu_muc, "canh-*")))
    canh = [c for c in canh if os.path.splitext(c)[1].lower() in ANH + (".mp4", ".mov")]
    if not canh:
        print("!! Không có cảnh nào trong %s" % thu_muc)
        sys.exit(1)
    n = len(canh)
    d = (tong_giay + (n - 1) * CHUYEN_CANH) / n
    so_anh = sum(1 for c in canh if os.path.splitext(c)[1].lower() in ANH)
    print(">> %d cảnh (%d ảnh tĩnh · %d cảnh quay) · mỗi cảnh %.2f giây · chuyển cảnh %.1f giây "
          "→ tổng %.1f giây" % (n, so_anh, n - so_anh, d, CHUYEN_CANH, tong_giay))

    tam = os.path.join(thu_muc, "_chuan")
    os.makedirs(tam, exist_ok=True)
    da_chuan = []
    for i, c in enumerate(canh, 1):
        o = os.path.join(tam, "c-%02d.mp4" % i)
        if os.path.splitext(c)[1].lower() in ANH:
            lam_canh_tu_anh(c, d, o, tam)
            loai = "ảnh"
        else:
            lam_canh_tu_clip(c, d, o)
            loai = "quay"
        da_chuan.append(o)
        print("   cảnh %2d (%s) xong" % (i, loai))

    dau_vao = []
    for c in da_chuan:
        dau_vao += ["-i", c]
    loc, nhan, moc = [], "[0:v]", 0.0
    for i in range(1, n):
        moc += d - CHUYEN_CANH
        ra_nhan = "[v%d]" % i
        loc.append("%s[%d:v]xfade=transition=fade:duration=%.2f:offset=%.3f%s"
                   % (nhan, i, CHUYEN_CANH, moc, ra_nhan))
        nhan = ra_nhan
    sh(["ffmpeg", "-v", "error", "-y"] + dau_vao +
       ["-filter_complex", ";".join(loc), "-map", nhan,
        "-t", "%.3f" % tong_giay,
        "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", ra])
    print(">> XONG: %s" % ra)


if __name__ == "__main__":
    main()
