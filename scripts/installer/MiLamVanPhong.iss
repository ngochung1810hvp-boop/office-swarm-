; Mì Làm Văn Phòng — Inno Setup 6 script
; Build: powershell -ExecutionPolicy Bypass -File scripts/installer/Build-WindowsInstaller.ps1
; Thủ công: ISCC.exe MiLamVanPhong.iss /DStagingPath="C:\full\path\to\staging" /O"C:\out"

#define MyAppName "Mì Làm Văn Phòng"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "Agency Swarm"
#define MyAppURL "https://github.com/VRSEN/openswarm"
#define MyAppExeName "mi-lam-van-phong.exe"
#ifndef StagingPath
  #define StagingPath "dist\windows-installer-staging"
#endif

[Setup]
AppId={{9F2E8B1C-3D4A-5E6F-A7B8-C9D0E1F2A3B4}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf64}\MiLamVanPhong
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=dist\installer
OutputBaseFilename=MiLamVanPhong-Setup-{#MyAppVersion}-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Tạo biểu tượng trên Desktop"; GroupDescription: "Tùy chọn:"; Flags: unchecked
Name: "pythondeps"; Description: "Tạo venv và chạy pip install (cần Python 3.10+ và Internet, 5–15 phút)"; GroupDescription: "Thư viện Python:"; Flags: checkedonce

[Files]
Source: "{#StagingPath}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\desktop\src-tauri\target\release\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\desktop\src-tauri\target\release\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{cmd}"; Parameters: "/c ""{app}\scripts\installer\post-install-python.bat"""; StatusMsg: "Đang cài thư viện Python (pip)..."; Flags: waituntilterminated; Tasks: pythondeps
Filename: "{app}\desktop\src-tauri\target\release\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\.venv"
