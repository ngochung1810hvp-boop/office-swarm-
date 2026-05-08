@echo off
chcp 65001 >nul
title Mì Làm Văn Phòng — cài đặt
cd /d "%~dp0"

echo.
echo  Mì Làm Văn Phòng — cài đặt môi trường (Python venv + npm desktop)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\installer\Install-FromSource.ps1" %*
if errorlevel 1 (
  echo.
  echo Cài đặt gặp lỗi. Xem thông báo phía trên.
  pause
  exit /b 1
)

echo.
pause
