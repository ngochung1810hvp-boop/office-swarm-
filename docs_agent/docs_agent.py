from datetime import datetime, timezone
from pathlib import Path

from agency_swarm import Agent, ModelSettings, Agency
from agency_swarm.tools import IPythonInterpreter, WebSearchTool
from openai.types.shared import Reasoning
from shared_tools import CopyFile

from config import get_default_model, is_openai_provider

_INSTRUCTIONS_PATH = Path(__file__).parent / "instructions.md"


def _list_existing_projects() -> str:
    from .tools.utils.doc_file_utils import get_mnt_dir
    base = get_mnt_dir()
    if not base.exists():
        return "(none)"
    dirs = sorted(d.name for d in base.iterdir() if d.is_dir())
    return "\n".join(f"  - {d}" for d in dirs) if dirs else "(none)"


def _build_instructions() -> str:
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    body = _INSTRUCTIONS_PATH.read_text(encoding="utf-8")
    projects_block = _list_existing_projects()
    return (
        f"{body}\n\n"
        f"Current date/time (UTC): {now_utc}\n\n"
        f"Existing project folders (do NOT reuse these names for a new document project):\n{projects_block}"
    )


def create_docs_agent() -> Agent:
    return Agent(
        name="Docs Agent",
        description="Chuyên viên Văn bản — soạn công văn, tờ trình, biên bản, quyết định, báo cáo, hợp đồng theo NĐ 30/2020/NĐ-CP và xuất ra DOCX/PDF/Markdown/TXT.",
        instructions=_build_instructions(),
        files_folder="./files",
        tools_folder="./tools",
        model=get_default_model(),
        model_settings=ModelSettings(
            reasoning=Reasoning(effort="medium", summary="auto") if is_openai_provider() else None,
            response_include=["web_search_call.action.sources"] if is_openai_provider() else None,
        ),
        tools=[WebSearchTool(), IPythonInterpreter, CopyFile],
        conversation_starters=[
            "Soạn công văn đề nghị phê duyệt ngân sách Q2/2026 theo NĐ 30/2020 và xuất DOCX.",
            "Soạn tờ trình mua sắm thiết bị văn phòng trị giá 350 triệu đồng và xuất PDF.",
            "Soạn biên bản họp giao ban tháng 5/2026 với 5 nội dung kết luận, xuất DOCX.",
            "Soạn hợp đồng dịch vụ tư vấn giữa Công ty A và Công ty B (giá trị 200 triệu, có VAT).",
        ],
    )


if __name__ == "__main__":
    import contextlib
    import os

    with open(os.devnull, "w") as devnull, contextlib.redirect_stderr(devnull):
        Agency(create_docs_agent()).terminal_demo()