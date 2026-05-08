import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { agentsApi, filesApi, streamChat } from "../api";
import type { AgentInfo, ChatMessage } from "../types";

type Props = {
    ready: boolean;
    onAfterTurn: () => void;
    onOpenSettings: () => void;
};

const AGENT_LABELS: Record<string, string> = {
    Orchestrator:      "Trưởng phòng Điều phối",
    VirtualAssistant:  "Thư ký Văn phòng",
    DeepResearch:      "Chuyên viên Nghiên cứu",
    DataAnalyst:       "Chuyên viên Phân tích Dữ liệu",
    SlidesAgent:       "Chuyên viên Trình chiếu",
    DocsAgent:         "Chuyên viên Văn bản",
    ImageGenerationAgent: "Chuyên viên Hình ảnh",
    VideoGenerationAgent: "Chuyên viên Video",
};

export function ChatPane({ ready, onAfterTurn, onOpenSettings }: Props) {
    const [agents, setAgents] = useState<AgentInfo[]>([]);
    const [recipient, setRecipient] = useState<string>("Orchestrator");
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [busy, setBusy] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<Record<string, string>>({});
    const abortRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!ready) return;
        agentsApi.list()
            .then(r => {
                setAgents(r.agents);
                setRecipient(r.default_recipient);
            })
            .catch(e => console.error("agents.list failed", e));
    }, [ready]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const send = async () => {
        const text = input.trim();
        if (!text || busy) return;

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            text,
            files: Object.keys(pendingFiles).map(name => ({ name, path: pendingFiles[name] })),
        };
        const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            text: "",
            agent: recipient,
            streaming: true,
        };
        setMessages(prev => [...prev, userMsg, assistantMsg]);
        setInput("");
        setBusy(true);
        const fileUrls = pendingFiles;
        setPendingFiles({});

        const ac = new AbortController();
        abortRef.current = ac;

        try {
            for await (const ev of streamChat(
                {
                    message: text,
                    recipient_agent: recipient,
                    file_urls: Object.keys(fileUrls).length ? fileUrls : undefined,
                },
                ac.signal,
            )) {
                if (ev.type === "delta" && ev.text) {
                    setMessages(prev =>
                        prev.map(m => m.id === assistantMsg.id
                            ? { ...m, text: m.text + ev.text }
                            : m),
                    );
                } else if (ev.type === "agent" && ev.agent) {
                    setMessages(prev =>
                        prev.map(m => m.id === assistantMsg.id
                            ? { ...m, agent: ev.agent }
                            : m),
                    );
                } else if (ev.type === "tool" && ev.text) {
                    setMessages(prev =>
                        prev.map(m => m.id === assistantMsg.id
                            ? { ...m, text: m.text + `\n\n_đang dùng tool: ${ev.text}_\n\n` }
                            : m),
                    );
                } else if (ev.type === "final") {
                    setMessages(prev =>
                        prev.map(m => m.id === assistantMsg.id
                            ? { ...m, streaming: false, text: ev.text || m.text }
                            : m),
                    );
                } else if (ev.type === "error" && ev.text) {
                    setMessages(prev =>
                        prev.map(m => m.id === assistantMsg.id
                            ? { ...m, streaming: false, error: ev.text }
                            : m),
                    );
                }
            }
        } catch (e: any) {
            const err = e?.name === "AbortError" ? "Đã hủy." : (e?.message || String(e));
            setMessages(prev =>
                prev.map(m => m.id === assistantMsg.id
                    ? { ...m, streaming: false, error: err }
                    : m),
            );
            if (err.includes("401") || err.includes("API key") || err.toLowerCase().includes("unauthorized")) {
                onOpenSettings();
            }
        } finally {
            setBusy(false);
            abortRef.current = null;
            onAfterTurn();
        }
    };

    const cancel = () => {
        abortRef.current?.abort();
    };

    const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const r = await filesApi.upload(file, "uploads");
            setPendingFiles(prev => ({ ...prev, [file.name]: r.absolute_path }));
        } catch (err) {
            console.error("upload failed", err);
        } finally {
            e.target.value = "";
        }
    };

    const removePendingFile = (name: string) => {
        setPendingFiles(prev => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    };

    return (
        <section className="chat">
            <div className="chat-toolbar">
                <label className="chat-recipient">
                    <span>Gửi đến:</span>
                    <select
                        value={recipient}
                        onChange={e => setRecipient(e.target.value)}
                        disabled={busy || agents.length === 0}
                    >
                        {agents.map(a => (
                            <option key={a.name} value={a.name}>
                                {AGENT_LABELS[a.name] ?? a.name}
                            </option>
                        ))}
                    </select>
                </label>
                {messages.length > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setMessages([])} disabled={busy}>
                        Xóa lịch sử
                    </button>
                )}
            </div>

            <div className="chat-stream" ref={scrollRef}>
                {messages.length === 0 && <EmptyState />}
                {messages.map(m => (
                    <MessageBubble key={m.id} msg={m} />
                ))}
            </div>

            <div className="chat-composer">
                {Object.keys(pendingFiles).length > 0 && (
                    <div className="composer-attachments">
                        {Object.keys(pendingFiles).map(name => (
                            <span key={name} className="chip">
                                {name}
                                <button onClick={() => removePendingFile(name)} aria-label="Bỏ tệp">×</button>
                            </span>
                        ))}
                    </div>
                )}
                <textarea
                    className="composer-input"
                    placeholder={ready ? "Yêu cầu công việc, ví dụ: 'Soạn công văn đề nghị phê duyệt ngân sách Q2/2026'" : "Đang khởi động backend…"}
                    value={input}
                    disabled={!ready}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send();
                        }
                    }}
                    rows={3}
                />
                <div className="composer-actions">
                    <label className="btn btn-ghost btn-sm">
                        Đính kèm tệp
                        <input type="file" hidden onChange={onFilePicked} />
                    </label>
                    <div className="composer-spacer" />
                    {busy ? (
                        <button className="btn btn-danger" onClick={cancel}>Hủy</button>
                    ) : (
                        <button className="btn btn-primary" onClick={send} disabled={!ready || !input.trim()}>
                            Gửi
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
    const agentLabel = msg.agent ? (AGENT_LABELS[msg.agent] ?? msg.agent) : null;
    return (
        <div className={`bubble bubble-${msg.role}`}>
            {msg.role === "assistant" && agentLabel && (
                <div className="bubble-agent">{agentLabel}</div>
            )}
            <div className="bubble-body">
                {msg.role === "assistant" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text || (msg.streaming ? "…" : "")}</ReactMarkdown>
                ) : (
                    <p>{msg.text}</p>
                )}
                {msg.error && <p className="bubble-error">{msg.error}</p>}
                {msg.files && msg.files.length > 0 && (
                    <ul className="bubble-files">
                        {msg.files.map(f => <li key={f.path}>📎 {f.name}</li>)}
                    </ul>
                )}
            </div>
        </div>
    );
}

function EmptyState() {
    const examples = [
        "Soạn công văn đề nghị phê duyệt ngân sách Q2/2026 và slide 10 trang đi kèm.",
        "Phân tích doanh thu Quý 1 từ file Excel và làm slide báo cáo.",
        "Tạo banner Tết Nguyên Đán 2027 và video 15 giây cho fanpage.",
        "Tổng hợp Nghị định 30/2020 và soạn checklist văn thư cho phòng Hành Chính.",
    ];
    return (
        <div className="empty-state">
            <h2>Chào bạn 👋</h2>
            <p>Bạn cần đội ngũ AI giúp gì hôm nay? Vài ví dụ:</p>
            <ul>
                {examples.map(e => <li key={e}>{e}</li>)}
            </ul>
        </div>
    );
}
