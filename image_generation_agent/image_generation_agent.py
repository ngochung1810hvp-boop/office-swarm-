from agency_swarm import Agent, ModelSettings
from agency_swarm.tools import LoadFileAttachment
from openai.types.shared.reasoning import Reasoning
from shared_tools import CopyFile

from config import get_default_model, is_openai_provider


def create_image_generation_agent() -> Agent:
    return Agent(
        name="Image Agent",
        description="Chuyên viên Hình ảnh — tạo và chỉnh sửa hình ảnh cho marketing, sản phẩm, banner nội bộ; nhận biết bối cảnh văn hóa Việt Nam.",
        instructions="instructions.md",
        tools_folder="./tools",
        tools=[LoadFileAttachment, CopyFile],
        model=get_default_model(),
        model_settings=ModelSettings(
            reasoning=Reasoning(summary="auto", effort="medium") if is_openai_provider() else None,
            truncation="auto",
        ),
        conversation_starters=[
            "Tạo banner Tết Nguyên Đán 2027 cho fanpage công ty, phong cách trang nhã đỏ-vàng.",
            "Chỉnh sửa ảnh sản phẩm này theo phong cách điện ảnh để dùng cho landing page.",
            "Tạo poster mời tham dự hội nghị khách hàng (size A2, song ngữ Việt-Anh).",
            "Ghép logo công ty vào ảnh sản phẩm để làm ảnh quảng cáo Facebook Ads.",
        ],
    )


if __name__ == "__main__":
    from agency_swarm import Agency
    Agency(create_image_generation_agent()).terminal_demo()
