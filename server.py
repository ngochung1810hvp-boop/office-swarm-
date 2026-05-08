# FastAPI entry point — backs both the standalone API and the Tauri desktop shell.
#
# Run with: python server.py        (default :8080)
# The Tauri sidecar in `desktop/src-tauri/src/main.rs` spawns this same script.

import logging
import os
import sys

import uvicorn
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)

from agency_swarm.integrations.fastapi import run_fastapi
from fastapi.middleware.cors import CORSMiddleware

from desktop_api import attach as attach_desktop_api
from swarm import create_agency


def build_app():
    """Build the FastAPI app with both agency endpoints and desktop endpoints attached."""
    app = run_fastapi(
        agencies={
            "open-swarm": create_agency,
        },
        port=int(os.getenv("PORT", "8080")),
        enable_logging=True,
        allowed_local_file_dirs=[
            "./uploads",
            "./outputs",
        ],
        cors_origins=[
            # Tauri webview origins — see tauri.conf.json `app.windows[].url`.
            "tauri://localhost",
            "http://tauri.localhost",
            # Vite dev server, used during `npm run tauri dev`.
            "http://localhost:1420",
            "http://127.0.0.1:1420",
        ],
        return_app=True,
    )
    if app is None:
        raise RuntimeError("agency-swarm[fastapi] is not installed. Run `pip install -r requirements.txt`.")

    # `run_fastapi` already added a CORSMiddleware; we still attach the desktop
    # routes on top of the same app so cookies/auth flow stays consistent.
    attach_desktop_api(app)
    return app


def main() -> None:
    app = build_app()
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8080"))
    logging.info("Starting Mì Làm Văn Phòng server at http://%s:%s", host, port)
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
