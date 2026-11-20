// What the GM app needs from the machine it runs on. main.tsx passes the Tauri versions;
// tests pass in-memory ones.
import type { FileSystem, PickedFile } from "@ttrpg-helper/core";

export interface Platform {
  readonly fileSystem: FileSystem;
  readonly newId: () => string;
  /** SHA-256 of the bytes, lower-case hex. */
  readonly sha256: (bytes: Uint8Array) => Promise<string>;
  /** Opens the image file picker; empty when the GM cancels. */
  readonly pickImages: () => Promise<readonly PickedFile[]>;
}

/** SHA-256 with Web Crypto, as lower-case hex. */
export async function webCryptoSha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
