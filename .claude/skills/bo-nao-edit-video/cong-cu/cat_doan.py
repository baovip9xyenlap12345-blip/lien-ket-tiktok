# -*- coding: utf-8 -*-
"""CẮT GHÉP ĐOẠN — lấy vài đoạn hay trong một video dài rồi ghép thành video ngắn.

CÁCH DÙNG
  python cat_doan.py <video-dai.mp4> <danh-sach-doan.json> <file-ra.mp4> [--doc]

  <video-dai.mp4>        video gốc, dài bao nhiêu cũng được (đã chạy thật với 30 phút / 1 GB)
  <danh-sach-doan.json>  file ghi các đoạn muốn lấy, dạng:  [[5, 13], [420, 431.5], [1750, 1760]]
                         mỗi cặp là [giây bắt đầu, giây kết thúc]. Lấy theo đúng thứ tự đã ghi.
  <file-ra.mp4>          tên video thành phẩm
  --doc                  đổi về khung dọc 9:16 (1080x1920) để đăng TikTok. Không ghi thì
                         giữ nguyên khung hình gốc.

VÍ DỤ
  python cat_doan.py buoi-noi-chuyen.mp4 doan-hay.json video-tiktok.mp4 --doc


═══════════════════════════════════════════════════════════════════════════════
TẠI SAO CÔNG CỤ NÀY RA ĐỜI — VÀ VÌ SAO NÓ NHANH
═══════════════════════════════════════════════════════════════════════════════

Bộ dựng cũ (kich-ban/03-.../dung-video.py) vẽ TỪNG KHUNG HÌNH bằng thư viện Pillow rồi
bơm sang ffmpeg. Đo thật: 2,8 giây máy chạy cho mỗi 1 giây video. Video 30 phút mà làm
kiểu đó là 84 phút — không xài được.

Công cụ này KHÔNG vẽ khung hình nào cả. Nó giao trọn việc cho ffmpeg. Không đụng Pillow.


═══════════════════════════════════════════════════════════════════════════════
ĐÃ ĐO THẬT BA CÁCH LÀM — SỐ LIỆU NGÀY 13/08/2026
═══════════════════════════════════════════════════════════════════════════════

Bài đo: video gốc 30 phút (1800 giây), 720x1280, 990 MB. Cắt 5 đoạn rải khắp video
(giây 12, 430, 900, 1350, 1780) ra một video 40 giây, đổi về khung dọc 1080x1920.
Máy: 4 nhân CPU, 15 GB RAM, không có card đồ hoạ.

  Cách 1 — MỘT LỆNH, MỖI ĐOẠN MỘT CỬA VÀO (cách đang dùng)
    Mở file gốc 5 lần, mỗi lần nhảy thẳng tới đoạn cần lấy bằng -ss ĐẶT TRƯỚC -i,
    rồi trộn hết trong một lệnh duy nhất (xfade + acrossfade).
    →  27,7 giây  ·  RAM đỉnh 384 MB

  Cách 2 — CẮT RỜI SONG SONG RỒI NỐI (concat demuxer)
    Chạy 5 lệnh ffmpeg song song, mỗi lệnh cắt một đoạn ra file tạm, xong nối lại.
    →  36,7 giây  ·  RAM đỉnh 262 MB  (chậm hơn cách 1 khoảng 1,3 lần)
    Chậm vì phải mã hoá hình HAI LƯỢT: một lượt ra file tạm, một lượt nữa khi nối
    (bắt buộc mã lại lượt hai vì muốn có chuyển cảnh mờ chồng — nối kiểu chép thẳng
    thì không chèn chuyển cảnh được, chỗ nối sẽ giật).

  Cách 3 — MỘT CỬA VÀO, DÙNG BỘ LỌC trim (cách nhiều người hay viết)
    Mở file gốc đúng một lần rồi dùng trim để lấy đoạn.
    →  254,6 giây  ·  RAM đỉnh 187 MB  (CHẬM GẤP 9,2 LẦN cách 1 — loại thẳng)
    Chậm vì trim KHÔNG BIẾT NHẢY. Muốn lấy đoạn ở giây 1780, ffmpeg phải giải nén
    lần lượt cả 1780 giây trước đó rồi vứt đi. Video càng dài càng chậm.

  ➜ CHỌN CÁCH 1. Nhanh nhất, và thời gian chạy gần như không phụ thuộc video gốc
    dài bao nhiêu — chỉ phụ thuộc tổng độ dài các đoạn lấy ra.


═══════════════════════════════════════════════════════════════════════════════
BA CHỐT CHẶN AN TOÀN — ĐÃ TREO MÁY THẬT VÌ THIẾU CHÚNG
═══════════════════════════════════════════════════════════════════════════════

1. Mọi lệnh ffmpeg đều có -t Ở MỨC LỆNH (chốt tổng độ dài đầu ra). Bộ não đã ghi hai
   lần treo máy thật vì thiếu chỗ này: 578 giây và 607 giây CPU cháy không công.

2. ⚠️ NGUỒN TIẾNG IM (anullsrc) LÀ NGUỒN SINH VÔ HẠN. Nó tự đẻ mẫu tiếng mãi mãi.
   Ở đây luôn kèm -t ngay tại cửa vào của nó.
   Ghi nhớ đi kèm: ẢNH TĨNH thì -t KHÔNG chặn được, phải dùng -loop 1 -framerate.
   Công cụ này không nhận ảnh tĩnh nên không dính, nhưng đừng chép nhầm sang chỗ khác.

3. Mọi lần gọi ffmpeg đều có chốt chặn thời gian (timeout). Quá hạn thì in ra lý do
   rõ ràng rồi thoát, không bao giờ treo im lặng.

Ngoài ra: KHÔNG nạp video vào bộ nhớ. Toàn bộ hình chảy thẳng trong ffmpeg.
"""

import json
import os
import subprocess
import sys
import time

# ── Thông số khung dọc chuẩn TikTok ──────────────────────────────────────────
RONG_DOC, CAO_DOC = 1080, 1920
TY_LE_DOC = RONG_DOC / CAO_DOC          # 0,5625 — tức 9 chia 16

# Chuyển cảnh mờ chồng giữa hai đoạn. 0,15 giây là vừa đủ để chỗ nối không giật
# mà mắt gần như không nhận ra là có hiệu ứng.
MO_CHONG = 0.15

# Đoạn ngắn hơn mức này thì không mờ chồng được (mờ chồng ăn mất 0,15 giây ở mỗi đầu).
DOAN_NGAN_NHAT = 0.40

# Cắt từ đâu khi phải bỏ bớt chiều cao: 0.35 nghĩa là bỏ 35% phần thừa ở trên,
# 65% ở dưới — tức khung nhìn hơi lệch lên trên. Vì mặt người và sản phẩm
# gần như luôn nằm ở nửa trên khung, cắt đúng giữa là hay mất đầu.
LECH_LEN_TREN = 0.35


# ═══════════════════════════════════════════════════════════════════════════
#  PHẦN 1 — MẤY VIỆC LẶT VẶT: GỌI FFMPEG, ĐỌC THÔNG TIN VIDEO
# ═══════════════════════════════════════════════════════════════════════════

def chay(lenh, han_giay, ten_viec):
    """Gọi ffmpeg/ffprobe một lần, có chốt chặn thời gian.

    han_giay: quá bao nhiêu giây thì coi như treo, cắt ngang và báo lỗi.
    Không bao giờ để máy chạy im lặng vô tận — đó là lỗi đã dính thật hai lần.
    """
    try:
        ket_qua = subprocess.run(lenh, capture_output=True, timeout=han_giay)
    except subprocess.TimeoutExpired:
        print("")
        print("  ✗ DỪNG KHẨN: bước «%s» chạy quá %d giây mà chưa xong." % (ten_viec, han_giay))
        print("    Máy có thể đang mắc kẹt. Đã cắt ngang để khỏi cháy CPU vô ích.")
        print("    Thử lại với ít đoạn hơn, hoặc các đoạn ngắn hơn.")
        sys.exit(1)
    except FileNotFoundError:
        print("  ✗ Không tìm thấy chương trình ffmpeg trên máy. Cần cài ffmpeg trước.")
        sys.exit(1)

    if ket_qua.returncode != 0:
        print("")
        print("  ✗ Bước «%s» bị lỗi. ffmpeg nói thế này:" % ten_viec)
        loi = ket_qua.stderr.decode("utf-8", "replace").strip().splitlines()
        for dong in loi[-12:]:
            print("      " + dong)
        sys.exit(1)
    return ket_qua.stdout.decode("utf-8", "replace")


def doc_thong_tin(duong_dan):
    """Đọc kích thước, độ dài, số hình/giây và xem video có tiếng hay không."""
    if not os.path.isfile(duong_dan):
        print("  ✗ Không thấy file video: %s" % duong_dan)
        sys.exit(1)

    ra = chay(["ffprobe", "-v", "error", "-print_format", "json",
               "-show_streams", "-show_format", duong_dan],
              han_giay=60, ten_viec="đọc thông tin video")
    du_lieu = json.loads(ra)

    hinh = None
    co_tieng = False
    for luong in du_lieu.get("streams", []):
        if luong.get("codec_type") == "video" and hinh is None:
            hinh = luong
        elif luong.get("codec_type") == "audio":
            co_tieng = True

    if hinh is None:
        print("  ✗ File này không có hình ảnh nào — không phải video dùng được.")
        sys.exit(1)

    # Số hình/giây ffprobe trả về dạng phân số kiểu "30000/1001"
    try:
        tu, mau = hinh.get("r_frame_rate", "30/1").split("/")
        so_hinh_giay = float(tu) / float(mau) if float(mau) else 30.0
    except (ValueError, ZeroDivisionError):
        so_hinh_giay = 30.0
    if not (1 <= so_hinh_giay <= 240):
        so_hinh_giay = 30.0

    return {
        "rong": int(hinh.get("width", 0)),
        "cao": int(hinh.get("height", 0)),
        "so_hinh_giay": so_hinh_giay,
        "dai": float(du_lieu.get("format", {}).get("duration", 0) or 0),
        "co_tieng": co_tieng,
    }


# ═══════════════════════════════════════════════════════════════════════════
#  PHẦN 2 — ĐỌC VÀ KIỂM DANH SÁCH ĐOẠN
# ═══════════════════════════════════════════════════════════════════════════

def doc_danh_sach_doan(duong_dan_json, dai_video):
    """Đọc file JSON ra danh sách đoạn đã kiểm sạch.

    Đoạn nào sai (ghi ngược, nằm ngoài video, quá ngắn) thì BỎ QUA VÀ IN RA LÝ DO.
    Tuyệt đối không bỏ qua im lặng — người dùng phải biết đoạn nào bị loại.
    """
    if not os.path.isfile(duong_dan_json):
        print("  ✗ Không thấy file danh sách đoạn: %s" % duong_dan_json)
        sys.exit(1)

    try:
        with open(duong_dan_json, "r", encoding="utf-8") as f:
            tho = json.load(f)
    except (ValueError, UnicodeDecodeError) as e:
        print("  ✗ File danh sách đoạn không đọc được (sai định dạng JSON): %s" % e)
        print("    Đúng phải là kiểu:  [[5, 13], [420, 431.5]]")
        sys.exit(1)

    if not isinstance(tho, list) or not tho:
        print("  ✗ Danh sách đoạn phải là một danh sách và phải có ít nhất một đoạn.")
        print("    Đúng phải là kiểu:  [[5, 13], [420, 431.5]]")
        sys.exit(1)

    sach = []
    for so_thu_tu, muc in enumerate(tho, 1):
        # ── mỗi mục phải là một cặp hai con số ──
        if not isinstance(muc, (list, tuple)) or len(muc) != 2:
            print("  (!) Bỏ qua đoạn thứ %d: phải là một cặp [giây đầu, giây cuối], "
                  "đang ghi là %r." % (so_thu_tu, muc))
            continue
        try:
            dau, cuoi = float(muc[0]), float(muc[1])
        except (TypeError, ValueError):
            print("  (!) Bỏ qua đoạn thứ %d: %r không phải con số." % (so_thu_tu, muc))
            continue

        if cuoi <= dau:
            print("  (!) Bỏ qua đoạn thứ %d (%.2f → %.2f giây): giây cuối phải lớn hơn "
                  "giây đầu." % (so_thu_tu, dau, cuoi))
            continue

        if dau < 0:
            print("  (!) Đoạn thứ %d bắt đầu ở giây âm (%.2f) — kéo về giây 0."
                  % (so_thu_tu, dau))
            dau = 0.0

        # ── cắt gọn phần lòi ra ngoài độ dài video ──
        if dai_video > 0:
            if dau >= dai_video:
                print("  (!) Bỏ qua đoạn thứ %d (%.2f → %.2f giây): nằm hẳn ngoài video, "
                      "video chỉ dài %.1f giây." % (so_thu_tu, dau, cuoi, dai_video))
                continue
            if cuoi > dai_video:
                print("  (!) Đoạn thứ %d kết thúc ở giây %.2f nhưng video chỉ dài %.1f giây "
                      "— rút ngắn lại cho vừa." % (so_thu_tu, cuoi, dai_video))
                cuoi = dai_video

        if cuoi - dau < 0.10:
            print("  (!) Bỏ qua đoạn thứ %d (%.2f → %.2f giây): ngắn dưới 0,10 giây, "
                  "lấy ra cũng không thấy gì." % (so_thu_tu, dau, cuoi))
            continue

        sach.append((dau, cuoi))

    if not sach:
        print("  ✗ Không còn đoạn nào dùng được sau khi kiểm. Xem lại file danh sách đoạn.")
        sys.exit(1)
    return sach


# ═══════════════════════════════════════════════════════════════════════════
#  PHẦN 3 — DỰNG CÔNG THỨC XỬ LÝ HÌNH (bộ lọc của ffmpeg)
# ═══════════════════════════════════════════════════════════════════════════

def loc_khung_doc(rong_nguon, cao_nguon):
    """Trả về công thức đổi video về khung dọc 1080x1920, kèm câu giải thích tiếng Việt.

    CÁCH LÀM: phóng to cho ảnh phủ KÍN khung dọc (không để viền đen), rồi cắt bỏ
    phần thừa lòi ra ngoài.

      · Video NGANG (16:9 chẳng hạn): phóng lên cho kín chiều cao, phần thừa nằm ở
        hai bên trái phải → cắt đều hai bên, giữ nguyên phần giữa.
      · Video DỌC HƠN 9:16 (kiểu 9:20): phóng cho kín chiều ngang, phần thừa nằm ở
        trên dưới → cắt bỏ 35% phần thừa ở trên, 65% ở dưới, tức khung nhìn hơi
        lệch lên trên. Vì mặt người và sản phẩm hầu như luôn nằm ở nửa trên khung,
        cắt đúng giữa là dễ mất đầu.
      · Video ĐÚNG 9:16 sẵn: chỉ phóng cho vừa, không cắt gì cả.
    """
    cong_thuc = ("scale=%d:%d:force_original_aspect_ratio=increase,"
                 "crop=%d:%d:(iw-ow)/2:(ih-oh)*%.2f"
                 % (RONG_DOC, CAO_DOC, RONG_DOC, CAO_DOC, LECH_LEN_TREN))

    if cao_nguon <= 0:
        return cong_thuc, "phóng cho phủ kín khung dọc 1080x1920"

    ty_le = rong_nguon / cao_nguon
    if abs(ty_le - TY_LE_DOC) < 0.01:
        giai_thich = ("video đã dọc 9:16 sẵn (%dx%d) — chỉ phóng cho vừa 1080x1920, "
                      "không cắt mất gì" % (rong_nguon, cao_nguon))
    elif ty_le > TY_LE_DOC:
        giu = TY_LE_DOC / ty_le * 100
        giai_thich = ("video ngang %dx%d — phóng cho kín chiều cao rồi cắt hai bên, "
                      "giữ lại %.0f%% bề ngang ở chính giữa" % (rong_nguon, cao_nguon, giu))
    else:
        giu = ty_le / TY_LE_DOC * 100
        giai_thich = ("video dọc hẹp %dx%d — phóng cho kín chiều ngang rồi cắt trên dưới, "
                      "giữ lại %.0f%% chiều cao, lấy hơi lệch lên trên để không mất đầu"
                      % (rong_nguon, cao_nguon, giu))
    return cong_thuc, giai_thich


def dung_cong_thuc(doan, tin, doc, so_hinh_giay):
    """Dựng toàn bộ công thức trộn cho ffmpeg, và danh sách cửa vào.

    Trả về: (danh sách tham số cửa vào, chuỗi công thức, tên luồng hình, tên luồng tiếng,
             tổng độ dài đầu ra, có mờ chồng hay không)

    ⚠️ CHỖ QUYẾT ĐỊNH TỐC ĐỘ NẰM Ở ĐÂY: mỗi đoạn là MỘT CỬA VÀO riêng, và -ss được
    đặt TRƯỚC -i. Đặt trước thì ffmpeg NHẢY THẲNG tới chỗ cần lấy. Đặt sau -i (hoặc
    dùng bộ lọc trim) thì ffmpeg phải giải nén lần lượt từ đầu video tới chỗ đó rồi
    vứt đi — đo thật chậm gấp 9,2 lần.
    """
    cua_vao = []
    dat_hinh = []       # các bước xử lý hình cho từng đoạn
    dat_tieng = []      # các bước xử lý tiếng cho từng đoạn

    # Có mờ chồng được không? Mờ chồng ăn 0,15 giây ở chỗ nối, đoạn quá ngắn thì hỏng.
    ngan_nhat = min(cuoi - dau for dau, cuoi in doan)
    co_mo_chong = len(doan) > 1 and ngan_nhat >= DOAN_NGAN_NHAT
    if len(doan) > 1 and not co_mo_chong:
        print("  (!) Có đoạn chỉ dài %.2f giây (ngắn hơn %.2f giây) nên KHÔNG chèn được "
              "chuyển cảnh mờ chồng. Các đoạn sẽ nối thẳng, chỗ nối có thể hơi gợn."
              % (ngan_nhat, DOAN_NGAN_NHAT))

    if doc:
        loc_hinh, _ = loc_khung_doc(tin["rong"], tin["cao"])
    else:
        # Không đổi khung: giữ nguyên kích thước gốc. Vẫn phải ép về số chẵn vì
        # bộ mã hoá H.264 không nhận cạnh lẻ.
        loc_hinh = "scale=trunc(iw/2)*2:trunc(ih/2)*2"

    for i, (dau, cuoi) in enumerate(doan):
        thoi_luong = cuoi - dau
        # -ss và -t ĐẶT TRƯỚC -i: nhảy thẳng tới đoạn cần, và chỉ đọc đúng chừng ấy giây.
        # Đây đồng thời là chốt chặn: cửa vào không bao giờ đọc quá độ dài đã ghi.
        cua_vao += ["-ss", "%.4f" % dau, "-t", "%.4f" % thoi_luong, "-i", tin["duong_dan"]]

        # fps= ép về số hình/giây cố định — bắt buộc, vì chỗ nối mờ chồng đòi hai bên
        # phải cùng nhịp hình. setpts=PTS-STARTPTS kéo đồng hồ của đoạn về mốc 0.
        dat_hinh.append("[%d:v]%s,fps=%.5f,setsar=1,format=yuv420p,setpts=PTS-STARTPTS[h%d];"
                        % (i, loc_hinh, so_hinh_giay, i))

        if tin["co_tieng"]:
            # GIỮ NGUYÊN TIẾNG GỐC — chỉ đồng nhất tần số lấy mẫu và kéo đồng hồ về 0,
            # không đụng tới độ to, không đổi cao độ. Tiếng khớp đúng hình đã cắt.
            dat_tieng.append("[%d:a]aformat=sample_rates=48000:channel_layouts=stereo,"
                             "asetpts=PTS-STARTPTS[t%d];" % (i, i))

    # ── Video không có tiếng: đắp một dải tiếng im để file ra vẫn có luồng tiếng ──
    # ⚠️ anullsrc LÀ NGUỒN SINH VÔ HẠN — nó đẻ mẫu tiếng mãi mãi. Bắt buộc kèm -t
    # ngay tại cửa vào, nếu không ffmpeg chạy tới sáng. Đây là lỗi đã dính thật.
    if not tin["co_tieng"]:
        tong_tho = sum(cuoi - dau for dau, cuoi in doan)
        print("  (!) Video gốc KHÔNG CÓ TIẾNG. File ra sẽ có một dải tiếng im để các "
              "nền tảng không báo lỗi.")
        cua_vao += ["-f", "lavfi", "-t", "%.4f" % (tong_tho + 1),
                    "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]

    # ── Nối các đoạn lại ──
    buoc = list(dat_hinh) + list(dat_tieng)

    if len(doan) == 1:
        ten_hinh = "[h0]"
        ten_tieng = "[t0]" if tin["co_tieng"] else None
        tong_dai = doan[0][1] - doan[0][0]

    elif co_mo_chong:
        # xfade = mờ chồng. "offset" là mốc giây TRONG ĐOẠN ĐÃ GHÉP mà chuyển cảnh
        # bắt đầu. Ghép xong đoạn thứ k thì tổng dài = tổng cũ + đoạn mới − 0,15
        # (vì hai đoạn chồng lên nhau mất 0,15 giây).
        dai_ghep = doan[0][1] - doan[0][0]
        truoc = "[h0]"
        for i in range(1, len(doan)):
            moc = dai_ghep - MO_CHONG
            ra = "[hx%d]" % i
            buoc.append("%s[h%d]xfade=transition=fade:duration=%.3f:offset=%.4f%s;"
                        % (truoc, i, MO_CHONG, moc, ra))
            dai_ghep = dai_ghep + (doan[i][1] - doan[i][0]) - MO_CHONG
            truoc = ra
        ten_hinh = truoc
        tong_dai = dai_ghep

        if tin["co_tieng"]:
            # acrossfade = tiếng cũng mờ chồng đúng 0,15 giây, khớp y hệt hình,
            # nên tiếng không bao giờ lệch khỏi hình.
            truoc_t = "[t0]"
            for i in range(1, len(doan)):
                ra = "[tx%d]" % i
                buoc.append("%s[t%d]acrossfade=d=%.3f:c1=tri:c2=tri%s;"
                            % (truoc_t, i, MO_CHONG, ra))
                truoc_t = ra
            ten_tieng = truoc_t
        else:
            ten_tieng = None

    else:
        # Không mờ chồng được thì nối thẳng.
        ten_hinh, ten_tieng = "[hn]", "[tn]"
        chuoi_h = "".join("[h%d]" % i for i in range(len(doan)))
        buoc.append("%sconcat=n=%d:v=1:a=0[hn];" % (chuoi_h, len(doan)))
        if tin["co_tieng"]:
            chuoi_t = "".join("[t%d]" % i for i in range(len(doan)))
            buoc.append("%sconcat=n=%d:v=0:a=1[tn];" % (chuoi_t, len(doan)))
        else:
            ten_tieng = None
        tong_dai = sum(cuoi - dau for dau, cuoi in doan)

    cong_thuc = "".join(buoc).rstrip(";")
    return cua_vao, cong_thuc, ten_hinh, ten_tieng, tong_dai, co_mo_chong


# ═══════════════════════════════════════════════════════════════════════════
#  PHẦN 4 — CHẠY
# ═══════════════════════════════════════════════════════════════════════════

def in_cach_dung():
    print("CẮT GHÉP ĐOẠN — lấy vài đoạn hay trong video dài rồi ghép thành video ngắn")
    print("")
    print("  python cat_doan.py <video-dai.mp4> <danh-sach-doan.json> <file-ra.mp4> [--doc]")
    print("")
    print("  --doc   đổi về khung dọc 9:16 (1080x1920) để đăng TikTok")
    print("")
    print("  File danh sách đoạn ghi kiểu này (giây bắt đầu, giây kết thúc):")
    print("      [[5, 13], [420, 431.5], [1750, 1760]]")


def main():
    tham_so = [a for a in sys.argv[1:] if not a.startswith("--")]
    co_cai = [a for a in sys.argv[1:] if a.startswith("--")]

    doc = "--doc" in co_cai
    la = [c for c in co_cai if c != "--doc"]
    if la:
        print("  (!) Không hiểu cờ %s — bỏ qua. Chỉ có một cờ duy nhất là --doc."
              % ", ".join(la))

    if len(tham_so) < 3:
        in_cach_dung()
        sys.exit(1)

    video_goc, file_doan, file_ra = tham_so[0], tham_so[1], tham_so[2]

    print("═══ CẮT GHÉP ĐOẠN ═══")
    print("")

    # ── Bước 1: đọc video gốc ──
    tin = doc_thong_tin(video_goc)
    tin["duong_dan"] = video_goc
    dung_luong = os.path.getsize(video_goc) / (1024 * 1024)
    print("  Video gốc : %s" % os.path.basename(video_goc))
    print("              %dx%d · dài %.1f giây (%d phút %d giây) · %.0f MB · %s"
          % (tin["rong"], tin["cao"], tin["dai"], int(tin["dai"] // 60),
             int(tin["dai"] % 60), dung_luong,
             "có tiếng" if tin["co_tieng"] else "KHÔNG có tiếng"))

    # ── Bước 2: đọc danh sách đoạn ──
    doan = doc_danh_sach_doan(file_doan, tin["dai"])
    print("")
    print("  Lấy ra %d đoạn:" % len(doan))
    for i, (dau, cuoi) in enumerate(doan, 1):
        print("      %d. giây %7.2f → %7.2f   (%.2f giây)" % (i, dau, cuoi, cuoi - dau))

    # ── Bước 3: dựng công thức ──
    so_hinh_giay = tin["so_hinh_giay"]
    cua_vao, cong_thuc, ten_hinh, ten_tieng, tong_dai, co_mo_chong = \
        dung_cong_thuc(doan, tin, doc, so_hinh_giay)

    print("")
    if doc:
        _, giai_thich = loc_khung_doc(tin["rong"], tin["cao"])
        print("  Khung ra  : dọc 1080x1920 (9:16) — %s" % giai_thich)
    else:
        print("  Khung ra  : giữ nguyên khung gốc %dx%d (không ghi cờ --doc)"
              % (tin["rong"], tin["cao"]))
    if co_mo_chong:
        print("  Chỗ nối   : mờ chồng %.2f giây × %d chỗ — hình và tiếng mờ chồng cùng nhịp"
              % (MO_CHONG, len(doan) - 1))
    elif len(doan) == 1:
        print("  Chỗ nối   : chỉ có một đoạn, không có chỗ nối nào")
    print("  Dự tính   : video ra dài khoảng %.2f giây" % tong_dai)

    # ── Bước 4: chạy ffmpeg ──
    # ⚠️ -t Ở MỨC LỆNH: chốt chặn cứng, dù công thức có sai thế nào thì ffmpeg cũng
    # dừng đúng chỗ này. Bộ não đã ghi hai lần treo máy thật vì thiếu dòng này.
    han_t = tong_dai + 0.05

    # Chốt chặn thời gian: cho 12 giây máy chạy cho mỗi 1 giây video ra, cộng thêm
    # 90 giây dự phòng lúc mở file. Đo thật chỉ mất khoảng 0,7 giây cho mỗi giây video,
    # nên hạn này rất rộng — chạm tới hạn là chắc chắn có gì đó kẹt thật.
    han_cho = int(tong_dai * 12 + 90)

    lenh = (["ffmpeg", "-y", "-v", "error", "-nostdin"] + cua_vao +
            ["-filter_complex", cong_thuc,
             "-map", ten_hinh])
    if ten_tieng:
        lenh += ["-map", ten_tieng]
    else:
        # Dải tiếng im là cửa vào cuối cùng (đã kèm -t ngay tại cửa vào của nó)
        lenh += ["-map", "%d:a" % len(doan)]

    lenh += [
        "-t", "%.4f" % han_t,                 # ⚠️ CHỐT CHẶN BẮT BUỘC — đừng bỏ dòng này
        "-c:v", "libx264",
        "-preset", "veryfast",                # 4 nhân CPU, không có card đồ hoạ
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-profile:v", "high",       # để ffmpeg tự chọn "level", khung 1080x1920 sát mức 4.0
        "-r", "%.5f" % so_hinh_giay,
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart",            # để nền tảng phát được ngay, khỏi chờ tải hết
        file_ra,
    ]

    print("")
    print("  Đang cắt ghép... (chốt chặn %d giây, quá hạn sẽ tự dừng)" % han_cho)
    bat_dau = time.time()
    chay(lenh, han_giay=han_cho, ten_viec="cắt ghép và mã hoá video")
    mat = time.time() - bat_dau

    # ── Bước 5: kiểm lại file ra ──
    if not os.path.isfile(file_ra) or os.path.getsize(file_ra) == 0:
        print("  ✗ ffmpeg báo xong nhưng không thấy file ra. Có gì đó không ổn.")
        sys.exit(1)

    kiem = doc_thong_tin(file_ra)
    print("")
    print("═══ XONG ═══")
    print("  File ra   : %s" % file_ra)
    print("  Kích thước: %dx%d · dài %.2f giây · %.1f MB · %s"
          % (kiem["rong"], kiem["cao"], kiem["dai"],
             os.path.getsize(file_ra) / (1024 * 1024),
             "có tiếng" if kiem["co_tieng"] else "KHÔNG có tiếng"))
    print("  Máy chạy  : %.1f giây" % mat)
    if kiem["dai"] > 0:
        print("              (%.2f giây máy chạy cho mỗi 1 giây video ra)"
              % (mat / kiem["dai"]))

    lech = abs(kiem["dai"] - tong_dai)
    if lech > 0.35:
        print("  (!) Độ dài thật lệch %.2f giây so với dự tính %.2f giây. "
              "Nên mở video ra xem lại." % (lech, tong_dai))


if __name__ == "__main__":
    main()
