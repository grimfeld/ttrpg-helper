import { beforeEach, describe, expect, it, vi } from "vitest";

const plugin = vi.hoisted(() => ({
  BaseDirectory: { AppData: 14 },
  exists: vi.fn(),
  mkdir: vi.fn(),
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  rename: vi.fn(),
  writeFile: vi.fn(),
  writeTextFile: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-fs", () => plugin);

const { tauriFileSystem } = await import("./tauriFileSystem");
const appData = { baseDir: 14 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tauriFileSystem", () => {
  it("reads text from the app data folder, undefined when missing", async () => {
    plugin.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    plugin.readTextFile.mockResolvedValue("{}");
    expect(await tauriFileSystem.readText("campaigns/a/campaign.json")).toBe(
      "{}"
    );
    expect(plugin.readTextFile).toHaveBeenCalledWith(
      "campaigns/a/campaign.json",
      appData
    );
    expect(await tauriFileSystem.readText("missing.json")).toBeUndefined();
  });

  it("writes, renames and makes folders inside the app data folder", async () => {
    await tauriFileSystem.writeText("a.json", "x");
    await tauriFileSystem.writeBytes("m/a.png", new Uint8Array([1]));
    await tauriFileSystem.rename("a.json.tmp", "a.json");
    await tauriFileSystem.makeDirectory("campaigns/a");
    expect(plugin.writeTextFile).toHaveBeenCalledWith("a.json", "x", appData);
    expect(plugin.writeFile).toHaveBeenCalledWith(
      "m/a.png",
      new Uint8Array([1]),
      appData
    );
    expect(plugin.rename).toHaveBeenCalledWith("a.json.tmp", "a.json", {
      oldPathBaseDir: 14,
      newPathBaseDir: 14,
    });
    expect(plugin.mkdir).toHaveBeenCalledWith("campaigns/a", {
      ...appData,
      recursive: true,
    });
  });

  it("lists only folders, sorted, and nothing when the folder is missing", async () => {
    plugin.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    plugin.readDir.mockResolvedValue([
      { name: "b", isDirectory: true },
      { name: "notes.txt", isDirectory: false },
      { name: "a", isDirectory: true },
    ]);
    expect(await tauriFileSystem.listDirectories("campaigns")).toEqual([
      "a",
      "b",
    ]);
    expect(await tauriFileSystem.listDirectories("campaigns")).toEqual([]);
  });
});
