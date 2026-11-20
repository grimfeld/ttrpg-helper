// The GM app's Platform on Tauri: the fs plugin, the open dialog, Web Crypto.
import { type Platform, webCryptoSha256 } from "../platform";
import { pickImages } from "./pickImages";
import { tauriFileSystem } from "./tauriFileSystem";

export const tauriPlatform: Platform = {
  fileSystem: tauriFileSystem,
  newId: () => crypto.randomUUID(),
  sha256: webCryptoSha256,
  pickImages,
};
