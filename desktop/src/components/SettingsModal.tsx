import { useEffect, useState } from "react";
import { envApi, restartBackend } from "../api";
import type { EnvStatus } from "../types";

type Props = {
    initial: EnvStatus;
    onClose: () => void;
    onSaved: () => void;
};

type KeyDef = {
    env: string;
    label: string;
    url: string;
    description: string;
    group: "provider" | "addon";
    providerId?: string;
};

const KEY_DEFS: KeyDef[] = [
    {
        env: "OPENAI_API_KEY", label: "OpenAI", url: "https://platform.openai.com/api-keys",
        description: "GPT 5.x cho hầu hết agent, cộng với Sora video.", group: "provider", providerId: "openai",
    },
    {
        env: "ANTHROPIC_API_KEY", label: "Anthropic Claude", url: "https://console.anthropic.com/settings/keys",
        description: "Claude Sonnet — chất lượng slide tốt hơn.", group: "provider", providerId: "anthropic",
    },
    {
        env: "GOOGLE_API_KEY", label: "Google Gemini", url: "https://aistudio.google.com/app/apikey",
        description: "Gemini 3 + sinh ảnh giữ chữ tiếng Việt + Veo video.", group: "provider", providerId: "google",
    },
    {
        env: "COMPOSIO_API_KEY", label: "Composio API key", url: "https://composio.dev",
        description: "10.000+ tích hợp: Gmail, Outlook, Zalo, Teams, MISA…", group: "addon",
    },
    {
        env: "COMPOSIO_USER_ID", label: "Composio user ID", url: "https://composio.dev",
        description: "User ID đi cùng Composio API key.", group: "addon",
    },
    {
        env: "SEARCH_API_KEY", label: "SearchAPI key", url: "https://www.searchapi.io",
        description: "Tìm kiếm web, Scholar, sản phẩm cho mọi agent.", group: "addon",
    },
    {
        env: "FAL_KEY", label: "Fal.ai key", url: "https://fal.ai/dashboard/keys",
        description: "Seedance video, chỉnh sửa video, xóa nền hình ảnh.", group: "addon",
    },
    {
        env: "PEXELS_API_KEY", label: "Pexels key", url: "https://www.pexels.com/api",
        description: "Stock photo cho Slides Agent.", group: "addon",
    },
    {
        env: "PIXABAY_API_KEY", label: "Pixabay key", url: "https://pixabay.com/api/docs",
        description: "Stock photo cho Slides Agent.", group: "addon",
    },
    {
        env: "UNSPLASH_ACCESS_KEY", label: "Unsplash access key", url: "https://unsplash.com/developers",
        description: "Stock photo cho Slides Agent.", group: "addon",
    },
];

export function SettingsModal({ initial, onClose, onSaved }: Props) {
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [status, setStatus] = useState<EnvStatus>(initial);
    const [saving, setSaving] = useState(false);
    const [restarting, setRestarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        envApi.status().then(setStatus).catch(() => {});
    }, []);

    const setDraft = (env: string, value: string) => {
        setDrafts(prev => ({ ...prev, [env]: value }));
    };

    const isSet = (env: string) => status.keys[env]?.set;

    const save = async () => {
        // Only persist non-empty drafts. Use the explicit "Xóa" button to
        // unset keys — silently treating an empty input as "delete" surprises
        // users who simply focused and unfocused a field.
        const toSave: Record<string, string> = {};
        for (const [k, v] of Object.entries(drafts)) {
            const trimmed = v.trim();
            if (trimmed) toSave[k] = trimmed;
        }
        if (Object.keys(toSave).length === 0) {
            onClose();
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await envApi.update(toSave);
            const fresh = await envApi.status();
            setStatus(fresh);
            setDrafts({});

            setRestarting(true);
            try { await restartBackend(); } catch { /* non-fatal */ }
            setRestarting(false);

            onSaved();
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setSaving(false);
            setRestarting(false);
        }
    };

    const clear = async (env: string) => {
        if (!confirm(`Xóa key ${env}?`)) return;
        await envApi.update({ [env]: "" });
        setStatus(await envApi.status());
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>Cài đặt API key</h2>
                    {status.has_provider && (
                        <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
                    )}
                </header>

                {!status.has_provider && (
                    <div className="modal-banner modal-banner--warn">
                        Cần ít nhất <strong>một</strong> nhà cung cấp AI (OpenAI, Anthropic, hoặc Google) để bắt đầu.
                    </div>
                )}

                <Section title="Nhà cung cấp AI (chọn ít nhất 1)">
                    {KEY_DEFS.filter(k => k.group === "provider").map(k => (
                        <KeyRow
                            key={k.env}
                            def={k}
                            currentPreview={status.keys[k.env]?.preview ?? ""}
                            isSet={isSet(k.env) ?? false}
                            value={drafts[k.env]}
                            onChange={v => setDraft(k.env, v)}
                            onClear={() => clear(k.env)}
                        />
                    ))}
                </Section>

                <Section title="Tiện ích bổ sung (tùy chọn)">
                    {KEY_DEFS.filter(k => k.group === "addon").map(k => (
                        <KeyRow
                            key={k.env}
                            def={k}
                            currentPreview={status.keys[k.env]?.preview ?? ""}
                            isSet={isSet(k.env) ?? false}
                            value={drafts[k.env]}
                            onChange={v => setDraft(k.env, v)}
                            onClear={() => clear(k.env)}
                        />
                    ))}
                </Section>

                {error && <p className="error">{error}</p>}

                <footer className="modal-footer">
                    <p className="muted modal-footer-note">
                        Khóa lưu vào file <code>.env</code> tại thư mục dự án. Backend sẽ tự khởi động lại sau khi lưu.
                    </p>
                    <div className="modal-footer-actions">
                        {status.has_provider && (
                            <button className="btn btn-ghost" onClick={onClose} disabled={saving || restarting}>
                                Hủy
                            </button>
                        )}
                        <button className="btn btn-primary" onClick={save} disabled={saving || restarting}>
                            {saving ? "Đang lưu…" : restarting ? "Khởi động lại backend…" : "Lưu"}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="modal-section">
            <h3>{title}</h3>
            {children}
        </section>
    );
}

function KeyRow({ def, currentPreview, isSet, value, onChange, onClear }: {
    def: KeyDef;
    currentPreview: string;
    isSet: boolean;
    value: string | undefined;
    onChange: (v: string) => void;
    onClear: () => void;
}) {
    return (
        <div className={`key-row ${isSet ? "key-row--set" : ""}`}>
            <div className="key-row-meta">
                <div className="key-row-title">
                    <strong>{def.label}</strong>
                    {isSet && <span className="badge badge-ok">đã cấu hình</span>}
                </div>
                <p className="key-row-desc">{def.description}</p>
                <a href={def.url} target="_blank" rel="noreferrer" className="key-row-link">
                    Lấy key tại {def.url.replace(/^https?:\/\//, "")}
                </a>
            </div>
            <div className="key-row-input">
                <input
                    type="password"
                    placeholder={isSet ? `${currentPreview} (nhập để cập nhật)` : "Dán API key vào đây"}
                    value={value ?? ""}
                    onChange={e => onChange(e.target.value)}
                />
                {isSet && (
                    <button className="btn btn-ghost btn-sm" onClick={onClear} title="Xóa key đã lưu">Xóa</button>
                )}
            </div>
        </div>
    );
}
