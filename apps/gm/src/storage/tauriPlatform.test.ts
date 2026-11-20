import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({ BaseDirectory: { AppData: 14 } }));

const { tauriPlatform } = await import("./tauriPlatform");

describe("tauriPlatform", () => {
  it("makes UUIDs and SHA-256 hex digests", async () => {
    expect(tauriPlatform.newId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(await tauriPlatform.sha256(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });
});
