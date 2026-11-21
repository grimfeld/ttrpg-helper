fn main() {
    // Declaring the app's own commands puts them under the capabilities, so only the main
    // window can pick and read images; the Broadcast window can't (ADR-0006).
    let commands = tauri_build::AppManifest::new().commands(&["pick_images", "read_picked_image"]);
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(commands))
        .expect("tauri-build failed");
}
