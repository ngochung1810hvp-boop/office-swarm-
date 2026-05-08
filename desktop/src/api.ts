// Thin client over the FastAPI server in `server.py`.
// In Tauri context the URL comes from the `backend_url` command (so it could
// later move to a different port). In `vite dev` (browser fallback) we default
// to localhost:8080.

import type { EnvStatus, FileListing, AgentInfo } from "./types";

let cachedBaseUrl: string | null = null;

async function resolveBaseUrl(): Promise<string> {
    if (cachedBaseUrl) return cachedBaseUrl;
    try {
        const { invoke } = await import("@tauri-apps/api/core");
        cachedBaseUrl = await invoke<string>("backend_url");
    } catch {
        cachedBaseUrl = "http://127.0.0.1:8080";
    }
    return cachedBaseUrl!;
}

export async function waitUntilReady(): Promise<boolean> {
    try {
        const { invoke } = await import("@tauri-apps/api/core");
        return await invoke<boolean>("wait_until_ready");
    } catch {
        // Browser fallback — best-effort poll.
        const base = await resolveBaseUrl();
        for (let i = 0; i < 60; i++) {
            try {
                const r = await fetch(`${base}/desktop/health`);
                if (r.ok) return true;
            } catch { /* ignore */ }
            await new Promise(r => setTimeout(r, 500));
        }
        return false;
    }
}

export async function restartBackend(): Promise<string> {
    const { invoke } = await import("@tauri-apps/api/core");
    cachedBaseUrl = null;
    return await invoke<string>("restart_backend");
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const base = await resolveBaseUrl();
    const r = await fetch(`${base}${path}`, init);
    if (!r.ok) {
        const text = await r.text().catch(() => r.statusText);
        throw new Error(`${r.status} ${path}: ${text}`);
    }
    return r.json() as Promise<T>;
}

// ── env ────────────────────────────────────────────────────────────────────

export const envApi = {
    status: () => api<EnvStatus>("/desktop/env"),
    update: (updates: Record<string, string>) =>
        api<{ written: string[]; cleared: string[] }>("/desktop/env", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updates }),
        }),
};

// ── files ───────────────────────────────────────────────────────────────────

export const filesApi = {
    list: (root: "uploads" | "outputs", path = "") =>
        api<FileListing>(`/desktop/files?root=${root}&path=${encodeURIComponent(path)}`),
    fileUrl: async (root: "uploads" | "outputs", path: string) => {
        const base = await resolveBaseUrl();
        return `${base}/desktop/files/read?root=${root}&path=${encodeURIComponent(path)}`;
    },
    delete: (root: "uploads" | "outputs", path: string) =>
        api<{ deleted: string }>(`/desktop/files?root=${root}&path=${encodeURIComponent(path)}`, {
            method: "DELETE",
        }),
    upload: async (file: File, root: "uploads" | "outputs" = "uploads") => {
        const base = await resolveBaseUrl();
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch(`${base}/desktop/files/upload?root=${root}`, {
            method: "POST",
            body: fd,
        });
        if (!r.ok) throw new Error(`upload failed: ${r.status}`);
        return r.json() as Promise<{ saved: string; absolute_path: string; size: number }>;
    },
};

// ── agents ───────────────────────────────────────────────────────────────────

export const agentsApi = {
    list: () => api<{ agents: AgentInfo[]; default_recipient: string }>("/desktop/agents"),
};

// ── chat (SSE) ───────────────────────────────────────────────────────────────

export type StreamEvent = {
    type: "delta" | "final" | "error" | "tool" | "agent" | "raw";
    text?: string;
    agent?: string;
    raw?: unknown;
};

export type ChatRequest = {
    message: string;
    chat_history?: unknown[];
    recipient_agent?: string | null;
    file_urls?: Record<string, string>;
};

/**
 * Streams the agency-swarm SSE response endpoint and yields semantic events.
 *
 * Why this and not `EventSource`: agency-swarm requires a POST body and uses
 * custom event names (`messages`, `end`, plus AG-UI deltas). `EventSource`
 * supports neither, so we hand-roll a fetch-based reader.
 */
export async function* streamChat(req: ChatRequest, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    const base = await resolveBaseUrl();
    const resp = await fetch(`${base}/open-swarm/get_response_stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
            message: req.message,
            chat_history: req.chat_history ?? null,
            recipient_agent: req.recipient_agent ?? null,
            file_urls: req.file_urls ?? null,
            generate_chat_name: false,
        }),
        signal,
    });
    if (!resp.ok || !resp.body) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`stream failed: ${resp.status} ${txt}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE frames are separated by a blank line.
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const event = parseFrame(frame);
            if (event) yield event;
        }
    }
}

/**
 * Parse one SSE frame into a semantic event.
 *
 * agency-swarm with `enable_agui=False` (the default we use) emits frames like:
 *
 *   event: meta
 *   data: {"run_id": "..."}
 *
 *   data: {"data": {"type": "raw_response_event", "agent": "Orchestrator",
 *                   "data": {"type": "response.output_text.delta", "delta": "Xin"}}}
 *
 *   data: {"data": {"type": "run_item_stream_event", "agent": "Orchestrator",
 *                   "item": {"type": "tool_call_item", "name": "GenerateImage", ...}}}
 *
 *   event: messages
 *   data: {"new_messages": [...], "run_id": "..."}
 *
 *   event: end
 *   data: [DONE]
 *
 * Plus error frames: `data: {"error": "..."}`.
 */
function parseFrame(frame: string): StreamEvent | null {
    let eventName = "message";
    const dataLines: string[] = [];
    for (const line of frame.split("\n")) {
        if (!line) continue;
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return null;
    const raw = dataLines.join("\n");
    if (raw === "[DONE]") return { type: "final" };

    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { return { type: "raw", raw }; }

    if (eventName === "meta") return { type: "raw", raw: parsed };

    if (eventName === "messages") {
        // Concatenate the assistant's final text across `new_messages`.
        const messages = parsed?.new_messages ?? parsed?.messages ?? [];
        const text = messages
            .filter((m: any) => m?.role === "assistant")
            .flatMap((m: any) => extractTextFromContent(m?.content))
            .join("");
        return { type: "final", text };
    }

    if (parsed?.error) return { type: "error", text: String(parsed.error) };

    const inner = parsed?.data ?? parsed;
    const innerType = inner?.type;

    if (innerType === "raw_response_event") {
        const nested = inner.data ?? {};
        const ntype = nested.type;
        if (ntype === "response.output_text.delta" && typeof nested.delta === "string") {
            return { type: "delta", text: nested.delta };
        }
        if (ntype === "response.created" && inner.agent) {
            return { type: "agent", agent: inner.agent };
        }
        return { type: "raw", raw: parsed };
    }

    if (innerType === "run_item_stream_event") {
        const item = inner.item ?? {};
        if (item.type === "tool_call_item") {
            return { type: "tool", text: item.name || item.raw_item?.name || "tool" };
        }
        return { type: "raw", raw: parsed };
    }

    // AG-UI flavoured events — kept for forward compatibility if the server
    // is later booted with `enable_agui=True`.
    if (innerType === "TEXT_MESSAGE_CONTENT" && typeof inner.delta === "string") {
        return { type: "delta", text: inner.delta };
    }
    if (innerType === "TEXT_MESSAGE_START" && inner.agent) {
        return { type: "agent", agent: inner.agent };
    }

    return { type: "raw", raw: parsed };
}

function extractTextFromContent(content: any): string[] {
    if (typeof content === "string") return [content];
    if (Array.isArray(content)) {
        return content.flatMap(c => {
            if (typeof c === "string") return [c];
            if (c?.type === "output_text" || c?.type === "text") {
                return [typeof c.text === "string" ? c.text : (c.text?.value ?? "")];
            }
            return [];
        });
    }
    return [];
}
