// Tauri shell — boots the Python FastAPI backend as a child process and waits
// for `/desktop/health` to come up before unveiling the window.
//
// Why a sidecar instead of bundling: the Python agency depends on a large
// scientific stack (pandas, scipy, scikit-learn, jupyter, weasyprint, …) that
// is awkward to ship as a single executable and changes frequently. We let the
// existing Python virtualenv run as-is and only wrap it in a native frame.

use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use tauri::{AppHandle, Manager, State};

const BACKEND_PORT: u16 = 8080;
const BACKEND_HOST: &str = "127.0.0.1";

/// Holds the spawned Python process so we can kill it on app exit.
struct BackendProcess(Mutex<Option<Child>>);

/// Resolve the project root that contains `server.py`.
///
/// In `tauri dev` the exe lives at `<repo>/desktop/src-tauri/target/debug/<exe>`,
/// so we walk parents until we find `server.py`. In packaged builds the user
/// can override via `MI_LAM_PROJECT_ROOT`.
fn project_root() -> PathBuf {
    if let Ok(custom) = std::env::var("MI_LAM_PROJECT_ROOT") {
        return PathBuf::from(custom);
    }
    let exe = std::env::current_exe().unwrap_or_else(|_| PathBuf::from("."));
    let mut walker = exe.clone();
    while let Some(parent) = walker.parent() {
        if parent.join("server.py").exists() {
            return parent.to_path_buf();
        }
        walker = parent.to_path_buf();
    }
    PathBuf::from(".")
}

fn python_executable(root: &PathBuf) -> String {
    // Prefer a virtualenv co-located with the project — matches the layout
    // produced by `python -m venv .venv` inside the Mì Làm Văn Phòng repo.
    let venv_python = if cfg!(target_os = "windows") {
        root.join(".venv").join("Scripts").join("python.exe")
    } else {
        root.join(".venv").join("bin").join("python")
    };
    if venv_python.exists() {
        return venv_python.to_string_lossy().to_string();
    }
    if cfg!(target_os = "windows") {
        "python".to_string()
    } else {
        "python3".to_string()
    }
}

fn spawn_backend() -> std::io::Result<Child> {
    let root = project_root();
    let py = python_executable(&root);

    log::info!("spawning backend: {} server.py (cwd={:?})", py, root);

    let mut cmd = Command::new(py);
    cmd.arg("server.py")
        .current_dir(&root)
        .env("HOST", BACKEND_HOST)
        .env("PORT", BACKEND_PORT.to_string())
        .env("PYTHONUNBUFFERED", "1")
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());

    // On Windows, hide the spawned console window so users don't see a flashing
    // cmd prompt every time the app starts.
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    cmd.spawn()
}

/// True once `GET /desktop/health` returns 200.
fn probe_backend() -> bool {
    let addr: SocketAddr = match format!("{}:{}", BACKEND_HOST, BACKEND_PORT).parse() {
        Ok(a) => a,
        Err(_) => return false,
    };
    let mut stream = match TcpStream::connect_timeout(&addr, Duration::from_millis(500)) {
        Ok(s) => s,
        Err(_) => return false,
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(800)));
    let req = format!(
        "GET /desktop/health HTTP/1.1\r\nHost: {}:{}\r\nConnection: close\r\n\r\n",
        BACKEND_HOST, BACKEND_PORT
    );
    if stream.write_all(req.as_bytes()).is_err() {
        return false;
    }
    let mut buf = [0u8; 64];
    let n = stream.read(&mut buf).unwrap_or(0);
    let head = String::from_utf8_lossy(&buf[..n]);
    head.starts_with("HTTP/1.1 200") || head.starts_with("HTTP/1.0 200")
}

async fn wait_for_backend() -> bool {
    // Poll for up to ~30s. First cold start is slow because pandas/numpy/scipy
    // import lazily.
    for _ in 0..120 {
        if probe_backend() {
            return true;
        }
        tokio::time::sleep(Duration::from_millis(250)).await;
    }
    false
}

#[tauri::command]
fn backend_url() -> String {
    format!("http://{}:{}", BACKEND_HOST, BACKEND_PORT)
}

#[tauri::command]
async fn restart_backend(state: State<'_, BackendProcess>) -> Result<String, String> {
    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
    let child = spawn_backend().map_err(|e| e.to_string())?;
    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        *guard = Some(child);
    }
    if wait_for_backend().await {
        Ok(backend_url())
    } else {
        Err("Backend did not start in time".into())
    }
}

#[tauri::command]
async fn wait_until_ready() -> bool {
    wait_for_backend().await
}

fn shutdown_backend(handle: &AppHandle) {
    if let Some(state) = handle.try_state::<BackendProcess>() {
        if let Ok(mut guard) = state.0.lock() {
            if let Some(mut child) = guard.take() {
                log::info!("stopping backend pid={}", child.id());
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}

pub fn run() {
    let backend = match spawn_backend() {
        Ok(child) => {
            log::info!("backend pid={}", child.id());
            Some(child)
        }
        Err(e) => {
            log::error!("failed to spawn backend: {e}");
            None
        }
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(BackendProcess(Mutex::new(backend)))
        .invoke_handler(tauri::generate_handler![
            backend_url,
            wait_until_ready,
            restart_backend,
        ])
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                shutdown_backend(window.app_handle());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
