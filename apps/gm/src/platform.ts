// What the GM app needs from the machine it runs on. main.tsx passes the Tauri versions;
// tests pass in-memory ones.
import type {
  BroadcastProjection,
  FileSystem,
  PickedFile,
} from "@ttrpg-helper/core";

export interface Platform {
  readonly fileSystem: FileSystem;
  readonly newId: () => string;
  /** SHA-256 of the bytes, lower-case hex. */
  readonly sha256: (bytes: Uint8Array) => Promise<string>;
  /** Opens the image file picker; empty when the GM cancels. */
  readonly pickImages: () => Promise<readonly PickedFile[]>;
  /** A URL the webview can show for a file in the app data folder (the asset protocol). */
  readonly mediaUrl: (path: string) => Promise<string>;
  /** The main window's side of the Broadcast window. */
  readonly broadcast: BroadcastLink;
}

/** How the main window drives the Broadcast window (ADR-0006). */
export interface BroadcastLink {
  /** Opens the Broadcast window, or brings it forward when it is open. */
  open(): Promise<void>;
  /** Toggles the Broadcast window's fullscreen, when it is open. */
  toggleFullscreen(): Promise<void>;
  /** Sends the Broadcast window the latest projection; nothing happens when it is closed. */
  send(projection: BroadcastProjection): void;
  /** Calls back when a Broadcast window opens and asks for what is on air. */
  onReady(callback: () => void): () => void;
}

/** The Broadcast window's side: it only receives projections, and can ask for one. */
export interface BroadcastReceiver {
  onProjection(callback: (payload: unknown) => void): () => void;
  /** Asks the main window for what is on air. */
  ready(): void;
  /** Asks the main window to leave fullscreen (Esc). */
  escape(): void;
}

/** SHA-256 with Web Crypto, as lower-case hex. */
export async function webCryptoSha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
