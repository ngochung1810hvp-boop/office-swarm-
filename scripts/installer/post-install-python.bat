@echo off
chcp 65001 >nul
setlocal EnableExtensions
REM Chạy từ thư mục cài đặt: ...\MiLamVanPhong\scripts\installer\
cd /d "%~dp0..\.."
if not exist "requirements.txt" (
  echo Lỗi: Không tìm thấy requirements.txt trong thư mục ứng dụng.
  pause
  exit /b 1
)

echo === Mì Làm Văn Phòng — cài môi trường Python ===
echo.

REM --- Tự kiểm tra/cài Python nếu thiếu (winget) ---
set "PY_CMD="
where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
  set "PY_CMD=py -3"
) else (
  where python >nul 2>&1
  if %ERRORLEVEL% equ 0 (
    set "PY_CMD=python"
  )
)

if "%PY_CMD%"=="" (
  where winget >nul 2>&1
  if %ERRORLEVEL% equ 0 (
    echo Không tìm thấy Python. Đang tự cài Python (bản mới nhất 3.x) bằng winget...
    echo ^> winget install -e --id Python.Python.3 --silent
    winget install -e --id Python.Python.3 --silent --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% neq 0 (
      echo Lỗi: winget cài Python thất bại. Bạn có thể tự cài Python tại https://www.python.org/downloads/
      pause
      exit /b 1
    )

    REM Re-check after install
    where py >nul 2>&1
    if %ERRORLEVEL% equ 0 (
      set "PY_CMD=py -3"
    ) else (
      where python >nul 2>&1
      if %ERRORLEVEL% equ 0 (
        set "PY_CMD=python"
      )
    )
  ) else (
    echo Cần Python 3.10+. Máy bạn chưa có Python và cũng không có winget để tự cài.
    echo Hãy tải Python tại https://www.python.org/downloads/ ^(nhớ chọn "Add Python to PATH"^),
    echo rồi chạy lại file này.
    pause
    exit /b 1
  )
)

if "%PY_CMD%"=="" (
  echo Đã cài Python nhưng phiên hiện tại chưa nhận PATH.
  echo Hãy đóng installer/app, mở lại, rồi chạy lại file này.
  pause
  exit /b 1
)

where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
  echo Đang tạo .venv bằng: py -3 ...
  py -3 -m venv .venv
) else (
  where python >nul 2>&1
  if %ERRORLEVEL% neq 0 (
    echo Cần Python 3.10+ ^(tải tại https://www.python.org/downloads/^).
    echo Khi cài, nhớ chọn "Add Python to PATH".
    pause
    exit /b 1
  )
  echo Đang tạo .venv bằng: python ...
  python -m venv .venv
)

if not exist ".venv\Scripts\python.exe" (
  echo Không tạo được .venv.
  pause
  exit /b 1
)

call ".venv\Scripts\activate.bat"
python -m pip install --upgrade pip wheel
echo.
echo Đang pip install -r requirements.txt ^(có thể mất 5-15 phút^)...
pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
  echo pip thất bại. Kiểm tra kết nối mạng và Python.
  pause
  exit /b 1
)

echo.
echo Hoàn tất. Bạn có thể mở ứng dụng từ menu Start.
pause
endlocal
exit /b 0
