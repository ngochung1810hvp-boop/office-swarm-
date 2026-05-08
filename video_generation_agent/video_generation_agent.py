from agency_swarm import Agent, ModelSettings
from agency_swarm.tools import LoadFileAttachment
from openai.types.shared.reasoning import Reasoning
from shared_tools import CopyFile

from config import get_default_model, is_openai_provider


def create_video_generation_agent() -> Agent:
    return Agent(
        name="Video Agent",
        description="Chuyên viên Video — tạo và chỉnh sửa video quảng cáo, video nội bộ, video đào tạo; hỗ trợ phụ đề tiếng Việt và bối cảnh văn hóa VN.",
        instructions="instructions.md",
        tools_folder="./tools",
        tools=[LoadFileAttachment, CopyFile],
        model=get_default_model(),
        model_settings=ModelSettings(
            reasoning=Reasoning(summary="auto", effort="medium") if is_openai_provider() else None,
            truncation="auto",
        ),
        conversation_starters=[
            "Tạo video quảng cáo 15 giây cho ra mắt sản phẩm mới (có chữ tiếng Việt).",
            "Tạo video giới thiệu công ty 60 giây, phong cách doanh nghiệp Việt Nam.",
            "Chỉnh sửa clip này và thêm phụ đề tiếng Việt.",
            "Biến bài blog tiếng Việt này thành video có voiceover và phụ đề.",
        ],
    )
