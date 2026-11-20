// The image picker: Tauri's open dialog, several files at once. The dialog lets the fs plugin
// read exactly the files the GM picked, and nothing else outside the app data folder.
import type { PickedFile } from "@ttrpg-helper/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";

export async function pickImages(): Promise<readonly PickedFile[]> {
  const picked = await open({
    multiple: true,
    directory: false,
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
  });
  if (picked === null) return [];
  return picked.map((path) => ({
    name: path.split(/[\\/]/).pop() ?? path,
    read: () => readFile(path),
  }));
}
