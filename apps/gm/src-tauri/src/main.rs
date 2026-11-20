// Bootstrap only: opens the window from tauri.conf.json. Logic belongs in Core.
// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod media_import;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(media_import::PickedImages::default())
        .invoke_handler(tauri::generate_handler![
            media_import::pick_images,
            media_import::read_picked_image
        ])
        .run(tauri::generate_context!())
        .expect("the Tauri app failed to start");
}
