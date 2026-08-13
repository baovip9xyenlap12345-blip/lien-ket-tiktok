# -*- coding: utf-8 -*-
"""NẠP VIDEO DÀI — bộ não edit video của anh Hoàn / Bảo Gấu Bông.

Việc của công cụ này: nạp MỘT video dài (khoảng 30 phút, nặng cỡ 1 GB) mà anh Hoàn quay,
rồi tự tìm ra những đoạn 25–50 giây đáng cắt ra làm video ngắn đăng TikTok.

    python nap_video_dai.py <video-dai.mp4> [--phut-toi-da 40]

Chạy xong sẽ có 3 tệp trong  <thư-mục-video>/_du-an/<tên-video>/work/ :
    words.json          — mốc giây của TỪNG CHỮ
    transcript-doc.txt  — bản chữ dễ đọc, mỗi câu có mốc giây
    doan-de-xuat.json   — 5 đoạn hay nhất, có điểm và lý do

Máy cần có: ffmpeg, ffprobe, và thư viện faster-whisper (đã cài sẵn trên máy anh Hoàn).

BA ĐIỀU ĐÃ TRẢ GIÁ BẰNG MÁY TREO — ĐỪNG SỬA MẤT:
  1. CHẠY BẰNG CPU, KHÔNG DÙNG CARD MÀN HÌNH. Đã thử card màn hình thì ffmpeg sập.
  2. Mọi lệnh ffmpeg đều có -t (giới hạn số giây). Thiếu -t đã treo máy thật hai lần
     trong dự án này (một lần 578 giây, một lần 607 giây tính theo giờ máy chạy).
  3. Không nạp cả video vào bộ nhớ. Video chảy qua ffmpeg, Python chỉ đọc chữ.
"""

import os
import re
import sys
import json
import time
import argparse
import subprocess

# Cho phép in tiếng Việt trên cửa sổ dòng lệnh của Windows mà không lỗi phông chữ.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


# ============================================================================
# PHẦN 0 — MẤY CON SỐ CHỐT SẴN, MUỐN ĐỔI THÌ ĐỔI Ở ĐÂY
# ============================================================================

PHUT_TOI_DA_MAC_DINH = 40      # nạp tối đa 40 phút; dài hơn thì cắt bớt và BÁO ra màn hình
DOAN_NGAN_NHAT = 25.0          # đoạn đề xuất ngắn nhất (giây)
DOAN_DAI_NHAT = 50.0           # đoạn đề xuất dài nhất (giây)
DOAN_LY_TUONG_TU = 30.0        # khoảng đẹp nhất để đăng TikTok: 30–45 giây
DOAN_LY_TUONG_DEN = 45.0
SO_DOAN_XUAT = 5               # xuất 5 đoạn hay nhất
NGUONG_LANG = 0.35             # im lặng quá 0,35 giây thì tính là khoảng chết
TAN_SO_LAY_TIENG = 16000       # 16 nghìn mẫu/giây, một kênh — đủ cho bóc lời, nhẹ máy

# Mô hình bóc lời. Chọn "small" (bản nhỏ) làm mặc định vì tiếng Việt cần độ chính xác;
# "base" (bản nền) nhanh gần gấp đôi nhưng sai chính tả nhiều hơn, chỉ dùng khi cần gấp.
MODEL_MAC_DINH = "small"

# Tiếng đệm — nói nhiều mấy tiếng này thì đoạn đó nghe ề à, phải trừ điểm.
TIENG_DEM = {
    "à", "ừ", "ừm", "ờ", "ơ", "ưm", "hử", "hửm", "ừa", "à à", "ơ kìa",
    "ừ thì", "kiểu như", "đấy", "ấy", "nói chung là",
}


# ============================================================================
# PHẦN 1 — MẤY HÀM VẶT: IN SỐ, IN GIỜ, GỌI LỆNH
# ============================================================================

def so(x, le=1):
    """Viết số theo kiểu người Việt: dấu phẩy ngăn phần lẻ. Ví dụ 12,9 chứ không phải 12.9."""
    return ("%.*f" % (le, x)).replace(".", ",")


def dinh_dang_thoi_gian(giay):
    """Đổi số giây thành câu dễ đọc: '4 phút 12 giây'."""
    giay = int(round(max(0.0, giay)))
    if giay < 60:
        return "%d giây" % giay
    phut, du = divmod(giay, 60)
    if phut < 60:
        return "%d phút %d giây" % (phut, du) if du else "%d phút" % phut
    tieng, phut = divmod(phut, 60)
    return "%d tiếng %d phút" % (tieng, phut) if phut else "%d tiếng" % tieng


def moc_dong_ho(giay):
    """Đổi số giây thành mốc đồng hồ phút:giây, kiểu 02:15 — để anh Hoàn tua tay cho nhanh."""
    giay = max(0, int(giay))
    return "%02d:%02d" % (giay // 60, giay % 60)


def chay_lenh(cmd):
    """Gọi một lệnh ngoài (ffmpeg / ffprobe) và lấy về kết quả chữ."""
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def kiem_tra_cong_cu():
    """Bảo đảm máy có ffmpeg và ffprobe. Thiếu thì dừng ngay, nói rõ thiếu cái gì."""
    thieu = []
    for ten in ("ffmpeg", "ffprobe"):
        try:
            r = subprocess.run([ten, "-version"], capture_output=True)
            if r.returncode != 0:
                thieu.append(ten)
        except Exception:
            thieu.append(ten)
    if thieu:
        print("")
        print("!! DỪNG LẠI. Máy chưa có công cụ xử lý video: " + ", ".join(thieu))
        print("   Cách sửa: cài ffmpeg rồi thêm nó vào đường dẫn hệ thống, sau đó chạy lại.")
        return False
    return True


# ============================================================================
# PHẦN 2 — BƯỚC 1: ĐỌC THÔNG TIN VIDEO
# ============================================================================

def doc_thong_tin_video(video):
    """Hỏi ffprobe xem video này dài bao nhiêu, khung hình cỡ nào, có tiếng hay không.

    Trả về một cuốn sổ thông tin. Nếu video KHÔNG CÓ TIẾNG thì trả về None
    sau khi đã in lời báo lỗi rõ ràng — vì không có tiếng thì không bóc lời được.
    """
    print("")
    print("BƯỚC 1/5 — ĐỌC THÔNG TIN VIDEO")
    print("-" * 66)

    if not os.path.isfile(video):
        print("!! Không tìm thấy tệp video: %s" % video)
        print("   Kiểm tra lại đường dẫn, hoặc kéo thả tệp vào cửa sổ dòng lệnh cho chắc.")
        return None

    dung_luong = os.path.getsize(video) / (1024.0 * 1024.0)

    # Hỏi phần hình
    r = chay_lenh([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate,codec_name",
        "-show_entries", "format=duration",
        "-of", "json", video,
    ])
    try:
        du_lieu = json.loads(r.stdout or "{}")
    except Exception:
        du_lieu = {}

    luong_hinh = (du_lieu.get("streams") or [{}])[0]
    thoi_luong = float((du_lieu.get("format") or {}).get("duration") or 0.0)

    if thoi_luong <= 0:
        print("!! Không đọc được độ dài video. Tệp có thể hỏng hoặc chưa quay xong.")
        print("   Lời máy báo: %s" % (r.stderr or "").strip()[:300])
        return None

    rong = int(luong_hinh.get("width") or 0)
    cao = int(luong_hinh.get("height") or 0)
    khung = luong_hinh.get("r_frame_rate") or "0/1"
    try:
        tu, mau = khung.split("/")
        so_khung = float(tu) / float(mau) if float(mau) else 0.0
    except Exception:
        so_khung = 0.0

    # Hỏi phần tiếng
    r2 = chay_lenh([
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=codec_name,channels,sample_rate",
        "-of", "json", video,
    ])
    try:
        luong_tieng = (json.loads(r2.stdout or "{}").get("streams") or [])
    except Exception:
        luong_tieng = []

    print("   Tệp        : %s" % os.path.basename(video))
    print("   Nặng       : %s MB" % so(dung_luong))
    print("   Dài        : %s (%s giây)" % (dinh_dang_thoi_gian(thoi_luong), so(thoi_luong)))
    print("   Khung hình : %d x %d, %s hình/giây" % (rong, cao, so(so_khung)))

    if not luong_tieng:
        print("   Tiếng      : KHÔNG CÓ")
        print("")
        print("!! DỪNG LẠI. Video này không có tiếng nên không bóc lời được.")
        print("   Công cụ này sống nhờ lời nói: không có tiếng thì không tìm được đoạn hay.")
        print("   Cách sửa: quay lại có bật míc, hoặc chọn đúng tệp video có tiếng rồi chạy lại.")
        return None

    print("   Tiếng      : có (%s, %s kênh)"
          % (luong_tieng[0].get("codec_name") or "chưa rõ", luong_tieng[0].get("channels") or "?"))

    # Kiểm tra thêm: có luồng tiếng nhưng câm như thóc thì cũng vô dụng.
    # Chỉ nghe thử 60 giây đầu cho nhanh — và BẮT BUỘC có -t để ffmpeg không chạy vô tận.
    r3 = chay_lenh([
        "ffmpeg", "-hide_banner", "-nostdin", "-v", "info",
        "-i", video, "-vn", "-t", "60", "-af", "volumedetect",
        "-f", "null", "-",
    ])
    khop = re.search(r"mean_volume:\s*(-?\d+(?:\.\d+)?) dB", r3.stderr or "")
    do_to = float(khop.group(1)) if khop else None
    if do_to is not None:
        print("   Độ to      : %s dB (trung bình 60 giây đầu)" % so(do_to))
        if do_to < -60.0:
            print("")
            print("!! DỪNG LẠI. Video có luồng tiếng nhưng gần như câm hẳn (%s dB)." % so(do_to))
            print("   Nhiều khả năng lúc quay míc bị tắt hoặc bị bịt.")
            print("   Cách sửa: quay lại có tiếng, rồi chạy lại công cụ này.")
            return None
    else:
        print("   BỎ QUA phép đo độ to: máy không đọc được chỉ số âm lượng. Vẫn chạy tiếp bình thường.")

    return {
        "duong_dan": os.path.abspath(video),
        "thoi_luong": thoi_luong,
        "dung_luong_mb": dung_luong,
        "rong": rong,
        "cao": cao,
        "so_khung": so_khung,
    }


# ============================================================================
# PHẦN 3 — BƯỚC 2: TÁCH TIẾNG RA TỆP ÂM THANH NHẸ
# ============================================================================

def thu_muc_du_an(video):
    """Dựng sẵn chỗ để đồ: <thư-mục-video>/_du-an/<tên-video>/work/ .

    Dùng os.path.join nên chạy được cả trên Windows lẫn Linux, không cứng hoá dấu gạch.
    """
    ten = os.path.splitext(os.path.basename(video))[0]
    goc = os.path.join(os.path.dirname(os.path.abspath(video)), "_du-an", ten)
    work = os.path.join(goc, "work")
    os.makedirs(work, exist_ok=True)
    return goc, work


def tach_am_thanh(video, thoi_luong, gioi_han_giay, duong_dan_wav):
    """Rút phần tiếng ra một tệp âm thanh mono 16 nghìn mẫu/giây.

    Cả video KHÔNG hề được nạp vào bộ nhớ: ffmpeg đọc video theo dòng chảy,
    Python chỉ đứng ngoài đọc mấy dòng báo tiến độ.
    """
    print("")
    print("BƯỚC 2/5 — TÁCH TIẾNG RA TỆP ÂM THANH NHẸ")
    print("-" * 66)

    thoi_luong_lam = min(thoi_luong, gioi_han_giay)
    if thoi_luong_lam < thoi_luong - 0.5:
        print("   BỎ QUA phần đuôi video: chỉ nạp %s đầu, cắt bỏ %s cuối."
              % (dinh_dang_thoi_gian(thoi_luong_lam), dinh_dang_thoi_gian(thoi_luong - thoi_luong_lam)))
        print("   (Muốn nạp nhiều hơn thì thêm  --phut-toi-da <số phút>  khi chạy.)")

    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-nostdin", "-v", "error",
        "-i", video,
        "-vn",                                   # bỏ hẳn phần hình cho nhẹ
        "-ac", "1",                              # gộp về một kênh
        "-ar", str(TAN_SO_LAY_TIENG),            # 16 nghìn mẫu/giây
        "-t", "%.3f" % thoi_luong_lam,           # BẮT BUỘC: chặn cứng số giây, đừng bao giờ bỏ
        "-progress", "pipe:1", "-nostats",
        duong_dan_wav,
    ]

    bat_dau = time.time()
    tien_trinh = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                  text=True, encoding="utf-8", errors="replace")
    lan_in_cuoi = 0.0
    try:
        for dong in tien_trinh.stdout:            # đọc từng dòng, không dồn vào bộ nhớ
            if not dong.startswith("out_time_ms="):
                continue
            try:
                da_xong = int(dong.split("=", 1)[1].strip()) / 1000000.0
            except Exception:
                continue
            bay_gio = time.time()
            if bay_gio - lan_in_cuoi >= 1.0:
                lan_in_cuoi = bay_gio
                phan_tram = min(100.0, da_xong / max(thoi_luong_lam, 0.001) * 100.0)
                sys.stdout.write("\r   Đang tách tiếng: %s%%   " % so(phan_tram, 0))
                sys.stdout.flush()
    finally:
        tien_trinh.wait()
    sys.stdout.write("\r" + " " * 50 + "\r")
    sys.stdout.flush()

    if tien_trinh.returncode != 0 or not os.path.isfile(duong_dan_wav):
        print("!! DỪNG LẠI. Không tách được tiếng ra khỏi video.")
        print("   Lời máy báo: %s" % (tien_trinh.stderr.read() or "").strip()[:400])
        return None

    nang = os.path.getsize(duong_dan_wav) / (1024.0 * 1024.0)
    print("   Xong. Tệp tiếng nặng %s MB, mất %s."
          % (so(nang), dinh_dang_thoi_gian(time.time() - bat_dau)))
    return thoi_luong_lam


# ============================================================================
# PHẦN 4 — BƯỚC 3: BÓC LỜI BẰNG FASTER-WHISPER (CHẠY BẰNG CPU)
# ============================================================================

def boc_loi(duong_dan_wav, thoi_luong, ten_model, thu_muc_model=None):
    """Nghe tệp tiếng rồi viết ra chữ, kèm mốc giây của từng chữ.

    Chạy hoàn toàn bằng CPU (đã chốt: card màn hình làm ffmpeg sập).
    In tiến độ theo phần trăm và báo còn khoảng bao lâu nữa để anh Hoàn biết đường đợi.
    """
    print("")
    print("BƯỚC 3/5 — BÓC LỜI (nghe rồi viết ra chữ)")
    print("-" * 66)

    try:
        from faster_whisper import WhisperModel
    except Exception as loi:
        print("!! DỪNG LẠI. Máy chưa cài được thư viện bóc lời faster-whisper.")
        print("   Lời máy báo: %s" % loi)
        print("   Cách sửa: mở dòng lệnh gõ  pip install faster-whisper  rồi chạy lại.")
        return None

    so_nhan = os.cpu_count() or 4
    print("   Chạy bằng CPU với %d nhân (cố ý không dùng card màn hình)." % so_nhan)
    print("   Dùng mô hình nghe: %s" % ten_model)
    print("   Lần chạy đầu tiên máy phải tải mô hình về, có thể đợi vài phút. Các lần sau nhanh hơn.")

    nguon_model = thu_muc_model or ten_model
    try:
        may_nghe = WhisperModel(
            nguon_model,
            device="cpu",           # CHỐT: chỉ CPU
            compute_type="int8",    # tính bằng số nguyên 8 bit — nhẹ bộ nhớ, nhanh trên CPU
            cpu_threads=so_nhan,
            num_workers=1,
        )
    except Exception as loi:
        print("!! DỪNG LẠI. Không nạp được mô hình nghe '%s'." % nguon_model)
        print("   Lời máy báo: %s" % str(loi)[:400])
        print("   Hai lý do hay gặp:")
        print("     1. Máy chưa nối được ra mạng để tải mô hình về lần đầu.")
        print("     2. Mạng công ty chặn chỗ tải mô hình.")
        print("   Cách sửa: tải sẵn thư mục mô hình về máy rồi chạy lại kèm")
        print("             --thu-muc-model <đường dẫn thư mục mô hình>")
        return None

    print("   Bắt đầu nghe. Xin đợi, đừng tắt cửa sổ này.")
    bat_dau = time.time()

    cac_doan, thong_tin = may_nghe.transcribe(
        duong_dan_wav,
        language="vi",                  # nói tiếng Việt
        word_timestamps=True,           # cần mốc giây từng chữ để cắt cho khớp miệng
        vad_filter=True,                # bỏ qua quãng im lặng cho nhanh và bớt bịa chữ
        vad_parameters=dict(min_silence_duration_ms=500, speech_pad_ms=200),
        beam_size=1,                    # đi thẳng, không dò nhiều hướng — nhanh gấp rưỡi trên CPU
        temperature=0.0,
        condition_on_previous_text=False,  # chống bệnh lặp câu vô tận khi video dài
    )

    tong_giay = float(getattr(thong_tin, "duration", 0) or thoi_luong)
    cau = []
    chu = []
    so_chu_thieu_moc = 0
    so_cau_rong = 0
    lan_in_cuoi = 0.0

    for doan in cac_doan:
        loi_noi = (doan.text or "").strip()
        if not loi_noi:
            so_cau_rong += 1
            continue

        cac_chu = []
        for w in (doan.words or []):
            if w.start is None or w.end is None:
                so_chu_thieu_moc += 1
                continue
            cac_chu.append({
                "chu": (w.word or "").strip(),
                "bat_dau": round(float(w.start), 3),
                "ket_thuc": round(float(w.end), 3),
            })
        chu.extend(cac_chu)
        cau.append({
            "bat_dau": round(float(doan.start), 3),
            "ket_thuc": round(float(doan.end), 3),
            "loi": loi_noi,
            "chu": cac_chu,
        })

        bay_gio = time.time()
        if bay_gio - lan_in_cuoi >= 3.0:
            lan_in_cuoi = bay_gio
            xong = min(1.0, float(doan.end) / max(tong_giay, 0.001))
            da_ton = bay_gio - bat_dau
            con_lai = (da_ton / xong - da_ton) if xong > 0.02 else 0
            sys.stdout.write(
                "\r   Đang bóc lời: %s%%  —  đã nghe %s / %s  —  còn khoảng %s      "
                % (so(xong * 100, 0), dinh_dang_thoi_gian(doan.end),
                   dinh_dang_thoi_gian(tong_giay), dinh_dang_thoi_gian(con_lai)))
            sys.stdout.flush()

    sys.stdout.write("\r" + " " * 90 + "\r")
    sys.stdout.flush()

    ton = time.time() - bat_dau
    if so_cau_rong:
        print("   BỎ QUA %d câu rỗng (máy nghe ra khoảng lặng, không có chữ nào)." % so_cau_rong)
    if so_chu_thieu_moc:
        print("   BỎ QUA %d chữ không có mốc giây (không cắt theo mấy chữ này được)." % so_chu_thieu_moc)
    if not cau:
        print("!! DỪNG LẠI. Nghe hết video mà không ra chữ nào.")
        print("   Nhiều khả năng tiếng quá nhỏ, quá ồn, hoặc không phải tiếng Việt.")
        return None

    print("   Xong. Bóc được %d câu, %d chữ. Mất %s (nhanh gấp %s lần so với ngồi nghe tay)."
          % (len(cau), len(chu), dinh_dang_thoi_gian(ton), so(tong_giay / max(ton, 0.001))))
    return {"cau": cau, "chu": chu, "tong_giay": tong_giay, "giay_boc": ton}


# ============================================================================
# PHẦN 5 — BƯỚC 4: CHẤM ĐIỂM ĐOẠN HAY
# Tiêu chí lấy thẳng từ hồ sơ khách hàng ở
# .claude/skills/ho-so-khach-hang/SKILL.md — mục 2 (bảy nhóm nỗi đau),
# mục 3 (mười tiêu chí chọn nhà cung cấp) và mục 4 (ngôn ngữ đã chứng minh có sức nặng).
# ============================================================================

# Mỗi nhóm: (tên nhóm, điểm cộng, lời giải thích, danh sách cụm từ cần bắt)
NHOM_TIEU_CHI = [
    ("tiến độ", 30,
     "nỗi đau MẠNH NHẤT trong hồ sơ — ngày sự kiện là hạn cứng, giao chậm là hỏng cả lô",
     ["tiến độ", "đúng hẹn", "đúng tiến độ", "giao chậm", "giao trễ", "trễ hẹn",
      "chậm tiến độ", "kịp sự kiện", "đúng ngày", "sát ngày", "giao đúng",
      "đến sau", "trễ", "kịp không", "kịp ngày", "hàng gấp", "đơn gấp", "làm gấp"]),

    ("sợ bị quy trách nhiệm", 22,
     "người đặt quà không tiêu tiền của mình nhưng đứng tên chịu trách nhiệm trước sếp",
     ["chịu trách nhiệm", "quy trách nhiệm", "sếp", "mất uy tín", "đứng tên",
      "người phụ trách", "bị mắng", "gánh", "ăn nói làm sao", "khó ăn nói"]),

    ("giá tận xưởng, không qua trung gian", 24,
     "câu đã chứng minh có sức nặng ở mục 4 hồ sơ khách hàng",
     ["giá tận xưởng", "tận xưởng", "xưởng trực tiếp", "không qua trung gian",
      "qua trung gian", "trung gian", "đội giá", "giá gốc", "giá xưởng", "cắt bớt khâu"]),

    ("demo và thiết kế miễn phí", 20,
     "gỡ đúng nỗi sợ 'demo đẹp mà in thật lại khác' ở nhóm nỗi đau ý tưởng & duyệt mẫu",
     ["demo miễn phí", "miễn phí demo", "thiết kế miễn phí", "lên demo", "làm demo",
      "duyệt mẫu", "mẫu thật", "gửi logo", "làm mẫu", "xem mẫu trước"]),

    ("in thêu logo, đúng nhận diện", 20,
     "tiêu chí số 2 và số 6 khi khách chọn nhà cung cấp: đúng chất lượng đã duyệt, cá nhân hoá",
     ["in logo", "thêu logo", "in thêu", "nhận diện thương hiệu", "đúng nhận diện",
      "lệch màu", "đúng màu", "in tên", "thêu tên", "gắn logo"]),

    ("hợp đồng, hoá đơn đỏ", 16,
     "tiêu chí số 7 — bên mua của doanh nghiệp bắt buộc phải có giấy tờ mới thanh toán được",
     ["hợp đồng", "hoá đơn", "hóa đơn", "xuất hoá đơn", "xuất hóa đơn",
      "chứng từ", "thanh toán", "công nợ", "thuế"]),

    ("số lượng lớn, năng lực xưởng", 16,
     "tiêu chí số 8 — khách sợ xưởng nhỏ ôm không nổi đơn to",
     ["số lượng lớn", "đơn lớn", "đơn to", "nghìn", "ngàn", "công suất",
      "một ngày", "mỗi ngày", "xưởng", "dây chuyền", "sản xuất"]),

    ("giao toàn quốc", 12,
     "tiêu chí số 8 — khách ở tỉnh sợ không giao tới nơi",
     ["giao toàn quốc", "toàn quốc", "giao hàng toàn quốc", "gửi đi tỉnh", "cả nước"]),

    ("giá trị món quà, điểm chạm thương hiệu", 14,
     "nhóm nỗi đau chiến lược — quà đại trà thì không ai giữ",
     ["điểm chạm thương hiệu", "quà tặng", "món quà", "giữ lại", "bỏ đi",
      "nhớ thương hiệu", "kỷ niệm", "tri ân", "quà nhạt", "khó nhớ"]),

    ("mời khách liên hệ", 12,
     "mục 6 hồ sơ — mỗi nội dung phải có đúng một lời kêu gọi",
     ["báo giá", "nhắn tin", "để lại số", "za lô", "zalo", "liên hệ",
      "gọi tư vấn", "đại lý", "nhắn cho em", "inbox"]),
]

# Tám câu đã chứng minh có sức nặng (mục 4.2 hồ sơ). Nói trúng mấy câu này là cộng đậm.
CAU_VANG = [
    ("quà đến sau", 28, "nói trúng câu vàng 'đừng để 3 tháng chuẩn bị sự kiện đổ bể vì quà đến sau một ngày'"),
    ("đổ bể", 24, "nói trúng ý câu vàng về sự kiện đổ bể vì quà về muộn"),
    ("ngủ ngon", 28, "nói trúng câu vàng 'xưởng tốt trả lại cho bạn một đêm ngủ ngon trước sự kiện'"),
    ("quà rẻ", 22, "nói trúng câu vàng 'quà rẻ nhưng bị bỏ đi mới là món quà đắt nhất'"),
    ("ôm con gấu", 24, "nói trúng câu vàng 'khách có thể ôm con gấu mang logo của bạn nhiều năm'"),
    ("cảm giác thuộc về", 24, "nói trúng câu vàng về tặng quà nhân viên và cảm giác thuộc về"),
    ("ký ức", 20, "nói trúng ý câu vàng về gấu tốt nghiệp là ký ức có tên trường, lớp, niên khoá"),
    ("sếp dễ duyệt", 22, "nói trúng câu vàng 'món quà lên ảnh đẹp, sếp dễ duyệt, khách muốn giữ'"),
    ("khoản phát sinh", 20, "nói trúng câu vàng về báo giá rõ để mua hàng không phải săn từng khoản phát sinh"),
]


def _bo_dau_cach_thua(chuoi):
    """Đưa lời nói về dạng dễ so khớp: chữ thường, một dấu cách, bỏ dấu câu."""
    chuoi = (chuoi or "").lower()
    chuoi = re.sub(r"[.,!?;:\"'()\[\]…–—-]", " ", chuoi)
    return re.sub(r"\s+", " ", chuoi).strip()


def cham_diem_doan(loi_noi, cac_chu, bat_dau, ket_thuc):
    """Chấm điểm một đoạn và ghi lại lý do bằng tiếng Việt.

    Trả về (điểm, danh sách lý do). Điểm càng cao càng đáng cắt ra đăng.
    """
    van = _bo_dau_cach_thua(loi_noi)
    do_dai = max(0.001, ket_thuc - bat_dau)
    diem = 0.0
    ly_do = []

    # --- CỘNG: nói trúng nỗi đau và ngôn ngữ trong hồ sơ khách hàng ---
    for ten_nhom, diem_nhom, giai_thich, cac_cum in NHOM_TIEU_CHI:
        bat_duoc = sorted({c for c in cac_cum if c in van})
        if not bat_duoc:
            continue
        # Nhóm nào cũng chỉ được cộng tối đa gấp đôi, tránh một đoạn lặp đi lặp lại
        # mỗi chữ "logo" hai chục lần rồi chiếm hết bảng xếp hạng.
        he_so = min(2.0, 1.0 + 0.25 * (len(bat_duoc) - 1))
        cong = diem_nhom * he_so
        diem += cong
        ly_do.append("Cộng %s điểm — chạm nhóm '%s' (nghe thấy: %s). Vì %s."
                     % (so(cong, 0), ten_nhom, ", ".join("“%s”" % c for c in bat_duoc[:4]), giai_thich))

    # --- CỘNG: nói trúng mấy câu vàng đã chứng minh có sức nặng ---
    for cum, diem_cau, giai_thich in CAU_VANG:
        if cum in van:
            diem += diem_cau
            ly_do.append("Cộng %s điểm — %s." % (so(diem_cau, 0), giai_thich))

    # --- CỘNG: có con số cụ thể thì lời nói chắc hơn ---
    cac_so = re.findall(r"\d+", van)
    if cac_so:
        cong = min(10.0, 4.0 + 2.0 * len(set(cac_so)))
        diem += cong
        ly_do.append("Cộng %s điểm — có con số cụ thể (%s), nói có sách mách có chứng."
                     % (so(cong, 0), ", ".join(sorted(set(cac_so))[:4])))

    # --- CỘNG: độ dài rơi đúng khoảng đẹp để đăng TikTok ---
    if DOAN_LY_TUONG_TU <= do_dai <= DOAN_LY_TUONG_DEN:
        diem += 8.0
        ly_do.append("Cộng 8 điểm — dài %s giây, đúng khoảng đẹp nhất để đăng TikTok (30–45 giây)."
                     % so(do_dai))

    # --- TRỪ: nói nhiều tiếng đệm thì nghe ề à ---
    if cac_chu:
        so_dem = sum(1 for c in cac_chu if _bo_dau_cach_thua(c["chu"]) in TIENG_DEM)
        ty_le_dem = so_dem / float(len(cac_chu))
        if ty_le_dem > 0.02:
            tru = min(25.0, (ty_le_dem - 0.02) * 100.0 * 2.5)
            diem -= tru
            ly_do.append("Trừ %s điểm — %d tiếng đệm kiểu “à”, “ừm”, “ờ” trên %d chữ (%s%%), nghe ề à."
                         % (so(tru, 0), so_dem, len(cac_chu), so(ty_le_dem * 100)))

    # --- TRỪ: nhiều khoảng lặng thì đoạn bị chết nhịp ---
    tong_lang = 0.0
    for truoc, sau in zip(cac_chu, cac_chu[1:]):
        khe = sau["bat_dau"] - truoc["ket_thuc"]
        if khe > NGUONG_LANG:
            tong_lang += khe
    ty_le_lang = tong_lang / do_dai
    if ty_le_lang > 0.12:
        tru = min(30.0, (ty_le_lang - 0.12) * 100.0 * 1.2)
        diem -= tru
        ly_do.append("Trừ %s điểm — im lặng mất %s giây trên %s giây (%s%%), đoạn bị chết nhịp."
                     % (so(tru, 0), so(tong_lang), so(do_dai), so(ty_le_lang * 100)))

    # --- TRỪ: nói quá thưa, cả đoạn chẳng được mấy chữ ---
    mat_do = len(cac_chu) / do_dai
    if mat_do < 1.6:
        tru = min(15.0, (1.6 - mat_do) * 12.0)
        diem -= tru
        ly_do.append("Trừ %s điểm — cả đoạn chỉ %d chữ trong %s giây, nói quá thưa."
                     % (so(tru, 0), len(cac_chu), so(do_dai)))

    if not ly_do:
        ly_do.append("Không chạm được nỗi đau nào trong hồ sơ khách hàng, cũng không mắc lỗi nào rõ rệt.")

    return max(0.0, diem), ly_do


def _khong_dinh_nhau(a, b):
    """Hai đoạn có dẫm lên nhau về thời gian hay không."""
    return a["giay_ket_thuc"] <= b["giay_bat_dau"] or b["giay_ket_thuc"] <= a["giay_bat_dau"]


def de_xuat_doan(cau, tong_giay):
    """Chia lời nói thành các đoạn 25–50 giây theo ranh giới câu, chấm điểm, lấy 5 đoạn hay nhất."""
    print("")
    print("BƯỚC 4/5 — CHẤM ĐIỂM VÀ CHỌN ĐOẠN HAY")
    print("-" * 66)
    print("   Tiêu chí chấm lấy từ hồ sơ khách hàng Bảo Gấu Bông")
    print("   (nỗi đau tiến độ, giá tận xưởng, demo miễn phí, in thêu logo,")
    print("    hợp đồng và hoá đơn, số lượng lớn, giao toàn quốc, tám câu vàng).")

    ngan_nhat, dai_nhat = DOAN_NGAN_NHAT, DOAN_DAI_NHAT

    # Video ngắn quá thì không cắt nổi đoạn 25 giây — hạ ngưỡng và BÁO ra màn hình.
    if tong_giay < DOAN_NGAN_NHAT:
        ngan_nhat = max(5.0, tong_giay * 0.5)
        dai_nhat = tong_giay + 1.0
        print("   BỎ QUA luật 25–50 giây: cả video chỉ dài %s giây." % so(tong_giay))
        print("   Hạ ngưỡng xuống %s giây để vẫn có đoạn mà xem." % so(ngan_nhat))

    ung_vien = []
    so_qua_ngan = 0
    for i in range(len(cau)):
        for j in range(i, len(cau)):
            bat_dau = cau[i]["bat_dau"]
            ket_thuc = cau[j]["ket_thuc"]
            do_dai = ket_thuc - bat_dau
            if do_dai > dai_nhat:
                break
            if do_dai < ngan_nhat:
                so_qua_ngan += 1
                continue
            cac_chu = []
            cac_loi = []
            for k in range(i, j + 1):
                cac_chu.extend(cau[k]["chu"])
                cac_loi.append(cau[k]["loi"])
            loi_noi = " ".join(cac_loi).strip()
            diem, ly_do = cham_diem_doan(loi_noi, cac_chu, bat_dau, ket_thuc)
            ung_vien.append({
                "giay_bat_dau": round(bat_dau, 2),
                "giay_ket_thuc": round(ket_thuc, 2),
                "do_dai_giay": round(do_dai, 2),
                "moc_dong_ho": "%s - %s" % (moc_dong_ho(bat_dau), moc_dong_ho(ket_thuc)),
                "diem": round(diem, 1),
                "ly_do_cham_diem": ly_do,
                "nguyen_van": loi_noi,
                "so_chu": len(cac_chu),
            })

    print("   Đã dựng %d đoạn để chấm. BỎ QUA %d đoạn vì chưa đủ %s giây."
          % (len(ung_vien), so_qua_ngan, so(ngan_nhat)))

    if not ung_vien:
        print("   BỎ QUA việc đề xuất: không dựng nổi đoạn nào đủ dài. Vẫn ghi tệp rỗng để anh biết.")
        return []

    ung_vien.sort(key=lambda d: (-d["diem"], -d["do_dai_giay"]))

    chon = []
    so_dinh_nhau = 0
    for uv in ung_vien:
        if len(chon) >= SO_DOAN_XUAT:
            break
        if all(_khong_dinh_nhau(uv, da_chon) for da_chon in chon):
            chon.append(uv)
        else:
            so_dinh_nhau += 1

    if so_dinh_nhau:
        print("   BỎ QUA %d đoạn vì dẫm lên đoạn đã chọn (tránh chọn trùng một chỗ nhiều lần)."
              % so_dinh_nhau)
    if len(chon) < SO_DOAN_XUAT:
        print("   BỎ QUA phần còn thiếu: chỉ tìm được %d đoạn không dẫm nhau, ít hơn %d đoạn mong muốn."
              % (len(chon), SO_DOAN_XUAT))

    chon.sort(key=lambda d: -d["diem"])
    for thu_tu, d in enumerate(chon, 1):
        d["xep_hang"] = thu_tu
    return chon


# ============================================================================
# PHẦN 6 — BƯỚC 5: GHI RA BA TỆP
# ============================================================================

def ghi_ba_tep(work, video, ket_qua, doan_hay):
    """Ghi words.json, transcript-doc.txt và doan-de-xuat.json."""
    print("")
    print("BƯỚC 5/5 — GHI KẾT QUẢ RA TỆP")
    print("-" * 66)

    duong_words = os.path.join(work, "words.json")
    duong_doc = os.path.join(work, "transcript-doc.txt")
    duong_dexuat = os.path.join(work, "doan-de-xuat.json")

    # 1) Mốc giây từng chữ — để bước dựng cắt cho khớp miệng.
    with open(duong_words, "w", encoding="utf-8") as f:
        json.dump(ket_qua["chu"], f, ensure_ascii=False, indent=1)

    # 2) Bản chữ dễ đọc — để anh Hoàn đọc bằng mắt.
    with open(duong_doc, "w", encoding="utf-8") as f:
        f.write("BẢN BÓC LỜI — %s\n" % os.path.basename(video))
        f.write("Mỗi dòng là một câu. Trong ngoặc vuông là mốc giây để anh tua cho nhanh.\n")
        f.write("Dạng: [phút:giây bắt đầu → phút:giây kết thúc | giây bắt đầu - giây kết thúc] lời nói\n")
        f.write("Tổng: %d câu, %d chữ, nghe hết %s.\n"
                % (len(ket_qua["cau"]), len(ket_qua["chu"]),
                   dinh_dang_thoi_gian(ket_qua["tong_giay"])))
        f.write("=" * 78 + "\n\n")
        for c in ket_qua["cau"]:
            f.write("[%s → %s | %s - %s] %s\n"
                    % (moc_dong_ho(c["bat_dau"]), moc_dong_ho(c["ket_thuc"]),
                       so(c["bat_dau"]), so(c["ket_thuc"]), c["loi"]))

    # 3) Đoạn đề xuất — thứ anh Hoàn cần nhất.
    goi = {
        "video_goc": os.path.abspath(video),
        "tong_giay_da_nghe": round(ket_qua["tong_giay"], 2),
        "so_doan_de_xuat": len(doan_hay),
        "cach_cham_diem": ("Điểm cộng khi đoạn nói trúng nỗi đau và ngôn ngữ trong hồ sơ khách hàng "
                           "Bảo Gấu Bông (tiến độ, giá tận xưởng, demo miễn phí, in thêu logo, "
                           "hợp đồng và hoá đơn, số lượng lớn, giao toàn quốc, tám câu vàng). "
                           "Điểm trừ khi nhiều tiếng đệm hoặc nhiều khoảng lặng."),
        "doan": doan_hay,
    }
    with open(duong_dexuat, "w", encoding="utf-8") as f:
        json.dump(goi, f, ensure_ascii=False, indent=1)

    for ten, duong in (("words.json", duong_words),
                       ("transcript-doc.txt", duong_doc),
                       ("doan-de-xuat.json", duong_dexuat)):
        print("   Đã ghi %-20s %s KB   %s"
              % (ten, so(os.path.getsize(duong) / 1024.0), duong))
    return duong_dexuat


def in_bang_de_xuat(doan_hay):
    """In 5 đoạn hay nhất ra màn hình cho anh Hoàn xem ngay, khỏi phải mở tệp."""
    print("")
    print("=" * 78)
    print("NĂM ĐOẠN ĐÁNG CẮT NHẤT")
    print("=" * 78)
    if not doan_hay:
        print("Không tìm được đoạn nào đủ dài để đề xuất.")
        return
    for d in doan_hay:
        print("")
        print("ĐOẠN %d — %s điểm" % (d["xep_hang"], so(d["diem"])))
        print("  Tua tới : %s   (giây %s đến giây %s, dài %s giây)"
              % (d["moc_dong_ho"], so(d["giay_bat_dau"]), so(d["giay_ket_thuc"]), so(d["do_dai_giay"])))
        print("  Vì sao chấm điểm này:")
        for l in d["ly_do_cham_diem"]:
            print("     - %s" % l)
        loi = d["nguyen_van"]
        print("  Nguyên văn lời nói:")
        for dong in _bo_dong(loi, 70):
            print("     %s" % dong)


def _bo_dong(chuoi, rong):
    """Bẻ một câu dài thành nhiều dòng cho dễ đọc trên cửa sổ dòng lệnh."""
    tu = (chuoi or "").split()
    dong, hien = [], ""
    for t in tu:
        if len(hien) + len(t) + 1 > rong:
            dong.append(hien)
            hien = t
        else:
            hien = (hien + " " + t).strip()
    if hien:
        dong.append(hien)
    return dong or [""]


# ============================================================================
# PHẦN 7 — CHẠY CHÍNH
# ============================================================================

def main():
    bo_doc = argparse.ArgumentParser(
        description="Nạp một video dài rồi tự tìm những đoạn đáng cắt thành video ngắn đăng TikTok.")
    bo_doc.add_argument("video", help="đường dẫn video dài cần nạp")
    bo_doc.add_argument("--phut-toi-da", type=float, default=PHUT_TOI_DA_MAC_DINH,
                        help="chỉ nạp bấy nhiêu phút đầu (mặc định %d phút)" % PHUT_TOI_DA_MAC_DINH)
    bo_doc.add_argument("--model", default=MODEL_MAC_DINH,
                        help="mô hình nghe: small (chính xác hơn, mặc định) hoặc base (nhanh gần gấp đôi)")
    bo_doc.add_argument("--thu-muc-model", default=None,
                        help="thư mục mô hình đã tải sẵn, dùng khi máy không nối được ra mạng")
    tham_so = bo_doc.parse_args()

    print("")
    print("=" * 78)
    print("NẠP VIDEO DÀI — TÌM ĐOẠN ĐÁNG CẮT THÀNH VIDEO NGẮN")
    print("Bộ não edit video của anh Hoàn / Bảo Gấu Bông")
    print("=" * 78)

    bat_dau_tat_ca = time.time()

    if not kiem_tra_cong_cu():
        return 2

    thong_tin = doc_thong_tin_video(tham_so.video)
    if thong_tin is None:
        return 2

    goc, work = thu_muc_du_an(tham_so.video)
    duong_wav = os.path.join(work, "tieng-goc.wav")

    thoi_luong_lam = tach_am_thanh(
        thong_tin["duong_dan"], thong_tin["thoi_luong"],
        tham_so.phut_toi_da * 60.0, duong_wav)
    if thoi_luong_lam is None:
        return 2

    ket_qua = boc_loi(duong_wav, thoi_luong_lam, tham_so.model, tham_so.thu_muc_model)
    if ket_qua is None:
        return 2

    doan_hay = de_xuat_doan(ket_qua["cau"], ket_qua["tong_giay"])
    ghi_ba_tep(work, thong_tin["duong_dan"], ket_qua, doan_hay)
    in_bang_de_xuat(doan_hay)

    print("")
    print("=" * 78)
    print("XONG TẤT CẢ. Mất %s cho video dài %s."
          % (dinh_dang_thoi_gian(time.time() - bat_dau_tat_ca),
             dinh_dang_thoi_gian(thong_tin["thoi_luong"])))
    print("Ba tệp kết quả nằm ở: %s" % work)
    print("Bước tiếp theo: mở doan-de-xuat.json, chọn đoạn ưng ý, rồi đưa mốc giây đó")
    print("sang công cụ edit_video_giaoduc.py để dựng thành video ngắn hoàn chỉnh.")
    print("=" * 78)
    return 0


if __name__ == "__main__":
    sys.exit(main())
