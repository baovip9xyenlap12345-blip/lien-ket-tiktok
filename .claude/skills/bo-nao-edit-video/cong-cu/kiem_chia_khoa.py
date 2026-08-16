# -*- coding: utf-8 -*-
"""Xem file chìa khoá đã dán đủ chìa chưa, báo bằng tiếng Việt dễ hiểu.

Vì sao phải có file này thay vì đọc thẳng trong file .bat:
Notepad trên Windows lưu file kèm một ký tự xuống dòng thừa. Lệnh `for /f` của
Windows KHÔNG cắt ký tự đó, nên chìa đọc ra bị dính một ký tự lạ ở cuối — kho ảnh
và kho giọng đều trả lời "sai chìa khoá", mà nhìn mắt thường thấy chìa vẫn đúng y.
Python thì `.strip()` cắt sạch hai đầu.
"""
import io, os, sys

CAN = {
    "CARTESIA_KEY": "giọng đọc tiếng Việt — lấy ở play.cartesia.ai",
    "PEXELS_KEY":   "kho ảnh/video minh hoạ — lấy ở pexels.com/api",
}


def doc(duong_dan):
    co = {}
    for dong in io.open(duong_dan, encoding="utf-8", errors="replace"):
        d = dong.strip()
        if "=" not in d:
            continue
        ten, gia = d.split("=", 1)
        ten, gia = ten.strip(), gia.strip()
        if ten in CAN and gia and not gia.startswith("<"):
            co[ten] = gia
    return co


def main():
    duong_dan = sys.argv[1] if len(sys.argv) > 1 else "chia-khoa.txt"
    if not os.path.exists(duong_dan):
        print("[!] Khong thay file %s" % duong_dan)
        sys.exit(1)
    co = doc(duong_dan)

    thieu = [t for t in CAN if t not in co]
    if "CARTESIA_KEY" in thieu:
        print()
        print("[!] CHUA CO CHIA KHOA GIONG DOC — khong lam video duoc.")
        print("    Mo file nay bang Notepad:")
        print("       %s" % duong_dan)
        print("    Tim dong CARTESIA_KEY= roi dan chia cua anh vao sau dau bang.")
        print("    Vi du:  CARTESIA_KEY=sk_car_abc123")
        print()
        sys.exit(1)

    print("    OK - da co chia giong doc (%d ky tu)" % len(co["CARTESIA_KEY"]))
    if "PEXELS_KEY" in thieu:
        print("    (!) Chua co chia kho anh. Video van chay, nhung canh nao khai tu khoa")
        print("        hinh se khong tai duoc anh minh hoa.")
    else:
        print("    OK - da co chia kho anh (%d ky tu)" % len(co["PEXELS_KEY"]))


if __name__ == "__main__":
    main()
