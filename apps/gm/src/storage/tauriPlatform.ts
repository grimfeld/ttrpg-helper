// The GM app's Platform on Tauri: the fs plugin, the Rust image picker, Web Crypto, the
// asset protocol and the Broadcast window.
import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { type Platform, webCryptoSha256 } from "../platform";
import { pickImages } from "./pickImages";
import { tauriBroadcast } from "./tauriBroadcast";
import { tauriFileSystem } from "./tauriFileSystem";

export const tauriPlatform: Platform = {
  fileSystem: tauriFileSystem,
  newId: () => crypto.randomUUID(),
  sha256: webCryptoSha256,
  pickImages,
  mediaUrl: async (path) =>
    convertFileSrc(await join(await appDataDir(), path)),
  broadcast: tauriBroadcast,
};
