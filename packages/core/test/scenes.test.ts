import { describe, expect, it } from "vitest";
import {
  addBackground,
  addOverlay,
  moveOverlay,
  OVERLAY_MIN_HEIGHT,
  overlayRect,
  removeOverlay,
  reorderOverlay,
  resizeOverlay,
  setOverlayVisible,
  checkSceneName,
  checkSceneTitle,
  createMemoryFileSystem,
  createScene,
  createSceneStore,
  decodeDocument,
  deleteScene,
  fitRect,
  removeBackground,
  renameScene,
  type Scene,
  scenesDocument,
  scenesFile,
  setBackgroundFit,
  setBackgroundVisible,
  setSceneTitle,
  updateScene,
} from "../src/index";

const scene = (overrides: Partial<Scene> = {}): Scene => ({
  id: "s1",
  name: "Scene 1",
  title: "",
  backgrounds: [],
  overlays: [],
  ...overrides,
});

describe("Scene names and titles", () => {
  it("trims a name and refuses empty or over 80 characters", () => {
    expect(checkSceneName(" Tavern ")).toEqual({ ok: true, value: "Tavern" });
    expect(checkSceneName("  ")).toEqual({
      ok: false,
      reason: "Give the Scene a name.",
    });
    expect(checkSceneName("x".repeat(80)).ok).toBe(true);
    expect(checkSceneName("x".repeat(81))).toEqual({
      ok: false,
      reason: "Use at most 80 characters.",
    });
  });

  it("accepts an empty title and refuses over 120 characters", () => {
    expect(checkSceneTitle("  ")).toEqual({ ok: true, value: "" });
    expect(checkSceneTitle("x".repeat(120)).ok).toBe(true);
    expect(checkSceneTitle("x".repeat(121))).toEqual({
      ok: false,
      reason: "Use at most 120 characters.",
    });
  });
});

describe("Scene edits", () => {
  it("names a new Scene after the highest Scene number so far", () => {
    const one = createScene([], "a");
    expect(one.map((s) => s.name)).toEqual(["Scene 1"]);
    const renamed = updateScene(
      createScene(one, "b"),
      "a",
      renameScene("Tavern")
    );
    expect(createScene(renamed, "c").map((s) => s.name)).toEqual([
      "Tavern",
      "Scene 2",
      "Scene 3",
    ]);
    expect(createScene([scene({ name: "Scene 7" })], "x").at(-1)?.name).toBe(
      "Scene 8"
    );
    expect(createScene([], "a")[0]).toEqual({
      id: "a",
      name: "Scene 1",
      title: "",
      backgrounds: [],
      overlays: [],
    });
  });

  it("sets a title and deletes a Scene", () => {
    const scenes = updateScene([scene()], "s1", setSceneTitle("The Tavern"));
    expect(scenes[0]?.title).toBe("The Tavern");
    expect(updateScene(scenes, "other", setSceneTitle("x"))).toEqual(scenes);
    expect(deleteScene(scenes, "s1")).toEqual([]);
  });

  it("places a Background on top, Hidden and Cover", () => {
    const placed = addBackground(
      "b2",
      "m2"
    )(addBackground("b1", "m1")(scene()));
    expect(placed.backgrounds).toEqual([
      { id: "b1", mediaId: "m1", fit: "cover", visible: false },
      { id: "b2", mediaId: "m2", fit: "cover", visible: false },
    ]);
  });

  it("changes fit and visibility of one Background, and removes it", () => {
    const placed = addBackground(
      "b2",
      "m2"
    )(addBackground("b1", "m1")(scene()));
    const edited = setBackgroundVisible(
      "b1",
      true
    )(setBackgroundFit("b1", "contain")(placed));
    expect(edited.backgrounds[0]).toEqual({
      id: "b1",
      mediaId: "m1",
      fit: "contain",
      visible: true,
    });
    expect(edited.backgrounds[1]).toEqual(placed.backgrounds[1]);
    expect(removeBackground("b1")(edited).backgrounds.map((b) => b.id)).toEqual(
      ["b2"]
    );
  });
});

describe("fitRect", () => {
  it("fills a 16:9 canvas exactly with a 16:9 image either way", () => {
    expect(fitRect({ width: 1600, height: 900 }, "cover")).toEqual({
      left: 0,
      top: 0,
      width: 1,
      height: 1,
    });
    expect(fitRect({ width: 1600, height: 900 }, "contain")).toEqual({
      left: 0,
      top: 0,
      width: 1,
      height: 1,
    });
  });

  it("covers a square image by cropping top and bottom", () => {
    const rect = fitRect({ width: 100, height: 100 }, "cover");
    expect(rect.width).toBe(1);
    expect(rect.height).toBeCloseTo(16 / 9);
    expect(rect.top).toBeCloseTo((1 - 16 / 9) / 2);
  });

  it("contains a square image with bars left and right", () => {
    const rect = fitRect({ width: 100, height: 100 }, "contain");
    expect(rect.height).toBe(1);
    expect(rect.width).toBeCloseTo(9 / 16);
    expect(rect.left).toBeCloseTo((1 - 9 / 16) / 2);
  });

  it("covers a panorama by cropping the sides and contains it with bars above and below", () => {
    const panorama = { width: 3000, height: 1000 };
    expect(fitRect(panorama, "cover").height).toBe(1);
    expect(fitRect(panorama, "cover").width).toBeCloseTo(3 / (16 / 9));
    expect(fitRect(panorama, "contain").width).toBe(1);
    expect(fitRect(panorama, "contain").height).toBeCloseTo(16 / 9 / 3);
  });

  it("fills the canvas for an image with no size yet", () => {
    expect(fitRect({ width: 0, height: 0 }, "contain")).toEqual({
      left: 0,
      top: 0,
      width: 1,
      height: 1,
    });
  });
});

describe("scenesDocument", () => {
  const valid = {
    id: "s1",
    name: "Tavern",
    title: "",
    backgrounds: [{ id: "b1", mediaId: "m1", fit: "cover", visible: true }],
    overlays: [
      {
        id: "o1",
        mediaId: "m2",
        position: { x: 0.5, y: 0.25 },
        height: 0.3,
        visible: false,
      },
    ],
  };
  const decode = (scenes: unknown) =>
    decodeDocument(JSON.stringify({ schemaVersion: 1, scenes }), scenesDocument)
      .status;

  it("accepts Scenes with Backgrounds and Overlays", () => {
    expect(decode([valid])).toBe("ok");
  });

  it.each([
    ["scenes not a list", {}],
    ["a Scene not an object", [1]],
    ["an empty name", [{ ...valid, name: "" }]],
    ["a long title", [{ ...valid, title: "x".repeat(121) }]],
    ["backgrounds missing", [{ ...valid, backgrounds: undefined }]],
    [
      "an unknown fit",
      [
        {
          ...valid,
          backgrounds: [
            { id: "b", mediaId: "m", fit: "stretch", visible: true },
          ],
        },
      ],
    ],
    [
      "a Background without visible",
      [{ ...valid, backgrounds: [{ id: "b", mediaId: "m", fit: "cover" }] }],
    ],
    [
      "an Overlay off the canvas",
      [
        {
          ...valid,
          overlays: [{ ...valid.overlays[0], position: { x: 1.5, y: 0 } }],
        },
      ],
    ],
    [
      "an Overlay with no height",
      [{ ...valid, overlays: [{ ...valid.overlays[0], height: 0 }] }],
    ],
    [
      "an Overlay without a position",
      [{ ...valid, overlays: [{ ...valid.overlays[0], position: null }] }],
    ],
    ["an Overlay not an object", [{ ...valid, overlays: ["x"] }]],
    ["a Background not an object", [{ ...valid, backgrounds: [null] }]],
  ])("refuses %s", (_label, scenes) => {
    expect(decode(scenes)).toBe("corrupt");
  });
});

describe("createSceneStore", () => {
  it("loads nothing before the first save, and saves the whole list", async () => {
    const fileSystem = createMemoryFileSystem();
    await fileSystem.makeDirectory("campaigns/c1");
    const store = createSceneStore(fileSystem, "c1");
    expect(await store.load()).toEqual([]);
    const scenes = createScene([], "s1");
    await store.save(scenes);
    expect(JSON.parse(fileSystem.files.get(scenesFile("c1")) ?? "")).toEqual({
      schemaVersion: 1,
      scenes: [
        { id: "s1", name: "Scene 1", title: "", backgrounds: [], overlays: [] },
      ],
    });
    expect(await createSceneStore(fileSystem, "c1").load()).toEqual(scenes);
  });
});

describe("Overlay edits", () => {
  const withTwo = () => addOverlay("o2", "m2")(addOverlay("o1", "m1")(scene()));

  it("places a Media as the top Overlay, Hidden and centred", () => {
    expect(withTwo().overlays).toEqual([
      {
        id: "o1",
        mediaId: "m1",
        position: { x: 0.5, y: 0.5 },
        height: 1 / 3,
        visible: false,
      },
      {
        id: "o2",
        mediaId: "m2",
        position: { x: 0.5, y: 0.5 },
        height: 1 / 3,
        visible: false,
      },
    ]);
  });

  it("moves an Overlay's centre and keeps it on the canvas", () => {
    expect(
      moveOverlay("o1", 0.25, 0.75)(withTwo()).overlays[0]?.position
    ).toEqual({ x: 0.25, y: 0.75 });
    expect(
      moveOverlay("o1", -0.5, 1.4)(withTwo()).overlays[0]?.position
    ).toEqual({ x: 0, y: 1 });
    expect(moveOverlay("o1", 0.1, 0.1)(withTwo()).overlays[1]).toEqual(
      withTwo().overlays[1]
    );
  });

  it("resizes an Overlay between the minimum and the canvas height", () => {
    expect(resizeOverlay("o1", 0.5)(withTwo()).overlays[0]?.height).toBe(0.5);
    expect(resizeOverlay("o1", 3)(withTwo()).overlays[0]?.height).toBe(1);
    expect(resizeOverlay("o1", -1)(withTwo()).overlays[0]?.height).toBe(
      OVERLAY_MIN_HEIGHT
    );
  });

  it("shows, hides and removes one Overlay", () => {
    const shown = setOverlayVisible("o2", true)(withTwo());
    expect(shown.overlays.map((o) => o.visible)).toEqual([false, true]);
    expect(removeOverlay("o1")(shown).overlays.map((o) => o.id)).toEqual([
      "o2",
    ]);
  });

  it("moves an Overlay up or down the stack, and not past either end", () => {
    const ids = (s: Scene) => s.overlays.map((o) => o.id);
    expect(ids(reorderOverlay("o1", "up")(withTwo()))).toEqual(["o2", "o1"]);
    expect(ids(reorderOverlay("o2", "down")(withTwo()))).toEqual(["o2", "o1"]);
    expect(ids(reorderOverlay("o2", "up")(withTwo()))).toEqual(["o1", "o2"]);
    expect(ids(reorderOverlay("o1", "down")(withTwo()))).toEqual(["o1", "o2"]);
    expect(ids(reorderOverlay("nope", "up")(withTwo()))).toEqual(["o1", "o2"]);
  });

  it("saves Overlays in scenes.json and reads them back", () => {
    const text = JSON.stringify({
      schemaVersion: 1,
      scenes: [moveOverlay("o1", 0.2, 0.3)(withTwo())],
    });
    const decoded = decodeDocument(text, scenesDocument);
    expect(
      decoded.status === "ok" && decoded.value.scenes[0]?.overlays[0]?.position
    ).toEqual({ x: 0.2, y: 0.3 });
  });
});

describe("overlayRect", () => {
  it("sizes an Overlay from its height and the image's aspect, around its centre", () => {
    const rect = overlayRect(
      { position: { x: 0.5, y: 0.5 }, height: 0.5 },
      { width: 200, height: 100 }
    );
    expect(rect.height).toBe(0.5);
    expect(rect.width).toBeCloseTo((0.5 * 2) / (16 / 9));
    expect(rect.left).toBeCloseTo(0.5 - rect.width / 2);
    expect(rect.top).toBe(0.25);
  });

  it("treats an image with no size yet as square", () => {
    expect(
      overlayRect(
        { position: { x: 0, y: 0 }, height: 0.4 },
        { width: 0, height: 0 }
      ).width
    ).toBeCloseTo(0.4 / (16 / 9));
  });
});
