// Shared types — kept thin so the UI mirrors the FastAPI request_models.py
// shape without pulling in a heavyweight client generator.

export type EnvKeyStatus = {
    set: boolean;
    preview: string;
    source: "env" | "process" | null;
};

export type EnvStatus = {
    keys: Record<string, EnvKeyStatus>;
    has_provider: boolean;
    active_provider: string | null;
    default_model: string | null;
};

export type FileEntry = {
    name: string;
    path: string;
    is_dir: boolean;
    size: number | null;
    modified: number;
    ext: string;
};

export type FileListing = {
    root: "uploads" | "outputs";
    path: string;
    entries: FileEntry[];
};

export type AgentInfo = {
    name: string;
    description: string;
    is_entry: boolean;
};

export type ChatMessage = {
    id: string;
    role: "user" | "assistant" | "system";
    agent?: string;
    text: string;
    streaming?: boolean;
    error?: string;
    files?: { name: string; path: string }[];
};
