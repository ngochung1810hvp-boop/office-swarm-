#Requires -Version 5.1
<#
.SYNOPSIS
  Cài đặt Mì Làm Văn Phòng từ mã nguồn (không cần Inno Setup).
  Tạo .venv, pip install, npm install trong desktop/, tùy chọn build Tauri release.

.DESCRIPTION
  Chạy script này trong thư mục gốc repo (cùng cấp với server.py).
  Dùng khi người dùng git clone hoặc giải nén ZIP mã nguồn.
#>
[CmdletBinding()]
param(
    [switch]$SkipDesktopNpm,
    [switch]$BuildTauriRelease,
    [switch]$AddShortcuts
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if (-not (Test-Path (Join-Path $Root "server.py"))) {
    $Root = (Get-Location).Path
}
if (-not (Test-Path (Join-Path $Root "server.py"))) {
    throw "Chạy script trong thư mục gốc dự án (phải có server.py). Hiện tại: $Root"
}

Write-Host ""
Write-Host "=== Mì Làm Văn Phòng — cài đặt từ mã nguồn ===" -ForegroundColor Cyan
Write-Host "Thư mục: $Root"
Write-Host ""

# --- Python venv ---
$py = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
    $py = "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $py = "python"
} else {
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "Không tìm thấy Python. Đang tự cài Python (bản mới nhất 3.x) bằng winget..." -ForegroundColor Yellow
        winget install -e --id Python.Python.3 --silent --accept-package-agreements --accept-source-agreements | Out-Host

        if (Get-Command py -ErrorAction SilentlyContinue) {
            $py = "py"
        } elseif (Get-Command python -ErrorAction SilentlyContinue) {
            $py = "python"
        } else {
            throw "Đã cài Python nhưng phiên PowerShell hiện tại chưa nhận PATH. Hãy mở terminal mới rồi chạy lại script."
        }
    } else {
        throw "Không tìm thấy Python và không có winget để tự cài. Cài Python 3.10+ từ https://www.python.org/downloads/ và chọn Add to PATH."
    }
}

$venvPy = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
    Write-Host "Tạo .venv..." -ForegroundColor Yellow
    if ($py -eq "py") {
        & py -3 -m venv (Join-Path $Root ".venv")
    } else {
        & python -m venv (Join-Path $Root ".venv")
    }
}

Write-Host "pip install -r requirements.txt (có thể mất vài phút)..." -ForegroundColor Yellow
& $venvPy -m pip install --upgrade pip wheel
& $venvPy -m pip install -r (Join-Path $Root "requirements.txt")

if (-not $SkipDesktopNpm) {
    $desktop = Join-Path $Root "desktop"
    if (-not (Test-Path (Join-Path $desktop "package.json"))) {
        throw "Không tìm thấy desktop/package.json"
    }
    Write-Host "npm install trong desktop/..." -ForegroundColor Yellow
    Push-Location $desktop
    try {
        if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
            throw "Cần Node.js 20+ (npm). Tải tại https://nodejs.org/"
        }
        npm install
        if ($BuildTauriRelease) {
            if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
                Write-Warning "Không có cargo trên PATH — bỏ qua build Tauri. Cài Rust: https://rustup.rs/"
            } else {
                npm run build
                npm run tauri:build
            }
        }
    } finally {
        Pop-Location
    }
}

if ($AddShortcuts) {
    $exeRelease = Join-Path $Root "desktop\src-tauri\target\release\mi-lam-van-phong.exe"
    $wsh = New-Object -ComObject WScript.Shell
    $programs = [Environment]::GetFolderPath("Programs")
    $lnkPath = Join-Path $programs "Mì Làm Văn Phòng.lnk"
    $s = $wsh.CreateShortcut($lnkPath)
    if (Test-Path $exeRelease) {
        $s.TargetPath = $exeRelease
        $s.WorkingDirectory = $Root
    } else {
        $s.TargetPath = "cmd.exe"
        $s.Arguments = "/c cd /d `"$Root\desktop`" && npm run tauri:dev"
        $s.WorkingDirectory = (Join-Path $Root "desktop")
    }
    $s.Save()
    Write-Host "Đã tạo shortcut: $lnkPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "Xong. Mở app:" -ForegroundColor Green
Write-Host "  cd desktop && npm run tauri:dev" -ForegroundColor White
if (Test-Path (Join-Path $Root "desktop\src-tauri\target\release\mi-lam-van-phong.exe")) {
    Write-Host "hoặc chạy: desktop\src-tauri\target\release\mi-lam-van-phong.exe" -ForegroundColor White
}
Write-Host ""
