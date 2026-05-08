import { useEffect, useState } from "react";
import { filesApi } from "../api";
import type { FileEntry } from "../types";

type Props = {
    file: { root: "uploads" | "outputs"; entry: FileEntry } | null;
};

const TEXTUAL_EXTS = new Set(["txt", "md", "json", "csv", "tsv", "py", "js", "ts", "tsx", "jsx", "html", "htm", "css", "yml", "yaml", "toml", "log", "sh"]);
const IMAGE_EXTS   = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"]);
const VIDEO_EXTS   = new Set(["mp4", "webm", "mov"]);
const AUDIO_EXTS   = new Set(["mp3", "wav", "ogg", "m4a"]);
const PDF_EXTS     = new Set(["pdf"]);
const OFFICE_EXTS  = new Set(["docx", "doc", "pptx", "ppt", "xlsx", "xls"]);

export function FilePreview({ file }: Props) {
    const [url, setUrl] = useState<string | null>(null);
    const [text, setText] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setText(null);
        setError(null);
        if (!file) {
            setUrl(null);
            return;
        }
        (async () => {
            const u = await filesApi.fileUrl(file.root, file.entry.path);
            if (cancelled) return;
            setUrl(u);
            if (TEXTUAL_EXTS.has(file.entry.ext) && (file.entry.size ?? 0) < 1024 * 1024) {
                try {
                    const r = await fetch(u);
                    if (cancelled) return;
                    setText(await r.text());
                } catch (e: any) {
                    setError(e?.message || String(e));
                }
            }
        })();
        return () => { cancelled = true; };
    }, [file]);

    if (!file) {
        return (
            <div className="preview preview-empty">
                <p>Chọn tệp ở thanh bên trái để xem.</p>
            </div>
        );
    }

    const { entry } = file;

    return (
        <div className="preview">
            <div className="preview-header">
                <h3>{entry.name}</h3>
                {url && (
                    <a href={url} download={entry.name} className="btn btn-ghost btn-sm">Tải xuống</a>
                )}
            </div>
            <div className="preview-body">
                {error && <p className="error">{error}</p>}
                {url && IMAGE_EXTS.has(entry.ext) && (
                    <img src={url} alt={entry.name} className="preview-image" />
                )}
                {url && VIDEO_EXTS.has(entry.ext) && (
                    <video src={url} controls className="preview-video" />
                )}
                {url && AUDIO_EXTS.has(entry.ext) && (
                    <audio src={url} controls />
                )}
                {url && PDF_EXTS.has(entry.ext) && (
                    <iframe src={url} title={entry.name} className="preview-iframe" />
                )}
                {url && OFFICE_EXTS.has(entry.ext) && (
                    <OfficePreview ext={entry.ext} url={url} name={entry.name} />
                )}
                {text !== null && (
                    <pre className="preview-text">{text}</pre>
                )}
                {!error && text === null && !IMAGE_EXTS.has(entry.ext) && !VIDEO_EXTS.has(entry.ext) &&
                  !AUDIO_EXTS.has(entry.ext) && !PDF_EXTS.has(entry.ext) && !OFFICE_EXTS.has(entry.ext) && (
                    <p className="muted">Định dạng <code>.{entry.ext || "(không rõ)"}</code> chưa hỗ trợ xem trước. Hãy tải xuống để mở.</p>
                )}
            </div>
        </div>
    );
}

function OfficePreview({ ext, url, name }: { ext: string; url: string; name: string }) {
    // WebView2/Tauri can't natively render .docx/.pptx. Surface the file with a
    // clear "open externally" affordance instead of a broken viewer.
    const label =
        ext.startsWith("doc") ? "Tài liệu Word"
        : ext.startsWith("ppt") ? "Trình chiếu PowerPoint"
        : "Bảng tính Excel";
    return (
        <div className="office-preview">
            <div className="office-preview-icon">
                {ext.startsWith("doc") ? "📄" : ext.startsWith("ppt") ? "📊" : "📈"}
            </div>
            <h4>{label}</h4>
            <p>{name}</p>
            <p className="muted">
                Tài liệu Office không xem trực tiếp được trong app. Hãy tải xuống để mở bằng Word/PowerPoint/Excel.
            </p>
            <a href={url} download={name} className="btn btn-primary">Tải xuống và mở</a>
        </div>
    );
}
