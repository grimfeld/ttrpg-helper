// The image picker. It runs in Rust (src-tauri/src/media_import.rs), so picking a file never
// widens what the webview can reach: each file is read once, by its index in the latest pick.
import type { PickedFile } from "@ttrpg-helper/core";
import { invoke } from "@tauri-apps/api/core";

export async function pickImages(): Promise<readonly PickedFile[]> {
  const names = await invoke<string[]>("pick_images");
  return names.map((name, index) => ({
    name,
    read: async () =>
      new Uint8Array(await invoke<ArrayBuffer>("read_picked_image", { index })),
  }));
}
