# Mì Làm Văn Phòng — Customization Guide

Tài liệu này cung cấp cho coding agent (Cursor, Claude Code, Codex…) mọi thứ cần để hiểu và tùy chỉnh hệ thống. **Đọc file này trước khi sửa bất kỳ thứ gì.**

---

## Mì Làm Văn Phòng là gì?

**Mì Làm Văn Phòng** là một đội ngũ AI đa tác tử (multi-agent) đã được tinh chỉnh đặc biệt cho công việc văn phòng tại Việt Nam. Hệ thống được fork và tùy biến tiếp cho bất kỳ phòng ban nào: Hành chính, Kinh doanh, Marketing, Tài chính, Kế toán, Nhân sự, hoặc CSKH. Mỗi agent là một chuyên viên. Tất cả cộng tác qua một Trưởng phòng Điều phối (Orchestrator).

**Tinh chỉnh đặc thù VN bao gồm:**

- Tiếng Việt có dấu UTF-8 là ngôn ngữ mặc định cho mọi agent.
- Văn bản hành chính theo `Nghị định 30/2020/NĐ-CP` (công văn, tờ trình, biên bản, quyết định, báo cáo, hợp đồng).
- Định dạng VN: VND, `dd/mm/yyyy`, giờ 24h, múi giờ `Asia/Ho_Chi_Minh`.
- Nguồn nghiên cứu ưu tiên VN: vbpl.vn, GSO, SBV, CafeF, VnEconomy.
- Tránh dấu gạch ngang dài "—" trong câu trả lời tiếng Việt.
- Hỗ trợ Zalo, MISA, Base.vn, Lark, Microsoft Teams, Outlook, Gmail.

---

## Cấu trúc thư mục

```
swarm.py                  ← config chính: import tất cả agent, định nghĩa luồng giao tiếp
shared_instructions.md    ← context chung cho mọi agent (tiếng Việt, NĐ 30/2020, định dạng VN)
server.py                 ← API entry point (FastAPI)

orchestrator/             ← Trưởng phòng Điều phối
  orchestrator.py
  instructions.md

virtual_assistant/        ← Thư ký Văn phòng (General Agent)
  virtual_assistant.py
  instructions.md
  tools/

deep_research/            ← Chuyên viên Nghiên cứu (nguồn VN ưu tiên)
  deep_research.py
  instructions.md
  tools/

data_analyst_agent/       ← Chuyên viên Phân tích Dữ liệu (VND, KPI VN)
  data_analyst_agent.py
  instructions.md
  tools/

docs_agent/               ← Chuyên viên Văn bản (NĐ 30/2020)
  docs_agent.py
  instructions.md
  tools/

slides_agent/             ← Chuyên viên Trình chiếu (font hỗ trợ tiếng Việt)
  slides_agent.py
  instructions.md
  tools/

image_generation_agent/   ← Chuyên viên Hình ảnh (bối cảnh văn hóa VN)
  image_generation_agent.py
  instructions.md
  tools/

video_generation_agent/   ← Chuyên viên Video (phụ đề tiếng Việt)
  video_generation_agent.py
  instructions.md
  tools/

shared_tools/             ← tools dùng chung (Composio, CopyFile…)
```

---

## Cách các agent kết nối (`swarm.py`)

`swarm.py` là **file duy nhất** bạn cần sửa khi thêm/xóa/đổi luồng agent. Nó:

1. Import factory function `create_*` từ mỗi thư mục agent.
2. Khởi tạo tất cả agent.
3. Định nghĩa communication flows — ai có thể giao tiếp với ai.

Pattern mặc định: **orchestrator-to-all** — Trưởng phòng Điều phối có thể gửi tin nhắn đến mọi specialist, và tất cả agent có thể handoff cho nhau.

---

## Cách tùy chỉnh

Để xây swarm phòng ban riêng từ template này:

1. **Fork và đổi tên repo** (vd: `swarm-phong-ke-toan`, `swarm-marketing-vn`).
2. **Quyết định giữ/đổi tên/thay agent nào**:
   - Đổi tên thư mục và file để phù hợp mục đích mới.
   - Cập nhật `instructions.md` với system prompt mới (giữ tiếng Việt + NĐ 30/2020 nếu vẫn là agent văn bản).
   - Cập nhật `swarm.py` để import và đăng ký agent mới.
3. **Thêm/bớt tools** trong thư mục `tools/` của mỗi agent.
4. **Cập nhật `shared_instructions.md`** với context mọi agent cần biết.
5. **Chạy** với `python swarm.py`.

### Ví dụ prompt cho coding agent

> "Tinh chỉnh thành swarm cho phòng Kế toán doanh nghiệp Việt Nam. Chuyên viên Văn bản trở thành chuyên gia hóa đơn điện tử (MeInvoice, Viettel SInvoice), Chuyên viên Phân tích Dữ liệu trở thành chuyên gia báo cáo thuế VAT/TNDN, Chuyên viên Nghiên cứu chuyên về Thông tư mới của Tổng cục Thuế. Giữ Trưởng phòng Điều phối và shared tools."

Coding agent sẽ đọc file này, hiểu cấu trúc, và tự sửa đổi.

---

## Roster Agent hiện tại (Mì Làm Văn Phòng)

| Agent (code) | Vai trò Việt | Mục đích |
|---|---|---|
| `orchestrator` | Trưởng phòng Điều phối | Định tuyến yêu cầu cho specialist phù hợp, không tự thực thi |
| `virtual_assistant` | Thư ký Văn phòng | Email, lịch, Zalo/Teams, MISA, hành chính |
| `deep_research` | Chuyên viên Nghiên cứu | Tra cứu pháp luật, thị trường, đối thủ; ưu tiên nguồn VN |
| `data_analyst_agent` | Chuyên viên Phân tích Dữ liệu | Doanh thu VND, KPI, dashboard, biểu đồ tiếng Việt |
| `docs_agent` | Chuyên viên Văn bản | Công văn, tờ trình, biên bản, quyết định, hợp đồng theo NĐ 30/2020 |
| `slides_agent` | Chuyên viên Trình chiếu | Slide PowerPoint/HTML có font hỗ trợ tiếng Việt |
| `image_generation_agent` | Chuyên viên Hình ảnh | Banner, poster, ảnh sản phẩm; nhận biết văn hóa VN |
| `video_generation_agent` | Chuyên viên Video | Video quảng cáo/nội bộ với phụ đề tiếng Việt |

---

## Quy ước quan trọng

- Mỗi agent có một file `<name>.py` và một file `instructions.md`.
- `instructions.md` là system prompt — sửa file này để thay đổi hành vi.
- Tools nằm trong thư mục `tools/` và được auto-load bởi định nghĩa agent.
- `shared_tools/` chứa các tích hợp Composio (Gmail, Slack, GitHub…) dùng chung.
- Models cấu hình qua `DEFAULT_MODEL` trong `.env` — không hardcode.
- **Tất cả output cuối cùng cho người dùng phải bằng tiếng Việt có dấu, UTF-8.**
- Đặt tên file đầu ra **không dấu, dùng gạch dưới** (vd: `cv_so_12_phe_duyet_ngan_sach_q2_2026.docx`).

Trước khi tạo agent, đọc kỹ:

- `.cursor/rules/agency-swarm-workflow.mdc` — hướng dẫn chính cho việc tạo agent và agency.

Các file đọc theo nhu cầu tùy task:

- `.cursor/commands/add-mcp.md` — cách thêm MCP server vào agent.
- `.cursor/commands/mcp-code-exec.md` — chuyển MCP server sang Code Execution Pattern (giảm 98% token).
- `.cursor/commands/write-instructions.md` — cách viết instructions hiệu quả.
- `.cursor/commands/create-prd.md` — cách tạo PRD cho agent (dùng cho hệ multi-agent phức tạp).
