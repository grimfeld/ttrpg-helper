import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createMemoryFileSystem, type PickedFile } from "@ttrpg-helper/core";
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
  return screen.findByRole("region", { name: "Media" });
}

// Starts an Import; each test then waits for the outcome it expects.
function importFiles(platform: TestPlatform, files: readonly PickedFile[]) {
  platform.nextPick = files;
  fireEvent.click(screen.getByRole("button", { name: "Import" }));
  return Promise.resolve();
}

describe("Media panel", () => {
  it("starts empty with Import", async () => {
    const panel = await openCampaign(testPlatform());
    expect(within(panel).getByText("No images yet")).toBeDefined();
  });

  it("lists imported images by file name, with the full name as a tooltip", async () => {
    const platform = testPlatform();
    const panel = await openCampaign(platform);
    const longName = `${"very-long-name-".repeat(6)}.png`;
    await importFiles(platform, [
      picked(longName, PNG),
      picked("hero.jpeg", JPG),
    ]);
    await within(panel).findByText("hero.jpeg");
    const items = within(panel).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      longName,
      "hero.jpeg",
    ]);
    expect(items[0]?.getAttribute("title")).toBe(longName);
  });

  it("shows a spinner on Import while files are copied", async () => {
    const platform = testPlatform();
    await openCampaign(platform);
    let finish: (bytes: Uint8Array) => void = () => undefined;
    platform.nextPick = [
      {
        name: "slow.png",
        read: () =>
          new Promise<Uint8Array>((resolve) => {
            finish = resolve;
          }),
      },
    ];
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    const busy = await screen.findByRole("button", { name: "Importing…" });
    expect(busy.getAttribute("aria-busy")).toBe("true");
    finish(PNG);
    expect(await screen.findByText("slow.png")).toBeDefined();
  });

  it("adds no second copy of an image already imported", async () => {
    const platform = testPlatform();
    const panel = await openCampaign(platform);
    await importFiles(platform, [picked("a.png", PNG)]);
    await within(panel).findByText("a.png");
    // The same image again, with a new one to know when the batch is done.
    await importFiles(platform, [
      picked("again.png", PNG),
      picked("b.jpg", JPG),
    ]);
    await within(panel).findByText("b.jpg");
    expect(
      within(panel)
        .getAllByRole("listitem")
        .map((i) => i.textContent)
    ).toEqual(["a.png", "b.jpg"]);
  });

  it("names a bad file in a notice and imports the others", async () => {
    const platform = testPlatform();
    const panel = await openCampaign(platform);
    await importFiles(platform, [
      picked("notes.txt", PNG),
      picked("good.png", PNG),
    ]);
    expect(
      await screen.findByText(
        "notes.txt isn't a PNG, JPG or WebP file, so it wasn't imported."
      )
    ).toBeDefined();
    expect(await within(panel).findByText("good.png")).toBeDefined();
  });

  it("does nothing when the GM cancels the picker", async () => {
    const platform = testPlatform();
    const panel = await openCampaign(platform);
    await importFiles(platform, []);
    await screen.findByRole("button", { name: "Import" });
    expect(within(panel).getByText("No images yet")).toBeDefined();
  });

  it("keeps the Media after a restart", async () => {
    const fileSystem = createMemoryFileSystem();
    const platform = testPlatform(fileSystem);
    await openCampaign(platform);
    await importFiles(platform, [picked("kept.png", PNG)]);
    await screen.findByText("kept.png");
    cleanup();
    render(<App platform={testPlatform(fileSystem)} />);
    fireEvent.click(await screen.findByRole("button", { name: "Keep" }));
    const panel = await screen.findByRole("region", { name: "Media" });
    expect(await within(panel).findByText("kept.png")).toBeDefined();
  });

  it("says so when the import fails", async () => {
    const platform = testPlatform();
    await openCampaign(platform);
    platform.fileSystem.writeBytes = () =>
      Promise.reject(new Error("disk full"));
    await importFiles(platform, [picked("a.png", PNG)]);
    expect(
      await screen.findByText("Couldn't import the images: disk full")
    ).toBeDefined();
  });

  it("says so when the Media can't be read", async () => {
    const fileSystem = createMemoryFileSystem({
      "campaigns/c/campaign.json": JSON.stringify({
        schemaVersion: 1,
        name: "Broken media",
        createdAt: "2026-11-20T10:00:00.000Z",
        updatedAt: "2026-11-20T10:00:00.000Z",
      }),
      "campaigns/c/media.json": "{",
    });
    render(<App platform={testPlatform(fileSystem)} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Broken media" })
    );
    expect(
      await screen.findByText(
        /Couldn't read the Media: campaigns\/c\/media.json is damaged/
      )
    ).toBeDefined();
  });
});
