#Requires -Version 5.1
<#
.SYNOPSIS
  Đóng gói Windows installer (.exe) bằng Inno Setup.
  Tự: robocopy staging, build frontend + Tauri release, chạy ISCC.exe.

.PREREQUISITES
  - Python 3.10+ (để test pip, không bắt buộc cho build)
  - Node.js 20+, npm
  - Rust + Visual Studio Build Tools (Windows)
  - Inno Setup 6+: https://jrsoftware.org/isinfo.php (ISCC.exe trên PATH hoặc chỉ định -InnoPath)

.PARAMETER InnoPath
  Đường dẫn đầy đủ tới ISCC.exe, ví dụ: "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
#>
[CmdletBinding()]
param(
    [string]$InnoPath = "",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Find-InnoCompiler {
    $candidates = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

$Staging = Join-Path $env:TEMP "MiLamVanPhong-installer-staging"
$OutDir = Join-Path $RepoRoot "dist\installer"

if ($SkipBuild) {
    if (-not (Test-Path $Staging)) {
        throw "Không tìm thấy thư mục staging $Staging . Hãy chạy script một lần không có -SkipBuild để tạo staging và build Tauri."
    }
    if (-not (Test-Path (Join-Path $Staging "server.py"))) {
        throw "Staging không hợp lệ (thiếu server.py)."
    }
}

if (-not $SkipBuild) {
    Write-Host "=== 1/4 Dọn staging ===" -ForegroundColor Cyan
    if (Test-Path $Staging) { Remove-Item $Staging -Recurse -Force }
    New-Item -ItemType Directory -Path $Staging -Force | Out-Null

    $log = Join-Path $env:TEMP "milam-robocopy.log"
    $rc = robocopy $RepoRoot $Staging /MIR /NFL /NDL /NJH /NJS /XD ".git" "node_modules" ".venv" "dist" "desktop\node_modules" "desktop\dist" "desktop\src-tauri\target" ".cursor" ".agency_swarm_chats" "activity-logs" "__pycache__" ".github" /XF "Thumbs.db"
    if ($rc -ge 8) {
        throw "robocopy failed with exit $rc"
    }

    Write-Host "=== 2/4 npm install + vite build + tauri build ===" -ForegroundColor Cyan
    Push-Location (Join-Path $RepoRoot "desktop")
    npm install
    npm run build
    npm run tauri:build
    Pop-Location

    $rel = Join-Path $RepoRoot "desktop\src-tauri\target\release"
    $destRel = Join-Path $Staging "desktop\src-tauri\target\release"
    New-Item -ItemType Directory -Path $destRel -Force | Out-Null
    Copy-Item (Join-Path $rel "mi-lam-van-phong.exe") $destRel -Force
    Get-ChildItem $rel -Filter "*.dll" -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item $_.FullName $destRel -Force
    }
}

$iss = Join-Path $PSScriptRoot "MiLamVanPhong.iss"
if (-not (Test-Path $iss)) { throw "Missing $iss" }

$iscc = $InnoPath
if (-not $iscc) { $iscc = Find-InnoCompiler }
if (-not $iscc -or -not (Test-Path $iscc)) {
    throw "Không tìm thấy Inno Setup (ISCC.exe). Cài từ https://jrsoftware.org/isinfo.php hoặc truyền -InnoPath."
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
Write-Host "=== 4/4 Inno Setup ===" -ForegroundColor Cyan
Write-Host "ISCC: $iscc"
Write-Host "Staging: $Staging"
Write-Host "Output: $OutDir"

& $iscc $iss /DStagingPath="$Staging" /O"$OutDir"

Write-Host ""
Write-Host "Xong. File cài đặt nằm trong: $OutDir" -ForegroundColor Green
Write-Host ""
