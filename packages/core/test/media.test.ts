import { describe, expect, it } from "vitest";
import {
  createMediaLibrary,
  createMemoryFileSystem,
  decodeDocument,
  mediaDocument,
  mediaFile,
  normaliseExtension,
  type PickedFile,
  sniffImage,
} from "../src/index";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const PNG_2 = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 2,
]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);

const file = (name: string, bytes: Uint8Array): PickedFile => ({
  name,
  read: () => Promise.resolve(bytes),
});

// A stand-in hash: the bytes as hex, padded to 64 characters.
const fakeSha256 = (bytes: Uint8Array) =>
  Promise.resolve(
    [...bytes]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .padEnd(64, "0")
      .slice(0, 64)
  );

function setup() {
  const fileSystem = createMemoryFileSystem();
  let ids = 0;
  const options = { newId: () => `m${String(++ids)}`, sha256: fakeSha256 };
  return {
    fileSystem,
    library: createMediaLibrary(fileSystem, "c1", options),
    options,
  };
}

describe("normaliseExtension", () => {
  it.each([
    ["map.PNG", "png"],
    ["hero.jpeg", "jpg"],
    ["hero.JPG", "jpg"],
    ["tile.webp", "webp"],
    ["notes.txt", undefined],
    ["no-extension", undefined],
  ])("%s is stored as %s", (name, extension) => {
    expect(normaliseExtension(name)).toBe(extension);
  });
});

describe("sniffImage", () => {
  it("recognises PNG, JPG and WebP by their first bytes", () => {
    expect(sniffImage(PNG)).toBe("png");
    expect(sniffImage(JPG)).toBe("jpg");
    expect(sniffImage(WEBP)).toBe("webp");
    expect(sniffImage(new Uint8Array([1, 2, 3]))).toBeUndefined();
  });
});

describe("mediaDocument", () => {
  const hash = "a".repeat(64);
  it("accepts a valid index", () => {
    const text = JSON.stringify({
      schemaVersion: 1,
      media: [
        {
          id: "m1",
          contentHash: hash,
          originalName: "a.png",
          extension: "png",
        },
      ],
    });
    expect(decodeDocument(text, mediaDocument).status).toBe("ok");
  });

  it.each([
    ["media not a list", { media: {} }],
    ["an item not an object", { media: [1] }],
    [
      "an empty id",
      {
        media: [
          { id: "", contentHash: hash, originalName: "a", extension: "png" },
        ],
      },
    ],
    [
      "a short hash",
      {
        media: [
          { id: "m", contentHash: "ab", originalName: "a", extension: "png" },
        ],
      },
    ],
    ["no name", { media: [{ id: "m", contentHash: hash, extension: "png" }] }],
    [
      "an unknown extension",
      {
        media: [
          { id: "m", contentHash: hash, originalName: "a", extension: "gif" },
        ],
      },
    ],
  ])("refuses %s", (_label, fields) => {
    const text = JSON.stringify({ schemaVersion: 1, ...fields });
    expect(decodeDocument(text, mediaDocument).status).toBe("corrupt");
  });
});

describe("createMediaLibrary", () => {
  it("lists nothing before the first import", async () => {
    expect(await setup().library.list()).toEqual([]);
  });

  it("stores each image under its hash and indexes it", async () => {
    const { fileSystem, library, options } = setup();
    const result = await library.import([
      file("Map.PNG", PNG),
      file("hero.jpeg", JPG),
    ]);
    expect(result.failed).toEqual([]);
    expect(result.media.map((m) => [m.originalName, m.extension])).toEqual([
      ["Map.PNG", "png"],
      ["hero.jpeg", "jpg"],
    ]);
    const [map] = result.media;
    if (map === undefined) throw new Error("no media");
    expect(mediaFile("c1", map)).toBe(
      `campaigns/c1/media/${map.contentHash}.png`
    );
    expect(fileSystem.binaries.get(mediaFile("c1", map))).toEqual(PNG);
    // A restart: a new library on the same files.
    const reopened = createMediaLibrary(fileSystem, "c1", options);
    expect(await reopened.list()).toEqual(result.media);
  });

  it("reuses the Media of a file already in the Campaign", async () => {
    const { fileSystem, library } = setup();
    await library.import([file("a.png", PNG)]);
    const again = await library.import([
      file("copy-of-a.png", PNG),
      file("b.png", PNG_2),
    ]);
    expect(again.media.map((m) => m.originalName)).toEqual(["a.png", "b.png"]);
    expect(fileSystem.binaries.size).toBe(2);
  });

  it("imports the rest of a batch when one file is bad, and says why", async () => {
    const { library } = setup();
    const unreadable: PickedFile = {
      name: "locked.png",
      read: () => Promise.reject(new Error("permission denied")),
    };
    const result = await library.import([
      file("notes.txt", PNG),
      unreadable,
      file("fake.png", new Uint8Array([1, 2, 3])),
      file("ok.webp", WEBP),
    ]);
    expect(result.media.map((m) => m.originalName)).toEqual(["ok.webp"]);
    expect(result.failed).toEqual([
      { name: "notes.txt", reason: "isn't a PNG, JPG or WebP file" },
      { name: "locked.png", reason: "couldn't be read" },
      { name: "fake.png", reason: "isn't a readable PNG, JPG or WebP image" },
    ]);
  });
});
