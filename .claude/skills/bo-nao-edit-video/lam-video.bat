@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title LAM VIDEO - Bao Gau Bong

REM ===============================================================
REM CACH DUNG: keo file bang.json THA VAO file nay la chay.
REM Hoac go:  lam-video.bat duong\dan\bang.json
REM ===============================================================

set BANG=%~1
if "%BANG%"=="" (
    echo.
    echo   Keo file bang.json tha vao day roi bam Enter,
    echo   hoac dong cua so nay va keo thang file bang.json vao lam-video.bat
    echo.
    set /p BANG="   Duong dan bang.json: "
)
set BANG=%BANG:"=%

if not exist "%BANG%" (
    echo.
    echo [!] Khong thay file: %BANG%
    pause
    exit /b 1
)

REM ---------------------------------------------------------------
REM KIEM TRA CHIA KHOA BANG PYTHON, KHONG DOC BANG FILE .BAT.
REM Vi sao: Notepad tren Windows luu file kem ky tu xuong dong thua (CR).
REM Lenh for /f cua Windows KHONG bo ky tu do, nen chia khoa doc ra bi dinh
REM mot ky tu la o cuoi -> may bao "sai chia khoa" ma nhin mat thuong thay dung y.
REM Python thi tu cat sach hai dau, nen de Python doc la chac an.
REM ---------------------------------------------------------------
if not exist "%~dp0chia-khoa.txt" (
    echo.
    echo [!] Chua co file chia-khoa.txt.
    echo     Chay cai-dat-may-tinh.bat truoc, no se tu tao file do.
    echo.
    pause
    exit /b 1
)
python "%~dp0cong-cu\kiem_chia_khoa.py" "%~dp0chia-khoa.txt"
if errorlevel 1 (
    pause
    exit /b 1
)

REM Thu muc ket qua dat canh file bang.json, ten "video-ra"
for %%F in ("%BANG%") do set THUMUC=%%~dpF
set RA=%THUMUC%video-ra

echo.
echo ============================================================
echo   BANG PHAN CANH : %BANG%
echo   KET QUA SE NAM O: %RA%
echo ============================================================
echo.
echo   May se lam 5 buoc: doc giong - tai hinh - dung hinh -
echo   tron tieng - ghep va tu kiem.
echo   Video 1 phut mat khoang 5 phut. Video 3 phut mat khoang 20 phut.
echo   DUNG DONG CUA SO NAY trong luc no chay.
echo.

set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
python "%~dp0cong-cu\lam_video.py" "%BANG%" "%RA%"

if errorlevel 1 (
    echo.
    echo [!] Chay bi loi. Chup nguyen man hinh nay gui lai de xem loi o dau.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   XONG. Mo thu muc ket qua...
echo ============================================================
start "" "%RA%"
echo.
echo   NHO: mo thu muc "soi" xem tung anh khung hinh truoc khi dang.
echo.
pause
