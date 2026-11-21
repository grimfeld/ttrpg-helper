// An in-memory Platform for tests: files in memory, predictable ids, a picker tests can load.
import {
  type BroadcastProjection,
  createMemoryFileSystem,
  type FileSystem,
  type PickedFile,
} from "@ttrpg-helper/core";
import type { Platform } from "./platform";
import { webCryptoSha256 } from "./platform";

export interface TestPlatform extends Platform {
  /** The files the next Import picks; empty means the GM cancels. */
  nextPick: readonly PickedFile[];
  /** The fake Broadcast window. */
  readonly broadcastWindow: FakeBroadcastWindow;
}

/** Records what the main window sends, and plays a Broadcast window opening. */
export interface FakeBroadcastWindow {
  readonly sent: BroadcastProjection[];
  opened: number;
  fullscreenToggles: number;
  /** A Broadcast window opens and asks for what is on air. */
  ready(): void;
}

export function testPlatform(
  fileSystem: FileSystem = createMemoryFileSystem()
): TestPlatform {
  let ids = 0;
  const readyCallbacks = new Set<() => void>();
  const broadcastWindow: FakeBroadcastWindow = {
    sent: [],
    opened: 0,
    fullscreenToggles: 0,
    ready: () => {
      for (const callback of readyCallbacks) callback();
    },
  };
  const platform: TestPlatform = {
    broadcastWindow,
    broadcast: {
      open: () => {
        broadcastWindow.opened += 1;
        return Promise.resolve();
      },
      toggleFullscreen: () => {
        broadcastWindow.fullscreenToggles += 1;
        return Promise.resolve();
      },
      send: (projection) => {
        broadcastWindow.sent.push(projection);
      },
      onReady: (callback) => {
        readyCallbacks.add(callback);
        return () => {
          readyCallbacks.delete(callback);
        };
      },
    },
    fileSystem,
    newId: () => `id-${String(++ids)}`,
    sha256: webCryptoSha256,
    nextPick: [],
    pickImages: () => Promise.resolve(platform.nextPick),
    mediaUrl: (path) => Promise.resolve(`test-asset://${path}`),
  };
  return platform;
}

/** A picked file holding these bytes. */
export function picked(name: string, bytes: Uint8Array): PickedFile {
  return { name, read: () => Promise.resolve(bytes) };
}

export const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1,
]);
export const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 2]);
