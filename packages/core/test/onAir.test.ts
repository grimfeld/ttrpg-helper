import { describe, expect, it } from "vitest";
import {
  activate,
  type BroadcastProjection,
  CROSSFADE_MS,
  isNewer,
  leaveCampaign,
  nextProjection,
  offAir,
  parseProjection,
  project,
  type Scene,
  toggleBlackout,
} from "../src/index";

const scene: Scene = {
  id: "s1",
  name: "Secret lair (private)",
  title: "The Lair",
  backgrounds: [
    { id: "b1", mediaId: "m-map", fit: "contain", visible: true },
    { id: "b2", mediaId: "m-hidden", fit: "cover", visible: false },
    { id: "b3", mediaId: "m-gone", fit: "cover", visible: true },
  ],
  overlays: [
    {
      id: "o1",
      mediaId: "m-token",
      position: { x: 0.2, y: 0.3 },
      height: 0.4,
      visible: true,
    },
    {
      id: "o2",
      mediaId: "m-spoiler",
      position: { x: 0.5, y: 0.5 },
      height: 0.2,
      visible: false,
    },
  ],
};
const other: Scene = {
  ...scene,
  id: "s2",
  title: "Elsewhere",
  backgrounds: [],
  overlays: [],
};
const urls: Record<string, string> = {
  "m-map": "asset://map.png",
  "m-hidden": "asset://hidden.png",
  "m-token": "asset://token.png",
  "m-spoiler": "asset://spoiler.png",
};
const urlFor = (id: string) => urls[id];

describe("on-air state", () => {
  it("starts with nothing on air", () => {
    expect(offAir(100)).toEqual({
      activeSceneId: null,
      blackout: false,
      take: 0,
      revision: 100,
    });
  });

  it("activates a Scene as a new take, and raises the revision on every change", () => {
    const one = activate(offAir(1), "s1");
    expect(one).toEqual({
      activeSceneId: "s1",
      blackout: false,
      take: 1,
      revision: 2,
    });
    const two = activate(one, "s2");
    expect(two.take).toBe(2);
    expect(toggleBlackout(two)).toMatchObject({
      blackout: true,
      revision: 4,
      activeSceneId: "s2",
    });
  });

  it("keeps Blackout when a Scene is activated, and toggles it back", () => {
    const dark = toggleBlackout(activate(offAir(1), "s1"));
    expect(activate(dark, "s2").blackout).toBe(true);
    expect(toggleBlackout(dark).blackout).toBe(false);
  });

  it("takes everything off air when the GM leaves the Campaign", () => {
    const dark = toggleBlackout(activate(offAir(1), "s1"));
    expect(leaveCampaign(dark)).toMatchObject({
      activeSceneId: null,
      blackout: false,
      revision: 4,
    });
  });

  it("crossfades over 600 ms", () => {
    expect(CROSSFADE_MS).toBe(600);
  });
});

describe("project", () => {
  it("sends only shown placements, with asset URLs, and the Scene title", () => {
    const projection = project(
      activate(offAir(1), "s1"),
      [other, scene],
      urlFor
    );
    expect(projection).toEqual({
      revision: 2,
      blackout: false,
      scene: {
        take: 1,
        title: "The Lair",
        backgrounds: [{ url: "asset://map.png", fit: "contain" }],
        overlays: [
          {
            url: "asset://token.png",
            position: { x: 0.2, y: 0.3 },
            height: 0.4,
          },
        ],
      },
    });
  });

  it("is built from an allow-list: no name, id, Media or Hidden placement can reach players", () => {
    const projection = project(activate(offAir(1), "s1"), [scene], urlFor);
    const keys = (value: object | null) =>
      value === null ? [] : Object.keys(value).sort();
    expect(keys(projection)).toEqual(["blackout", "revision", "scene"]);
    expect(keys(projection.scene)).toEqual([
      "backgrounds",
      "overlays",
      "take",
      "title",
    ]);
    expect(projection.scene?.backgrounds.map(keys)).toEqual([["fit", "url"]]);
    expect(projection.scene?.overlays.map(keys)).toEqual([
      ["height", "position", "url"],
    ]);
    const text = JSON.stringify(projection);
    for (const secret of [
      "Secret lair",
      "s1",
      "m-map",
      "hidden.png",
      "spoiler.png",
      "b1",
      "o1",
    ]) {
      expect(text).not.toContain(secret);
    }
  });

  it("is black when nothing is on air or the Active Scene is gone", () => {
    expect(project(offAir(5), [scene], urlFor)).toEqual({
      revision: 5,
      blackout: false,
      scene: null,
    });
    expect(
      project(activate(offAir(5), "deleted"), [scene], urlFor).scene
    ).toBeNull();
  });
});

describe("isNewer", () => {
  const at = (revision: number): BroadcastProjection => ({
    revision,
    blackout: false,
    scene: null,
  });
  it("accepts the first projection and newer ones, and ignores stale ones", () => {
    expect(isNewer(at(1), undefined)).toBe(true);
    expect(isNewer(at(2), at(1))).toBe(true);
    expect(isNewer(at(1), at(2))).toBe(false);
    expect(isNewer(at(2), at(2))).toBe(false);
  });
});

describe("parseProjection", () => {
  const valid = project(activate(offAir(1), "s1"), [scene], urlFor);

  it("accepts what project builds, and nothing on air", () => {
    expect(parseProjection(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
    expect(
      parseProjection({ revision: 1, blackout: true, scene: null })
    ).toEqual({
      revision: 1,
      blackout: true,
      scene: null,
    });
  });

  it("drops fields that aren't on the allow-list", () => {
    const extra = {
      ...valid,
      sceneName: "Secret",
      scene: { ...valid.scene, name: "Secret" },
    };
    expect(JSON.stringify(parseProjection(extra))).not.toContain("Secret");
  });

  it.each([
    ["not an object", 1],
    ["no revision", { blackout: false, scene: null }],
    [
      "a scene that isn't an object",
      { revision: 1, blackout: false, scene: 3 },
    ],
    [
      "a scene without a title",
      {
        revision: 1,
        blackout: false,
        scene: { take: 1, backgrounds: [], overlays: [] },
      },
    ],
    [
      "backgrounds not a list",
      { ...valid, scene: { ...valid.scene, backgrounds: {} } },
    ],
    [
      "a background with an unknown fit",
      {
        ...valid,
        scene: { ...valid.scene, backgrounds: [{ url: "x", fit: "fill" }] },
      },
    ],
    [
      "an overlay without a position",
      {
        ...valid,
        scene: { ...valid.scene, overlays: [{ url: "x", height: 1 }] },
      },
    ],
    [
      "an overlay without a url",
      {
        ...valid,
        scene: {
          ...valid.scene,
          overlays: [{ position: { x: 0, y: 0 }, height: 1 }],
        },
      },
    ],
  ])("refuses %s", (_label, value) => {
    expect(parseProjection(value)).toBeUndefined();
  });
});

describe("nextProjection", () => {
  const at = (revision: number, title = ""): BroadcastProjection => ({
    revision,
    blackout: false,
    scene: { take: 1, title, backgrounds: [], overlays: [] },
  });

  it("keeps a projection that is already newer", () => {
    expect(nextProjection(undefined, at(5))).toEqual(at(5));
    expect(nextProjection(at(5), at(9))).toEqual(at(9));
  });

  it("raises the revision of a saved edit that left the on-air state as it was", () => {
    const edited = nextProjection(at(5, "Before"), at(5, "After"));
    expect(edited).toEqual(at(6, "After"));
    expect(isNewer(edited, at(5, "Before"))).toBe(true);
  });
});
