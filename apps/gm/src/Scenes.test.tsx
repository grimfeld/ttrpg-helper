import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createMemoryFileSystem, type FileSystem } from "@ttrpg-helper/core";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import {
  JPG,
  PNG,
  picked,
  type TestPlatform,
  testPlatform,
} from "./testPlatform";

afterEach(cleanup);

async function openCampaign(platform: TestPlatform) {
  render(<App platform={platform} />);
  fireEvent.click(await screen.findByRole("button", { name: "New Campaign" }));
  fireEvent.change(screen.getByLabelText("Campaign name"), {
    target: { value: "Keep" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  await screen.findByRole("region", { name: "Media" });
  return within(await screen.findByRole("region", { name: "Scenes" }));
}

async function importImages(platform: TestPlatform) {
  platform.nextPick = [picked("map.png", PNG), picked("hero.jpg", JPG)];
  fireEvent.click(screen.getByRole("button", { name: "Import" }));
  await screen.findByText("hero.jpg");
}

async function reopen(fileSystem: FileSystem) {
  cleanup();
  render(<App platform={testPlatform(fileSystem)} />);
  fireEvent.click(await screen.findByRole("button", { name: "Keep" }));
  return within(await screen.findByRole("region", { name: "Scenes" }));
}

function editor() {
  return within(screen.getByRole("region", { name: "Scene editor" }));
}

function rename(label: string, value: string) {
  const field = editor().getByLabelText(label);
  fireEvent.change(field, { target: { value } });
  fireEvent.blur(field);
}

function addBackground(name: string) {
  fireEvent.click(editor().getByRole("button", { name: "Add Background" }));
  fireEvent.click(
    within(editor().getByRole("list", { name: "Choose an image" })).getByRole(
      "button",
      { name }
    )
  );
}

describe("Scene list", () => {
  it("starts empty, with a prompt in the editor area", async () => {
    const scenes = await openCampaign(testPlatform());
    expect(scenes.getByText("No Scenes yet")).toBeDefined();
    expect(
      screen.getByText("Create a Scene or select one to edit it.")
    ).toBeDefined();
  });

  it("adds and selects Scene 1, then Scene 2", async () => {
    const scenes = await openCampaign(testPlatform());
    fireEvent.click(scenes.getByRole("button", { name: "New Scene" }));
    fireEvent.click(scenes.getByRole("button", { name: "New Scene" }));
    const rows = scenes.getAllByRole("button", { name: /^Scene \d$/ });
    expect(rows.map((row) => row.textContent)).toEqual(["Scene 1", "Scene 2"]);
    expect(rows[1]?.getAttribute("aria-current")).toBe("true");
    expect(editor().getByLabelText<HTMLInputElement>("Scene name").value).toBe(
      "Scene 2"
    );
    fireEvent.click(rows[0] as HTMLElement);
    expect(editor().getByLabelText<HTMLInputElement>("Scene name").value).toBe(
      "Scene 1"
    );
  });

  it("renames a Scene and sets its title, and keeps both after a restart", async () => {
    const fileSystem = createMemoryFileSystem();
    const scenes = await openCampaign(testPlatform(fileSystem));
    fireEvent.click(scenes.getByRole("button", { name: "New Scene" }));
    rename("Scene name", "  The Tavern ");
    rename("Scene title", "Night falls");
    expect(scenes.getByRole("button", { name: "The Tavern" })).toBeDefined();
    await screen.findByText("The Tavern");

    const again = await reopen(fileSystem);
    fireEvent.click(await again.findByRole("button", { name: "The Tavern" }));
    expect(editor().getByLabelText<HTMLInputElement>("Scene title").value).toBe(
      "Night falls"
    );
  });

  it("says why a name or title can't be saved, and keeps the old one", async () => {
    const scenes = await openCampaign(testPlatform());
    fireEvent.click(scenes.getByRole("button", { name: "New Scene" }));
    rename("Scene name", "   ");
    expect(editor().getByText("Give the Scene a name.")).toBeDefined();
    rename("Scene name", "x".repeat(81));
    expect(editor().getByText("Use at most 80 characters.")).toBeDefined();
    rename("Scene title", "t".repeat(121));
    expect(editor().getByText("Use at most 120 characters.")).toBeDefined();
    expect(scenes.getByRole("button", { name: "Scene 1" })).toBeDefined();
  });

  it("saves a name on Enter", async () => {
    const scenes = await openCampaign(testPlatform());
    fireEvent.click(scenes.getByRole("button", { name: "New Scene" }));
    const field = editor().getByLabelText("Scene name");
    fireEvent.change(field, { target: { value: "Docks" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(scenes.getByRole("button", { name: "Docks" })).toBeDefined();
  });

  it("asks before deleting a Scene", async () => {
    const scenes = await openCampaign(testPlatform());
    fireEvent.click(scenes.getByRole("button", { name: "New Scene" }));
    fireEvent.click(editor().getByRole("button", { name: "Delete Scene" }));
    fireEvent.click(editor().getByRole("button", { name: "Keep it" }));
    expect(scenes.getByRole("button", { name: "Scene 1" })).toBeDefined();

    fireEvent.click(editor().getByRole("button", { name: "Delete Scene" }));
    expect(
      screen.getByRole("alertdialog", { name: "Delete Scene" })
    ).toBeDefined();
    fireEvent.click(editor().getByRole("button", { name: "Delete" }));
    expect(scenes.getByText("No Scenes yet")).toBeDefined();
    expect(
      screen.getByText("Create a Scene or select one to edit it.")
    ).toBeDefined();
  });

  it("keeps an edit on screen and says so when saving fails", async () => {
    const platform = testPlatform();
    const scenes = await openCampaign(platform);
    platform.fileSystem.writeText = () =>
      Promise.reject(new Error("disk full"));
    fireEvent.click(scenes.getByRole("button", { name: "New Scene" }));
    expect(
      await screen.findByText("Couldn't save the Scenes: disk full")
    ).toBeDefined();
    expect(scenes.getByRole("button", { name: "Scene 1" })).toBeDefined();
  });

  it("says so when the Scenes can't be read", async () => {
    const fileSystem = createMemoryFileSystem({
      "campaigns/c/campaign.json": JSON.stringify({
        schemaVersion: 1,
        name: "Keep",
        createdAt: "2026-11-20T10:00:00.000Z",
        updatedAt: "2026-11-20T10:00:00.000Z",
      }),
      "campaigns/c/scenes.json": "{",
    });
    render(<App platform={testPlatform(fileSystem)} />);
    fireEvent.click(await screen.findByRole("button", { name: "Keep" }));
    expect(
      await screen.findByText(
        /Couldn't read the Scenes: campaigns\/c\/scenes.json is damaged/
      )
    ).toBeDefined();
  });
});

describe("Backgrounds", () => {
  async function sceneWithImages(platform: TestPlatform = testPlatform()) {
    const scenes = await openCampaign(platform);
    await importImages(platform);
    fireEvent.click(scenes.getByRole("button", { name: "New Scene" }));
    return platform;
  }

  it("says to import images when the Campaign has none", async () => {
    const scenes = await openCampaign(testPlatform());
    fireEvent.click(scenes.getByRole("button", { name: "New Scene" }));
    fireEvent.click(editor().getByRole("button", { name: "Add Background" }));
    expect(editor().getByText(/No images yet: import some/)).toBeDefined();
  });

  it("places a chosen image Hidden, faded on the canvas", async () => {
    await sceneWithImages();
    addBackground("map.png");
    const row = within(
      editor().getByRole("list", { name: "Backgrounds, top last" })
    );
    expect(row.getByText("map.png")).toBeDefined();
    expect(row.getByRole("button", { name: "Show" })).toBeDefined();
    const image = await editor().findByRole("img", { name: "map.png" });
    expect(image.className).toBe("placement hidden");
    expect(image.getAttribute("src")).toMatch(
      /^test-asset:\/\/campaigns\/id-1\/media\/[0-9a-f]{64}\.png$/
    );
  });

  it("stacks later Backgrounds on top", async () => {
    await sceneWithImages();
    addBackground("map.png");
    addBackground("hero.jpg");
    await editor().findByRole("img", { name: "hero.jpg" });
    const canvas = editor().getByLabelText("Canvas");
    expect(
      within(canvas)
        .getAllByRole("img")
        .map((img) => img.getAttribute("alt"))
    ).toEqual(["map.png", "hero.jpg"]);
  });

  it("shows, hides, sets Contain and removes a Background", async () => {
    await sceneWithImages();
    addBackground("map.png");
    const image = await editor().findByRole("img", { name: "map.png" });
    fireEvent.click(editor().getByRole("button", { name: "Show" }));
    expect(image.className).toBe("placement");
    expect(
      editor()
        .getByRole("button", { name: "Hide" })
        .getAttribute("aria-pressed")
    ).toBe("true");

    Object.defineProperty(image, "naturalWidth", { value: 100 });
    Object.defineProperty(image, "naturalHeight", { value: 100 });
    fireEvent.change(editor().getByLabelText("Fit of map.png"), {
      target: { value: "contain" },
    });
    fireEvent.load(image);
    expect(image.style.width).toBe(`${String((9 / 16) * 100)}%`);
    expect(image.style.height).toBe("100%");

    fireEvent.click(editor().getByRole("button", { name: "Remove map.png" }));
    expect(editor().queryByRole("img", { name: "map.png" })).toBeNull();
  });

  it("keeps every Background edit after a restart", async () => {
    const fileSystem = createMemoryFileSystem();
    await sceneWithImages(testPlatform(fileSystem));
    addBackground("hero.jpg");
    fireEvent.click(editor().getByRole("button", { name: "Show" }));
    fireEvent.change(editor().getByLabelText("Fit of hero.jpg"), {
      target: { value: "contain" },
    });
    await screen.findByText("hero.jpg", { selector: ".placement-name" });

    const again = await reopen(fileSystem);
    fireEvent.click(await again.findByRole("button", { name: "Scene 1" }));
    expect(
      editor().getByLabelText<HTMLSelectElement>("Fit of hero.jpg").value
    ).toBe("contain");
    expect(editor().getByRole("button", { name: "Hide" })).toBeDefined();
  });

  it("shows the Missing image placeholder when a file won't load or its Media is gone", async () => {
    const fileSystem = createMemoryFileSystem();
    await sceneWithImages(testPlatform(fileSystem));
    addBackground("map.png");
    fireEvent.error(await editor().findByRole("img", { name: "map.png" }));
    expect(editor().getByRole("img", { name: "Missing image" })).toBeDefined();

    // The Media index loses the image: the placement stays, as a placeholder.
    const indexFile = [...fileSystem.files.keys()].find((path) =>
      path.endsWith("media.json")
    );
    if (indexFile === undefined) throw new Error("no media.json");
    fileSystem.files.set(
      indexFile,
      JSON.stringify({ schemaVersion: 1, media: [] })
    );
    const again = await reopen(fileSystem);
    fireEvent.click(await again.findByRole("button", { name: "Scene 1" }));
    expect(editor().getByRole("img", { name: "Missing image" })).toBeDefined();
    expect(
      editor().getByText("Missing image", { selector: ".placement-name" })
    ).toBeDefined();
  });
});
