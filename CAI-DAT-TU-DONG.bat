@echo off
rem ============================================================
rem  VONG QUAY MAY MAN - CAI DAT TU DONG (chi can nhay dup file nay)
rem  Tu dong: tai ma nguon -> giai nen -> cai dat -> chay app
rem ============================================================
title Vong Quay May Man - Cai dat tu dong
echo.
echo  ============================================
echo   VONG QUAY MAY MAN - CAI DAT TU DONG
echo  ============================================
echo.

rem --- Kiem tra da cai Node.js chua ---
where node >nul 2>nul
if errorlevel 1 (
  echo  [LOI] May chua cai Node.js!
  echo  1. Vao trang: https://nodejs.org
  echo  2. Tai ban LTS va cai dat ^(Next - Next - Install^)
  echo  3. Khoi dong lai may roi chay lai file nay
  echo.
  start https://nodejs.org
  pause
  exit /b
)
echo  [OK] Da co Node.js
for /f "delims=" %%v in ('node --version') do echo       Phien ban: %%v

set "DIR=%USERPROFILE%\VongQuayMayMan"

rem --- Tai ma nguon moi nhat tu GitHub ---
echo.
echo  [1/4] Dang tai ma nguon moi nhat...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/baovip9xyenlap12345-blip/lien-ket-tiktok/archive/refs/heads/claude/lucky-wheel-discount-app-j3lxpb.zip' -OutFile '%TEMP%\vongquay.zip'"
if not exist "%TEMP%\vongquay.zip" (
  echo  [LOI] Tai that bai. Kiem tra ket noi mang roi chay lai!
  pause
  exit /b
)

rem --- Giai nen ---
echo  [2/4] Dang giai nen...
if exist "%TEMP%\vongquay-extract" rmdir /s /q "%TEMP%\vongquay-extract"
powershell -NoProfile -Command "Expand-Archive -Force '%TEMP%\vongquay.zip' '%TEMP%\vongquay-extract'"

rem --- Copy thu muc lucky-wheel vao thu muc nguoi dung ---
set "SRC="
for /d %%i in ("%TEMP%\vongquay-extract\*") do set "SRC=%%i"
if "%SRC%"=="" (
  echo  [LOI] Giai nen that bai!
  pause
  exit /b
)
rem Giu lai du lieu cu (neu da tung cai) truoc khi chep ban moi
if exist "%DIR%\data" (
  if exist "%TEMP%\vongquay-data-backup" rmdir /s /q "%TEMP%\vongquay-data-backup"
  move "%DIR%\data" "%TEMP%\vongquay-data-backup" >nul
)
if exist "%DIR%" rmdir /s /q "%DIR%"
mkdir "%DIR%"
xcopy /e /i /y "%SRC%\lucky-wheel" "%DIR%" >nul
if exist "%TEMP%\vongquay-data-backup" move "%TEMP%\vongquay-data-backup" "%DIR%\data" >nul

rem --- Cai dat thu vien ---
echo  [3/4] Dang cai dat (1-2 phut, vui long cho)...
cd /d "%DIR%"
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo  [LOI] Cai dat that bai. Chup man hinh loi va gui cho tro ly!
  pause
  exit /b
)

rem --- Khoi dong app va mo trinh duyet ---
echo.
echo  [4/4] CAI DAT XONG! Dang khoi dong app...
echo.
echo  ============================================================
echo   App chay tai:  http://localhost:3000
echo   Tai khoan admin: admin@vongquay.local  /  admin123
echo.
echo   DUNG TAT cua so den nay khi dang dung app!
echo   Lan sau muon chay lai: nhay dup file CHAY-APP.bat
echo   trong thu muc %DIR%
echo  ============================================================
echo.
start "" "http://localhost:3000"
call npm start
pause
