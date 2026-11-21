import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  createMemoryFileSystem,
  type MemoryFileSystem,
  type Overlay,
} from "@ttrpg-helper/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { JPG, PNG, picked, testPlatform } from "./testPlatform";

// The canvas is 800×450 px in these tests.
beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 800, height: 450 })
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function sceneWithImages(fileSystem: MemoryFileSystem) {
  const platform = testPlatform(fileSystem);
  render(<App platform={platform} />);
  fireEvent.click(await screen.findByRole("button", { name: "New Campaign" }));
  fireEvent.change(screen.getByLabelText("Campaign name"), {
    target: { value: "Keep" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  await screen.findByRole("region", { name: "Media" });
  platform.nextPick = [picked("token.png", PNG), picked("letter.jpg", JPG)];
  fireEvent.click(screen.getByRole("button", { name: "Import" }));
  await screen.findByText("letter.jpg");
  fireEvent.click(screen.getByRole("button", { name: "New Scene" }));
}

function editor() {
  return within(screen.getByRole("region", { name: "Scene editor" }));
}

function addOverlay(name: string) {
  fireEvent.click(editor().getByRole("button", { name: "Add Overlay" }));
  fireEvent.click(
    within(editor().getByRole("list", { name: "Choose an image" })).getByRole(
      "button",
      { name }
    )
  );
}

function overlayRows() {
  return within(editor().getByRole("list", { name: "Overlays, top last" }));
}

function storedOverlays(fileSystem: MemoryFileSystem): Overlay[] {
  const file = [...fileSystem.files.keys()].find((path) =>
    path.endsWith("/scenes.json")
  );
  const text = file === undefined ? undefined : fileSystem.files.get(file);
  if (text === undefined) return [];
  const stored = JSON.parse(text) as { scenes: { overlays: Overlay[] }[] };
  return stored.scenes[0]?.overlays ?? [];
}

describe("Overlays", () => {
  it("places a chosen image as a Hidden Overlay above the Backgrounds", async () => {
    const fileSystem = createMemoryFileSystem();
    await sceneWithImages(fileSystem);
    fireEvent.click(editor().getByRole("button", { name: "Add Background" }));
    fireEvent.click(
      within(editor().getByRole("list", { name: "Choose an image" })).getByRole(
        "button",
        { name: "letter.jpg" }
      )
    );
    addOverlay("token.png");
    const box = editor().getByLabelText("Overlay token.png");
    expect(box.className).toBe("placement hidden");
    expect(overlayRows().getByRole("button", { name: "Show" })).toBeDefined();
    const canvas = editor().getByLabelText("Canvas");
    expect(
      [...canvas.querySelectorAll(".placement")].map((el) =>
        el.getAttribute("aria-label")
      )
    ).toEqual([null, "Overlay token.png"]);
    await waitFor(() => {
      expect(storedOverlays(fileSystem)).toEqual([
        expect.objectContaining({
          position: { x: 0.5, y: 0.5 },
          visible: false,
        }),
      ]);
    });
  });

  it("moves an Overlay up and down the stack", async () => {
    await sceneWithImages(createMemoryFileSystem());
    addOverlay("token.png");
    addOverlay("letter.jpg");
    const names = () =>
      overlayRows()
        .getAllByRole("listitem")
        .map((row) => row.querySelector(".placement-name")?.textContent);
    expect(names()).toEqual(["token.png", "letter.jpg"]);
    expect(
      overlayRows().getByRole<HTMLButtonElement>("button", {
        name: "Move letter.jpg up",
      }).disabled
    ).toBe(true);
    fireEvent.click(
      overlayRows().getByRole("button", { name: "Move token.png up" })
    );
    expect(names()).toEqual(["letter.jpg", "token.png"]);
    fireEvent.click(
      overlayRows().getByRole("button", { name: "Move token.png down" })
    );
    expect(names()).toEqual(["token.png", "letter.jpg"]);
  });

  it("shows, hides and removes an Overlay", async () => {
    await sceneWithImages(createMemoryFileSystem());
    addOverlay("token.png");
    fireEvent.click(overlayRows().getByRole("button", { name: "Show" }));
    expect(editor().getByLabelText("Overlay token.png").className).toBe(
      "placement"
    );
    fireEvent.click(overlayRows().getByRole("button", { name: "Hide" }));
    expect(editor().getByLabelText("Overlay token.png").className).toBe(
      "placement hidden"
    );
    fireEvent.click(
      overlayRows().getByRole("button", { name: "Remove token.png" })
    );
    expect(editor().queryByLabelText("Overlay token.png")).toBeNull();
  });

  it("shows the Missing image placeholder for an Overlay whose file won't load", async () => {
    await sceneWithImages(createMemoryFileSystem());
    addOverlay("token.png");
    fireEvent.error(await editor().findByRole("img", { name: "token.png" }));
    expect(
      within(editor().getByLabelText("Overlay token.png")).getByRole("img", {
        name: "Missing image",
      })
    ).toBeDefined();
  });

  it("moves an Overlay by dragging, saved on release and not before", async () => {
    const fileSystem = createMemoryFileSystem();
    await sceneWithImages(fileSystem);
    addOverlay("token.png");
    const box = editor().getByLabelText("Overlay token.png");
    await waitFor(() => {
      expect(storedOverlays(fileSystem)).toHaveLength(1);
    });

    fireEvent.mouseDown(box, { button: 0, clientX: 400, clientY: 225 });
    expect(box.getAttribute("data-gesture")).toBe("move");
    fireEvent.mouseMove(window, { clientX: 480, clientY: 270 });
    expect(storedOverlays(fileSystem)[0]?.position).toEqual({ x: 0.5, y: 0.5 });
    fireEvent.mouseUp(window, { clientX: 480, clientY: 270 });

    await waitFor(() => {
      const position = storedOverlays(fileSystem)[0]?.position;
      expect(position?.x).toBeCloseTo(0.6);
      expect(position?.y).toBeCloseTo(0.6);
    });
    expect(box.getAttribute("data-gesture")).toBeNull();
  });

  it("keeps a dragged Overlay's centre on the canvas", async () => {
    const fileSystem = createMemoryFileSystem();
    await sceneWithImages(fileSystem);
    addOverlay("token.png");
    const box = editor().getByLabelText("Overlay token.png");
    fireEvent.mouseDown(box, { button: 0, clientX: 400, clientY: 225 });
    fireEvent.mouseUp(window, { clientX: 2000, clientY: -900 });
    await waitFor(() => {
      expect(storedOverlays(fileSystem)[0]?.position).toEqual({ x: 1, y: 0 });
    });
  });

  it("resizes an Overlay from its corner handle, saved on release", async () => {
    const fileSystem = createMemoryFileSystem();
    await sceneWithImages(fileSystem);
    addOverlay("token.png");
    const handle = editor().getByLabelText("Resize token.png");
    fireEvent.mouseDown(handle, { button: 0, clientX: 500, clientY: 300 });
    fireEvent.mouseUp(window, { clientX: 520, clientY: 345 });
    await waitFor(() => {
      expect(storedOverlays(fileSystem)[0]?.height).toBeCloseTo(1 / 3 + 0.2);
    });
    // The move gesture didn't fire too.
    expect(storedOverlays(fileSystem)[0]?.position).toEqual({ x: 0.5, y: 0.5 });
  });

  it("ignores a click without movement and a right-button press", async () => {
    const fileSystem = createMemoryFileSystem();
    await sceneWithImages(fileSystem);
    addOverlay("token.png");
    await waitFor(() => {
      expect(storedOverlays(fileSystem)).toHaveLength(1);
    });
    const saved = fileSystem.files.get(
      [...fileSystem.files.keys()].find((p) => p.endsWith("/scenes.json")) ?? ""
    );
    const box = editor().getByLabelText("Overlay token.png");
    fireEvent.mouseDown(box, { button: 0, clientX: 400, clientY: 225 });
    fireEvent.mouseUp(window, { clientX: 400, clientY: 225 });
    fireEvent.mouseDown(box, { button: 2, clientX: 400, clientY: 225 });
    expect(box.getAttribute("data-gesture")).toBeNull();
    fireEvent.mouseUp(window, { clientX: 600, clientY: 300 });
    expect(
      fileSystem.files.get(
        [...fileSystem.files.keys()].find((p) => p.endsWith("/scenes.json")) ??
          ""
      )
    ).toBe(saved);
  });

  it("keeps every Overlay edit after a restart", async () => {
    const fileSystem = createMemoryFileSystem();
    await sceneWithImages(fileSystem);
    addOverlay("token.png");
    fireEvent.click(overlayRows().getByRole("button", { name: "Show" }));
    const box = editor().getByLabelText("Overlay token.png");
    fireEvent.mouseDown(box, { button: 0, clientX: 400, clientY: 225 });
    fireEvent.mouseUp(window, { clientX: 320, clientY: 180 });
    await waitFor(() => {
      expect(storedOverlays(fileSystem)[0]).toMatchObject({ visible: true });
      expect(storedOverlays(fileSystem)[0]?.position.x).toBeCloseTo(0.4);
    });

    cleanup();
    render(<App platform={testPlatform(fileSystem)} />);
    fireEvent.click(await screen.findByRole("button", { name: "Keep" }));
    fireEvent.click(await screen.findByRole("button", { name: "Scene 1" }));
    const again = editor().getByLabelText("Overlay token.png");
    expect(again.className).toBe("placement");
    expect(again.style.left).not.toBe("");
  });
});
