# -*- coding: utf-8 -*-
"""LÀM TRỌN MỘT VIDEO NGẮN BẰNG MỘT LỆNH.

Nạp một bảng phân cảnh viết sẵn -> ra video 9:16 có giọng đọc, hình minh hoạ,
chữ, nhạc nền và tiếng động. Tự đo tiếng, tự trích khung hình để soi.

CÁCH DÙNG
  python lam_video.py <bang-phan-canh.json> <thu-muc-ra>

BẢNG PHÂN CẢNH viết dạng JSON:
{
  "ten": "ten-video-khong-dau",
  "giong": "<mã giọng Cartesia>",
  "canh": [
    {"to": "CHỮ TO", "nhan": "NHÃN NHỎ", "loi": "lời đọc", "kieu": "hook", "hinh": "english keyword"},
    ...
  ]
}

  kieu: hook | dau (nỗi đau) | hieu (bước ngoặt) | giai (giải pháp) | cta
  hinh: từ khoá tiếng Anh để tải hình. Bỏ trống thì cảnh đó dùng màu thương hiệu.

CẦN CÓ
  Biến môi trường CARTESIA_API_KEY và PEXELS_KEY (hoặc điền trong chia-khoa.txt).
"""
import json, os, re, subprocess, sys, urllib.request, urllib.error

GOC = os.path.dirname(os.path.abspath(__file__))
BO_NAO = os.path.dirname(GOC)
ASSETS = os.path.join(GOC, "assets")
BO_DUNG_MAU = os.path.join(BO_NAO, "kich-ban", "03-qua-in-logo-thuong-hieu", "dung-video.py")
MAU_GIONG = "sonic-3"          # mẫu DUY NHẤT đọc được tiếng Việt, ba mẫu kia đều từ chối

# ---------------------------------------------------------------------------
# NHỊP VIDEO — chủ doanh nghiệp chốt 14/08/2026
# Nguyên văn: "tốc độ đọc tăng lên 1.1 và tỷ lệ chuyển cảnh nhanh hơn, tôi thấy
# giọng tôi và cảnh đi hơi chậm". Bốn con số dưới đây là chỗ chỉnh nhịp, áp cho
# MỌI video sau này. Muốn đổi thì đổi ở đây, đừng sửa rải rác trong mã.
# ---------------------------------------------------------------------------
TOC_DO_DOC     = 1.10   # đọc nhanh hơn 10%. Dùng atempo nên KHÔNG bị the giọng
NGHI_CUOI_CAU  = 0.14   # giây thở cuối mỗi câu, trước để 0,32 -> cảnh bị lê
CANH_NGAN_NHAT = 1.60   # cảnh ngắn nhất, trước để 2,00
LECH_GIONG     = 0.08   # giọng vào sau khi đổi cảnh bao lâu, trước để 0,16
BIA_DAI_NHAT   = 3.00   # ảnh bìa chốt cứng 2-3 giây


def chia(ten_bien, ten_dong):
    v = os.environ.get(ten_bien)
    if v:
        return v.strip()
    p = os.path.join(BO_NAO, "chia-khoa.txt")
    if os.path.exists(p):
        for d in open(p, encoding="utf-8", errors="replace"):
            d = d.strip()
            if d.startswith(ten_dong + "="):
                v = d.split("=", 1)[1].strip()
                if v and not v.startswith("<"):
                    return v
    return None


def dai_tep(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", f], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def do_to(f, loc=None):
    c = ["ffmpeg", "-hide_banner", "-i", f, "-af",
         (loc + ",volumedetect") if loc else "volumedetect", "-f", "null", "-"]
    r = subprocess.run(c, capture_output=True, text=True)
    tb = re.search(r"mean_volume: (-?[\d.]+)", r.stderr)
    mx = re.search(r"max_volume: (-?[\d.]+)", r.stderr)
    return (float(tb.group(1)) if tb else None, float(mx.group(1)) if mx else None)


# ---------- BƯỚC 1: đọc lời bằng giọng Cartesia ----------

def doc_giong(canh, ma_giong, thu_muc, khoa):
    doc_giong.da_bao = getattr(doc_giong, "da_bao", False)
    """Đọc từng câu ra một tệp riêng, cắt khoảng lặng thừa, rồi tính mốc giây theo giọng."""
    os.makedirs(thu_muc, exist_ok=True)
    moc, t = [], 0.0
    print("\n>> BƯỚC 1/5 — ĐỌC LỜI BẰNG GIỌNG THẬT")
    for i, c in enumerate(canh, 1):
        loi = (c.get("loi") or "").strip()
        if not loi:                       # cảnh không có lời (ví dụ cảnh chữ tiêu đề)
            canh_dai = BIA_DAI_NHAT
            moc.append({"canh": i, "bat": round(t, 2), "ket": round(t + canh_dai, 2), "tep": None})
            print("   %2d: (không có lời) — để %.1f giây" % (i, canh_dai))
            t += canh_dai
            continue
        body = json.dumps({
            "model_id": MAU_GIONG, "transcript": loi,
            "voice": {"mode": "id", "id": ma_giong}, "language": "vi",
            "output_format": {"container": "wav", "encoding": "pcm_s16le", "sample_rate": 44100},
        }).encode()
        rq = urllib.request.Request("https://api.cartesia.ai/tts/bytes", data=body, headers={
            "X-API-Key": khoa, "Cartesia-Version": "2024-11-13", "Content-Type": "application/json"})
        tho = os.path.join(thu_muc, "v-%02d.wav" % i)
        try:
            open(tho, "wb").write(urllib.request.urlopen(rq, timeout=90).read())
        except urllib.error.HTTPError as e:
            loi_txt = e.read()[:120].decode("utf-8", "replace")
            if e.code == 402 and not doc_giong.da_bao:
                # Hết lượt đọc: KHÔNG dừng cả dây chuyền, chuyển sang giọng máy offline
                # để chủ doanh nghiệp vẫn xem được nhịp video. Báo thật to, không im lặng.
                print()
                print("   " + "!" * 56)
                print("   !! TÀI KHOẢN CARTESIA ĐÃ HẾT LƯỢT ĐỌC (lỗi 402).")
                print("   !! Chuyển sang GIỌNG MÁY OFFLINE để làm bản nháp.")
                print("   !! Giọng này rất máy móc — CHỈ để xem nhịp, ĐỪNG ĐĂNG.")
                print("   !! Nạp thêm lượt ở play.cartesia.ai rồi chạy lại là ra giọng thật.")
                print("   " + "!" * 56)
                doc_giong.da_bao = True
            elif e.code != 402:
                print("!! Không đọc được câu %d: lỗi %s %s" % (i, e.code, loi_txt))
                sys.exit(1)
            if subprocess.run(["which", "espeak-ng"], capture_output=True).returncode != 0:
                print("!! Không có giọng thay thế. Cài bằng: apt-get install -y espeak-ng")
                sys.exit(1)
            subprocess.run(["espeak-ng", "-v", "vi", "-s", "150", "-w", tho, loi],
                           capture_output=True)
        sach = os.path.join(thu_muc, "c-%02d.wav" % i)
        # Cắt khoảng lặng TRƯỚC rồi mới tăng tốc — làm ngược lại thì ngưỡng -45 dB
        # đo trên tiếng đã méo, cắt sai chỗ.
        # atempo giữ nguyên cao độ giọng, khác hẳn đổi tần số lấy mẫu (nghe the như chuột).
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tho, "-af",
            "silenceremove=start_periods=1:start_silence=0.12:start_threshold=-45dB:"
            "stop_periods=-1:stop_silence=0.12:stop_threshold=-45dB,"
            "atempo=%.3f" % TOC_DO_DOC,
            "-c:a", "pcm_s16le", sach], check=True)
        d = dai_tep(sach)
        canh_dai = max(CANH_NGAN_NHAT, d + NGHI_CUOI_CAU)
        # ẢNH BÌA chốt cứng 2-3 giây: lâu hơn thì người xem sốt ruột lướt qua,
        # ngắn hơn thì chưa kịp đọc hết hai dải chữ. Lệnh của chủ doanh nghiệp 14/08.
        if c.get("kieu") == "bia" and canh_dai > BIA_DAI_NHAT:
            print("   (!) Lời cảnh bìa dài %.2f giây — cắt còn %.1f giây theo luật ảnh bìa."
                  % (canh_dai, BIA_DAI_NHAT))
            print("       Viết lại lời cảnh bìa ngắn hơn kẻo cụt tiếng.")
            canh_dai = BIA_DAI_NHAT
        moc.append({"canh": i, "bat": round(t, 2), "ket": round(t + canh_dai, 2), "tep": sach})
        print("   %2d: đọc ra %.2f giây → cảnh %.2f giây | %s" % (i, d, canh_dai, loi[:40]))
        t += canh_dai
    print("   Tổng video: %.2f giây" % t)
    return moc, t


# ---------- BƯỚC 2: tải hình minh hoạ ----------

def tai_hinh(canh, thu_muc, khoa_pexels):
    print("\n>> BƯỚC 2/5 — TẢI HÌNH MINH HOẠ")
    if not khoa_pexels:
        print("   (!) Chưa có chìa kho ảnh — mọi cảnh sẽ dùng màu thương hiệu.")
        return 0
    muc = []
    for i, c in enumerate(canh, 1):
        if c.get("hinh"):
            muc.append("%02d:%s" % (i, c["hinh"]))
    if not muc:
        print("   Không cảnh nào khai từ khoá hình — bỏ qua.")
        return 0
    r = subprocess.run([sys.executable, os.path.join(GOC, "lay_hinh_pexels.py"), thu_muc] + muc,
                       env=dict(os.environ, PEXELS_KEY=khoa_pexels),
                       capture_output=True, text=True, timeout=900)
    for d in r.stdout.splitlines():
        if d.strip().startswith(("+", ">> Cảnh", "(!)")) or "(!)" in d:
            print("   " + d.strip())
    return len([f for f in os.listdir(thu_muc)]) if os.path.isdir(thu_muc) else 0


# ---------- BƯỚC 3: dựng hình ----------

def dung_hinh(canh, moc, thu_muc_canh, ra_mp4, lam_mo=False):
    """Chép bộ dựng mẫu, thay bảng phân cảnh bằng bảng của mình, rồi chạy."""
    print("\n>> BƯỚC 3/5 — DỰNG HÌNH")
    t = open(BO_DUNG_MAU, encoding="utf-8").read()
    XD = chr(92) + "n"                    # hai ký tự: gạch chéo + n, để xuống dòng trong chữ to
    dong = ["CANH = ["]
    for c, m in zip(canh, moc):
        # Dấu ngoặc kép trong chữ phải đổi thành ngoặc đơn, nếu không nó cắt đứt chuỗi
        # trong mã sinh ra và cả bộ dựng vỡ. Đã dính thật ở câu hook có chữ trong ngoặc kép.
        sach = lambda s: (s or "").replace('"', "'")
        to = sach(c.get("to")).replace("\n", XD)
        dong.append(' (%.2f, %.2f, "%s", "%s", "%s", "%s"),'
                    % (m["bat"], m["ket"], sach(c.get("nhan")), to,
                       sach(c.get("loi")), c.get("kieu", "giai")))
    dong.append("]")
    # dùng hàm thay thế để dấu gạch chéo không bị nuốt
    t = re.sub(r"CANH = \[.*?\n\]", lambda m: "\n".join(dong), t, flags=re.S)
    tam = os.path.join(os.path.dirname(ra_mp4), "_bo-dung-tam.py")
    open(tam, "w", encoding="utf-8").write(t)
    lenh = [sys.executable, tam, ra_mp4, thu_muc_canh] + (["mo"] if lam_mo else [])
    r = subprocess.run(lenh, capture_output=True, text=True, timeout=1800)
    for d in r.stdout.splitlines()[-3:]:
        print("   " + d.strip())
    if not os.path.exists(ra_mp4):
        print("!! Dựng hỏng:\n" + r.stdout[-1200:] + r.stderr[-800:])
        sys.exit(1)
    os.remove(tam)


# ---------- BƯỚC 4: trộn tiếng ----------

def tron_tieng(moc, tong_dai, ra_wav, moc_tieng_dong):
    print("\n>> BƯỚC 4/5 — TRỘN TIẾNG")
    co_loi = [m for m in moc if m["tep"]]
    ins, fc, nh = [], [], []
    for k, m in enumerate(co_loi):
        ins += ["-i", m["tep"]]
        ms = int(round((m["bat"] + LECH_GIONG) * 1000))
        fc.append("[%d:a]aresample=44100,adelay=%d|%d[v%d]" % (k, ms, ms, k))
        nh.append("[v%d]" % k)
    fc.append("".join(nh) + "amix=inputs=%d:duration=longest:normalize=0,volume=2.2[g]" % len(co_loi))
    gop = ra_wav + ".giong.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y"] + ins +
                   ["-filter_complex", ";".join(fc), "-map", "[g]", "-t", "%.2f" % tong_dai,
                    "-c:a", "pcm_s16le", gop], check=True)

    nhac = os.path.join(ASSETS, "nhac-video-ngan-2.mp3")
    who = os.path.join(ASSETS, "whoosh-nhe.wav")
    tb_g, _ = do_to(gop)
    tb_n, _ = do_to(nhac)
    # Luật bộ não: nhạc thấp hơn giọng 18-25 dB. Lấy 21 dB cho vào giữa khung.
    vol = 10 ** (((tb_g - 21) - tb_n) / 20)
    print("   Giọng %.1f dB · nhạc đặt %.1f dB (mức %.3f)" % (tb_g, tb_g - 21, vol))

    sfx = "".join("[2:a]volume=0.45,adelay=%d|%d[s%d];" % (int(t * 1000), int(t * 1000), i)
                  for i, t in enumerate(moc_tieng_dong))
    nhan_sfx = "".join("[s%d]" % i for i in range(len(moc_tieng_dong)))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", gop,
        "-t", "%.2f" % tong_dai, "-i", nhac, "-i", who,
        "-filter_complex",
        "[1:a]volume=%.4f,afade=t=in:st=0:d=1.2,afade=t=out:st=%.1f:d=2.0[nh];%s"
        "[0:a][nh]%samix=inputs=%d:duration=first:normalize=0,alimiter=limit=0.89[a]"
        % (vol, max(0, tong_dai - 2), sfx, nhan_sfx, 2 + len(moc_tieng_dong)),
        "-map", "[a]", "-t", "%.2f" % tong_dai, "-c:a", "pcm_s16le", ra_wav], check=True)
    # Chuẩn hoá về mức nền tảng video ngắn, chừa hở cho khâu nén AAC khỏi vọt lên
    chuan = ra_wav + ".chuan.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", ra_wav,
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100",
                    "-c:a", "pcm_s16le", chuan], check=True)
    return chuan


# ---------- BƯỚC 5: ghép và tự kiểm ----------

def ghep_va_kiem(hinh, tieng, ra, tong_dai, thu_muc_soi):
    print("\n>> BƯỚC 5/5 — GHÉP VÀ TỰ KIỂM")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", hinh, "-i", tieng,
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-movflags", "+faststart", "-t", "%.2f" % tong_dai, ra], check=True)
    tb, mx = do_to(ra)
    print("   Đo tiếng: trung bình %.1f dB · to nhất %.1f dB" % (tb, mx))
    print("   " + ("✔ Đỉnh dưới -1 dB, không rè" if mx < -1 else "⚠️ Đỉnh chạm trần, có thể rè"))

    os.makedirs(thu_muc_soi, exist_ok=True)
    moc_soi = [0.0, tong_dai * 0.25, tong_dai * 0.5, tong_dai * 0.75, max(0, tong_dai - 1.5)]
    for i, t in enumerate(moc_soi, 1):
        subprocess.run(["ffmpeg", "-v", "error", "-ss", "%.2f" % t, "-i", ra, "-frames:v", "1",
                        "-vf", "scale=405:-1", os.path.join(thu_muc_soi, "soi-%02d.png" % i), "-y"],
                       check=True)
    print("   Đã trích %d khung vào %s" % (len(moc_soi), thu_muc_soi))
    print("   ⚠️ BẮT BUỘC mở từng ảnh ra XEM TẬN MẮT trước khi báo xong.")


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    bang = json.load(open(sys.argv[1], encoding="utf-8"))
    ra_dir = sys.argv[2]
    os.makedirs(ra_dir, exist_ok=True)
    ten = bang.get("ten", "video")
    canh = bang["canh"]

    k_car = chia("CARTESIA_API_KEY", "CARTESIA_KEY")
    if not k_car:
        print("!! Chưa có chìa Cartesia. Đặt biến môi trường CARTESIA_API_KEY."); sys.exit(1)
    k_pex = chia("PEXELS_KEY", "PEXELS_KEY")

    print("=" * 62)
    print("LÀM VIDEO: %s — %d cảnh" % (ten, len(canh)))
    print("=" * 62)

    moc, tong = doc_giong(canh, bang["giong"], os.path.join(ra_dir, "giong"), k_car)
    thu_muc_canh = os.path.join(ra_dir, "canh")
    tai_hinh(canh, thu_muc_canh, k_pex)

    hinh = os.path.join(ra_dir, "_hinh.mp4")
    dung_hinh(canh, moc, thu_muc_canh, hinh, lam_mo=bang.get("lam_mo", False))

    # Tiếng động đánh vào chỗ đổi sang cảnh bước ngoặt và cảnh kêu gọi
    moc_sfx = [0.0] + [m["bat"] for c, m in zip(canh, moc) if c.get("kieu") in ("hieu", "cta")]
    tieng = tron_tieng(moc, tong, os.path.join(ra_dir, "_tieng.wav"), sorted(set(moc_sfx))[:4])

    ra = os.path.join(ra_dir, "%s-9x16.mp4" % ten)
    ghep_va_kiem(hinh, tieng, ra, tong, os.path.join(ra_dir, "soi"))
    print("\n>> XONG: %s (%.1f giây)" % (ra, tong))


if __name__ == "__main__":
    main()
