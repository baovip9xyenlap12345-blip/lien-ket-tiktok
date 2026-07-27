@echo off
rem Nhay dup file nay de chay app Vong Quay May Man (sau khi da cai dat)
title Vong Quay May Man
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] May chua cai Node.js! Vao https://nodejs.org tai ban LTS.
  start https://nodejs.org
  pause
  exit /b
)
if not exist "node_modules" (
  echo Lan dau chay - dang cai dat 1-2 phut...
  call npm install --no-audit --no-fund
)
echo.
echo  App chay tai: http://localhost:3000
echo  Admin: admin@vongquay.local / admin123
echo  DUNG TAT cua so nay khi dang dung app!
echo.
start "" "http://localhost:3000"
call npm start
pause
