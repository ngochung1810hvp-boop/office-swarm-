import os
from agency_swarm import Agent, ModelSettings
from openai.types.shared.reasoning import Reasoning
from agency_swarm.tools import (
    WebSearchTool,
    PersistentShellTool,
    IPythonInterpreter,
    LoadFileAttachment,
)
from shared_tools import CopyFile, ExecuteTool, FindTools, ManageConnections, SearchTools

from config import get_default_model, is_openai_provider

current_dir = os.path.dirname(os.path.abspath(__file__))
instructions_path = os.path.join(current_dir, "instructions.md")

def create_data_analyst() -> Agent:
    return Agent(
        name="Data Analyst",
        description="Chuyên viên Phân tích Dữ liệu — phân tích doanh thu, KPI, dashboard cho doanh nghiệp Việt Nam (định dạng VND, dd/mm/yyyy, biểu đồ tiếng Việt có dấu).",
        instructions=instructions_path,
        tools_folder=os.path.join(current_dir, "tools"),
        model=get_default_model(),
        tools=[
            WebSearchTool(),
            PersistentShellTool,
            IPythonInterpreter,
            LoadFileAttachment,
            CopyFile,
            ExecuteTool,
            FindTools,
            ManageConnections,
            SearchTools,
        ],
        model_settings=ModelSettings(
            reasoning=Reasoning(effort="medium", summary="auto") if is_openai_provider() else None,
            truncation="auto",
            response_include=["web_search_call.action.sources"] if is_openai_provider() else None,
        ),
        conversation_starters=[
            "Phân tích file Excel doanh thu Q1/2026 và chỉ ra các xu hướng chính (theo VND).",
            "Tạo dashboard biểu đồ KPI bán hàng theo tháng cho 6 tháng gần nhất.",
            "Kết nối Google Analytics và tổng hợp traffic website tháng trước.",
            "Đọc dữ liệu công nợ khách hàng và tìm các khách hàng quá hạn trên 60 ngày.",
        ],
    )
