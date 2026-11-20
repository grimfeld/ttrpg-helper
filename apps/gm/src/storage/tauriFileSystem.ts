// Core's FileSystem port, implemented with Tauri's fs plugin. Every path is relative to the
// app data folder, the only place the GM app's capability lets the plugin reach (ADR-0005).
import type { FileSystem } from "@ttrpg-helper/core";
import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
  rename,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";

const appData = { baseDir: BaseDirectory.AppData };

export const tauriFileSystem: FileSystem = {
  async readText(path) {
    if (!(await exists(path, appData))) return undefined;
    return readTextFile(path, appData);
  },
  writeText: (path, text) => writeTextFile(path, text, appData),
  writeBytes: (path, bytes) => writeFile(path, bytes, appData),
  rename: (from, to) =>
    rename(from, to, {
      oldPathBaseDir: BaseDirectory.AppData,
      newPathBaseDir: BaseDirectory.AppData,
    }),
  makeDirectory: (path) => mkdir(path, { ...appData, recursive: true }),
  async listDirectories(path) {
    if (!(await exists(path, appData))) return [];
    const entries = await readDir(path, appData);
    return entries
      .filter((entry) => entry.isDirectory)
      .map((entry) => entry.name)
      .sort();
  },
};
