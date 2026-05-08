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
    [switch]$SkipBuild,
    [switch]$AutoInstallInno,
    [string]$AppVersion = ""
)

$ErrorActionPreference = "Stop"

# Tauri/Cargo may place the .exe in target\release\ or target\<triple>\release\; the
# base name is usually the Cargo package name (mi-lam-van-phong) or its underscore form.
function Get-TauriReleaseArtifactDir {
    param([string]$SrcTauriRoot)
    # Prefer per-target output first (common when rust-cache / CI uses an explicit triple).
    $candidates = @(
        (Join-Path $SrcTauriRoot "target\x86_64-pc-windows-msvc\release")
        (Join-Path $SrcTauriRoot "target\aarch64-pc-windows-msvc\release")
        (Join-Path $SrcTauriRoot "target\release")
    )
    foreach ($dir in $candidates) {
        if (-not (Test-Path $dir)) { continue }
        $names = @("mi-lam-van-phong.exe", "mi_lam_van_phong.exe")
        foreach ($n in $names) {
            $p = Join-Path $dir $n
            if (Test-Path $p) { return $dir }
        }
    }
    foreach ($dir in $candidates) {
        if (-not (Test-Path $dir)) { continue }
        $exes = @(Get-ChildItem $dir -File -Filter "*.exe" -ErrorAction SilentlyContinue)
        $main = $exes | Where-Object { $_.Name -match '^(mi-lam-van-phong|mi_lam_van_phong)\.exe$' }
        if ($main) { return $dir }
        if ($exes.Count -eq 1) { return $dir }
    }
    return $null
}

function Find-InnoCompiler {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\Inno Setup 6\ISCC.exe"),
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

function Ensure-InnoCompiler {
    param([string]$RequestedPath, [switch]$AutoInstall)

    if ($RequestedPath -and (Test-Path $RequestedPath)) { return $RequestedPath }
    $found = Find-InnoCompiler
    if ($found) { return $found }

    if (-not $AutoInstall) { return $null }

    Write-Host "Không tìm thấy Inno Setup (ISCC.exe). Đang thử cài tự động..." -ForegroundColor Yellow

    $choco = Get-Command choco -ErrorAction SilentlyContinue
    if ($choco) {
        & choco install innosetup --no-progress --yes | Out-Host
        $found = Find-InnoCompiler
        if ($found) { return $found }
    }

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        # winget IDs can change; this is best-effort.
        & winget install --id JRSoftware.InnoSetup --exact --silent --accept-package-agreements --accept-source-agreements | Out-Host
        $found = Find-InnoCompiler
        if ($found) { return $found }
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
    # Ensure Cargo is available when Rust was installed via rustup (common: ~/.cargo/bin not on PATH in some shells)
    $cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
    if (Test-Path $cargoBin) { $env:Path = "$cargoBin;$env:Path" }
    npm install
    npm run build
    # We only need the compiled .exe for the Inno installer; skip MSI/NSIS bundling (WiX light.exe can fail on some setups)
    npm run tauri:build -- --no-bundle
    Pop-Location

    $srcTauri = Join-Path $RepoRoot "desktop\src-tauri"
    $rel = Get-TauriReleaseArtifactDir -SrcTauriRoot $srcTauri
    if (-not $rel) {
        $targetRoot = Join-Path $srcTauri "target"
        $found = if (Test-Path $targetRoot) {
            Get-ChildItem $targetRoot -Recurse -File -Filter "*.exe" -ErrorAction SilentlyContinue |
                Where-Object { $_.FullName -notmatch '\\deps\\' -and $_.FullName -notmatch '\\incremental\\' } |
                ForEach-Object FullName
        } else { @() }
        throw "Không tìm thấy thư mục release Tauri (target\\release hoặc target\\*-pc-windows-msvc\\release). " +
            "Các file .exe tìm được: $(if ($found) { $found -join '; ' } else { '(không có)' })"
    }

    $names = @("mi-lam-van-phong.exe", "mi_lam_van_phong.exe")
    $exeSrc = $null
    foreach ($n in $names) {
        $p = Join-Path $rel $n
        if (Test-Path $p) { $exeSrc = $p; break }
    }
    if (-not $exeSrc) {
        $exes = @(Get-ChildItem $rel -File -Filter "*.exe" -ErrorAction SilentlyContinue)
        $match = $exes | Where-Object { $_.Name -match 'mi[-_]lam' } | Select-Object -First 1
        if ($match) {
            $exeSrc = $match.FullName
        } elseif ($exes.Count -eq 1) {
            $exeSrc = $exes[0].FullName
        } else {
            $list = ($exes | ForEach-Object Name) -join ', '
            throw "Không xác định được binary Tauri trong $rel . Các .exe: $list"
        }
    }

    # Keep the installer payload small: copy only the runnable exe (+ adjacent dlls) to a dedicated folder.
    # (Never ship the full Cargo target/ directory; it adds hundreds of MB and slows CI dramatically.)
    $destRel = Join-Path $Staging "desktop\app"
    New-Item -ItemType Directory -Path $destRel -Force | Out-Null
    Copy-Item $exeSrc (Join-Path $destRel "mi-lam-van-phong.exe") -Force
    Get-ChildItem $rel -Filter "*.dll" -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item $_.FullName $destRel -Force
    }
}

$iss = Join-Path $PSScriptRoot "MiLamVanPhong.iss"
if (-not (Test-Path $iss)) { throw "Missing $iss" }

$auto = $AutoInstallInno
if (-not $auto) {
    # Auto-install by default on CI runners; keep local runs conservative unless explicitly requested.
    if ($env:CI -or $env:GITHUB_ACTIONS) { $auto = $true }
}

$iscc = Ensure-InnoCompiler -RequestedPath $InnoPath -AutoInstall:$auto
if (-not $iscc -or -not (Test-Path $iscc)) {
    throw "Không tìm thấy Inno Setup (ISCC.exe). Cài từ https://jrsoftware.org/isinfo.php, hoặc chạy script với -AutoInstallInno, hoặc truyền -InnoPath."
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
Write-Host "=== 4/4 Inno Setup ===" -ForegroundColor Cyan
Write-Host "ISCC: $iscc"
Write-Host "Staging: $Staging"
Write-Host "Output: $OutDir"

$effectiveVersion = $AppVersion
if ($effectiveVersion -and $effectiveVersion -match '^v\\d') { $effectiveVersion = $effectiveVersion.TrimStart('v') }
if (-not $effectiveVersion) {
    $ref = $env:GITHUB_REF_NAME
    if ($ref -and $ref -match '^v\d') { $effectiveVersion = $ref.TrimStart('v') }
}

if ($effectiveVersion) {
    & $iscc $iss /DStagingPath="$Staging" /DMyAppVersion="$effectiveVersion" /O"$OutDir"
} else {
    & $iscc $iss /DStagingPath="$Staging" /O"$OutDir"
}

Write-Host ""
Write-Host "Xong. File cài đặt nằm trong: $OutDir" -ForegroundColor Green
Write-Host ""
