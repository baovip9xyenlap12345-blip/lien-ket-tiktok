# -*- coding: utf-8 -*-
"""GIỌNG ĐỌC — biến chữ thành tiếng bằng giọng nhân bản của anh Bảo (dịch vụ Cartesia).

Ba việc:
  python cong-cu/doc_giong.py giong                                  # xem có những giọng nào
  python cong-cu/doc_giong.py thu                                    # đọc thử một câu mẫu
  python cong-cu/doc_giong.py doc "chữ cần đọc" --ra tieng/loi.mp3   # đọc ra file tiếng
  python cong-cu/doc_giong.py doc --tep kich-ban.txt --ra tieng/loi.mp3

CHÌA KHOÁ lấy theo thứ tự: biến môi trường CARTESIA_API_KEY → dòng CARTESIA_API_KEY=... trong
chia-khoa.txt ở gốc bộ não. KHÔNG viết chìa vào mã lệnh, không đưa chìa lên kho mã.

Cần: ffmpeg trong PATH (chỉ khi xuất ra .mp3 mà lời đọc phải ghép nhiều mảnh).
"""
import os, sys, json, argparse, wave, subprocess, urllib.request, urllib.error

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

API = "https://api.cartesia.ai"
PHIEN_BAN = "2024-11-13"

# MODEL: chốt 2026-08-13 sau khi thử cả bốn bản. CHỈ sonic-3 đọc được tiếng Việt —
# sonic-2, sonic-turbo, sonic đều trả lỗi "The language is not supported by this model".
MODEL = "sonic-3"

# GIỌNG MẶC ĐỊNH: "giọng 2 bảo gấu bông" — anh Bảo chốt 2026-08-13.
GIONG_MAC_DINH = "929e69c2-c9ab-481a-bffb-cd16565f867c"
GIONG_QUEN = {
    "bao-gau-bong": "929e69c2-c9ab-481a-bffb-cd16565f867c",   # giọng 2 bảo gấu bông
    "bao": "b8385199-ee1a-4c65-a48a-4724194c2b2e",            # giọng của bùi hữu bảo
}

TAN_SO = 44100          # số mẫu mỗi giây, khớp với nhạc nền của bộ dựng video
DAI_MOI_MANH = 600      # cắt lời đọc thành mảnh ~600 chữ cho chắc, ghép lại sau


def goc_kho():
    """Gốc bộ não = thư mục cha của cong-cu/ — chỗ đặt chia-khoa.txt."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def doc_chia():
    """Lấy chìa khoá: ưu tiên biến môi trường, không có thì đọc chia-khoa.txt ở gốc bộ não."""
    v = os.environ.get("CARTESIA_API_KEY")
    if v:
        return v.strip()
    p = os.path.join(goc_kho(), "chia-khoa.txt")
    if os.path.exists(p):
        for dong in open(p, encoding="utf-8", errors="replace"):
            d = dong.strip()
            if d.startswith("CARTESIA_API_KEY="):
                v = d.split("=", 1)[1].strip()
                if v and not v.startswith("<"):   # bỏ qua dòng mẫu kiểu KEY=<dán vào đây>
                    return v
    print("!! CHƯA CÓ CHÌA KHOÁ GIỌNG ĐỌC.")
    print("   Cách 1: đặt biến môi trường CARTESIA_API_KEY")
    print("   Cách 2: thêm dòng  CARTESIA_API_KEY=<chìa của anh>  vào %s" % p)
    print("   Lấy chìa ở play.cartesia.ai → Settings → API Keys.")
    sys.exit(2)


def goi(duong, than=None, cach="GET"):
    chia = doc_chia()
    dl = {"X-API-Key": chia, "Cartesia-Version": PHIEN_BAN}
    data = None
    if than is not None:
        data = json.dumps(than).encode("utf-8")
        dl["Content-Type"] = "application/json"
    rq = urllib.request.Request(API + duong, data=data, headers=dl, method=cach)
    try:
        with urllib.request.urlopen(rq, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        loi = e.read().decode("utf-8", "replace")
        print("!! Dịch vụ giọng đọc báo lỗi %s: %s" % (e.code, loi[:300]))
        if e.code in (401, 403):
            print("   → Chìa khoá sai hoặc đã bị xoá. Vào play.cartesia.ai tạo chìa mới.")
        sys.exit(3)


def liet_ke_giong():
    # ⚠️ PHẢI có is_owner=true. Không có nó thì dịch vụ trả về toàn giọng công khai của họ
    # (hàng trăm giọng tiếng Anh/Pháp/Nhật) và KHÔNG có giọng nhân bản của anh trong đó —
    # nhìn vào tưởng mất giọng. Đã dính lúc viết công cụ này (2026-08-13).
    rows = json.loads(goi("/voices/?limit=100&is_owner=true"))
    rows = rows if isinstance(rows, list) else rows.get("data", [])
    print(">> Giọng RIÊNG của anh (%d giọng):" % len(rows))
    for r in rows:
        dau = " ← MẶC ĐỊNH" if r.get("id") == GIONG_MAC_DINH else ""
        print("   %s  %s  [%s]%s" % (r.get("id"), r.get("name", "").strip(), r.get("language"), dau))
    if not rows:
        print("   (trống — chìa khoá này chưa nhân bản giọng nào, hoặc chìa của tài khoản khác)")


def chia_manh(chu, dai=DAI_MOI_MANH):
    """Cắt lời đọc thành mảnh ngắn, cắt ở cuối câu cho khỏi đứt hơi giữa chừng."""
    chu = " ".join(chu.split())
    if len(chu) <= dai:
        return [chu]
    manh, cur = [], ""
    for cau in chu.replace("!", ".").replace("?", ".").split("."):
        cau = cau.strip()
        if not cau:
            continue
        cau += "."
        if len(cur) + len(cau) + 1 > dai and cur:
            manh.append(cur.strip())
            cur = cau
        else:
            cur = (cur + " " + cau).strip()
    if cur:
        manh.append(cur.strip())
    return manh


def doc_mot_manh(chu, giong, toc_do):
    than = {
        "model_id": MODEL,
        "transcript": chu,
        "voice": {"mode": "id", "id": giong, "speed": toc_do},
        "language": "vi",
        # lấy tiếng sống (raw) để ghép nhiều mảnh không bị lộ mối nối — mp3 ghép thẳng hay bị lụp bụp
        "output_format": {"container": "raw", "encoding": "pcm_s16le", "sample_rate": TAN_SO},
    }
    return goi("/tts/bytes", than, "POST")


def doc(chu, duong_ra, giong, toc_do):
    manh = chia_manh(chu)
    print(">> Đọc %d chữ, cắt thành %d mảnh, giọng %s, tốc độ %s" % (len(chu), len(manh), giong, toc_do))
    tieng = b""
    for i, m in enumerate(manh, 1):
        b = doc_mot_manh(m, giong, toc_do)
        tieng += b
        print("   mảnh %d/%d — %.1f giây — %s..." % (i, len(manh), len(b) / 2 / TAN_SO, m[:48]))

    os.makedirs(os.path.dirname(os.path.abspath(duong_ra)) or ".", exist_ok=True)
    do_dai = len(tieng) / 2 / TAN_SO
    wav_ra = duong_ra if duong_ra.lower().endswith(".wav") else duong_ra + ".tam.wav"
    with wave.open(wav_ra, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TAN_SO)
        w.writeframes(tieng)

    if wav_ra != duong_ra:
        try:
            subprocess.run(["ffmpeg", "-y", "-i", wav_ra, "-b:a", "192k", duong_ra],
                           check=True, capture_output=True)
            os.remove(wav_ra)
        except Exception:
            print("!! Không gọi được ffmpeg để nén ra %s — giữ nguyên bản .wav ở %s"
                  % (os.path.splitext(duong_ra)[1], wav_ra))
            duong_ra = wav_ra

    print(">> XONG. %s — dài %.1f giây (%.1f phút)" % (duong_ra, do_dai, do_dai / 60))
    print(">> ⚠️ NGHE LẠI trước khi dùng. Máy đọc hay sai: tên riêng, tên thương hiệu, số điện thoại,")
    print("   chữ viết tắt. Sai chỗ nào thì viết lại chữ đó theo cách đọc rồi chạy lại.")
    return duong_ra


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("viec", choices=["doc", "giong", "thu"])
    ap.add_argument("chu", nargs="?", default=None, help="Chữ cần đọc, để trong ngoặc kép")
    ap.add_argument("--tep", default=None, help="Đọc chữ từ file .txt thay vì gõ thẳng")
    ap.add_argument("--ra", default=None, help="File tiếng xuất ra, .mp3 hoặc .wav")
    ap.add_argument("--giong", default=GIONG_MAC_DINH,
                    help="Mã giọng, hoặc tên tắt: bao-gau-bong / bao. Mặc định giọng 2 bảo gấu bông")
    ap.add_argument("--toc-do", choices=["slow", "normal", "fast"], default="normal",
                    help="Tốc độ đọc. Mặc định normal")
    a = ap.parse_args()

    giong = GIONG_QUEN.get(a.giong, a.giong)

    if a.viec == "giong":
        liet_ke_giong()
        return

    if a.viec == "thu":
        ra = a.ra or os.path.join(goc_kho(), "tieng-ra", "thu-giong.mp3")
        doc("Xin chào, đây là giọng đọc thử. Nếu anh nghe rõ câu này thì bộ đọc giọng đã chạy được.",
            ra, giong, a.toc_do)
        return

    chu = a.chu
    if a.tep:
        chu = open(a.tep, encoding="utf-8", errors="replace").read()
    if not chu or not chu.strip():
        print("!! Chưa có chữ để đọc. Gõ thẳng trong ngoặc kép, hoặc dùng --tep <file.txt>.")
        sys.exit(1)
    if not a.ra:
        print("!! Thiếu --ra <đường dẫn file tiếng>. VD: --ra tieng-ra/loi-doc.mp3")
        sys.exit(1)
    doc(chu, a.ra, giong, a.toc_do)


if __name__ == "__main__":
    main()
