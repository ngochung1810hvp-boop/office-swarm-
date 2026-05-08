import { useEffect, useState } from "react";
import { ChatPane } from "./components/ChatPane";
import { FileBrowser } from "./components/FileBrowser";
import { FilePreview } from "./components/FilePreview";
import { SettingsModal } from "./components/SettingsModal";
import { TitleBar } from "./components/TitleBar";
import { LoadingSplash } from "./components/LoadingSplash";
import { envApi, waitUntilReady } from "./api";
import type { EnvStatus, FileEntry } from "./types";

type AppState =
    | { kind: "booting" }
    | { kind: "needs_setup"; status: EnvStatus }
    | { kind: "ready"; status: EnvStatus };

export function App() {
    const [state, setState] = useState<AppState>({ kind: "booting" });
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<{ root: "uploads" | "outputs"; entry: FileEntry } | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const refreshEnv = async () => {
        const status = await envApi.status();
        setState(status.has_provider
            ? { kind: "ready", status }
            : { kind: "needs_setup", status });
        return status;
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const ok = await waitUntilReady();
            if (cancelled) return;
            if (!ok) {
                setState({ kind: "needs_setup", status: makeEmptyStatus() });
                setSettingsOpen(true);
                return;
            }
            try {
                const status = await refreshEnv();
                if (!status.has_provider) {
                    setSettingsOpen(true);
                }
            } catch {
                setState({ kind: "needs_setup", status: makeEmptyStatus() });
                setSettingsOpen(true);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const onSettingsSaved = async () => {
        const status = await refreshEnv();
        if (status.has_provider) {
            setSettingsOpen(false);
        }
    };

    const onAgentFilesChanged = () => setRefreshKey(k => k + 1);

    if (state.kind === "booting") {
        return <LoadingSplash />;
    }

    const status = state.status;

    return (
        <div className="app-shell">
            <TitleBar
                provider={status.active_provider}
                model={status.default_model}
                onSettings={() => setSettingsOpen(true)}
            />
            <div className="app-body">
                <aside className="pane pane-files">
                    <FileBrowser
                        refreshKey={refreshKey}
                        onSelect={(root, entry) => setPreviewFile({ root, entry })}
                        selected={previewFile?.entry.path ?? null}
                    />
                </aside>
                <main className="pane pane-chat">
                    <ChatPane
                        ready={state.kind === "ready"}
                        onAfterTurn={onAgentFilesChanged}
                        onOpenSettings={() => setSettingsOpen(true)}
                    />
                </main>
                <aside className="pane pane-preview">
                    <FilePreview file={previewFile} />
                </aside>
            </div>
            {settingsOpen && (
                <SettingsModal
                    initial={status}
                    onClose={() => {
                        if (status.has_provider) setSettingsOpen(false);
                    }}
                    onSaved={onSettingsSaved}
                />
            )}
        </div>
    );
}

function makeEmptyStatus(): EnvStatus {
    return { keys: {}, has_provider: false, active_provider: null, default_model: null };
}
