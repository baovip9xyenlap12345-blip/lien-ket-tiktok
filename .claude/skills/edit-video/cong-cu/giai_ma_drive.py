# -*- coding: utf-8 -*-
"""Giải mã ảnh Drive từ các file kết quả mà hệ thống đã tự lưu ra đĩa.

VÌ SAO CÓ FILE NÀY: ổ Drive bị chính sách mạng chặn, không tải thẳng bằng curl được. Đường duy
nhất là công cụ Drive, mà nó trả ảnh về dạng chuỗi mã hoá base64 — một ảnh 250 KB ngốn ~80.000
token nếu đi qua bộ nhớ. NHƯNG khi kết quả quá lớn, hệ thống TỰ LƯU nó ra file trên đĩa và chỉ
đưa lại đường dẫn. File này đọc đúng những file đó rồi giải mã ra ảnh thật — tốn 0 token.

  python giai_ma_anh.py <thư-mục-kết-quả> <thư-mục-ảnh-ra>
"""
import os, sys, json, glob, base64

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

DUOI = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4"}


def kich_thuoc_jpeg(b):
    """Đọc chiều rộng/cao thẳng từ đầu file JPEG, khỏi cần thư viện ảnh."""
    i = 2
    while i < len(b) - 9:
        if b[i] != 0xFF:
            i += 1
            continue
        m = b[i + 1]
        if m in (0xC0, 0xC1, 0xC2, 0xC3):
            return (int.from_bytes(b[i + 7:i + 9], "big"), int.from_bytes(b[i + 5:i + 7], "big"))
        i += 2 + int.from_bytes(b[i + 2:i + 4], "big")
    return (0, 0)


def main():
    thu_muc_kq, ra = sys.argv[1], sys.argv[2]
    os.makedirs(ra, exist_ok=True)
    tep = sorted(glob.glob(os.path.join(thu_muc_kq, "*download_file_content*")))
    print(">> Tìm thấy %d file kết quả." % len(tep))
    xong, hong, so = 0, 0, []
    for p in tep:
        try:
            d = json.load(open(p, encoding="utf-8"))
            b = base64.b64decode(d["content"])
        except Exception:
            hong += 1
            continue
        duoi = DUOI.get(d.get("mimeType", ""), ".bin")
        o = os.path.join(ra, d["id"] + duoi)
        if not os.path.exists(o):
            open(o, "wb").write(b)
        w, h = kich_thuoc_jpeg(b) if duoi == ".jpg" else (0, 0)
        so.append((d["id"], len(b), w, h))
        xong += 1
    print(">> Giải mã xong %d ảnh · %d file hỏng bỏ qua." % (xong, hong))

    ngang = sum(1 for _, _, w, h in so if w > h > 0)
    doc = sum(1 for _, _, w, h in so if 0 < w < h)
    vuong = sum(1 for _, _, w, h in so if w == h and w > 0)
    print(">> Khung ảnh: %d NGANG · %d DỌC · %d VUÔNG" % (ngang, doc, vuong))
    nho = [i for i, n, w, h in so if 0 < h < 900]
    if nho:
        print(">> ⚠️ %d ảnh có chiều cao dưới 900 điểm — phóng lên khung 1920 sẽ vỡ:" % len(nho))
        for i in nho[:8]:
            print("   " + i)
    json.dump([{"id": i, "byte": n, "rong": w, "cao": h} for i, n, w, h in so],
              open(os.path.join(ra, "_kich-thuoc.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
