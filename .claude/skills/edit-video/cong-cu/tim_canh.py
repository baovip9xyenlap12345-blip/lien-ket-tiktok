# -*- coding: utf-8 -*-
"""Tìm cảnh minh hoạ trên Pexels — XEM ẢNH ĐẠI DIỆN TRƯỚC, tải sau.

Vì sao có file này: luật số 4 trong huong-dan/04-chon-hinh-minh-hoa.md bắt phải soi hình trước
khi dựng cả video. Tải hẳn clip về rồi mới xem thì mỗi lần đổi từ khoá mất vài phút. Ảnh đại diện
Pexels trả sẵn trong kết quả tìm kiếm — xem trước rồi mới tải đúng cái đã chọn, nhanh hơn nhiều lần.

  python tim_canh.py xem  <tep-tu-khoa.txt>  <bang-ra.jpg>   # dựng bảng ảnh đại diện để soi
  python tim_canh.py tai  <tep-chon.txt>     <thu-muc-ra>    # tải đúng clip đã chọn

tep-tu-khoa.txt: mỗi dòng một từ khoá tiếng Anh.
tep-chon.txt:    mỗi dòng "<số thứ tự cảnh> <mã clip Pexels>".
"""
import os, sys, json, urllib.request, urllib.parse

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
MOI_TU_KHOA = 2      # lấy 2 ứng viên mỗi từ khoá cho đỡ rối bảng


def goc_kho():
    """Gốc bộ não = thư mục cha của cong-cu/ — chỗ đặt chia-khoa.txt."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def chia():
    v = os.environ.get("PEXELS_KEY")
    if v:
        return v.strip()
    p = os.path.join(goc_kho(), "chia-khoa.txt")
    for dong in open(p, encoding="utf-8", errors="replace"):
        d = dong.strip()
        if d.startswith("PEXELS_KEY="):
            v = d.split("=", 1)[1].strip()
            if v and not v.startswith("<"):
                return v
    print("!! Chưa có PEXELS_KEY trong chia-khoa.txt")
    sys.exit(2)


def goi(url, chia_khoa=None):
    dl = {"User-Agent": UA}
    if chia_khoa:
        dl["Authorization"] = chia_khoa
    rq = urllib.request.Request(url, headers=dl)
    with urllib.request.urlopen(rq, timeout=90) as r:
        return r.read()


def xem(tep_tu_khoa, bang_ra):
    from PIL import Image, ImageDraw
    k = chia()
    tu_khoa = [d.strip() for d in open(tep_tu_khoa, encoding="utf-8") if d.strip()]
    thu_muc = os.path.join(os.path.dirname(os.path.abspath(bang_ra)), "ung-vien")
    os.makedirs(thu_muc, exist_ok=True)
    o = []
    for i, t in enumerate(tu_khoa, 1):
        url = ("https://api.pexels.com/videos/search?query=%s&per_page=%d&orientation=portrait"
               % (urllib.parse.quote(t), MOI_TU_KHOA))
        try:
            d = json.loads(goi(url, k))
        except Exception as ex:
            print("   (!) hỏng khi tra \"%s\": %s" % (t, ex))
            continue
        for v in d.get("videos", [])[:MOI_TU_KHOA]:
            p = os.path.join(thu_muc, "%02d-%d.jpg" % (i, v["id"]))
            if not os.path.exists(p):
                open(p, "wb").write(goi(v["image"]))
            o.append((i, t, v["id"], p, v.get("duration", 0)))
        print("  %2d. %-52s → %s" % (i, t[:52],
              " ".join(str(v["id"]) for v in d.get("videos", [])[:MOI_TU_KHOA]) or "KHÔNG CÓ"))

    if not o:
        print("!! Không tra được cảnh nào.")
        return
    cot = 6
    hang = (len(o) + cot - 1) // cot
    w, h = 250, 444
    sheet = Image.new("RGB", (w * cot, h * hang), (18, 18, 18))
    d = ImageDraw.Draw(sheet)
    for n, (i, t, vid, p, dur) in enumerate(o):
        try:
            im = Image.open(p).convert("RGB").resize((w, h))
        except Exception:
            continue
        x, y = (n % cot) * w, (n // cot) * h
        sheet.paste(im, (x, y))
        d.rectangle([x, y, x + 118, y + 20], fill=(0, 0, 0))
        d.text((x + 4, y + 5), "canh %d · %d" % (i, vid), fill=(255, 214, 0))
    sheet.save(bang_ra, quality=85)
    print(">> Bảng ứng viên: %s (%d ô)" % (bang_ra, len(o)))
    print(">> MỞ ẢNH RA XEM rồi ghi lựa chọn vào tệp chọn: mỗi dòng \"<số cảnh> <mã clip>\".")


def tai(tep_chon, thu_muc_ra):
    k = chia()
    os.makedirs(thu_muc_ra, exist_ok=True)
    for dong in open(tep_chon, encoding="utf-8"):
        dong = dong.split("#")[0].strip()
        if not dong:
            continue
        so, vid = dong.split()[:2]
        ra = os.path.join(thu_muc_ra, "canh-%02d.mp4" % int(so))
        if os.path.exists(ra):
            print("  cảnh %s — đã có" % so)
            continue
        v = json.loads(goi("https://api.pexels.com/videos/videos/%s" % vid, k))
        # Lấy bản NHỎ NHẤT mà vẫn đạt 1080x1920 (cao >= 1900) — đúng khung ra, khỏi phóng to mất nét. Bản cũ lấy bản to nhất — dính bản 4K
        # nặng 53 MB, tải giữa chừng đứt (IncompleteRead). Khung ra chỉ 1080x1920, lấy 4K là phí.
        fs = sorted(v["video_files"], key=lambda f: (f.get("height") or 0))
        pick = next((f for f in fs if (f.get("height") or 0) >= 1900), fs[-1])
        for lan in range(4):
            try:
                b = goi(pick["link"])
                open(ra, "wb").write(b)
                break
            except Exception as ex:
                if lan == 3:
                    print("  (!) cảnh %s tải hỏng sau 4 lần: %s" % (so, str(ex)[:70]))
                    b = None
                    break
                print("  ... cảnh %s tải lại lần %d" % (so, lan + 2))
        if b:
            # ⚠️ ĐỪNG TIN SIÊU DỮ LIỆU. Pexels khai bản "hd_1080_2048" nhưng đường dẫn đó có khi
            # trả về file 720x1366 — đưa thẳng vào dựng là mất nét mà không ai biết (phạm luật 4).
            # Đo lại bằng ffprobe trên chính file đã tải, và báo ra nếu lệch.
            import subprocess
            r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v",
                                "-show_entries", "stream=width,height", "-of", "csv=p=0", ra],
                               capture_output=True, text=True)
            that = r.stdout.strip().replace(",", "x")
            khai = "%dx%d" % (pick["width"], pick["height"])
            canh_bao = ""
            if that and that != khai:
                canh_bao = "  ⚠️ KHAI %s NHƯNG THẬT LÀ %s" % (khai, that)
            print("  cảnh %s ← clip %s  (%s, %.1f MB)%s"
                  % (so, vid, that or khai, len(b) / 1048576, canh_bao))


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    if sys.argv[1] == "xem":
        xem(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == "tai":
        tai(sys.argv[2], sys.argv[3])
