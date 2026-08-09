use serde::Serialize;
use std::{
    fs,
    net::TcpStream,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::Duration,
};
use tauri::{Manager, State};

// Single source of truth for the local server's port. Changing it (see
// `restart_local_server`) persists to `server-port.json` next to the app's
// data — both this process and the embedded Node server read it from there,
// so there is exactly one place a port can drift out of sync, not three.
const DEFAULT_PORT: u16 = 2238;
const MIN_PORT: u16 = 1024;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalServerConfig {
    base_url: String,
    ws_url: String,
}

impl LocalServerConfig {
    fn for_port(port: u16) -> Self {
        LocalServerConfig {
            // REST calls in the React client use relative route paths such as
            // `/flows`, so the shared native configuration must include the
            // Express API namespace. The websocket endpoint deliberately
            // stays at `/ws` on the loopback root.
            base_url: format!("http://127.0.0.1:{port}/api"),
            ws_url: format!("ws://127.0.0.1:{port}"),
        }
    }
}

#[derive(Serialize)]
struct WindowActionState {
    maximized: bool,
}

struct AppState {
    server: Mutex<Option<Child>>,
    config: Mutex<LocalServerConfig>,
}

fn port_config_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("server-port.json")
}

fn read_port(app_data_dir: &Path) -> u16 {
    fs::read_to_string(port_config_path(app_data_dir))
        .ok()
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok())
        .and_then(|json| json.get("port").and_then(|p| p.as_u64()))
        .map(|p| p as u16)
        .filter(|&p| p >= MIN_PORT)
        .unwrap_or(DEFAULT_PORT)
}

fn write_port(app_data_dir: &Path, port: u16) -> Result<(), String> {
    let json = serde_json::json!({ "port": port });
    fs::write(port_config_path(app_data_dir), json.to_string()).map_err(|error| error.to_string())
}

fn spawn_local_server(app_data_dir: &Path, resource_dir: &Path, port: u16) -> Result<Child, String> {
    let node_name = if cfg!(target_os = "windows") { "node.exe" } else { "node" };
    // Packaged apps expose resources directly, while a locally built executable
    // keeps them inside a `resources` directory beside the binary.
    let embedded_root = if resource_dir.join("node").is_dir() {
        resource_dir.to_path_buf()
    } else {
        resource_dir.join("resources")
    };
    let node = embedded_root.join("node").join(node_name);
    let server_dir = embedded_root.join("server");
    let entrypoint = server_dir.join("src").join("index.js");
    if !node.is_file() || !entrypoint.is_file() {
        return Err("The embedded local server is missing. Rebuild the GrowCare installer.".into());
    }

    let mut child = Command::new(node)
        .arg(entrypoint)
        .current_dir(server_dir)
        .env("HOST", "127.0.0.1")
        .env("PORT", port.to_string())
        .env("APP_DATA_DIR", app_data_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Unable to start GrowCare's local server: {error}"))?;

    if let Some(mut output) = child.stdout.take() {
        let log_path = app_data_dir.join("local-server.stdout.log");
        thread::spawn(move || {
            if let Ok(mut log) = fs::File::create(log_path) {
                let _ = std::io::copy(&mut output, &mut log);
            }
        });
    }
    if let Some(mut output) = child.stderr.take() {
        let log_path = app_data_dir.join("local-server.stderr.log");
        thread::spawn(move || {
            if let Ok(mut log) = fs::File::create(log_path) {
                let _ = std::io::copy(&mut output, &mut log);
            }
        });
    }

    Ok(child)
}

fn wait_for_local_server(port: u16) -> Result<(), String> {
    for _ in 0..50 {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(100));
    }
    Err(format!(
        "GrowCare's local server did not respond on port {port}. It may already be in use by another application."
    ))
}

fn kill_child(state: &AppState) {
    if let Ok(mut server) = state.server.lock() {
        if let Some(mut child) = server.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

#[tauri::command]
fn local_server_config(state: State<'_, AppState>) -> LocalServerConfig {
    state
        .config
        .lock()
        .map(|c| c.clone())
        .unwrap_or_else(|_| LocalServerConfig::for_port(DEFAULT_PORT))
}

/// Change the local server's port and restart it in place — no app relaunch
/// needed. Persists the choice so the next launch uses it too.
#[tauri::command]
fn restart_local_server(app: tauri::AppHandle, state: State<'_, AppState>, port: u16) -> Result<LocalServerConfig, String> {
    if port < MIN_PORT {
        return Err(format!("Port must be {MIN_PORT} or higher."));
    }
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    let resource_dir = app.path().resource_dir().map_err(|error| error.to_string())?;

    write_port(&app_data_dir, port)?;
    kill_child(&state);

    let child = spawn_local_server(&app_data_dir, &resource_dir, port)?;
    *state.server.lock().map_err(|error| error.to_string())? = Some(child);
    wait_for_local_server(port)?;

    let config = LocalServerConfig::for_port(port);
    *state.config.lock().map_err(|error| error.to_string())? = config.clone();
    Ok(config)
}

/// Window actions are executed by Tauri itself after the frontend emits an
/// application event. This keeps the controls reliable in a frameless build.
#[tauri::command]
fn window_action(app: tauri::AppHandle, action: String) -> Result<WindowActionState, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "GrowCare main window is unavailable.".to_string())?;

    match action.as_str() {
        "minimize" => window.minimize(),
        "toggle-maximize" => {
            if window.is_maximized().map_err(|error| error.to_string())? {
                window.unmaximize()
            } else {
                window.maximize()
            }
        }
        "close" => window.close(),
        _ => return Err("Unsupported window action.".to_string()),
    }
    .map_err(|error| error.to_string())?;

    Ok(WindowActionState {
        maximized: window.is_maximized().unwrap_or(false),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            server: Mutex::new(None),
            config: Mutex::new(LocalServerConfig::for_port(DEFAULT_PORT)),
        })
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
            fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
            let resource_dir = app.path().resource_dir().map_err(|error| error.to_string())?;

            let port = read_port(&app_data_dir);
            write_port(&app_data_dir, port).ok(); // keep the file authoritative even on a first run

            let child = spawn_local_server(&app_data_dir, &resource_dir, port)?;
            let state = app.state::<AppState>();
            *state.server.lock().map_err(|error| error.to_string())? = Some(child);
            *state.config.lock().map_err(|error| error.to_string())? = LocalServerConfig::for_port(port);
            wait_for_local_server(port)?;

            if let Some(window) = app.get_webview_window("main") {
                window.show().map_err(|error| error.to_string())?;
                window.set_focus().map_err(|error| error.to_string())?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            local_server_config,
            restart_local_server,
            window_action
        ])
        .build(tauri::generate_context!())
        .expect("error while building GrowCare")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                kill_child(&app.state::<AppState>());
            }
        });
}
