"""Native-app FastAPI endpoints — env management, file browser, file uploads.

These routes back the Tauri desktop shell in `desktop/`. They are mounted on top
of the agency-swarm FastAPI app inside `server.py`.

Design notes
------------
- `.env` is the single source of truth for API keys; we read it via
  `python-dotenv` and write through `set_key` so quoting/escaping is correct.
- Returned key values are masked (`sk-...abcd`) so the frontend never sees the
  raw secret unless the user types it.
- File browsing is sandboxed: requests must resolve under `uploads/` or
  `outputs/` (created lazily at the project root). Path traversal is rejected.
- Uploads stream to disk so large PPTX/MP4 attachments do not buffer in memory.
"""

from __future__ import annotations

import logging
import mimetypes
import os
import shutil
from pathlib import Path
from typing import Any

from dotenv import dotenv_values, set_key, unset_key
from fastapi import APIRouter, FastAPI, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent
ENV_PATH = PROJECT_ROOT / ".env"
UPLOADS_DIR = PROJECT_ROOT / "uploads"
OUTPUTS_DIR = PROJECT_ROOT / "outputs"

# Created lazily so a fresh checkout works without manual setup.
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_ROOTS: dict[str, Path] = {
    "uploads": UPLOADS_DIR,
    "outputs": OUTPUTS_DIR,
}

# ── env schema — must stay in sync with onboard.py ───────────────────────────
PROVIDER_KEYS = ("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY")

KNOWN_KEYS: tuple[str, ...] = (
    *PROVIDER_KEYS,
    "DEFAULT_MODEL",
    "COMPOSIO_API_KEY",
    "COMPOSIO_USER_ID",
    "SEARCH_API_KEY",
    "PEXELS_API_KEY",
    "PIXABAY_API_KEY",
    "UNSPLASH_ACCESS_KEY",
    "FAL_KEY",
)

PROVIDER_DEFAULT_MODELS: dict[str, str] = {
    "OPENAI_API_KEY":    "gpt-5.2",
    "ANTHROPIC_API_KEY": "litellm/claude-sonnet-4-6",
    "GOOGLE_API_KEY":    "litellm/gemini/gemini-3-flash",
}


def _mask(value: str) -> str:
    """Return `sk-…abcd` style preview so the UI can show "configured" without leaking."""
    if not value:
        return ""
    if len(value) <= 8:
        return "•" * len(value)
    return f"{value[:4]}…{value[-4:]}"


def _read_env() -> dict[str, str]:
    if not ENV_PATH.exists():
        return {}
    return {k: v or "" for k, v in dotenv_values(str(ENV_PATH)).items()}


def _resolve_safe(root_name: str, relative: str) -> Path:
    """Resolve `relative` under `ALLOWED_ROOTS[root_name]`, rejecting traversal."""
    if root_name not in ALLOWED_ROOTS:
        raise HTTPException(400, f"Unknown root '{root_name}'. Use one of: {list(ALLOWED_ROOTS)}")
    root = ALLOWED_ROOTS[root_name].resolve()
    candidate = (root / relative.lstrip("/\\")).resolve() if relative else root
    try:
        candidate.relative_to(root)
    except ValueError:
        raise HTTPException(403, "Path escapes the allowed directory.")
    return candidate


# ── pydantic models ──────────────────────────────────────────────────────────


class EnvUpdate(BaseModel):
    """Payload for `PATCH /env` — empty string means *unset* the key."""

    updates: dict[str, str] = Field(
        default_factory=dict,
        description="Map of env var name → value. Empty string deletes the key.",
    )


class EnvStatus(BaseModel):
    keys: dict[str, dict[str, Any]]
    has_provider: bool
    active_provider: str | None
    default_model: str | None


# ── router ───────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/desktop", tags=["desktop"])


@router.get("/env", response_model=EnvStatus)
def get_env_status() -> EnvStatus:
    """List configured env keys (masked) plus the active provider."""
    env = _read_env()

    keys: dict[str, dict[str, Any]] = {}
    for name in KNOWN_KEYS:
        raw = env.get(name) or os.getenv(name) or ""
        keys[name] = {
            "set":     bool(raw),
            "preview": _mask(raw) if raw else "",
            "source":  "env" if env.get(name) else ("process" if os.getenv(name) else None),
        }

    active_provider = next((p for p in PROVIDER_KEYS if keys[p]["set"]), None)

    return EnvStatus(
        keys=keys,
        has_provider=active_provider is not None,
        active_provider=active_provider,
        default_model=env.get("DEFAULT_MODEL") or os.getenv("DEFAULT_MODEL") or None,
    )


@router.patch("/env")
def update_env(payload: EnvUpdate) -> dict[str, Any]:
    """Persist env updates to `.env` and refresh `os.environ` for the running process."""
    if not ENV_PATH.exists():
        ENV_PATH.write_text("", encoding="utf-8")

    written: list[str] = []
    cleared: list[str] = []

    for raw_key, value in payload.updates.items():
        key = raw_key.strip()
        if key not in KNOWN_KEYS:
            raise HTTPException(400, f"Unknown env key '{key}'.")
        if value == "":
            unset_key(str(ENV_PATH), key)
            os.environ.pop(key, None)
            cleared.append(key)
        else:
            # Match onboard.py: use python-dotenv's default quoting so the
            # `.env` file stays consistent across the CLI wizard and the GUI.
            set_key(str(ENV_PATH), key, value)
            os.environ[key] = value
            written.append(key)

    # Auto-fill DEFAULT_MODEL if a provider key was just set and DEFAULT_MODEL is blank.
    env_after = _read_env()
    if not env_after.get("DEFAULT_MODEL"):
        for provider in PROVIDER_KEYS:
            if env_after.get(provider):
                model = PROVIDER_DEFAULT_MODELS[provider]
                set_key(str(ENV_PATH), "DEFAULT_MODEL", model)
                os.environ["DEFAULT_MODEL"] = model
                written.append("DEFAULT_MODEL")
                break

    logger.info("Env updated: wrote=%s cleared=%s", written, cleared)
    return {"written": written, "cleared": cleared}


@router.get("/files")
def list_files(
    root: str = Query("outputs", description="Root key — 'uploads' or 'outputs'."),
    path: str = Query("", description="Relative path under the root."),
) -> dict[str, Any]:
    """List directory contents. Always returns folders first, alphabetical."""
    target = _resolve_safe(root, path)
    if not target.exists():
        raise HTTPException(404, f"Path not found: {root}/{path}")
    if target.is_file():
        raise HTTPException(400, "Use /desktop/files/read for individual files.")

    entries: list[dict[str, Any]] = []
    for child in target.iterdir():
        try:
            stat = child.stat()
        except OSError:
            continue
        entries.append({
            "name":     child.name,
            "path":     str(child.relative_to(ALLOWED_ROOTS[root])).replace("\\", "/"),
            "is_dir":   child.is_dir(),
            "size":     stat.st_size if child.is_file() else None,
            "modified": stat.st_mtime,
            "ext":      child.suffix.lower().lstrip("."),
        })
    entries.sort(key=lambda e: (not e["is_dir"], e["name"].lower()))

    return {"root": root, "path": path, "entries": entries}


@router.get("/files/read")
def read_file(
    root: str = Query("outputs"),
    path: str = Query(...),
):
    """Stream a single file with its detected MIME type."""
    target = _resolve_safe(root, path)
    if not target.exists() or not target.is_file():
        raise HTTPException(404, f"File not found: {root}/{path}")

    mime, _ = mimetypes.guess_type(target.name)
    return FileResponse(
        path=target,
        media_type=mime or "application/octet-stream",
        filename=target.name,
    )


@router.delete("/files")
def delete_file(
    root: str = Query("outputs"),
    path: str = Query(...),
) -> dict[str, Any]:
    target = _resolve_safe(root, path)
    if not target.exists():
        raise HTTPException(404, "File not found.")
    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()
    return {"deleted": str(target.relative_to(ALLOWED_ROOTS[root])).replace("\\", "/")}


@router.post("/files/upload")
async def upload_file(
    file: UploadFile,
    root: str = Query("uploads"),
    subpath: str = Query("", description="Optional subdirectory under the root."),
) -> dict[str, Any]:
    target_dir = _resolve_safe(root, subpath)
    target_dir.mkdir(parents=True, exist_ok=True)
    if not target_dir.is_dir():
        raise HTTPException(400, "subpath must be a directory.")

    safe_name = Path(file.filename or "upload").name
    target_path = target_dir / safe_name
    if target_path.exists():
        # Append numeric suffix instead of clobbering — Vietnamese office workers
        # often paste the same file twice when collecting attachments.
        stem, suffix = target_path.stem, target_path.suffix
        i = 1
        while (target_dir / f"{stem} ({i}){suffix}").exists():
            i += 1
        target_path = target_dir / f"{stem} ({i}){suffix}"

    with target_path.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            out.write(chunk)

    return {
        "saved": str(target_path.relative_to(ALLOWED_ROOTS[root])).replace("\\", "/"),
        "absolute_path": str(target_path),
        "size": target_path.stat().st_size,
    }


@router.get("/agents")
def list_agents() -> dict[str, Any]:
    """Return the agency roster so the UI can render the agent picker without
    hard-coding names. Imports lazily so this endpoint is cheap when unused."""
    from swarm import create_agency  # noqa: PLC0415

    agency = create_agency()
    agents = []
    for name, agent in agency.agents.items():
        agents.append({
            "name":         name,
            "description":  getattr(agent, "description", "") or "",
            "is_entry":     name == "Orchestrator",
        })
    return {"agents": agents, "default_recipient": "Orchestrator"}


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def attach(app: FastAPI) -> None:
    """Mount the desktop router on an existing FastAPI app."""
    app.include_router(router)

    @app.get("/", include_in_schema=False)
    def _root() -> JSONResponse:
        return JSONResponse({
            "name": "Mì Làm Văn Phòng — desktop API",
            "endpoints": [r.path for r in app.routes if hasattr(r, "path")],
        })
