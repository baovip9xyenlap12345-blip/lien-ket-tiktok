# -*- coding: utf-8 -*-
"""LẤY HÌNH MINH HOẠ TỪ KHO PEXELS — tải thẳng về đĩa, không qua bộ nhớ.

CÁCH DÙNG
  python lay_hinh_pexels.py <thư-mục-lưu> <số-cảnh>:<từ khoá tiếng Anh> ...

VÍ DỤ
  python lay_hinh_pexels.py canh 03:"teddy bear plush toy" 08:"sewing machine closeup"

Nó tải về thành `canh-03.mp4`, `canh-08.mp4`… đúng tên mà bộ dựng cần.

LUẬT CHỌN HÌNH (mục 04 của bộ não) — công cụ chỉ lọc được phần máy làm được,
phần còn lại BẮT BUỘC người xem tận mắt:
  1. CẤM hình có mặt người cận cảnh  -> máy không tự biết, phải soi ảnh
  2. Ưu tiên video DỌC               -> máy lọc được, đã bật sẵn
  3. Thêm 'bright' khi hình hay tối  -> người tự thêm vào từ khoá
  4. Không lấy lại hình đã dùng      -> máy nhớ trong sổ, đã làm
"""
import json, os, sys, urllib.request, urllib.parse, subprocess

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


def doc_chia(goc_kho=None):
    """Chìa ưu tiên lấy từ biến môi trường, không có thì đọc file chia-khoa.txt."""
    v = os.environ.get("PEXELS_KEY")
    if v:
        return v.strip()
    goc = goc_kho or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for ten in ("chia-khoa.txt", "api-bonaothu2.txt"):
        p = os.path.join(goc, ten)
        if not os.path.exists(p):
            continue
        for dong in open(p, encoding="utf-8", errors="replace"):
            d = dong.strip()
            if d.startswith("PEXELS_KEY="):
                v = d.split("=", 1)[1].strip()
                if v and not v.startswith("<"):
                    return v
    return None


def so_da_dung():
    """Sổ ghi hình đã tải, để lần sau không lấy lại đúng cái cũ."""
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "broll-da-dung.json")
    try:
        return p, json.load(open(p, encoding="utf-8"))
    except Exception:
        return p, {"da_dung": []}


def goi(url, chia):
    rq = urllib.request.Request(url, headers={"Authorization": chia, "User-Agent": UA})
    with urllib.request.urlopen(rq, timeout=30) as r:
        return json.load(r)


def tai_ve(url, duong_dan):
    """Tải thẳng xuống đĩa theo từng khúc — file to cũng không phình bộ nhớ."""
    rq = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(rq, timeout=180) as r, open(duong_dan, "wb") as f:
        while True:
            khuc = r.read(1 << 20)          # đọc từng 1 MB
            if not khuc:
                break
            f.write(khuc)
    return os.path.getsize(duong_dan)


def tim_va_tai(tu_khoa, ra, chia, da_dung):
    """Tìm video DỌC hợp từ khoá rồi tải về. Trả về (đường dẫn, url) hoặc None."""
    q = urllib.parse.quote(tu_khoa)
    url = ("https://api.pexels.com/videos/search?query=%s"
           "&orientation=portrait&per_page=15&size=medium" % q)
    try:
        d = goi(url, chia)
    except Exception as e:
        print("   (!) Không tra được kho ảnh: %s" % e)
        return None

    ds = d.get("videos", [])
    if not ds:
        print("   (!) Không có video DỌC nào hợp từ khoá này. Thử từ khoá khác.")
        return None

    for v in ds:
        # chọn bản mp4 to nhất nhưng không quá 1920 chiều cao cho nhẹ
        tep = [f for f in v.get("video_files", [])
               if f.get("file_type") == "video/mp4" and f.get("height")]
        tep.sort(key=lambda f: -f["height"])
        chon = next((f for f in tep if f["height"] <= 1920), tep[-1] if tep else None)
        if not chon or chon["link"] in da_dung:
            continue
        try:
            n = tai_ve(chon["link"], ra)
        except Exception as e:
            print("   (!) Tải hỏng, thử hình khác: %s" % e)
            continue
        print("   + %s ← %dx%d, %d giây, %.1f MB · tác giả %s"
              % (os.path.basename(ra), chon["width"], chon["height"],
                 v.get("duration", 0), n / 1e6, v.get("user", {}).get("name", "?")))
        print("     nguồn: %s" % v.get("url", ""))
        return ra, chon["link"]

    print("   (!) Mọi hình hợp từ khoá này đều đã dùng rồi. Đổi từ khoá, hoặc xoá sổ broll-da-dung.json.")
    return None


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    thu_muc = sys.argv[1]
    os.makedirs(thu_muc, exist_ok=True)

    chia = doc_chia()
    if not chia:
        print("!! DỪNG LẠI. Chưa có chìa khoá kho ảnh.")
        print("   Cách sửa: đặt biến môi trường PEXELS_KEY, hoặc điền vào chia-khoa.txt")
        sys.exit(1)

    so_path, so = so_da_dung()
    da_dung = set(so.get("da_dung", []))
    xong = 0

    for muc in sys.argv[2:]:
        if ":" not in muc:
            print("   (!) Bỏ qua '%s' — phải viết dạng <số cảnh>:<từ khoá>" % muc)
            continue
        so_canh, tu_khoa = muc.split(":", 1)
        ra = os.path.join(thu_muc, "canh-%02d.mp4" % int(so_canh))
        print("\n>> Cảnh %s — tìm: %s" % (so_canh, tu_khoa))
        kq = tim_va_tai(tu_khoa, ra, chia, da_dung)
        if kq:
            da_dung.add(kq[1])
            xong += 1

    so["da_dung"] = sorted(da_dung)
    os.makedirs(os.path.dirname(so_path), exist_ok=True)
    json.dump(so, open(so_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print("\n>> Tải xong %d hình vào %s" % (xong, thu_muc))
    print("⚠️ BẮT BUỘC: trích một khung mỗi hình rồi MỞ RA XEM TẬN MẮT trước khi dựng.")
    print("   Bỏ ngay hình nào có MẶT NGƯỜI CẬN CẢNH — cắt từ mặt người nói sang mặt")
    print("   người lạ làm người xem tưởng đổi người nói. Đây là Điều cấm số 2.")


if __name__ == "__main__":
    main()
