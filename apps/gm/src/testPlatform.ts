// An in-memory Platform for tests: files in memory, predictable ids, a picker tests can load.
import {
  createMemoryFileSystem,
  type FileSystem,
  type PickedFile,
} from "@ttrpg-helper/core";
import type { Platform } from "./platform";
import { webCryptoSha256 } from "./platform";

export interface TestPlatform extends Platform {
  /** The files the next Import picks; empty means the GM cancels. */
  nextPick: readonly PickedFile[];
}

export function testPlatform(
  fileSystem: FileSystem = createMemoryFileSystem()
): TestPlatform {
  let ids = 0;
  const platform: TestPlatform = {
    fileSystem,
    newId: () => `id-${String(++ids)}`,
    sha256: webCryptoSha256,
    nextPick: [],
    pickImages: () => Promise.resolve(platform.nextPick),
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
