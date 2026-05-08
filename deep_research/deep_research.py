from agency_swarm import Agent, ModelSettings
from agency_swarm.tools import WebSearchTool, IPythonInterpreter
from openai.types.shared import Reasoning
from virtual_assistant.tools.ScholarSearch import ScholarSearch

from config import get_default_model, is_openai_provider


def create_deep_research() -> Agent:
    return Agent(
        name="Deep Research Agent",
        description="Chuyên viên Nghiên cứu — nghiên cứu sâu, có dẫn nguồn, ưu tiên các nguồn chính thống Việt Nam (vbpl.vn, GSO, CafeF, VnEconomy) và đối chiếu với nguồn quốc tế.",
        instructions="./instructions.md",
        files_folder="./files",
        tools=[WebSearchTool(), ScholarSearch, IPythonInterpreter],
        model=get_default_model(),
        model_settings=ModelSettings(
            reasoning=Reasoning(effort="high", summary="auto") if is_openai_provider() else None,
            response_include=["web_search_call.action.sources"] if is_openai_provider() else None,
        ),
        conversation_starters=[
            "Tổng hợp các điểm mới của Nghị định 30/2020/NĐ-CP về văn thư hành chính.",
            "Phân tích thị trường thương mại điện tử Việt Nam 2026 và 5 đối thủ lớn nhất.",
            "Tra cứu quy định về thuế VAT mới nhất cho doanh nghiệp SME tại Việt Nam.",
            "So sánh 5 phần mềm quản trị doanh nghiệp phổ biến nhất tại VN (MISA, Base, Lark, Odoo, Bitrix24).",
        ],
    )
