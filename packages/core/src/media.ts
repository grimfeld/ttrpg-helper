/**
 * Media: images the GM imported into a Campaign (ADR-0005). Each file is stored once, at
 * `media/<sha256>.<extension>`, and indexed in `media.json`.
 */
import { campaignFolder } from "./campaigns";
import {
  createDocumentStore,
  type DocumentStoreOptions,
  type DocumentType,
} from "./documents";
import { type FileSystem, joinPath, parentOf } from "./fileSystem";
import { isRecord, isString } from "./guards";

export type MediaExtension = "png" | "jpg" | "webp";

export interface Media {
  /** A UUID. */
  readonly id: string;
  /** SHA-256 of the file, lower-case hex. */
  readonly contentHash: string;
  readonly originalName: string;
  readonly extension: MediaExtension;
}

/** The extension a file name is stored under: lower case, `jpeg` as `jpg`. */
export function normaliseExtension(
  fileName: string
): MediaExtension | undefined {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1) return undefined;
  const extension = fileName.slice(dot + 1).toLowerCase();
  switch (extension) {
    case "png":
    case "jpg":
    case "webp":
      return extension;
    case "jpeg":
      return "jpg";
    default:
      return undefined;
  }
}

/** The image type a file's first bytes announce, whatever its name says. */
export function sniffImage(bytes: Uint8Array): MediaExtension | undefined {
  const at = (offset: number, ...expected: number[]) =>
    expected.every((byte, i) => bytes[offset + i] === byte);
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (at(0, 0xff, 0xd8, 0xff)) return "jpg";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50))
    return "webp";
  return undefined;
}

const HEX_SHA256 = /^[0-9a-f]{64}$/;
const EXTENSIONS: readonly string[] = ["png", "jpg", "webp"];

function parseMedia(value: unknown): Media | undefined {
  if (!isRecord(value)) return undefined;
  const { id, contentHash, originalName, extension } = value;
  if (!isString(id) || id === "") return undefined;
  if (!isString(contentHash) || !HEX_SHA256.test(contentHash)) return undefined;
  if (!isString(originalName)) return undefined;
  if (!isString(extension) || !EXTENSIONS.includes(extension)) return undefined;
  return {
    id,
    contentHash,
    originalName,
    extension: extension as MediaExtension,
  };
}

export interface MediaIndex {
  readonly media: readonly Media[];
}

/** `media.json`, version 1: `{ schemaVersion, media: [{ id, contentHash, originalName, extension }] }`. */
export const mediaDocument: DocumentType<MediaIndex> = {
  name: "media index",
  version: 1,
  migrations: {},
  parse({ media }) {
    if (!Array.isArray(media)) return undefined;
    const parsed = media.map(parseMedia);
    if (parsed.some((item) => item === undefined)) return undefined;
    return { media: parsed.filter((item) => item !== undefined) };
  },
  serialize: ({ media }) => ({ media: media.map((item) => ({ ...item })) }),
};

export function mediaIndexFile(campaignId: string): string {
  return joinPath(campaignFolder(campaignId), "media.json");
}

/** Where a Media file is stored, relative to the app data folder. */
export function mediaFile(campaignId: string, media: Media): string {
  return joinPath(
    campaignFolder(campaignId),
    "media",
    `${media.contentHash}.${media.extension}`
  );
}

/** A file the GM picked, read lazily so one unreadable file doesn't stop the batch. */
export interface PickedFile {
  readonly name: string;
  read(): Promise<Uint8Array>;
}

export interface ImportResult {
  /** Every Media now in the Campaign, in import order. */
  readonly media: readonly Media[];
  /** Files that were not imported, each with why. */
  readonly failed: readonly {
    readonly name: string;
    readonly reason: string;
  }[];
}

export interface MediaLibrary {
  list(): Promise<readonly Media[]>;
  /** Imports a batch; a file already in the Campaign reuses its Media. */
  import(files: readonly PickedFile[]): Promise<ImportResult>;
}

export interface MediaLibraryOptions extends DocumentStoreOptions {
  readonly newId: () => string;
  /** SHA-256 of the bytes, lower-case hex. The GM app uses Web Crypto. */
  readonly sha256: (bytes: Uint8Array) => Promise<string>;
}

export function createMediaLibrary(
  fileSystem: FileSystem,
  campaignId: string,
  options: MediaLibraryOptions
): MediaLibrary {
  const store = createDocumentStore(fileSystem, options);
  const indexFile = mediaIndexFile(campaignId);
  const read = async () =>
    (await store.read(indexFile, mediaDocument))?.media ?? [];

  return {
    list: read,
    async import(files) {
      const media = [...(await read())];
      const failed: { name: string; reason: string }[] = [];
      for (const file of files) {
        const extension = normaliseExtension(file.name);
        if (extension === undefined) {
          failed.push({
            name: file.name,
            reason: "isn't a PNG, JPG or WebP file",
          });
          continue;
        }
        let bytes: Uint8Array;
        try {
          bytes = await file.read();
        } catch {
          failed.push({ name: file.name, reason: "couldn't be read" });
          continue;
        }
        if (sniffImage(bytes) !== extension) {
          failed.push({
            name: file.name,
            reason: "isn't a readable PNG, JPG or WebP image",
          });
          continue;
        }
        const contentHash = await options.sha256(bytes);
        if (media.some((item) => item.contentHash === contentHash)) continue;
        const item: Media = {
          id: options.newId(),
          contentHash,
          originalName: file.name,
          extension,
        };
        const target = mediaFile(campaignId, item);
        await fileSystem.makeDirectory(parentOf(target));
        await fileSystem.writeBytes(target, bytes);
        media.push(item);
      }
      await store.write(indexFile, mediaDocument, { media });
      return { media, failed };
    },
  };
}
