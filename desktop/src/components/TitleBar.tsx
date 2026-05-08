import { restartBackend } from "../api";
import { useState } from "react";

type Props = {
    provider: string | null;
    model: string | null;
    onSettings: () => void;
};

const PROVIDER_LABELS: Record<string, string> = {
    OPENAI_API_KEY:    "OpenAI",
    ANTHROPIC_API_KEY: "Anthropic Claude",
    GOOGLE_API_KEY:    "Google Gemini",
};

export function TitleBar({ provider, model, onSettings }: Props) {
    const [restarting, setRestarting] = useState(false);

    const handleRestart = async () => {
        setRestarting(true);
        try {
            await restartBackend();
        } catch (e) {
            console.error("restart failed", e);
            alert("Không khởi động lại được backend. Kiểm tra terminal.");
        } finally {
            setRestarting(false);
        }
    };

    return (
        <header className="titlebar">
            <div className="titlebar-brand">
                <span className="brand-mark">M</span>
                <span className="brand-name">Mì Làm Văn Phòng</span>
            </div>
            <div className="titlebar-meta">
                {provider ? (
                    <>
                        <span className="meta-pill meta-pill--ok">
                            {PROVIDER_LABELS[provider] ?? provider}
                        </span>
                        {model && <span className="meta-pill">{model}</span>}
                    </>
                ) : (
                    <span className="meta-pill meta-pill--warn">Chưa cấu hình API key</span>
                )}
            </div>
            <div className="titlebar-actions">
                <button className="btn btn-ghost" onClick={handleRestart} disabled={restarting} title="Khởi động lại backend Python">
                    {restarting ? "Đang khởi động lại…" : "Khởi động lại"}
                </button>
                <button className="btn btn-primary" onClick={onSettings}>
                    Cài đặt
                </button>
            </div>
        </header>
    );
}
