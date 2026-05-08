# Cài đặt Mì Làm Văn Phòng (Windows)

Có hai cách chính:

## 1. Người dùng cuối: file `MiLamVanPhong-Setup-0.1.0-x64.exe`

Tải bản `.exe` từ mục **Releases** trên GitHub của dự án (khi maintainers đã upload file build).

1. Chạy installer với quyền Administrator (mặc định thư mục: `C:\Program Files\MiLamVanPhong`).
2. Giữ tích **« Tạo venv và chạy pip install »** (cần Internet, 5–15 phút).
   - Nếu máy **chưa có Python**, installer sẽ tự thử cài **Python bản mới nhất 3.x** qua `winget`.
3. Nếu bước pip install thất bại, bạn có thể chạy lại:
   `C:\Program Files\MiLamVanPhong\scripts\installer\post-install-python.bat`  
   Script sẽ tự kiểm tra/cài Python (qua `winget`) rồi tạo `.venv` và cài dependencies.

Shortcut **Start Menu** trỏ tới `mi-lam-van-phong.exe`; backend chạy từ `server.py` trong cùng bản cài.

## 2. Từ mã nguồn / dev

Trong thư mục gốc repo:

```powershell
.\scripts\installer\Install-FromSource.ps1
```

Hoặc double-click **`Cai-dat.bat`** ở thư mục gốc (tương đương lệnh trên).

Tùy chọn:

```powershell
.\scripts\installer\Install-FromSource.ps1 -BuildTauriRelease -AddShortcuts
```

## 3. Maintainer: đóng gôi installer (.exe)

Yêu cầu: Node.js 20+, Rust, Visual Studio Build Tools, [Inno Setup 6](https://jrsoftware.org/isinfo.php).

```powershell
.\scripts\installer\Build-WindowsInstaller.ps1
```

File sinh ra: `dist\installer\MiLamVanPhong-Setup-0.1.0-x64.exe`.

Chỉ chạy Inno (đã có staging sẵn trong `%TEMP%` từ lần build trước):

```powershell
.\scripts\installer\Build-WindowsInstaller.ps1 -SkipBuild
```

Nếu `ISCC.exe` không trong PATH:

```powershell
.\scripts\installer\Build-WindowsInstaller.ps1 -InnoPath "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
```
