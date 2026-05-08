from agency_swarm import Agent, ModelSettings
from agency_swarm.tools import (
    WebSearchTool,
    PersistentShellTool,
    IPythonInterpreter,
)
from openai.types.shared import Reasoning
from dotenv import load_dotenv

from config import get_default_model, is_openai_provider
from shared_tools import CopyFile, ExecuteTool, FindTools, ManageConnections, SearchTools

load_dotenv()

# Class-level rename — idempotent, safe to run once at import time.
IPythonInterpreter.__name__ = "ProgrammaticToolCalling"


def create_virtual_assistant() -> Agent:
    return Agent(
        name="General Agent",
        description="Thư ký Văn phòng — trợ lý hành chính kết nối với 10.000+ hệ thống ngoài (Gmail, Outlook, Zalo, Teams, MISA, lịch, CRM, kế toán...).",
        instructions="./instructions.md",
        files_folder="./files",
        tools_folder="./tools",
        model=get_default_model(),
        model_settings=ModelSettings(
            reasoning=Reasoning(effort="medium", summary="auto") if is_openai_provider() else None,
            response_include=["web_search_call.action.sources"] if is_openai_provider() else None,
        ),
        tools=[
            WebSearchTool(),
            PersistentShellTool,
            IPythonInterpreter,
            CopyFile,
            ExecuteTool,
            FindTools,
            ManageConnections,
            SearchTools,
        ],
        conversation_starters=[
            "Tóm tắt email chưa đọc trong hộp thư của em rồi gửi vào Teams nhóm Văn phòng.",
            "Đặt lịch họp giao ban với team Kinh doanh thứ Hai tuần sau, 9h00, qua Google Meet.",
            "Em đã kết nối những hệ thống ngoài nào rồi?",
            "Soạn email cảm ơn khách hàng dự cuộc họp hôm qua và gửi từ Outlook của em.",
        ],
    )


if __name__ == "__main__":
    from agency_swarm import Agency
    Agency(create_virtual_assistant()).terminal_demo()