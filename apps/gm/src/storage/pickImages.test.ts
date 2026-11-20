import { beforeEach, describe, expect, it, vi } from "vitest";

const dialog = vi.hoisted(() => ({ open: vi.fn() }));
const fs = vi.hoisted(() => ({
  BaseDirectory: { AppData: 14 },
  readFile: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-dialog", () => dialog);
vi.mock("@tauri-apps/plugin-fs", () => fs);

const { pickImages } = await import("./pickImages");
const { tauriPlatform } = await import("./tauriPlatform");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("pickImages", () => {
  it("opens a picker for several images and reads each file when asked", async () => {
    dialog.open.mockResolvedValue([
      "/home/gm/maps/Map.PNG",
      "C:\\gm\\hero.jpeg",
    ]);
    fs.readFile.mockResolvedValue(new Uint8Array([7]));
    const files = await pickImages();
    expect(dialog.open).toHaveBeenCalledWith({
      multiple: true,
      directory: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    expect(files.map((file) => file.name)).toEqual(["Map.PNG", "hero.jpeg"]);
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(await files[0]?.read()).toEqual(new Uint8Array([7]));
    expect(fs.readFile).toHaveBeenCalledWith("/home/gm/maps/Map.PNG");
  });

  it("picks nothing when the GM cancels", async () => {
    dialog.open.mockResolvedValue(null);
    expect(await pickImages()).toEqual([]);
  });
});

describe("tauriPlatform", () => {
  it("makes UUIDs and SHA-256 hex digests", async () => {
    expect(tauriPlatform.newId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(await tauriPlatform.sha256(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });
});
