import { useEffect, useState } from "react";
import { filesApi } from "../api";
import type { FileEntry } from "../types";

type Props = {
    refreshKey: number;
    onSelect: (root: "uploads" | "outputs", entry: FileEntry) => void;
    selected: string | null;
};

const ROOT_LABELS: Record<"uploads" | "outputs", string> = {
    outputs: "Tệp do AI tạo",
    uploads: "Tệp đã tải lên",
};

export function FileBrowser({ refreshKey, onSelect, selected }: Props) {
    const [root, setRoot] = useState<"uploads" | "outputs">("outputs");
    const [path, setPath] = useState("");
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await filesApi.list(root, path);
            setEntries(r.entries);
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, [root, path, refreshKey]);

    const onClickDir = (entry: FileEntry) => {
        setPath(entry.path);
    };

    const goUp = () => {
        if (!path) return;
        const next = path.split("/").slice(0, -1).join("/");
        setPath(next);
    };

    const handleDelete = async (entry: FileEntry) => {
        if (!confirm(`Xóa "${entry.name}"?`)) return;
        try {
            await filesApi.delete(root, entry.path);
            void load();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="filebrowser">
            <div className="filebrowser-tabs">
                {(["outputs", "uploads"] as const).map(r => (
                    <button
                        key={r}
                        className={`tab ${r === root ? "tab-active" : ""}`}
                        onClick={() => { setRoot(r); setPath(""); }}
                    >
                        {ROOT_LABELS[r]}
                    </button>
                ))}
            </div>
            <div className="filebrowser-path">
                {path ? (
                    <>
                        <button className="btn btn-ghost btn-sm" onClick={goUp}>← Lên</button>
                        <span className="path-display">/{path}</span>
                    </>
                ) : (
                    <span className="path-display path-display--root">/{root}</span>
                )}
                <button className="btn btn-ghost btn-sm" onClick={load} title="Làm mới">↻</button>
            </div>
            <div className="filebrowser-list">
                {loading && <p className="muted">Đang tải…</p>}
                {error && <p className="error">{error}</p>}
                {!loading && entries.length === 0 && (
                    <p className="muted">Chưa có tệp nào.</p>
                )}
                {entries.map(entry => (
                    <div
                        key={entry.path}
                        className={`file-row ${selected === entry.path ? "file-row--selected" : ""}`}
                        onClick={() => entry.is_dir ? onClickDir(entry) : onSelect(root, entry)}
                    >
                        <span className="file-icon">{iconFor(entry)}</span>
                        <span className="file-name">{entry.name}</span>
                        {!entry.is_dir && (
                            <span className="file-meta">{formatSize(entry.size ?? 0)}</span>
                        )}
                        <button
                            className="file-delete"
                            onClick={e => { e.stopPropagation(); handleDelete(entry); }}
                            title="Xóa"
                        >×</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function iconFor(entry: FileEntry): string {
    if (entry.is_dir) return "📁";
    switch (entry.ext) {
        case "docx": case "doc":  return "📄";
        case "pptx": case "ppt":  return "📊";
        case "xlsx": case "xls": case "csv": return "📈";
        case "pdf":               return "📕";
        case "png": case "jpg": case "jpeg": case "webp": case "gif": case "svg": return "🖼️";
        case "mp4": case "mov": case "webm": return "🎬";
        case "mp3": case "wav":   return "🎵";
        case "json": case "yaml": case "yml": case "toml": return "🔧";
        default: return "📃";
    }
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
