import { beforeEach, describe, expect, it, vi } from "vitest";

const core = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => core);

const { pickImages } = await import("./pickImages");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("pickImages", () => {
  it("picks in Rust and reads each file by its index when asked", async () => {
    core.invoke.mockResolvedValueOnce(["Map.PNG", "hero.jpeg"]);
    const files = await pickImages();
    expect(core.invoke).toHaveBeenCalledWith("pick_images");
    expect(files.map((file) => file.name)).toEqual(["Map.PNG", "hero.jpeg"]);

    core.invoke.mockResolvedValueOnce(new Uint8Array([7, 8]).buffer);
    expect(await files[1]?.read()).toEqual(new Uint8Array([7, 8]));
    expect(core.invoke).toHaveBeenLastCalledWith("read_picked_image", {
      index: 1,
    });
  });

  it("picks nothing when the GM cancels", async () => {
    core.invoke.mockResolvedValueOnce([]);
    expect(await pickImages()).toEqual([]);
  });
});
