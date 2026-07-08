@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM ============================================================
REM  SCRIPT PHIEN AM VIDEO -> TXT (tieng Viet)
REM  Dung voi Faster-Whisper-XXL (xem file HUONG-DAN.md)
REM
REM  >>> SUA 3 DONG DUOI DAY CHO DUNG MAY CUA BAN <<<
REM ============================================================

REM Thu muc chua video (o E - phan video hoc long)
set "VIDEO_DIR=E:\video hoc long"

REM Thu muc luu ket qua txt (se tu tao, giu nguyen cau truc thu muc)
set "OUT_DIR=E:\raw"

REM Model AI:
REM   large-v3  = chinh xac nhat  (can GPU NVIDIA >= 8GB VRAM, hoac CPU rat lau)
REM   medium    = kha tot         (GPU 4-6GB, hoac CPU manh)
REM   small     = nhanh nhat      (may yeu, chat luong thap hon)
set "MODEL=large-v3"

REM ============================================================
REM  TU DAY TRO XUONG KHONG CAN SUA GI
REM ============================================================

if "%VIDEO_DIR:~-1%"=="\" set "VIDEO_DIR=%VIDEO_DIR:~0,-1%"
if "%OUT_DIR:~-1%"=="\" set "OUT_DIR=%OUT_DIR:~0,-1%"

set "EXE=%~dp0faster-whisper-xxl.exe"

if not exist "%EXE%" (
    echo [LOI] Khong tim thay faster-whisper-xxl.exe
    echo Hay dat file .bat nay vao CUNG THU MUC voi faster-whisper-xxl.exe
    echo Xem lai buoc 1-2 trong HUONG-DAN.md
    pause
    exit /b 1
)

if not exist "%VIDEO_DIR%" (
    echo [LOI] Khong tim thay thu muc video: "%VIDEO_DIR%"
    echo Hay mo file .bat nay bang Notepad va sua dong VIDEO_DIR cho dung
    pause
    exit /b 1
)

mkdir "%OUT_DIR%" 2>nul

set /a TOTAL=0
for /r "%VIDEO_DIR%" %%F in (*.ts *.mp4 *.mkv *.avi *.mov *.webm *.flv) do set /a TOTAL+=1

echo ============================================================
echo  Tim thay !TOTAL! video trong: %VIDEO_DIR%
echo  Ket qua txt se luu vao:       %OUT_DIR%
echo  Model: %MODEL%
echo ============================================================
echo  Meo: Co the tat cua so nay bat cu luc nao. Lan sau chay lai
echo  script se TU BO QUA cac video da phien am xong.
echo ============================================================
echo.

set /a N=0
set /a DONE=0
set /a SKIP=0
set /a FAIL=0

for /r "%VIDEO_DIR%" %%F in (*.ts *.mp4 *.mkv *.avi *.mov *.webm *.flv) do (
    set /a N+=1
    set "SRCDIR=%%~dpF"
    set "REL=!SRCDIR:%VIDEO_DIR%=!"
    set "OUTD=%OUT_DIR%!REL!"
    if not exist "!OUTD!" mkdir "!OUTD!" 2>nul

    if exist "!OUTD!%%~nF.txt" (
        echo [!N!/!TOTAL!] BO QUA - da lam roi: %%~nxF
        set /a SKIP+=1
    ) else (
        echo.
        echo [!N!/!TOTAL!] DANG PHIEN AM: %%~nxF
        "%EXE%" "%%F" -l vi -m %MODEL% --output_format txt --output_dir "!OUTD!" --beep_off
        if exist "!OUTD!%%~nF.txt" (
            set /a DONE+=1
            echo [!N!/!TOTAL!] XONG: %%~nF.txt
        ) else (
            set /a FAIL+=1
            echo [!N!/!TOTAL!] [LOI] Khong tao duoc txt cho file nay
        )
    )
)

echo.
echo ============================================================
echo  HOAN TAT
echo  Thanh cong: !DONE!   Bo qua: !SKIP!   Loi: !FAIL!
echo  Toan bo file txt nam o: %OUT_DIR%
echo.
echo  BUOC TIEP THEO: Tai (upload) ca thu muc nay len Google Drive,
echo  dat ten "raw" ben trong thu muc "hoc long", roi bao Claude.
echo ============================================================
pause
