<div align="center">

# Mì Làm Văn Phòng

**Trợ lý AI cho công sở Việt Nam.**

<img src="assets/mi-lam-van-phong-banner.png" alt="Mì Làm Văn Phòng" width="640" />

</div>

Một hệ thống multi-agent open-source được tinh chỉnh đặc biệt cho **công việc văn phòng tại Việt Nam**: soạn thảo văn bản hành chính theo `Nghị định 30/2020/NĐ-CP`, báo cáo doanh thu KPI bằng VND, lập slide thuyết trình, phân tích dữ liệu Excel, và phối hợp công việc qua Zalo/Outlook/Teams — tất cả từ một câu lệnh trong terminal.

> Xây dựng trên [Agency Swarm](https://github.com/VRSEN/agency-swarm) — framework chạy thật trong các AI agency.

---

## Vì sao "Mì Làm Văn Phòng"?

Thay vì một AI cố làm tất cả mọi việc một cách hời hợt, bạn có một **đội ngũ chuyên viên AI** phối hợp dưới một Trưởng phòng Điều phối — đúng như cách văn phòng Việt Nam vận hành.

### Ví dụ thực tế cho công việc văn phòng VN

Dán các câu lệnh sau vào terminal và xem kết quả:

- **"Soạn công văn đề nghị phê duyệt ngân sách Q2/2026 và slide trình bày 10 trang đi kèm."** → Công văn DOCX đúng thể thức NĐ 30/2020 + deck PPTX bằng tiếng Việt.
- **"Phân tích doanh thu Quý 1 từ file Excel và làm slide báo cáo cho ban giám đốc."** → Biểu đồ doanh thu (VND), insight, và slide tổng kết.
- **"Soạn tờ trình mua thiết bị 350 triệu đồng và biên bản họp giao ban tuần này."** → Tờ trình + biên bản đúng định dạng văn thư VN.
- **"Tổng hợp Nghị định 30/2020 và soạn checklist văn thư cho phòng Hành Chính."** → Báo cáo nghiên cứu + checklist DOCX.
- **"Tạo banner Tết Nguyên Đán 2027 và video quảng cáo 15 giây cho fanpage công ty."** → Hình ảnh + video có chữ tiếng Việt đúng dấu.

Kết nối thêm 10.000+ dịch vụ ngoài qua [Composio](https://composio.dev) (Gmail, Outlook, Zalo qua webhook, Microsoft Teams, Notion, MISA…).

---

## Đội ngũ AI của bạn

| Agent (code) | Vai trò Việt | Nhiệm vụ |
|---|---|---|
| **Orchestrator** | Trưởng phòng Điều phối | Tiếp nhận yêu cầu và phân công cho specialist phù hợp. Không tự thực thi task, chỉ điều phối. |
| **General Agent** | Thư ký Văn phòng | Email, lịch họp, Zalo/Teams/Outlook, MISA, kết nối 10.000+ hệ thống ngoài qua Composio. |
| **Deep Research Agent** | Chuyên viên Nghiên cứu | Nghiên cứu thị trường, đối thủ, văn bản pháp luật (vbpl.vn, GSO, CafeF, VnEconomy) có dẫn nguồn. |
| **Data Analyst** | Chuyên viên Phân tích Dữ liệu | Phân tích doanh thu, KPI, dashboard, biểu đồ tiếng Việt có dấu, định dạng VND. |
| **Slides Agent** | Chuyên viên Trình chiếu | Slide thuyết trình HTML chuyên nghiệp, xuất `.pptx`, font hỗ trợ tiếng Việt. |
| **Docs Agent** | Chuyên viên Văn bản | Công văn, tờ trình, biên bản, quyết định, hợp đồng, báo cáo theo `NĐ 30/2020/NĐ-CP`. Xuất DOCX/PDF. |
| **Image Agent** | Chuyên viên Hình ảnh | Tạo và chỉnh sửa banner, poster, ảnh sản phẩm; nhận biết bối cảnh văn hóa VN (Tết, lễ hội, áo dài...). |
| **Video Agent** | Chuyên viên Video | Tạo video quảng cáo, video nội bộ, đào tạo — phụ đề tiếng Việt có dấu, voiceover ba miền. |

---

## Cài đặt nhanh trong 30 giây

**Khuyến nghị cho hầu hết người dùng — Native Desktop App (Windows / macOS / Linux):**

```bash
git clone https://github.com/VRSEN/openswarm.git
cd openswarm
pip install -r requirements.txt        # backend Python
npm run desktop:install                 # frontend Tauri + React
npm run desktop:dev                     # mở app native
```

App sẽ tự khởi động backend Python, mở wizard cấu hình API key trong cửa sổ Settings ngay lần chạy đầu, và lưu vào `.env`.

**Yêu cầu:** Python 3.10+, Node.js 20+, [Rust toolchain](https://www.rust-lang.org/tools/install) (cần thiết để build Tauri). Lần build đầu mất 3-5 phút để compile Rust dependencies.

**Build file cài đặt Windows (Inno Setup, khuyến nghị phát hành):**

1. Cài [Inno Setup 6](https://jrsoftware.org/isinfo.php) (có `ISCC.exe`).
2. Trong thư mục gốc repo:

```bash
npm run installer:win:build
```

File `MiLamVanPhong-Setup-0.1.0-x64.exe` nằm trong `dist/installer/`.

### Phát hành (push `.exe` lên GitHub Releases)

Bạn có 2 cách phổ biến. Cách A dùng GitHub CLI (`gh`) nhanh và chuẩn cho maintainer.

**A) Dùng GitHub CLI (khuyến nghị)**

```bash
# 1) (tuỳ chọn nhưng nên có) tạo tag version
git tag v0.1.0
git push origin v0.1.0

# 2) tạo GitHub Release và upload installer .exe
gh release create v0.1.0 "dist/installer/MiLamVanPhong-Setup-0.1.0-x64.exe" ^
  --title "Mì Làm Văn Phòng v0.1.0" ^
  --notes "Windows installer (Inno Setup)."
```

Nếu repo private hoặc máy mới, đăng nhập một lần:

```bash
gh auth login
```

**B) Dùng web UI của GitHub**

- Vào tab **Releases** → **Draft a new release**
- Chọn tag `v0.1.0` (hoặc tạo tag mới)
- Kéo-thả file `dist/installer/MiLamVanPhong-Setup-0.1.0-x64.exe` vào phần **Attach binaries**
- Publish release

### Installer đang hoạt động thế nào (tóm tắt kỹ thuật)

- **`npm run installer:win:build`** gọi `scripts/installer/Build-WindowsInstaller.ps1`.
- Script này tạo một thư mục **staging** ở `%TEMP%\MiLamVanPhong-installer-staging`, rồi `robocopy` codebase vào staging (loại trừ `.git`, `node_modules`, `target`,…).
- Sau đó build app desktop:
  - `desktop/`: `npm install` → `npm run build` (Vite) → `npm run tauri:build` (Rust/Tauri)
  - Copy `mi-lam-van-phong.exe` và các `.dll` từ `desktop/src-tauri/target/release/` sang staging.
- Cuối cùng chạy **Inno Setup** (`ISCC.exe`) với file `scripts/installer/MiLamVanPhong.iss` để đóng gói ra file `.exe` trong `dist/installer/`.
- Trong wizard Inno Setup có task **“Tạo venv và chạy pip install”**:
  - Nếu user tick, installer sẽ chạy `scripts/installer/post-install-python.bat` (trong thư mục cài đặt) để tạo `.venv` và `pip install -r requirements.txt`.
  - Nếu máy chưa có Python, script sẽ tự thử cài **Python bản mới nhất 3.x** qua `winget`, rồi mới tạo `.venv` và chạy `pip install`.
  - Nếu PowerShell/CMD phiên hiện tại chưa nhận PATH sau khi cài, chỉ cần mở lại installer/app hoặc mở terminal mới rồi chạy lại `post-install-python.bat`.

Người dùng chạy installer `.exe`; wizard có tùy chọn tạo `.venv` và `pip install -r requirements.txt` (cần Python 3.10+ và Internet).

Chi tiết: [scripts/installer/README.md](scripts/installer/README.md).

**Hoặc chỉ build gói Tauri (không có wizard Inno):**

```bash
npm run desktop:build
```

File NSIS/MSI sinh ra trong `desktop/src-tauri/target/release/bundle/`.

**Cài nhanh từ mã nguồn (không đóng gói):** double-click `Cai-dat.bat` hoặc `npm run installer:win:source`.

---

**Hoặc CLI gọn nhẹ qua npm** (cho dev hoặc CI):

```bash
npm install -g @vrsen/openswarm
openswarm
```

Wizard sẽ tự lo: xác thực, dependencies, và cấu hình. Yêu cầu Node.js 20+ (Python 3.10+ tự động cài).

## Tự build swarm văn phòng riêng của bạn

Fork repo này và tạo đội ngũ AI riêng cho doanh nghiệp:

```bash
git clone https://github.com/VRSEN/openswarm.git
cd openswarm
```

Sau đó nói với **Claude Code**, **Cursor**, hoặc **Codex**:

> _"Tinh chỉnh swarm này cho doanh nghiệp xuất nhập khẩu Việt Nam của tôi"_
> _"Thêm agent chuyên về kế toán MISA và báo cáo thuế"_

Coding agent sẽ tự động customize tất cả agent cho use case của bạn.

**Các swarm phổ biến đã tinh chỉnh từ template này:**

- **Văn phòng Hành Chính:** soạn công văn + biên bản + báo cáo + email nội bộ
- **Phòng Kinh Doanh:** phân tích sales + tờ trình duyệt giá + slide khách hàng
- **Phòng Marketing:** banner Tết + video quảng cáo + báo cáo hiệu quả chiến dịch
- **Phòng Tài Chính:** báo cáo doanh thu VND + dashboard KPI + tờ trình ngân sách

---

## API Keys & Cấu hình

Wizard sẽ hướng dẫn từng bước. Bạn cần ít nhất **một** trong các key sau:

**Bắt buộc (chọn một):**

- `OPENAI_API_KEY` — cho GPT 5.5 và Sora video.
- `ANTHROPIC_API_KEY` — cho Claude.

**Tùy chọn để mở khóa thêm sức mạnh:**

- `COMPOSIO_API_KEY` — kết nối 10.000+ tích hợp (Gmail, Outlook, Slack, Notion…).
- `GOOGLE_API_KEY` — Gemini (hình ảnh, có khả năng giữ chữ tiếng Việt tốt) + Veo (video).
- `FAL_KEY` — chỉnh sửa video nâng cao và hiệu ứng.
- `SEARCH_API_KEY` — search web cho Chuyên viên Nghiên cứu.

Tools tự động giảm cấp khi thiếu key, kèm hướng dẫn rõ ràng cần bổ sung gì.

---

## Đặc điểm tinh chỉnh cho VN

- **Tiếng Việt có dấu UTF-8** là ngôn ngữ làm việc mặc định cho mọi agent.
- **Văn bản hành chính theo NĐ 30/2020/NĐ-CP**: 9 yếu tố thể thức, mẫu HTML/CSS sẵn sàng, đặt tên file không dấu, ký hiệu văn bản chuẩn (CV, TTr, BC, QĐ, TB, KH, BB, HĐ).
- **Định dạng VN**: tiền VND `1.250.000 ₫`, ngày `dd/mm/yyyy`, giờ 24h, múi giờ `Asia/Ho_Chi_Minh`, dấu phẩy thập phân, dấu chấm phân tách hàng nghìn.
- **Nguồn nghiên cứu ưu tiên VN**: vbpl.vn, GSO, SBV, HOSE, CafeF, VnEconomy, VnExpress Kinh Doanh.
- **Tránh dấu gạch ngang dài "—"** trong câu trả lời tiếng Việt — chuẩn của công sở VN.
- **Lịch tự động né các ngày lễ Việt Nam**: Tết Dương lịch, Tết Nguyên Đán, Giỗ Tổ Hùng Vương, 30/4, 1/5, 2/9.
- **Hỗ trợ hệ thống nội địa**: MISA AMIS, Base.vn, Lark, Zalo OA (qua webhook), VNPT-CA / Viettel-CA cho ký số.

---
## Dành cho dev

**Chạy native desktop app (khuyến nghị):**

```bash
pip install -r requirements.txt
npm run desktop:install
npm run desktop:dev
```

Tauri sẽ spawn `python server.py` làm sidecar, đợi `/desktop/health` trả `200`, rồi mở cửa sổ React. Sửa file trong `desktop/src/` sẽ hot-reload, sửa Python sẽ áp dụng sau khi bạn bấm "Khởi động lại" ở thanh tiêu đề.

**Chỉ chạy backend (không UI native):**

```bash
python server.py           # FastAPI ở localhost:8080
# hoặc
python swarm.py            # giao diện terminal cũ
```

**Cấu trúc:**

- `desktop/`           — frontend Tauri + React (Vite + TypeScript).
- `desktop/src-tauri/` — vỏ Rust spawn Python sidecar.
- `server.py`         — FastAPI: agency endpoints + `/desktop/*` (env, files).
- `swarm.py`          — `create_agency()` và CLI fallback.

**Triển khai Docker:**

```bash
git clone https://github.com/VRSEN/openswarm.git
cd openswarm
cp .env.example .env        # thêm API keys của bạn
docker-compose up --build
```

---

## Tài liệu thêm

- **Multi-agent framework:** [Agency Swarm](https://github.com/VRSEN/agency-swarm)
- **Tích hợp ngoài:** [Composio](https://composio.dev)
- **Văn bản pháp luật VN:** [vbpl.vn](https://vbpl.vn), [thuvienphapluat.vn](https://thuvienphapluat.vn)

---

## License

MIT — xem [LICENSE](LICENSE).

**Mì Làm Văn Phòng** — tinh chỉnh từ [OpenSwarm](https://github.com/VRSEN/openswarm) bởi đội ngũ Agency Swarm, dành cho công sở Việt Nam.
