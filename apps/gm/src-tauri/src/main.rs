// Bootstrap only: opens the window from tauri.conf.json. Logic belongs in Core.
// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("the Tauri app failed to start");
}
