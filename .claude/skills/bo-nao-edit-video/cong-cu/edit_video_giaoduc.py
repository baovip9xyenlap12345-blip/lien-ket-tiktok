# -*- coding: utf-8 -*-
"""ĐẠT — kỹ năng 2: EDIT VIDEO GIÁO DỤC.
Nạp 1 video thô (giọng thật, không phải TTS) → cắt khoảng lặng + tiếng đệm + đoạn lặp ý,
tua nhanh, chèn nhạc nền, gắn phụ đề kiểu "chữ đang đọc sáng lên" (giống agentx-video-ai).

3 bước, chạy tuần tự:
  python edit_video_giaoduc.py transcribe <video.mp4>
  python edit_video_giaoduc.py dexuat <video.mp4>          # sau bước này, Đạt ĐỌC transcript, tự điền "lap_y" vào de-xuat-cat.json
  python edit_video_giaoduc.py dung <video.mp4> [--nhac PATH] [--toc-do 1.2]

Cần: faster-whisper, torch, ffmpeg trong PATH.
"""
import os, sys, json, argparse, subprocess, datetime
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

NGUONG_LANG = 0.5      # >0.5s im lặng thì coi là khoảng trống cần cắt (chốt 2026-08-08)
PAD_LANG = 0.12         # chừa lại 0.12s mỗi đầu khoảng lặng cho tự nhiên, không cắt sát 0 tuyệt đối
TOC_DO_MAC_DINH = 1.15  # hạ từ 1.2 xuống 1.15 — anh Hoàn chốt 1.2 nghe hơi nhanh (2026-08-08)
TU_DEM = {"à","ừ","ừm","ờ","ơ","ê","ừa","hửm","à à","ừ ừ"}

# --- LÀM ĐẸP HÌNH ẢNH: nâng mạnh ngày 2026-08-09 theo yêu cầu trực tiếp anh Hoàn
# ("làm sáng video, rõ nét, sao cho video thật nét nhất có thể, đừng để video bị tối").
# gamma nâng vùng tối/vùng giữa lên mà KHÔNG làm cháy vùng sáng — đây là thứ chống "video bị tối",
# khác brightness (brightness kéo đều cả khung, dễ làm bạc màu). Đổi được bằng --sang / --net.
SANG_MAC_DINH = 0.045   # 2026-08-08 là 0.015
GAMMA_MAC_DINH = 1.08   # 2026-08-08 chưa có gamma
NET_MAC_DINH = 0.85     # 2026-08-08 là 0.55
TUONG_PHAN = 1.10       # 2026-08-08 là 1.07
BAO_HOA = 1.12          # 2026-08-08 là 1.10
CTA_GIAY_MAC_DINH = 3.0  # câu chốt cuối hiện 3 giây cuối video
GOLD_RGBA = (255, 206, 72, 255)     # khớp màu GOLD của agentx-video-ai
WHITE_RGBA = (246, 248, 255, 255)
GRAY_RGBA = (150, 156, 172, 255)
BOX_RGBA = (12, 12, 16, 200)


def sh(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def ffprobe_dur(path):
    r = sh(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path])
    return float((r.stdout or "0").strip() or 0)


def kich_thuoc(path):
    r = sh(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
            "-of", "csv=s=x:p=0", path])
    w, h = (r.stdout or "").strip().split("x")
    return int(w), int(h)


def co_nvenc():
    # MẶC ĐỊNH TẮT GPU — bắt được NVENC crash thật (exit code access-violation) khi mã hoá
    # chuỗi lọc có scale eval=frame (zoom nhấn mạnh) ngày 2026-08-08. CPU chạy đúng, chỉ chậm hơn.
    # Đặt VID_GPU=1 nếu sau này xác nhận driver ổn thì mới bật lại.
    ov = os.environ.get("VID_GPU")
    if ov in ("1", "gpu", "on"):
        r = sh(["ffmpeg", "-hide_banner", "-encoders"])
        return "h264_nvenc" in (r.stdout or "")
    return False


def venc():
    if co_nvenc():
        return ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "22", "-pix_fmt", "yuv420p"]
    return ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p"]


def du_an_dir(video):
    """Trả về (thư_mục_du_an, gốc_kho). gốc_kho dùng để tính chỗ đặt video-ra/ sau này."""
    ten = os.path.splitext(os.path.basename(video))[0]
    video_abs = os.path.abspath(video)
    parts = video_abs.replace("\\", "/").split("/")
    if "video-tho" in parts:
        idx = parts.index("video-tho")
        cha = parts[idx - 1] if idx >= 1 else ""
        if cha.upper() == "1-NGUON-GOC":
            # kho gốc của anh Hoàn: .../<GỐC KHO>/1-NGUON-GOC/video-tho/...
            goc_kho = "/".join(parts[:idx - 1])
            root = os.path.join(goc_kho, "1-NGUON-GOC", "video-tho", "_du-an", ten)
        else:
            # kho gọn (bản đóng gói tặng người khác): .../<GỐC KHO>/video-tho/...
            goc_kho = "/".join(parts[:idx])
            root = os.path.join(goc_kho, "video-tho", "_du-an", ten)
    else:
        goc_kho = os.path.dirname(video_abs)
        root = os.path.join(goc_kho, "_du-an-" + ten)
    os.makedirs(os.path.join(root, "work"), exist_ok=True)
    return root, goc_kho


# ---------- BƯỚC 1: transcribe ----------

def buoc_transcribe(video):
    root, _ = du_an_dir(video)
    work = os.path.join(root, "work")
    wav = os.path.join(work, "goc.wav")
    print(">> Tách tiếng...")
    subprocess.run(["ffmpeg", "-y", "-i", video, "-ar", "16000", "-ac", "1", wav], check=True, capture_output=True)

    import torch
    from faster_whisper import WhisperModel
    try:
        os.add_dll_directory(os.path.join(os.path.dirname(torch.__file__), "lib"))
    except Exception:
        pass
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    ct = "float16" if dev == "cuda" else "int8"
    print(">> Bóc lời bằng faster-whisper (%s)..." % dev)
    wm = WhisperModel("large-v3" if dev == "cuda" else "small", device=dev, compute_type=ct)
    segs, _ = wm.transcribe(wav, language="vi", word_timestamps=True, vad_filter=False, temperature=0.0)

    words = []
    cues = []
    for s in segs:
        ws = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for w in (s.words or [])]
        words.extend(ws)
        cues.append({"s": round(s.start, 3), "e": round(s.end, 3), "text": s.text.strip()})

    json.dump(words, open(os.path.join(work, "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    with open(os.path.join(work, "goc.srt"), "w", encoding="utf-8") as f:
        for i, c in enumerate(cues, 1):
            f.write("%d\n%s --> %s\n%s\n\n" % (i, srt_time(c["s"]), srt_time(c["e"]), c["text"]))

    with open(os.path.join(work, "transcript-doc.txt"), "w", encoding="utf-8") as f:
        f.write("TRANSCRIPT ĐỂ ĐẠT ĐỌC VÀ DÒ Ý LẶP — %s\n" % os.path.basename(video))
        f.write("Mỗi dòng: [giây bắt đầu - giây kết thúc] câu nói.\n")
        f.write("Đọc xong thấy câu/đoạn nào LẶP Ý đã nói trước đó (nói lại cùng 1 ý, không phải nhấn mạnh có chủ đích),\n")
        f.write("thì ghi khoảng thời gian đó vào mảng \"lap_y\" trong de-xuat-cat.json (chạy bước 'dexuat' trước để có file này).\n\n")
        for c in cues:
            f.write("[%.1f - %.1f] %s\n" % (c["s"], c["e"], c["text"]))

    print(">> XONG bước 1. %d từ, %d câu — xem work/transcript-doc.txt" % (len(words), len(cues)))


def srt_time(t):
    h = int(t // 3600); m = int((t % 3600) // 60); s = int(t % 60); ms = int(round((t - int(t)) * 1000))
    return "%02d:%02d:%02d,%03d" % (h, m, s, ms)


# ---------- BƯỚC 2: đề xuất cắt tự động (khoảng lặng + tiếng đệm) ----------

def buoc_dexuat(video):
    root, _ = du_an_dir(video)
    work = os.path.join(root, "work")
    words = json.load(open(os.path.join(work, "words.json"), encoding="utf-8"))
    if not words:
        print(">> Không có từ nào — kiểm lại bước transcribe."); return

    khoang_lang = []
    for a, b in zip(words, words[1:]):
        gap = b["s"] - a["e"]
        if gap > NGUONG_LANG:
            s, e = a["e"] + PAD_LANG, b["s"] - PAD_LANG
            if e > s:
                khoang_lang.append([round(s, 2), round(e, 2)])

    tu_dem = []
    for w in words:
        tk = w["w"].strip(".,!?:;…").lower()
        if tk in TU_DEM:
            tu_dem.append([w["s"], w["e"], w["w"]])

    de_xuat_path = os.path.join(work, "de-xuat-cat.json")
    du_lieu = {
        "video": os.path.abspath(video),
        "tu_dong": {"khoang_lang": khoang_lang, "tu_dem": tu_dem},
        "lap_y": [],
    }
    # giữ lại "lap_y" cũ nếu Đạt đã điền từ trước, chỉ ghi đè phần tu_dong
    if os.path.exists(de_xuat_path):
        try:
            cu = json.load(open(de_xuat_path, encoding="utf-8"))
            du_lieu["lap_y"] = cu.get("lap_y", [])
        except Exception:
            pass
    json.dump(du_lieu, open(de_xuat_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(">> XONG bước 2. %d khoảng lặng, %d tiếng đệm — tự động đề xuất." % (len(khoang_lang), len(tu_dem)))
    print(">> Đọc work/transcript-doc.txt, điền \"lap_y\" vào work/de-xuat-cat.json rồi chạy bước 'dung'.")


# ---------- BƯỚC 3: dựng — cắt, tua, nhạc, phụ đề ----------

def gop_khoang_cat(danh_sach, tong_do_dai):
    """Gộp các khoảng cần CẮT bị chồng/kề nhau, trả về khoảng CẦN GIỮ."""
    if not danh_sach:
        return [[0.0, tong_do_dai]]
    xs = sorted([tuple(x[:2]) for x in danh_sach])
    gop = [list(xs[0])]
    for s, e in xs[1:]:
        if s <= gop[-1][1] + 0.02:
            gop[-1][1] = max(gop[-1][1], e)
        else:
            gop.append([s, e])
    giu = []
    con = 0.0
    for s, e in gop:
        if s > con:
            giu.append([con, s])
        con = max(con, e)
    if con < tong_do_dai:
        giu.append([con, tong_do_dai])
    return [g for g in giu if g[1] - g[0] > 0.05]


def cat_va_noi(video, khoang_giu, out_path):
    parts_v, parts_a, labels = [], [], []
    for i, (s, e) in enumerate(khoang_giu):
        parts_v.append("[0:v]trim=start=%.3f:end=%.3f,setpts=PTS-STARTPTS[v%d]" % (s, e, i))
        parts_a.append("[0:a]atrim=start=%.3f:end=%.3f,asetpts=PTS-STARTPTS[a%d]" % (s, e, i))
        labels += ["[v%d][a%d]" % (i, i)]
    concat = "%sconcat=n=%d:v=1:a=1[v][a]" % ("".join(labels), len(khoang_giu))
    fc = ";".join(parts_v + parts_a + [concat])
    subprocess.run(["ffmpeg", "-y", "-i", video, "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
                     *venc(), "-c:a", "aac", "-b:a", "192k", out_path], check=True, capture_output=True)


def dich_chuyen_moc_chu(words, khoang_giu):
    """Dịch mốc chữ gốc sang mốc chữ SAU KHI cắt+nối (bỏ từ rơi vào đoạn đã cắt).
    Mỗi đoạn GIỮ nối liền ngay sau đoạn GIỮ trước đó — offset phải cộng dồn theo
    thứ tự đoạn, không phải tính lại từ 0 cho từng từ."""
    segs = []
    cum = 0.0
    for gs, ge in khoang_giu:
        segs.append((gs, ge, gs - cum))   # new_time = old_time - offset
        cum += (ge - gs)
    ra = []
    for w in words:
        s, e = w["s"], w["e"]
        for gs, ge, offset in segs:
            if s >= gs - 0.01 and e <= ge + 0.01:
                ra.append({"w": w["w"], "s": round(s - offset, 3), "e": round(e - offset, 3)})
                break
    return ra


def dich_khoang_don(s, e, khoang_giu):
    """Dịch 1 mốc (s,e) bất kỳ (VD: mốc nhấn mạnh) sang timeline sau cắt+nối.
    Trả về None nếu mốc rơi đúng vào đoạn đã bị cắt (không dịch được)."""
    cum = 0.0
    for gs, ge in khoang_giu:
        if s >= gs - 0.02 and e <= ge + 0.02:
            offset = gs - cum
            return (s - offset, e - offset)
        cum += (ge - gs)
    return None


def dich_diem(t, khoang_giu):
    """Dịch MỘT ĐIỂM thời gian gốc sang timeline sau cắt+nối.
    Khác `dich_khoang_don` ở chỗ: hàm kia đòi cả mốc phải nằm gọn trong MỘT đoạn giữ lại,
    nên vùng dài (VD vùng làm mờ 60 giây, cắt qua nhiều đoạn) luôn trả về None.
    Đạt dính đúng lỗi này 09/08/2026: khai vùng làm mờ 50,5-110,5 giây mà không mờ gì cả,
    script chạy im re không báo lỗi. Hàm này dịch từng điểm một nên vùng dài mấy cũng được."""
    cum = 0.0
    for gs, ge in khoang_giu:
        if t < gs:
            return cum                      # điểm rơi vào đoạn đã cắt → dán vào đầu đoạn kế
        if t <= ge:
            return cum + (t - gs)
        cum += (ge - gs)
    return cum


def gom_cau_phu_de(words, max_w, fo, do_render, max_tu=5):
    """Gom từ thành từng dòng phụ đề ngắn (tối đa 5 từ HOẶC hết bề rộng khung hình,
    tuỳ cái nào tới trước) — dòng ngắn đọc nhanh hơn, đúng khuyến nghị 2026 (xem nghiên cứu)."""
    cues, cur, cur_start = [], [], None
    for w in words:
        if cur_start is None:
            cur_start = w["s"]
        test = cur + [w]
        rong = do_render.textlength(" ".join(x["w"] for x in test), font=fo)
        if cur and (len(test) > max_tu or rong > max_w):
            cues.append((cur_start, cur[-1]["e"], cur)); cur = [w]; cur_start = w["s"]
        else:
            cur = test
        if cur and cur[-1]["w"].rstrip().endswith((".", "!", "?")):
            cues.append((cur_start, cur[-1]["e"], cur)); cur = []; cur_start = None
    if cur:
        cues.append((cur_start, cur[-1]["e"], cur))
    return cues


def ve_dong_phu_de(d, lay, ln, t, fo, cap_y, vid_w):
    """Vẽ 1 dòng phụ đề tại thời điểm t: hộp bo góc + chữ NẢY LÊN (bung to rồi lắng lại)
    đúng lúc từ đó được đọc tới — giống clip mẫu anh Hoàn đưa, không phải đổi màu khô khan."""
    from PIL import Image, ImageDraw
    tot = d.textlength(" ".join(w["w"] for w in ln), font=fo)
    x = (vid_w - tot) / 2
    y = cap_y
    pad_x, pad_y = int(fo.size * 0.55), int(fo.size * 0.34)
    d.rounded_rectangle([x - pad_x, y - pad_y, x + tot + pad_x, y + fo.size + pad_y],
                         int(fo.size * 0.38), fill=BOX_RGBA)
    for w in ln:
        ww = d.textlength(w["w"], font=fo)
        adv = d.textlength(w["w"] + " ", font=fo)
        act = w["s"] <= t <= w["e"] + 0.05
        if act:
            p = max(0.0, min(1.0, (t - w["s"]) / 0.13))
            sc = 1.0 + 0.22 * (1 - p) * (1 - p)          # bung 1.22 → lắng về 1.0 trong 130ms
            if sc <= 1.01:
                d.text((x, y), w["w"], font=fo, fill=GOLD_RGBA)
            else:
                pad = 16
                tmp = Image.new("RGBA", (int(ww) + pad * 2, int(fo.size * 1.4) + pad * 2), (0, 0, 0, 0))
                ImageDraw.Draw(tmp).text((pad, pad), w["w"], font=fo, fill=GOLD_RGBA)
                sw, shh = max(1, int(tmp.width * sc)), max(1, int(tmp.height * sc))
                tmp = tmp.resize((sw, shh), Image.LANCZOS)
                cx, cy = x + ww / 2, y + fo.size * 0.5
                lay.alpha_composite(tmp, (int(cx - sw / 2), int(cy - shh / 2)))
        else:
            d.text((x, y), w["w"], font=fo, fill=(WHITE_RGBA if t > w["e"] else GRAY_RGBA))
        x += adv


def render_phu_de_overlay(words_final, vid_w, vid_h, thoi_luong, duong_dan_mov, fps=30):
    """Vẽ phụ đề từng khung hình bằng PIL rồi bơm thẳng vào ffmpeg ra 1 video TRONG SUỐT
    (giống cách agentx-video-ai vẽ caption) — thay cho phụ đề ASS/libass cứng nhắc trước đây."""
    from PIL import Image, ImageDraw, ImageFont
    # LƯU Ý: Arial Black (ariblk.ttf) thiếu vài dấu tiếng Việt (ộ, ầ ra ô vuông) — đã test dính lỗi
    # 2026-08-08, đổi sang Arial Bold (đủ dấu, đang dùng cho hook luôn để đồng bộ kiểu chữ).
    fo = ImageFont.truetype(font_path(["arialbd.ttf", "DejaVuSans-Bold.ttf"]),
                             max(34, int(vid_w * 0.058)))
    do_render = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    max_w = int(vid_w * 0.82)
    cues = gom_cau_phu_de(words_final, max_w, fo, do_render)
    # vị trí đo trực tiếp từ 1-NGUON-GOC/anh/phụ đề.png — 58-64% chiều cao tính từ trên — chốt 2026-08-08
    cap_y = int(vid_h * 0.58)
    nfr = max(1, int(round(thoi_luong * fps)))

    p = subprocess.Popen(["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgba",
                           "-s", "%dx%d" % (vid_w, vid_h), "-r", str(fps), "-i", "-",
                           "-an", "-c:v", "qtrle", duong_dan_mov],
                          stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ci = 0
    for fr in range(nfr):
        t = fr / fps
        while ci < len(cues) and cues[ci][1] + 0.4 < t:
            ci += 1
        img = Image.new("RGBA", (vid_w, vid_h), (0, 0, 0, 0))
        if ci < len(cues) and cues[ci][0] - 0.05 <= t <= cues[ci][1] + 0.35:
            d = ImageDraw.Draw(img)
            lay = Image.new("RGBA", (vid_w, vid_h), (0, 0, 0, 0))
            ve_dong_phu_de(d, lay, cues[ci][2], t, fo, cap_y, vid_w)
            img.alpha_composite(lay)
        p.stdin.write(img.tobytes())
    p.stdin.close()
    p.wait()


def ap_sua_chu(words, cap_sua):
    """Sửa chữ máy nghe nhầm TRƯỚC KHI vẽ phụ đề — thêm 2026-08-09 (chiều).

    Vì sao cần: máy bóc lời nghe nhầm rất nhiều tên riêng và từ địa phương, mà chữ sai đó
    ĐƯỢC ĐỐT THẲNG LÊN MÀN HÌNH cho khách đọc. Video thật ngày 09/08 dính 7 lỗi, nặng nhất là
    "gia lô" (đúng ra là Zalo — SAI TÊN SẢN PHẨM, ngay giây 1,4) và "tin lỗi" (đúng ra "tin nổi",
    là chữ ĐẦU TIÊN khách đọc), "Anh Hoàng ơi" (sai luôn tên chủ não).

    ⚠️ CHỈ SỬA CHỮ HIỆN LÊN, KHÔNG ĐỘNG VÀO TIẾNG NÓI. Giọng anh Hoàn giữ nguyên 100%.
    Cấm dùng chỗ này để đổi Ý anh Hoàn nói — chỉ sửa đúng từ máy nghe nhầm, và dùng để
    che thông tin riêng tư (ví dụ thay tên khách thật bằng "[ẩn tên]").

    cap_sua: [["chữ sai", "chữ đúng"], ...] — ghi trong "sua_chu" ở de-xuat-cat.json.
    Khớp không phân biệt hoa thường, gộp/tách được nhiều từ (VD "gia lô" 2 từ → "Zalo" 1 từ)."""
    if not cap_sua:
        return words, 0

    def chuan(s):
        return s.lower().strip(" .,!?:;\"'")

    cap = [(chuan(a).split(), str(b).split()) for a, b in cap_sua]
    ra, i, dem = [], 0, 0
    while i < len(words):
        khop = None
        for sai_w, dung_w in cap:
            n = len(sai_w)
            if n and i + n <= len(words) and [chuan(w["w"]) for w in words[i:i + n]] == sai_w:
                khop = (n, dung_w)
                break
        if khop:
            n, dung_w = khop
            s, e = words[i]["s"], words[i + n - 1]["e"]
            m = max(1, len(dung_w))
            buoc = (e - s) / m
            for j, dw in enumerate(dung_w):
                ra.append({"w": dw, "s": s + j * buoc, "e": s + (j + 1) * buoc})
            dem += 1
            i += n
        else:
            ra.append(words[i])
            i += 1
    return ra, dem


def do_am_luong(video, goc_wav, nhac, muc_nhac=0.18):
    """Đo độ to bằng SỐ — thêm 2026-08-09 (chiều), để bù cho việc ĐẠT KHÔNG NGHE ĐƯỢC.

    Mọi thứ Đạt tự kiểm từ trước tới nay đều bằng mắt (trích khung hình ra ảnh). Tai thì
    hoàn toàn phụ thuộc anh Hoàn. Hàm này không thay được tai người, nhưng bắt được loại lỗi
    đo bằng số: nhạc át giọng, video quá to hoặc quá nhỏ so với chuẩn nền tảng.

    Tài liệu 2026: nhạc nền nên thấp hơn giọng nói khoảng 18-25 dB. Video ngắn chuẩn quanh -14 LUFS."""
    def trung_binh(path, loc=None):
        cmd = ["ffmpeg", "-hide_banner", "-i", path]
        if loc:
            cmd += ["-af", loc + ",volumedetect"]
        else:
            cmd += ["-af", "volumedetect"]
        cmd += ["-f", "null", "-"]
        r = sh(cmd)
        out = (r.stderr or "")
        tb = mx = None
        for d in out.splitlines():
            if "mean_volume:" in d:
                tb = float(d.split("mean_volume:")[1].replace("dB", "").strip())
            if "max_volume:" in d:
                mx = float(d.split("max_volume:")[1].replace("dB", "").strip())
        return tb, mx

    print(">> ĐO ĐỘ TO (Đạt không nghe được, chỉ đo bằng số):")
    tb_v, mx_v = trung_binh(video)
    if tb_v is not None:
        print("   Video thành phẩm: trung bình %.1f dB · to nhất %.1f dB" % (tb_v, mx_v))
        if mx_v > -0.5:
            print("   ⚠️ Đỉnh gần chạm trần (%.1f dB) — có thể rè ở loa điện thoại." % mx_v)

    if goc_wav and os.path.exists(goc_wav) and nhac and os.path.exists(nhac):
        tb_giong, _ = trung_binh(goc_wav)
        tb_nhac, _ = trung_binh(nhac, "volume=%.4f" % muc_nhac)
        if tb_giong is not None and tb_nhac is not None:
            cach = tb_giong - tb_nhac
            print("   Giọng anh Hoàn %.1f dB · nhạc nền %.1f dB → cách nhau %.1f dB"
                  % (tb_giong, tb_nhac, cach))
            if cach < 15:
                print("   ⚠️ NHẠC HƠI TO so với giọng (nên cách 18-25 dB). Hạ bằng cách sửa volume nhạc.")
            elif cach > 30:
                print("   ⚠️ Nhạc gần như không nghe thấy (cách %.1f dB) — để vậy thì bỏ nhạc cho nhẹ." % cach)
            else:
                print("   ✔ Khoảng cách giọng/nhạc nằm trong vùng hợp lý.")


def so_broll_da_dung(goc_kho):
    """Sổ ghi hình minh hoạ ĐÃ DÙNG — thêm 2026-08-09 (chiều).
    Vì sao cần: tra cùng một từ khoá thì kho ảnh trả về đúng cái hình cũ. Vài video là
    khách nhận ra dùng đi dùng lại. Sổ này giúp lần sau tự bỏ qua hình đã dùng, lấy hình khác."""
    # SỬA 2026-08-11: trước đây trỏ tới <gốc kho>/.claude/skills/dat/assets/ — đường dẫn còn
    # sót lại từ máy người viết đầu tiên, hồi bộ này còn tên là "Đạt". Tài liệu
    # 04-chon-hinh-minh-hoa.md lại ghi sổ nằm ở cong-cu/assets/, nên câu "muốn lấy lại hình cũ
    # thì xoá file đó đi" không có tác dụng gì. Nay để đúng chỗ tài liệu đã ghi.
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "broll-da-dung.json")
    if not os.path.exists(p):
        # Máy nào đã lỡ ghi sổ ở chỗ cũ thì đọc lại, không để mất lịch sử hình đã dùng.
        cu = os.path.join(goc_kho, ".claude", "skills", "dat", "assets", "broll-da-dung.json")
        if os.path.exists(cu):
            print("   (i) Thấy sổ ghi hình ở chỗ cũ (%s) — đọc lại rồi từ nay ghi sang %s" % (cu, p))
            try:
                return p, json.load(open(cu, encoding="utf-8"))
            except Exception:
                pass
    try:
        return p, json.load(open(p, encoding="utf-8"))
    except Exception:
        return p, {"da_dung": []}


def ghi_broll_da_dung(duong_dan, so, url, tu_khoa, ten_video):
    so["da_dung"].append({"url": url, "tu_khoa": tu_khoa, "video": ten_video,
                          "ngay": datetime.date.today().isoformat()})
    os.makedirs(os.path.dirname(duong_dan), exist_ok=True)
    json.dump(so, open(duong_dan, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def them_moc_so_le(moc, do_dai, khoang_toi_da=4.5):
    """Rải thêm mốc phóng to vào những quãng ĐỨNG HÌNH quá lâu — thêm 2026-08-09 (vòng tự học 3).
    Tài liệu 2026: cứ 2-3 giây phải có một thay đổi nhìn thấy được; quá 5 giây không đổi gì
    thì chỗ đó là lỗ rò, người xem thoát. Bản 09/08 sáng: 99,7 giây mà chỉ 8 mốc = 12,5 giây/lần.

    ⚠️ NHỊP KHÔNG ĐỀU LÀ CỐ Ý: cùng tài liệu cảnh báo phóng to đúng đều mỗi 3 giây thì não bắt bài
    và ngừng phản ứng. Nên chu kỳ chèn so le 3,0 → 4,6 → 2,6 → 3,8 giây rồi lặp lại."""
    NHIP = [3.0, 4.6, 2.6, 3.8]
    goc = sorted(moc)
    them = []
    i = 0

    def quang_trong(tu, den):
        nonlocal i
        t = tu + NHIP[i % len(NHIP)]
        while t < den - 0.8:
            them.append((t, t + 0.35))
            i += 1
            t += NHIP[i % len(NHIP)]

    truoc = 0.0
    for s, e in goc:
        if s - truoc > khoang_toi_da:
            quang_trong(truoc, s)
        truoc = max(truoc, e)
    if do_dai - truoc > khoang_toi_da:
        quang_trong(truoc, do_dai)
    return sorted(goc + them), len(them)


def bieu_thuc_zoom(cua_so, zoom_cham=0.0, do_dai=0.0):
    """cua_so: [(s,e), ...] mốc NHẤN MẠNH trên timeline CUỐI (đã cắt+tua) — Đạt tự đọc transcript chọn.
    Trả về biểu thức ffmpeg (dùng cho scale eval=frame): phồng lên nhẹ (9%) đúng lúc đọc tới từ đó.

    zoom_cham (thêm 2026-08-09, vòng tự học 3): PHÓNG TO CHẬM DẦN suốt cả video, nhân đè lên
    phần phồng theo mốc. Tài liệu 2026 gọi đây là kỹ thuật giữ chân MẠNH NHẤT cho video
    nói-vào-máy: hình to dần rất chậm, người xem không nhận ra nhưng não luôn thấy đang có
    gì đó đổi. VD 0.06 = to dần 6% từ đầu đến cuối video."""
    nen = None
    if zoom_cham > 0.0001 and do_dai > 0.1:
        nen = "(1+%.5f*t/%.3f)" % (zoom_cham, do_dai)
    if not cua_so:
        return nen
    LEN_TRUOC, LEN_SAU, BIEN_DO = 0.12, 0.30, 0.09   # bung trong 120ms, giữ hết từ + lắng trong 300ms
    parts = []
    for s, e in sorted(cua_so):
        s2 = max(0.0, s - 0.05)          # chặn không cho về âm — âm sẽ ra "t--0.05" làm ffmpeg crash
        len_lang_bat_dau = e + 0.05
        len_lang_het = len_lang_bat_dau + LEN_SAU
        len_bung_het = s2 + LEN_TRUOC
        cond = "between(t,%.3f,%.3f)" % (s2, len_lang_het)
        val = ("if(lt(t,%.3f),1+%.4f*(t-%.3f)/%.3f,"
               "if(lt(t,%.3f),1+%.4f,"
               "1+%.4f*(1-(t-%.3f)/%.3f)))") % (
            len_bung_het, BIEN_DO, s2, LEN_TRUOC,
            len_lang_bat_dau, BIEN_DO,
            BIEN_DO, len_lang_bat_dau, LEN_SAU)
        parts.append("if(%s,%s," % (cond, val))
    bieu_thuc = "".join(parts) + "1" + ")" * len(parts)
    if nen:
        bieu_thuc = "%s*(%s)" % (nen, bieu_thuc)   # phóng chậm nhân đè lên phồng theo mốc
    return bieu_thuc


def tao_whoosh(duong_dan):
    """Tự tạo tiếng động chuyển cảnh bằng ffmpeg — thêm 2026-08-09 (vòng tự học 3, việc 5).
    Không đi xin kho tiếng ở đâu, không dính bản quyền: tổng hợp từ tiếng ồn hồng, lọc dải,
    vào nhanh ra chậm. CỐ Ý ĐỂ RẤT NHẸ — tài liệu cảnh báo lạm dụng tiếng động thành rẻ tiền."""
    if os.path.exists(duong_dan):
        return duong_dan
    # Bài học 17: hàm bỏ qua cái gì thì PHẢI in ra dòng báo. Im lặng thay đồ là loại lỗi
    # tệ nhất — chính chỗ này đã âm thầm thay tiếng động thật suốt một thời gian dài.
    print("   (!) Không thấy tiếng động sẵn ở %s — tự tổng hợp một tiếng khác để thay."
          % duong_dan)
    os.makedirs(os.path.dirname(duong_dan), exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anoisesrc=d=0.42:c=pink:a=0.6",
                    "-af", "highpass=f=420,lowpass=f=5200,"
                           "afade=t=in:st=0:d=0.10,afade=t=out:st=0.12:d=0.30",
                    "-ac", "2", "-ar", "44100", duong_dan], capture_output=True)
    return duong_dan if os.path.exists(duong_dan) else None


def tao_track_sfx(whoosh, moc, do_dai, duong_dan_ra, muc=0.16):
    """Ghép các tiếng động vào đúng mốc nhấn mạnh thành MỘT đường tiếng dài bằng video.
    Làm riêng thành 1 file thay vì nhét chục input vào lệnh dựng chính — chuỗi lọc ngắn,
    dễ dò lỗi, và tránh lặp lại kiểu treo ffmpeg từng dính ngày 08/08."""
    moc = [m for m in moc if 0.05 < m < do_dai - 0.2][:24]
    if not whoosh or not moc:
        return None
    if os.path.exists(duong_dan_ra):
        os.remove(duong_dan_ra)     # xoá file 0 byte sót lại từ lần chạy hỏng trước
    n = len(moc)
    fc = ["[0:a]volume=%.3f,asplit=%d%s" % (muc, n, "".join("[c%d]" % i for i in range(n)))]
    for i, t in enumerate(moc):
        ms = int(t * 1000)
        fc.append("[c%d]adelay=%d|%d[d%d]" % (i, ms, ms, i))
    fc.append("%samix=inputs=%d:normalize=0,apad[out]"
              % ("".join("[d%d]" % i for i in range(n)), n))
    # ⚠️ BẮT BUỘC có "-t": apad đệm im lặng VÔ HẠN. Bản đầu 09/08 chỉ dùng atrim trong chuỗi lọc
    # → ffmpeg TREO THẬT, chạy 578 giây CPU không dứt, phải kill tay. Đúng loại bẫy đã dính
    # ngày 08/08 với "-shortest". Bài học: hễ chuỗi lọc có nguồn sinh vô hạn thì phải chặn
    # bằng "-t" ở mức lệnh, không tin vào bộ lọc cắt bên trong.
    r = subprocess.run(["ffmpeg", "-y", "-i", whoosh, "-filter_complex", ";".join(fc),
                        "-map", "[out]", "-t", "%.3f" % do_dai,
                        "-ac", "2", "-ar", "44100", duong_dan_ra],
                       capture_output=True, timeout=180)
    if r.returncode != 0 or not os.path.exists(duong_dan_ra):
        print("   (!) Không tạo được đường tiếng động, bỏ qua — video vẫn dựng bình thường.")
        return None
    return duong_dan_ra


def esc_ffmpeg_path(p):
    p = os.path.abspath(p).replace("\\", "/")
    return p.replace(":", "\\:")


def font_path(names):
    for n in names:
        p = os.path.join(r"C:\Windows\Fonts", n)
        if os.path.exists(p):
            return p
    return names[0]


VANG_HOOK = (254, 218, 0, 255)   # đo trực tiếp từ 1-NGUON-GOC/anh/hook 3s.png — chốt 2026-08-08

# GÓC NGHIÊNG HỘP CHỮ — sửa về 0 ngày 2026-08-09.
# LỖI CỦA ĐẠT: bản 08/08 để -3.2 độ và ghi chú là "đúng theo mẫu hook 3s.png". SAI —
# mở lại đúng ảnh mẫu đó thì hộp vàng THẲNG BĂNG, không nghiêng. Đạt tự thêm rồi ghi
# chú sai làm anh Hoàn tưởng là ý mình. Muốn nghiêng thì truyền --hook-nghieng.
GOC_NGHIENG_MAC_DINH = 0.0

# PHÓNG TO — TẮT HẲN từ 2026-08-09 (chiều), anh Hoàn yêu cầu trực tiếp:
# "tao thấy mày đang hơi lợi dụng việc zoom out, zoom in, hiện tại không zoom nữa,
#  tập trung vào chèn hình mô tả liên quan hợp lí hơn".
# Đạt nhận là đã lạm dụng thật: sáng cùng ngày rải tới 28 mốc phóng to trong 99,7 giây.
# Việc GIỮ NHỊP giờ chuyển hẳn sang chèn hình minh hoạ đúng ý — đổi hình thật, không phải
# phóng to giả vờ cho có chuyển động. Muốn bật lại: --zoom-cham 0.06 và --zoom-nhan-manh.
ZOOM_CHAM_MAC_DINH = 0.0
ZOOM_NHAN_MANH_MAC_DINH = False


def boc_dong_tu_co(chu, font_file, vid_w, ty_le_hop, co_chu_thu, max_dong):
    """Bọc chữ xuống dòng, TỰ THU NHỎ cỡ chữ cho tới khi vừa trong số dòng cho phép.
    Thêm 2026-08-09 sau khi Đạt tự soi bắt lỗi: hook 4 dòng làm hộp vàng cao quá,
    che kín mặt anh Hoàn. Mẫu gốc `1-NGUON-GOC/anh/hook 3s.png` chỉ có 2 dòng."""
    from PIL import Image, ImageDraw, ImageFont
    tmp = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    box_w = int(vid_w * ty_le_hop)
    max_w = int(box_w * 0.88)
    ket_qua = None
    for co in co_chu_thu:
        tf = ImageFont.truetype(font_file, int(vid_w * co))
        dong = []
        for raw in chu.replace("\\n", "\n").split("\n"):
            cur = ""
            for w in raw.split():
                test = (cur + " " + w).strip()
                if tmp.textlength(test, font=tf) <= max_w:
                    cur = test
                else:
                    if cur:
                        dong.append(cur)
                    cur = w
            if cur:
                dong.append(cur)
        ket_qua = (tf, dong, co)
        if len(dong) <= max_dong:
            break
    return box_w, ket_qua


def ve_hook(vid_w, vid_h, badge, tieu_de, duong_dan_png, nghieng=GOC_NGHIENG_MAC_DINH):
    """3 giây đầu: hộp vàng bo góc THẲNG, chữ đen đậm căn giữa — đúng theo mẫu
    `1-NGUON-GOC/anh/hook 3s.png` anh Hoàn đưa (không phải kiểu badge đỏ của agentx-video-ai nữa)."""
    from PIL import Image, ImageDraw, ImageFont
    FB = font_path(["arialbd.ttf", "DejaVuSans-Bold.ttf"])

    text_full = tieu_de.replace("\\n", "\n")
    if badge:
        text_full = badge.replace("\\n", "\n") + "\n" + text_full

    # tự thu nhỏ cỡ chữ cho vừa tối đa 2 dòng — giữ hộp thấp, không che mặt (sửa 2026-08-09)
    box_w, (tf, linhas, _co) = boc_dong_tu_co(
        text_full, FB, vid_w, 0.86, [0.088, 0.079, 0.071, 0.064, 0.057], 2)

    line_h = int(tf.size * 1.14)
    pad_v = int(vid_w * 0.045)
    box_h = pad_v * 2 + line_h * len(linhas)

    lop = Image.new("RGBA", (box_w, box_h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lop)
    ld.rounded_rectangle([0, 0, box_w - 1, box_h - 1], int(vid_w * 0.045), fill=VANG_HOOK)
    y = pad_v
    for ln in linhas:
        tw = ld.textlength(ln, font=tf)
        ld.text(((box_w - tw) / 2, y), ln, font=tf, fill=(20, 15, 0, 255))
        y += line_h

    if abs(nghieng) > 0.01:
        lop = lop.rotate(nghieng, expand=True, resample=Image.BICUBIC)
    img = Image.new("RGBA", (vid_w, vid_h), (0, 0, 0, 0))
    # 0.27 → 0.22: hộp nhiều dòng từng che kín mặt anh Hoàn (Đạt tự soi bắt được 09/08/2026)
    cx, cy = vid_w // 2, int(vid_h * 0.22)
    img.alpha_composite(lop, (cx - lop.width // 2, cy - lop.height // 2))
    img.save(duong_dan_png)


def ve_cta(vid_w, vid_h, chu, duong_dan_png, nghieng=GOC_NGHIENG_MAC_DINH):
    """Câu chốt cuối video (CTA). Thiết kế chốt 2026-08-09 sau vòng tự học của Đạt:
    - Nền tối phủ toàn khung (scrim) — tài liệu 2026 khuyên "làm tối vùng nền sau chữ kêu gọi
      để tương phản cao nhất"; đồng thời báo cho người xem biết video đã hết, không hụt hẫng.
    - Vẫn dùng hộp vàng nghiêng + chữ đen đậm y như hook đầu video → cùng một bộ mặt thương hiệu,
      người xem nhìn phát nhận ra ngay là video của mình.
    - CHỈ MỘT câu kêu gọi cho cả video (tài liệu 2026: nhiều lời kêu gọi thì không ai làm cái nào)."""
    from PIL import Image, ImageDraw, ImageFont
    FB = font_path(["arialbd.ttf", "DejaVuSans-Bold.ttf"])

    img = Image.new("RGBA", (vid_w, vid_h), (0, 0, 0, 0))
    # Nền tối ĐẬM (alpha 150 → 215, sửa 2026-08-09 sau khi Đạt tự soi): alpha nhạt làm thẻ chốt
    # trông như miếng dán đè lên mặt anh Hoàn. Tối hẳn thì nó ra dáng "màn hình kết" cố ý.
    ImageDraw.Draw(img).rectangle([0, 0, vid_w, vid_h], fill=(8, 8, 12, 215))

    box_w, (tf, dong, _co) = boc_dong_tu_co(
        chu, FB, vid_w, 0.88, [0.082, 0.074, 0.067, 0.060], 3)

    line_h = int(tf.size * 1.16)
    pad_v = int(vid_w * 0.05)
    box_h = pad_v * 2 + line_h * len(dong)

    lop = Image.new("RGBA", (box_w, box_h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lop)
    ld.rounded_rectangle([0, 0, box_w - 1, box_h - 1], int(vid_w * 0.045), fill=VANG_HOOK)
    y = pad_v
    for ln in dong:
        tw = ld.textlength(ln, font=tf)
        ld.text(((box_w - tw) / 2, y), ln, font=tf, fill=(20, 15, 0, 255))
        y += line_h

    if abs(nghieng) > 0.01:
        lop = lop.rotate(nghieng, expand=True, resample=Image.BICUBIC)
    img.alpha_composite(lop, (vid_w // 2 - lop.width // 2, int(vid_h * 0.46) - lop.height // 2))
    img.save(duong_dan_png)


def trich_khung(video, thu_muc, moc_list, tien_to="khung"):
    """Trích vài khung hình ra ảnh PNG để Đạt TỰ SOI trước khi báo anh Hoàn.
    Thêm 2026-08-09: cả 3 lần dựng lại ngày 08/08 đều do mắt anh Hoàn bắt lỗi
    (hook sai kiểu, phụ đề sai chỗ, chữ tràn khung, logo CapCut ở cuối video thô).
    Đạt không có mắt để tự xem video — nhưng xem được ẢNH. Đây là cách Đạt tự kiểm."""
    os.makedirs(thu_muc, exist_ok=True)
    ra = []
    for i, t in enumerate(moc_list):
        if t < 0:
            continue
        p = os.path.join(thu_muc, "%s-%02d-giay-%.1f.png" % (tien_to, i + 1, t))
        subprocess.run(["ffmpeg", "-y", "-ss", "%.3f" % t, "-i", video,
                        "-frames:v", "1", "-q:v", "2", p], capture_output=True)
        if os.path.exists(p):
            ra.append(p)
    return ra


# ---------- KHO ẢNH/VIDEO MINH HOẠ (b-roll) — thêm 2026-08-09 ----------

UA_GIA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


def doc_chia(ten, goc_kho=None):
    """Lấy chìa khoá: ưu tiên biến môi trường, không có thì đọc từ `api-bonaothu2.txt` ở gốc kho
    (Điều 17 của não: chìa chỉ nằm ở MỘT chỗ duy nhất đó). Không viết chìa vào mã lệnh."""
    v = os.environ.get(ten)
    if v:
        return v.strip()
    if not goc_kho:
        return None
    for ten_tep in ("api-bonaothu2.txt", "chia-khoa.txt"):
        p = os.path.join(goc_kho, ten_tep)
        if not os.path.exists(p):
            continue
        for dong in open(p, encoding="utf-8", errors="replace"):
            d = dong.strip()
            if d.startswith(ten + "="):
                v = d.split("=", 1)[1].strip()
                if v and not v.startswith("<"):     # bỏ qua dòng mẫu kiểu KEY=<dán vào đây>
                    return v
    return None


def _goi(url, headers=None):
    import urllib.request
    rq = urllib.request.Request(url, headers=dict({"User-Agent": UA_GIA}, **(headers or {})))
    with urllib.request.urlopen(rq, timeout=25) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def tim_nguon_broll(tu_khoa, muon_video, goc_kho, da_dung=None):
    """Tìm 1 ảnh/video minh hoạ khớp từ khoá. Thứ tự ưu tiên có lý do rõ ràng:
      1. PEXELS   — có cả ảnh lẫn video, điều khoản không bắt ghi nguồn.
      2. PIXABAY  — cũng có cả hai, dự phòng. ⚠️ bắt buộc gửi kèm User-Agent, không thì bị chặn.
      3. UNSPLASH — CHỈ có ảnh, và điều khoản đòi ghi nguồn tác giả + gọi thêm lệnh báo tải,
                    nên xếp cuối; chỉ dùng khi hai nguồn trên không ra hình nào.
    Trả về (đường_dẫn_url, 'anh'|'video', tên_nguồn) hoặc None."""
    import urllib.parse
    q = urllib.parse.quote(tu_khoa)

    k = doc_chia("PEXELS_KEY", goc_kho)
    if k:
        try:
            if muon_video:
                d = _goi("https://api.pexels.com/videos/search?query=%s&per_page=8&orientation=portrait" % q,
                         {"Authorization": k})
                for v in d.get("videos", []):
                    tep = sorted([f for f in v.get("video_files", []) if f.get("height")],
                                 key=lambda f: -f["height"])
                    if tep and tep[0]["link"] not in (da_dung or ()):
                        return tep[0]["link"], "video", "Pexels"
            d = _goi("https://api.pexels.com/v1/search?query=%s&per_page=8&orientation=portrait" % q,
                     {"Authorization": k})
            for a in d.get("photos", []):
                if a["src"]["large2x"] not in (da_dung or ()):
                    return a["src"]["large2x"], "anh", "Pexels"
        except Exception as e:
            print("   (!) Pexels lỗi: %s" % e)

    k = doc_chia("PIXABAY_KEY", goc_kho)
    if k:
        try:
            if muon_video:
                d = _goi("https://pixabay.com/api/videos/?key=%s&q=%s&per_page=8" % (k, q))
                for v in d.get("hits", []):
                    vid = v.get("videos", {})
                    for co in ("large", "medium", "small"):
                        if vid.get(co, {}).get("url") and vid[co]["url"] not in (da_dung or ()):
                            return vid[co]["url"], "video", "Pixabay"
            d = _goi("https://pixabay.com/api/?key=%s&q=%s&per_page=8&image_type=photo" % (k, q))
            for a in d.get("hits", []):
                if a.get("largeImageURL") and a["largeImageURL"] not in (da_dung or ()):
                    return a["largeImageURL"], "anh", "Pixabay"
        except Exception as e:
            print("   (!) Pixabay lỗi: %s" % e)

    k = doc_chia("UNSPLASH_ACCESS_KEY", goc_kho)
    if k:
        try:
            d = _goi("https://api.unsplash.com/search/photos?query=%s&per_page=8&orientation=portrait" % q,
                     {"Authorization": "Client-ID " + k})
            for a in d.get("results", []):
                if a["urls"]["regular"] not in (da_dung or ()):
                    return a["urls"]["regular"], "anh", "Unsplash"
        except Exception as e:
            print("   (!) Unsplash lỗi: %s" % e)
    return None


def tai_ve(url, duong_dan):
    import urllib.request
    rq = urllib.request.Request(url, headers={"User-Agent": UA_GIA})
    with urllib.request.urlopen(rq, timeout=90) as r, open(duong_dan, "wb") as f:
        f.write(r.read())
    return duong_dan


def chuan_hoa_broll(nguon, loai, vid_w, vid_h, thoi_luong, duong_dan_ra,
                    sang=SANG_MAC_DINH, gamma=GAMMA_MAC_DINH, net=NET_MAC_DINH):
    """Cắt ảnh/video tải về cho vừa đúng khung hình dọc và đúng độ dài cần chèn.
    scale ... increase + crop = phủ kín khung, không để viền đen, chấp nhận mất rìa.

    Làm sáng/nét ĐÚNG BẰNG video chính (sửa 2026-08-09 sau khi Đạt tự soi): bản đầu chỉ
    chỉnh nhẹ cố định nên cảnh phố đêm chèn vào bị tối hơn hẳn phần anh Hoàn nói — trái
    đúng yêu cầu "đừng để video bị tối". Hình minh hoạ được chèn SAU khâu làm đẹp của video
    chính nên không ăn theo, phải làm sáng riêng ngay tại đây."""
    loc = ("scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,setsar=1,fps=30,"
           "eq=contrast=%.3f:saturation=%.3f:brightness=%.4f:gamma=%.3f,unsharp=5:5:%.2f:5:5:0.0"
           % (vid_w, vid_h, vid_w, vid_h, TUONG_PHAN, BAO_HOA, sang, gamma, net))
    if loai == "anh":
        vao = ["-loop", "1", "-t", "%.3f" % thoi_luong, "-i", nguon]
    else:
        # ⚠️ "-t" BẮT BUỘC: -stream_loop -1 là nguồn sinh vô hạn, thiếu -t là ffmpeg treo.
        vao = ["-stream_loop", "-1", "-t", "%.3f" % thoi_luong, "-i", nguon]
    r = subprocess.run(["ffmpeg", "-y"] + vao + ["-an", "-vf", loc,
                        "-t", "%.3f" % thoi_luong, *venc(), duong_dan_ra],
                       capture_output=True, timeout=240)
    return duong_dan_ra if r.returncode == 0 and os.path.exists(duong_dan_ra) else None


def chuan_bi_broll(danh_sach, vid_w, vid_h, thu_muc, goc_kho,
                   sang=SANG_MAC_DINH, gamma=GAMMA_MAC_DINH, net=NET_MAC_DINH, ten_video=""):
    """danh_sach: [[bắt_đầu, kết_thúc, "từ khoá tìm", "video"|"anh"], ...] — Đạt tự đọc transcript chọn.
    Trả về [(bắt_đầu, kết_thúc, đường_dẫn_clip, nguồn, từ_khoá), ...]"""
    os.makedirs(thu_muc, exist_ok=True)
    so_path, so = so_broll_da_dung(goc_kho)
    da_dung = {x["url"] for x in so.get("da_dung", [])}
    if da_dung:
        print("   (sổ ghi: đã dùng %d hình ở video trước — sẽ tự tránh lấy lại)" % len(da_dung))
    ra = []
    for i, m in enumerate(danh_sach):
        s, e, tu_khoa = float(m[0]), float(m[1]), m[2]
        muon_video = (len(m) > 3 and m[3] == "video")
        dai = max(0.8, e - s)
        clip = os.path.join(thu_muc, "broll-%02d.mp4" % (i + 1))
        if os.path.exists(clip):
            ra.append((s, e, clip, "(đã tải sẵn)", tu_khoa))
            continue
        tim = tim_nguon_broll(tu_khoa, muon_video, goc_kho, da_dung)
        if not tim:
            print("   (!) Không tìm được hình cho \"%s\" — bỏ qua mốc này." % tu_khoa)
            continue
        url, loai, nguon = tim
        duoi = ".mp4" if loai == "video" else ".jpg"
        tho = os.path.join(thu_muc, "tho-%02d%s" % (i + 1, duoi))
        try:
            tai_ve(url, tho)
        except Exception as ex:
            print("   (!) Tải hỏng cho \"%s\": %s" % (tu_khoa, ex))
            continue
        if chuan_hoa_broll(tho, loai, vid_w, vid_h, dai, clip, sang, gamma, net):
            ra.append((s, e, clip, "%s/%s" % (nguon, loai), tu_khoa))
            print("   + %.1f-%.1fs  \"%s\"  ← %s (%s)" % (s, e, tu_khoa, nguon, loai))
            ghi_broll_da_dung(so_path, so, url, tu_khoa, ten_video)
            da_dung.add(url)
        else:
            print("   (!) Không cắt được clip cho \"%s\"." % tu_khoa)
    return ra


def buoc_soi(video):
    """BƯỚC 0 — soát logo lạ ở 3 giây đầu và 3 giây cuối video THÔ (chốt 2026-08-09).
    Lý do có bước này: 08/08/2026 dính thật — 2 giây cuối một video thô của anh Hoàn là
    màn hình đen logo CapCut (đuôi thừa từ lần xuất trước). YouTube được cho là hạ thứ hạng
    video dính logo nền tảng khác — xem [[binh-tu-hoc]] vòng 09/08/2026 mục 2."""
    root, _ = du_an_dir(video)
    dur = ffprobe_dur(video)
    moc = [0.3, 1.2, 2.5, dur - 3.0, dur - 2.0, dur - 1.0, max(0.0, dur - 0.25)]
    thu_muc = os.path.join(root, "work", "soi-video-tho")
    anh = trich_khung(video, thu_muc, moc, "tho")
    print(">> Video thô dài %.1fs. Đã trích %d khung hình để soi logo lạ:" % (dur, len(anh)))
    for p in anh:
        print("   " + p)
    print(">> Đạt MỞ TỪNG ẢNH ra xem. Thấy logo CapCut/TikTok/Reels thì thêm mốc đó vào")
    print("   mảng 'khoang_lang' trong work/de-xuat-cat.json để cắt bỏ trước khi dựng.")


def buoc_dung(video, nhac, toc_do, hook=None, hook_badge=None, cta=None,
              cta_giay=CTA_GIAY_MAC_DINH, sang=SANG_MAC_DINH, net=NET_MAC_DINH,
              gamma=GAMMA_MAC_DINH, nghieng=GOC_NGHIENG_MAC_DINH,
              zoom_cham=ZOOM_CHAM_MAC_DINH, nhip_tu_dong=True, tieng_dong=True,
              broll_kieu="toanman", zoom_nhan_manh=ZOOM_NHAN_MANH_MAC_DINH):
    root, goc_kho = du_an_dir(video)
    work = os.path.join(root, "work")
    de_xuat = json.load(open(os.path.join(work, "de-xuat-cat.json"), encoding="utf-8"))
    words = json.load(open(os.path.join(work, "words.json"), encoding="utf-8"))

    # SỬA CHỮ MÁY NGHE NHẦM — chỉ đổi chữ hiện lên, KHÔNG động vào tiếng nói (2026-08-09).
    words, so_sua = ap_sua_chu(words, de_xuat.get("sua_chu", []))
    if so_sua:
        print(">> Sửa %d chỗ phụ đề máy nghe nhầm (giọng nói giữ nguyên 100%%)." % so_sua)

    tat_ca_cat = list(de_xuat["tu_dong"]["khoang_lang"]) + \
                 [[w[0], w[1]] for w in de_xuat["tu_dong"]["tu_dem"]] + \
                 [[x[0], x[1]] for x in de_xuat.get("lap_y", [])]
    tong = ffprobe_dur(video)
    khoang_giu = gop_khoang_cat(tat_ca_cat, tong)
    do_dai_sau_cat = sum(e - s for s, e in khoang_giu)
    print(">> Gốc %.1fs → sau cắt %.1fs (bỏ %.1fs, %d đoạn cắt) → tua %.2fx còn %.1fs" %
          (tong, do_dai_sau_cat, tong - do_dai_sau_cat, len(tat_ca_cat), toc_do, do_dai_sau_cat / toc_do))

    cat_path = os.path.join(work, "da-cat.mp4")
    cat_va_noi(video, khoang_giu, cat_path)
    vid_w, vid_h = kich_thuoc(cat_path)

    words_sau_cat = dich_chuyen_moc_chu(words, khoang_giu)
    do_dai_cuoi = do_dai_sau_cat / toc_do
    words_cuoi = [{"w": w["w"], "s": w["s"] / toc_do, "e": w["e"] / toc_do} for w in words_sau_cat]
    cap_mov = os.path.join(work, "phu-de.mov")
    print(">> Vẽ phụ đề từng khung hình (kiểu chữ nảy)...")
    render_phu_de_overlay(words_cuoi, vid_w, vid_h, do_dai_cuoi, cap_mov)

    # NHẤN MẠNH: Đạt tự đọc transcript chọn "nhan_manh" trong de-xuat-cat.json (giống lap_y) —
    # dịch mốc gốc sang timeline sau cắt+tua, bỏ qua mốc nào rơi đúng vào đoạn đã cắt.
    nhan_manh_cuoi = []
    for x in de_xuat.get("nhan_manh", []):
        r = dich_khoang_don(x[0], x[1], khoang_giu)
        if r:
            nhan_manh_cuoi.append((r[0] / toc_do, r[1] / toc_do))
    print(">> Nhấn mạnh %d/%d mốc còn sống sau khi cắt." % (len(nhan_manh_cuoi), len(de_xuat.get("nhan_manh", []))))
    # Giữ riêng danh sách mốc ĐẠT TỰ CHỌN — tiếng động chỉ đánh vào đây, không đánh vào
    # mốc máy tự rải. 28 tiếng động trong 100 giây là quá nhiều, đúng cái tài liệu cảnh báo
    # "lạm dụng tiếng động thành rẻ tiền". Tiếng động để nhấn Ý, mốc tự rải chỉ để giữ NHỊP HÌNH.
    nhan_manh_that = list(nhan_manh_cuoi)
    if zoom_nhan_manh and nhip_tu_dong:
        nhan_manh_cuoi, so_them = them_moc_so_le(nhan_manh_cuoi, do_dai_cuoi)
        if so_them:
            print(">> Rải thêm %d mốc so le vào quãng đứng hình lâu → tổng %d mốc, "
                  "trung bình %.1f giây/lần đổi hình." % (so_them, len(nhan_manh_cuoi),
                                                          do_dai_cuoi / max(1, len(nhan_manh_cuoi))))
    zoom_expr = bieu_thuc_zoom(nhan_manh_cuoi if zoom_nhan_manh else [], zoom_cham, do_dai_cuoi)
    if zoom_cham > 0.0001:
        print(">> Phóng to chậm dần %.0f%% suốt cả video." % (zoom_cham * 100))
    if not zoom_expr:
        print(">> KHÔNG phóng to gì cả — giữ nhịp bằng hình minh hoạ (anh Hoàn chốt 09/08/2026).")

    ten = os.path.splitext(os.path.basename(video))[0]
    thang = datetime.date.today().strftime("%Y-%m")
    out_dir = os.path.join(goc_kho, "video-ra", thang)
    os.makedirs(out_dir, exist_ok=True)
    final_path = os.path.join(out_dir, "%s-giaoduc.mp4" % ten)

    # LÀM ĐẸP HÌNH ẢNH — nâng mạnh 2026-08-09 theo yêu cầu anh Hoàn (sáng hơn, nét hơn, không để tối).
    lam_dep = "eq=contrast=%.3f:saturation=%.3f:brightness=%.4f:gamma=%.3f,unsharp=5:5:%.2f:5:5:0.0" % (
        TUONG_PHAN, BAO_HOA, sang, gamma, net)
    print(">> Làm đẹp hình: sáng %.3f · gamma %.2f · nét %.2f · tương phản %.2f" % (sang, gamma, net, TUONG_PHAN))
    ins = ["-i", cat_path, "-i", cap_mov]
    idx = 2
    lbl = 0
    vchain = "[0:v]setpts=PTS/%.4f" % toc_do
    if zoom_expr:
        vchain += ",scale=w='iw*(%s)':h='ih*(%s)':eval=frame,crop=%d:%d" % (zoom_expr, zoom_expr, vid_w, vid_h)
    vchain += ",%s[vs0];[vs0]null" % lam_dep

    # LÀM MỜ VÙNG RIÊNG TƯ — thêm 2026-08-09 (chiều), anh Hoàn chốt sau khi Đạt báo video lộ
    # tên thật + mã tài khoản một khách hàng thật trên màn hình.
    # Khai trong "lam_mo" ở de-xuat-cat.json: [giây_đầu, giây_cuối, x%, y%, rộng%, cao%]
    # Giây theo GIỜ GỐC, toạ độ theo PHẦN TRĂM khung hình. Dùng [0,0,100,100] để mờ cả khung.
    for m in de_xuat.get("lam_mo", []):
        s_m = dich_diem(float(m[0]), khoang_giu) / toc_do
        e_m = dich_diem(float(m[1]), khoang_giu) / toc_do
        if e_m - s_m < 0.2:
            print("   (!) Bỏ vùng làm mờ %.1f-%.1fs — sau khi cắt không còn gì." % (m[0], m[1]))
            continue
        x = int(vid_w * float(m[2]) / 100) // 2 * 2
        y = int(vid_h * float(m[3]) / 100) // 2 * 2
        w = max(2, int(vid_w * float(m[4]) / 100) // 2 * 2)
        h = max(2, int(vid_h * float(m[5]) / 100) // 2 * 2)
        w = min(w, vid_w - x)
        h = min(h, vid_h - y)
        muc_mo = int(m[6]) if len(m) > 6 else 24
        lbl += 1
        vchain += ("[vs%d];[vs%d]split[mo%da][mo%db];"
                   "[mo%db]crop=%d:%d:%d:%d,boxblur=%d:2[mob%d];"
                   "[mo%da][mob%d]overlay=%d:%d:enable='between(t,%.3f,%.3f)'"
                   % (lbl, lbl, lbl, lbl, lbl, w, h, x, y, muc_mo, lbl, lbl, lbl, x, y, s_m, e_m))
        print(">> Làm mờ vùng riêng tư: giây %.1f-%.1f, ô %d%%x%d%% tại (%d%%,%d%%), độ mờ %d"
              % (s_m, e_m, float(m[4]), float(m[5]), float(m[2]), float(m[3]), muc_mo))

    # ẢNH/VIDEO MINH HOẠ (b-roll) — thêm 2026-08-09. Đạt tự đọc transcript chọn mốc và từ khoá,
    # ghi vào mảng "broll" trong de-xuat-cat.json, giống cách chọn "lap_y" và "nhan_manh".
    # Mốc ghi theo giờ GỐC (chưa cắt chưa tua) cho dễ đọc — script tự dịch sang giờ bản cuối.
    # ⚠️ THỨ TỰ CHỒNG LỚP QUAN TRỌNG: b-roll phải nằm DƯỚI phụ đề. Bản đầu Đạt xếp b-roll
    # sau phụ đề → hình toàn màn che mất chữ, trong khi giọng anh Hoàn vẫn đang chạy.
    chuoi_broll = []
    broll_moc = []          # mốc bắt đầu mỗi hình minh hoạ — dùng để đặt tiếng động chuyển cảnh
    broll_cuoi = []
    # Chặn hình minh hoạ lấn vào vùng câu chốt cuối (thêm 2026-08-09 chiều, Đạt tự bắt):
    # lần chạy đầu hình đồng hồ cát hiện lúc 95,1s rồi bị câu chốt từ 96,7s che ngay — vụng.
    ranh_cta = (do_dai_cuoi - cta_giay - 0.15) if cta else do_dai_cuoi
    for m in de_xuat.get("broll", []):
        r = dich_khoang_don(float(m[0]), float(m[1]), khoang_giu)
        if not r:
            continue
        s_g, e_g = r[0] / toc_do, min(r[1] / toc_do, ranh_cta)
        if e_g - s_g < 0.6:
            print("   (!) Bỏ mốc \"%s\" — rơi vào vùng câu chốt cuối, không đủ chỗ." % m[2])
            continue
        broll_cuoi.append([s_g, e_g] + list(m[2:]))
    if broll_cuoi:
        print(">> Chuẩn bị %d ảnh/video minh hoạ (%d/%d mốc sống sót sau cắt):"
              % (len(broll_cuoi), len(broll_cuoi), len(de_xuat.get("broll", []))))
        for s_b, e_b, clip, nguon, tu_khoa in chuan_bi_broll(
                broll_cuoi, vid_w, vid_h, os.path.join(work, "broll"), goc_kho,
                sang, gamma, net, os.path.basename(video)):
            ins += ["-i", clip]
            broll_moc.append(s_b)
            lbl += 1
            if broll_kieu == "goc":
                # kiểu GÓC: thu nhỏ nằm góc trên, VẪN THẤY MẶT anh Hoàn — hợp khi cần giữ lòng tin
                rong = int(vid_w * 0.46)
                chuoi_broll.append("[%d:v]scale=%d:-2,setpts=PTS-STARTPTS+%.3f/TB[bl%d]"
                                   % (idx, rong, s_b, lbl))
                vchain += "[vs%d];[vs%d][bl%d]overlay=%d:%d:enable='between(t,%.3f,%.3f)'" % (
                    lbl, lbl, lbl, int(vid_w * 0.50), int(vid_h * 0.09), s_b, e_b)
            else:
                # kiểu TOÀN MÀN: cắt hẳn sang hình minh hoạ, giọng anh Hoàn vẫn chạy liên tục
                chuoi_broll.append("[%d:v]setpts=PTS-STARTPTS+%.3f/TB[bl%d]" % (idx, s_b, lbl))
                vchain += "[vs%d];[vs%d][bl%d]overlay=0:0:enable='between(t,%.3f,%.3f)'" % (
                    lbl, lbl, lbl, s_b, e_b)
            idx += 1

    # PHỤ ĐỀ chồng lên trên b-roll — chữ luôn đọc được kể cả lúc đang chèn hình minh hoạ
    lbl += 1
    vchain += "[vs%d];[vs%d][1:v]overlay=0:0" % (lbl, lbl)

    if hook:
        hook_png = os.path.join(work, "hook.png")
        ve_hook(vid_w, vid_h, hook_badge, hook, hook_png, nghieng)
        ins += ["-loop", "1", "-i", hook_png]
        # Khung cuối lặp khung đầu (chốt 2026-08-08). NHƯNG nếu có câu chốt cuối (CTA) thì
        # BỎ phần lặp này — 2 tấm đè lên nhau cùng lúc cuối video thì rối, và chỗ cuối phải
        # nhường cho câu kêu gọi hành động (tài liệu 2026: mỗi video chỉ một lời kêu gọi).
        lbl += 1
        if cta:
            vchain += "[vs%d];[vs%d][%d:v]overlay=0:0:enable='between(t,0,3)'" % (lbl, lbl, idx)
        else:
            cuoi_s = max(3.0, do_dai_cuoi - 1.0)
            vchain += "[vs%d];[vs%d][%d:v]overlay=0:0:enable='between(t,0,3)+between(t,%.3f,%.3f)'" % (
                lbl, lbl, idx, cuoi_s, do_dai_cuoi)
        idx += 1
    if cta:
        cta_png = os.path.join(work, "cta.png")
        ve_cta(vid_w, vid_h, cta, cta_png, nghieng)
        ins += ["-loop", "1", "-i", cta_png]
        cta_bat_dau = max(0.0, do_dai_cuoi - cta_giay)
        lbl += 1
        vchain += "[vs%d];[vs%d][%d:v]overlay=0:0:enable='between(t,%.3f,%.3f)'" % (
            lbl, lbl, idx, cta_bat_dau, do_dai_cuoi)
        idx += 1
        print(">> Câu chốt cuối hiện từ giây %.1f đến hết (%.1fs)." % (cta_bat_dau, do_dai_cuoi))
    # các nhánh b-roll phải khai TRƯỚC chuỗi chính vì chuỗi chính có dùng nhãn [bl*]
    fc = chuoi_broll + [vchain + "[v]"]

    # ĐƯỜNG TIẾNG ĐỘNG (việc 5, 2026-08-09) — dựng riêng thành 1 file trước, xem hàm tao_track_sfx.
    sfx_track = None
    # Tiếng động đánh dấu CHỖ ĐỔI HÌNH (sửa 2026-08-09 chiều). Trước đây nó đánh vào mốc phóng to,
    # nhưng anh Hoàn đã bỏ hẳn phóng to — tiếng động không có hình đổi kèm theo thì vô nghĩa.
    # Nay đặt đúng lúc hình minh hoạ hiện lên, tai và mắt cùng báo "cảnh đổi".
    moc_tieng = broll_moc if broll_moc else [s for s, _e in nhan_manh_that]
    if tieng_dong and moc_tieng:
        # SỬA 2026-08-11: bỏ ".." — trước đây tìm ở <gốc bộ não>/assets/ nên KHÔNG BAO GIỜ
        # thấy file tiếng động thật (nó nằm ở cong-cu/assets/). Không thấy thì tao_whoosh()
        # lặng lẽ tổng hợp một tiếng khác rồi dùng thay, không ai biết.
        wh = tao_whoosh(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     "assets", "whoosh-nhe.wav"))
        sfx_track = tao_track_sfx(wh, moc_tieng, do_dai_cuoi, os.path.join(work, "sfx-track.wav"))
        if sfx_track:
            print(">> Chèn tiếng động nhẹ ở %d chỗ đổi sang hình minh hoạ." % len(moc_tieng))

    tieng = []
    if nhac and nhac != "khong" and os.path.exists(nhac):
        ins += ["-stream_loop", "-1", "-i", nhac]
        i_nhac = idx
        idx += 1
        # NHẠC MỘT MỨC ĐỀU — BỎ HẲN phần tự lên tự xuống, 2026-08-09 (chiều), anh Hoàn yêu cầu
        # trực tiếp: "phần nhạc nền giữ nguyên âm thanh gốc không cho to, cho nhỏ nữa".
        # Sáng cùng ngày Đạt vừa thêm `sidechaincompress` (nhạc tự tụt khi anh nói, tự dâng khi
        # anh nghỉ) — anh nghe thấy khó chịu. Gỡ bỏ, để nhạc chạy một mức thấp không đổi,
        # giọng anh Hoàn giữ nguyên không bị thứ gì ép lên ép xuống.
        fc.append("[0:a]atempo=%.4f[a0]" % toc_do)
        fc.append("[%d:a]volume=0.18,afade=t=in:st=0:d=1.0[mus]" % i_nhac)
        tieng = ["[a0]", "[mus]"]
    else:
        fc.append("[0:a]atempo=%.4f[a0]" % toc_do)
        tieng = ["[a0]"]

    if sfx_track:
        ins += ["-i", sfx_track]
        tieng.append("[%d:a]" % idx)
        idx += 1

    if len(tieng) == 1:
        fc.append("[a0]loudnorm=I=-16:TP=-1.5:LRA=11[a]")
    else:
        fc.append("%samix=inputs=%d:duration=first:normalize=0,"
                  "loudnorm=I=-16:TP=-1.5:LRA=11[a]" % ("".join(tieng), len(tieng)))

    # -t tường minh: "-shortest" một mình KHÔNG đủ khi đồ hoạ vào có input lặp vô hạn
    # (nhạc -stream_loop -1, hook -loop 1) trộn qua filter_complex — từng bị treo thật khi test.
    subprocess.run(["ffmpeg", "-y"] + ins + ["-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]",
                     "-t", "%.3f" % do_dai_cuoi, *venc(), "-c:a", "aac", "-b:a", "192k", final_path],
                    check=True, capture_output=True)
    print(">> XONG! Video: %s%s%s" % (final_path,
                                      " (có hook 3s đầu)" if hook else "",
                                      " (có câu chốt cuối)" if cta else ""))

    # TỰ SOI BẢN VỪA RA (thêm 2026-08-09) — trích khung hình để Đạt tự kiểm trước khi báo anh Hoàn,
    # thay vì để mắt anh Hoàn làm người bắt lỗi như cả 3 lần dựng ngày 08/08.
    # Mốc 0.0 = KHUNG HÌNH ĐẦU TIÊN (việc 4, 2026-08-09): YouTube Shorts lấy đúng khung này
    # làm ảnh đại diện. Trước đây Đạt để mặc, ra khung nào thì ra — nhắm mắt/nhoè cũng chịu.
    moc_soi = [0.0, 0.6, 1.8, do_dai_cuoi * 0.35, do_dai_cuoi * 0.62,
               max(0.0, do_dai_cuoi - 2.0), max(0.0, do_dai_cuoi - 0.4)]
    do_am_luong(final_path, os.path.join(work, "goc.wav"),
                (nhac if (nhac and nhac != "khong" and os.path.exists(nhac)) else None))
    anh = trich_khung(final_path, os.path.join(work, "soi-ban-cuoi"), moc_soi, "ban-cuoi")
    print(">> Đã trích %d khung hình bản cuối để Đạt tự soi (hook · phụ đề · chữ tràn · câu chốt):" % len(anh))
    for p in anh:
        print("   " + p)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("buoc", choices=["soi", "transcribe", "dexuat", "dung"])
    ap.add_argument("video")
    ap.add_argument("--nhac", default=None)
    ap.add_argument("--toc-do", type=float, default=TOC_DO_MAC_DINH)
    ap.add_argument("--hook", default=None, help="Tiêu đề hook hiện 3 giây đầu, cách dòng bằng \\n")
    ap.add_argument("--hook-badge", default=None, help="Nhãn nhỏ trên hook, VD: SỰ THẬT")
    ap.add_argument("--cta", default=None,
                    help="Câu chốt cuối video, cách dòng bằng \\n. CHỮ NÀY LÀ NỘI DUNG — "
                         "lấy từ anh Hoàn, Đạt không tự bịa.")
    ap.add_argument("--cta-giay", type=float, default=CTA_GIAY_MAC_DINH,
                    help="Câu chốt cuối hiện bao nhiêu giây cuối video (mặc định 3)")
    ap.add_argument("--sang", type=float, default=SANG_MAC_DINH, help="Độ sáng thêm (mặc định 0.045)")
    ap.add_argument("--gamma", type=float, default=GAMMA_MAC_DINH, help="Nâng vùng tối (mặc định 1.08)")
    ap.add_argument("--net", type=float, default=NET_MAC_DINH, help="Độ mài nét (mặc định 0.85)")
    ap.add_argument("--broll-kieu", choices=["toanman", "goc"], default="toanman",
                    help="toanman = cắt hẳn sang hình minh hoạ · goc = thu nhỏ nằm góc, vẫn thấy mặt")
    ap.add_argument("--zoom-nhan-manh", action="store_true",
                    help="Bật lại kiểu phồng hình ở mốc nhấn mạnh (mặc định TẮT — anh Hoàn chốt 09/08)")
    ap.add_argument("--khong-nhac", action="store_true",
                    help="Bỏ hẳn nhạc nền, chỉ giữ đúng tiếng gốc anh Hoàn nói")
    ap.add_argument("--hook-nghieng", type=float, default=GOC_NGHIENG_MAC_DINH,
                    help="Góc nghiêng hộp chữ hook và câu chốt, độ. Mặc định 0 = thẳng, "
                         "đúng ảnh mẫu hook 3s.png. VD -3.2 để nghiêng nhẹ sang trái.")
    ap.add_argument("--zoom-cham", type=float, default=ZOOM_CHAM_MAC_DINH,
                    help="Phóng to chậm dần suốt video, 0.06 = 6%%. Đặt 0 để tắt.")
    ap.add_argument("--khong-nhip", action="store_true",
                    help="Tắt việc tự rải thêm mốc phóng to vào quãng đứng hình lâu")
    ap.add_argument("--khong-tieng-dong", action="store_true",
                    help="Tắt tiếng động nhẹ ở mốc nhấn mạnh")
    a = ap.parse_args()
    if a.buoc == "soi":
        buoc_soi(a.video)
    elif a.buoc == "transcribe":
        buoc_transcribe(a.video)
    elif a.buoc == "dexuat":
        buoc_dexuat(a.video)
    elif a.buoc == "dung":
        buoc_dung(a.video, ("khong" if a.khong_nhac else a.nhac), a.toc_do, a.hook, a.hook_badge,
                  a.cta, a.cta_giay, a.sang, a.net, a.gamma, a.hook_nghieng,
                  a.zoom_cham, not a.khong_nhip, not a.khong_tieng_dong, a.broll_kieu,
                  a.zoom_nhan_manh)


if __name__ == "__main__":
    main()
