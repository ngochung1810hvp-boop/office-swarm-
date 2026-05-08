from agency_swarm import Agent, ModelSettings
from agency_swarm.tools import IPythonInterpreter, PersistentShellTool, LoadFileAttachment, WebSearchTool
from datetime import datetime, timezone
from openai.types.shared import Reasoning
from pathlib import Path
from virtual_assistant.tools.ReadFile import ReadFile
from shared_tools.CopyFile import CopyFile

from config import get_default_model, is_openai_provider

# Import slide tools
from .tools import (
    InsertNewSlides,
    ModifySlide,
    ManageTheme,
    DeleteSlide,
    SlideScreenshot,
    ReadSlide,
    BuildPptxFromHtmlSlides,
    RestoreSnapshot,
    CreatePptxThumbnailGrid,
    CheckSlideCanvasOverflow,
    CheckSlide,
    DownloadImage,
    EnsureRasterImage,
    ImageSearch,
    GenerateImage,
)

_INSTRUCTIONS_PATH = Path(__file__).parent / "instructions.md"


def _list_existing_projects() -> str:
    from .tools.slide_file_utils import get_mnt_dir
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
        f"Existing project folders (do NOT reuse these names for a new presentation):\n{projects_block}"
    )


def create_slides_agent() -> Agent:
    return Agent(
        name="Slides Agent",
        description="Chuyên viên Trình chiếu — tạo, chỉnh sửa và phân tích slide PowerPoint (.pptx) bằng tiếng Việt cho doanh nghiệp và cơ quan tại Việt Nam.",
        instructions=_build_instructions(),
        # files_folder=os.path.join(current_dir, "files"),
        # tools_folder=os.path.join(current_dir, "tools"),
        tools=[
            # Slide creation and management: InsertNewSlides then ModifySlide
            InsertNewSlides,
            ModifySlide,
            ManageTheme,
            DeleteSlide,
            SlideScreenshot,
            ReadSlide,
            # PPTX building
            BuildPptxFromHtmlSlides,
            RestoreSnapshot,
            CreatePptxThumbnailGrid,
            CheckSlideCanvasOverflow,
            CheckSlide,
            # Image download
            DownloadImage,
            EnsureRasterImage,
            GenerateImage,
            # Template-based editing
            # ExtractPptxTextInventory,
            # RearrangePptxSlidesFromTemplate,
            # ApplyPptxTextReplacements,
            ImageSearch,
            # Utility tools
            IPythonInterpreter,
            PersistentShellTool,
            LoadFileAttachment,
            CopyFile,
            ReadFile,
            WebSearchTool(search_context_size="high"),
        ],
        model=get_default_model(),
        model_settings=ModelSettings(
            reasoning=Reasoning(effort="high", summary="auto") if is_openai_provider() else None,
            verbosity="medium" if is_openai_provider() else None,
            response_include=["web_search_call.action.sources"] if is_openai_provider() else None,
        ),
        conversation_starters=[
            "Tạo slide báo cáo tổng kết Quý 1/2026 (12 slide) trình ban giám đốc, font Be Vietnam Pro.",
            "Chỉnh sửa slide cũ của em và cải thiện thiết kế cho chuyên nghiệp hơn.",
            "Tạo slide giới thiệu sản phẩm mới ra mắt thị trường Việt Nam (10 slide bằng tiếng Việt).",
            "Chuyển báo cáo Word này thành deck thuyết trình ngắn gọn cho cuộc họp giao ban.",
        ],
    )


if __name__ == "__main__":
    from agency_swarm import Agency
    Agency(create_slides_agent()).terminal_demo(reload=False)
