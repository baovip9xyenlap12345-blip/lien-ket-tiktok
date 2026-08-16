@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title CAI DAT BO NAO EDIT VIDEO - Bao Gau Bong

echo.
echo ============================================================
echo   CAI DAT BO NAO EDIT VIDEO TREN MAY TINH NAY
echo ============================================================
echo.
echo   Chuong trinh nay se cai 3 thu, mat khoang 5-10 phut:
echo     1. Python      - may chay cac cong cu
echo     2. ffmpeg      - may cat ghep video va do am thanh
echo     3. Pillow      - may ve chu len khung hinh
echo.
echo   Neu Windows hoi "Cho phep ung dung nay thay doi thiet bi?"
echo   thi bam CO / YES.
echo.
pause

REM ---------------------------------------------------------------
REM winget la cho cai dat san co trong Windows 10/11, giong CH Play
REM cua dien thoai. Khong co no thi phai cai tay, script se bao ro.
REM ---------------------------------------------------------------
where winget >nul 2>&1
if errorlevel 1 (
    echo.
    echo [!] May nay khong co winget - kho cai dat san cua Windows.
    echo     Cach chua: mo Microsoft Store, tim "App Installer", bam Cap nhat.
    echo     Hoac cai tay:
    echo       Python : https://www.python.org/downloads/
    echo                LUU Y: man hinh dau tien PHAI tich o "Add python.exe to PATH"
    echo       ffmpeg : https://www.gyan.dev/ffmpeg/builds/  (ban "release essentials")
    echo.
    pause
    exit /b 1
)

echo.
echo === [1/4] Kiem tra Python ===
python --version >nul 2>&1
if errorlevel 1 (
    echo     Chua co Python. Dang cai...
    winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements
    echo.
    echo [!] DA CAI XONG PYTHON.
    echo     BAT BUOC: dong cua so den nay lai, roi MO LAI file cai-dat-may-tinh.bat.
    echo     Vi sao: Windows chi nap duong dan moi khi mo cua so moi.
    echo.
    pause
    exit /b 0
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo     OK - %%v

echo.
echo === [2/4] Kiem tra ffmpeg ===
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo     Chua co ffmpeg. Dang cai...
    winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements
    echo.
    echo [!] DA CAI XONG FFMPEG.
    echo     BAT BUOC: dong cua so den nay lai, roi MO LAI file cai-dat-may-tinh.bat.
    echo.
    pause
    exit /b 0
)
for /f "tokens=1-3" %%a in ('ffmpeg -version 2^>^&1 ^| findstr /b "ffmpeg version"') do echo     OK - %%a %%b %%c

echo.
echo === [3/4] Cai thu vien ve chu (Pillow) ===
python -m pip install --quiet --upgrade pip
python -m pip install --quiet pillow
if errorlevel 1 (
    echo [!] Cai Pillow that bai. Thu chay lai file nay bang chuot phai ^> Run as administrator.
    pause
    exit /b 1
)
echo     OK - Pillow da san sang

echo.
echo === [4/4] Chuan bi file chia khoa ===
if not exist "%~dp0chia-khoa.txt" (
    copy /y "%~dp0chia-khoa.mau.txt" "%~dp0chia-khoa.txt" >nul
    echo     Da tao file chia-khoa.txt tu ban mau.
) else (
    echo     Da co chia-khoa.txt tu truoc, giu nguyen.
)

echo.
echo === KIEM TRA LAN CUOI ===
python -c "from PIL import Image, ImageDraw, ImageFont; import os,sys; f=os.path.join(r'%~dp0','cong-cu','fonts','Anton-Regular.ttf'); assert os.path.exists(f), 'thieu font Anton'; ImageFont.truetype(f,40); print('    OK - ve chu duoc, font Anton co san')"
if errorlevel 1 (
    echo [!] Kiem tra that bai. Chup man hinh nay gui lai de xem loi.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   XONG. MAY DA SAN SANG DUNG VIDEO.
echo ============================================================
echo.
echo   CON MOT VIEC PHAI LAM TAY - dan 2 chia khoa vao file:
echo     %~dp0chia-khoa.txt
echo.
echo     PEXELS_KEY=...      (kho anh/video minh hoa mien phi)
echo     CARTESIA_KEY=...    (giong doc tieng Viet)
echo.
echo   Xong roi thi keo file bang.json tha vao lam-video.bat la chay.
echo.
pause
