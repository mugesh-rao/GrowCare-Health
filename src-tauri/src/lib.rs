use serde::Serialize;
use std::{
    fs,
    net::TcpStream,
    process::{Child, Command},
    sync::Mutex,
    thread,
    time::Duration,
};
use tauri::{Manager, State};

const SERVER_PORT: u16 = 17842;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalServerConfig {
    base_url: String,
    ws_url: String,
}

struct AppState {
    server: Mutex<Option<Child>>,
    config: LocalServerConfig,
}

fn start_local_server(app: &tauri::App) -> Result<Child, String> {
    let resource_dir = app.path().resource_dir().map_err(|error| error.to_string())?;
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;

    let node_name = if cfg!(target_os = "windows") { "node.exe" } else { "node" };
    // Packaged apps expose resources directly, while a locally built executable
    // keeps them inside a `resources` directory beside the binary.
    let embedded_root = if resource_dir.join("node").is_dir() {
        resource_dir
    } else {
        resource_dir.join("resources")
    };
    let node = embedded_root.join("node").join(node_name);
    let server_dir = embedded_root.join("server");
    let entrypoint = server_dir.join("src").join("index.js");
    if !node.is_file() || !entrypoint.is_file() {
        return Err("The embedded local server is missing. Rebuild the GrowCare installer.".into());
    }

    Command::new(node)
        .arg(entrypoint)
        .current_dir(server_dir)
        .env("HOST", "127.0.0.1")
        .env("PORT", SERVER_PORT.to_string())
        .env("APP_DATA_DIR", app_data_dir)
        .spawn()
        .map_err(|error| format!("Unable to start GrowCare's local server: {error}"))
}

fn wait_for_local_server() {
    for _ in 0..30 {
        if TcpStream::connect(("127.0.0.1", SERVER_PORT)).is_ok() {
            return;
        }
        thread::sleep(Duration::from_millis(100));
    }
}

#[tauri::command]
fn local_server_config(state: State<'_, AppState>) -> LocalServerConfig {
    state.config.clone()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = LocalServerConfig {
        base_url: format!("http://127.0.0.1:{SERVER_PORT}/api"),
        ws_url: format!("ws://127.0.0.1:{SERVER_PORT}"),
    };

    tauri::Builder::default()
        .manage(AppState {
            server: Mutex::new(None),
            config,
        })
        .setup(|app| {
            let child = start_local_server(app)?;
            *app.state::<AppState>().server.lock().map_err(|error| error.to_string())? = Some(child);
            wait_for_local_server();
            if let Some(window) = app.get_webview_window("main") {
                window.show().map_err(|error| error.to_string())?;
                window.set_focus().map_err(|error| error.to_string())?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![local_server_config])
        .build(tauri::generate_context!())
        .expect("error while building GrowCare")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                if let Ok(mut server) = app.state::<AppState>().server.lock() {
                    if let Some(mut child) = server.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
            }
        });
}
