from agency_swarm import Agent, ModelSettings
from openai.types.shared import Reasoning
from dotenv import load_dotenv

from config import get_default_model, is_openai_provider

load_dotenv()


def create_orchestrator() -> Agent:
    return Agent(
        name="Orchestrator",
        description=(
            "Trưởng phòng Điều phối của Mì Làm Văn Phòng. Tiếp nhận yêu cầu của người dùng, "
            "lập kế hoạch đa-agent, chạy song song khi các phần việc độc lập, và Handoff "
            "cho specialist khi tác vụ chỉ cần một chuyên viên xử lý xuyên suốt."
        ),
        instructions="./instructions.md",
        model=get_default_model(),
        model_settings=ModelSettings(
            reasoning=Reasoning(effort="medium", summary="auto") if is_openai_provider() else None,
        ),
        conversation_starters=[
            "Mì Làm Văn Phòng có thể giúp tôi những việc gì?",
            "Soạn công văn xin phê duyệt ngân sách Q2/2026 và slide trình bày 10 trang đi kèm.",
            "Phân tích doanh thu Quý 1 từ file Excel và làm slide báo cáo cho ban giám đốc.",
            "Tổng hợp tờ trình + biên bản họp + báo cáo PDF cho dự án mở chi nhánh Đà Nẵng.",
        ],
    )


if __name__ == "__main__":
    from agency_swarm import Agency
    Agency(create_orchestrator()).terminal_demo()