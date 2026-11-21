import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { type BroadcastProjection, isNewer } from "@ttrpg-helper/core";
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

const last = (platform: TestPlatform): BroadcastProjection | undefined =>
  platform.broadcastWindow.sent.at(-1);

/** What a Broadcast window would show after everything sent so far, in order. */
const shownBy = (platform: TestPlatform): BroadcastProjection | undefined =>
  platform.broadcastWindow.sent.reduce<BroadcastProjection | undefined>(
    (shown, incoming) => (isNewer(incoming, shown) ? incoming : shown),
    undefined
  );

function editor() {
  return within(screen.getByRole("region", { name: "Scene editor" }));
}

function scenes() {
  return within(screen.getByRole("region", { name: "Scenes" }));
}

/** A Campaign with two images and two Scenes; Scene 1 has a shown and a Hidden Background. */
async function setUp() {
  const platform = testPlatform();
  render(<App platform={platform} />);
  fireEvent.click(await screen.findByRole("button", { name: "New Campaign" }));
  fireEvent.change(screen.getByLabelText("Campaign name"), {
    target: { value: "Keep" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  await screen.findByRole("region", { name: "Media" });
  platform.nextPick = [picked("map.png", PNG), picked("secret.jpg", JPG)];
  fireEvent.click(screen.getByRole("button", { name: "Import" }));
  await screen.findByText("secret.jpg");
  fireEvent.click(scenes().getByRole("button", { name: "New Scene" }));
  fireEvent.click(scenes().getByRole("button", { name: "New Scene" }));
  fireEvent.click(scenes().getByRole("button", { name: /^Scene 1/ }));
  for (const name of ["map.png", "secret.jpg"]) {
    fireEvent.click(editor().getByRole("button", { name: "Add Background" }));
    fireEvent.click(
      within(editor().getByRole("list", { name: "Choose an image" })).getByRole(
        "button",
        {
          name,
        }
      )
    );
  }
  // Show map.png only.
  fireEvent.click(
    editor().getAllByRole("button", { name: "Show" })[0] as HTMLElement
  );
  await editor().findByRole("img", { name: "secret.jpg" });
  return platform;
}

describe("On air", () => {
  it("sends nothing on air at first, then the Selected Scene on Activate", async () => {
    const platform = await setUp();
    expect(last(platform)?.scene).toBeNull();
    fireEvent.click(editor().getByRole("button", { name: "Activate" }));
    await waitFor(() => {
      expect(last(platform)?.scene?.take).toBe(1);
    });
    const scene = last(platform)?.scene;
    expect(scene?.backgrounds).toEqual([
      { url: expect.stringMatching(/\.png$/) as unknown, fit: "cover" },
    ]);
    expect(JSON.stringify(last(platform))).not.toContain("Scene 1");
    expect(JSON.stringify(last(platform))).not.toContain("secret");
  });

  it("marks the Active Scene and disables its Delete, saying why", async () => {
    await setUp();
    fireEvent.click(editor().getByRole("button", { name: "Activate" }));
    expect(scenes().getByText("Active")).toBeDefined();
    const remove = editor().getByRole<HTMLButtonElement>("button", {
      name: "Delete Scene",
    });
    expect(remove.disabled).toBe(true);
    expect(remove.title).toBe(
      "This Scene is on air. Activate another Scene to delete this one."
    );
    fireEvent.click(scenes().getByRole("button", { name: /^Scene 2/ }));
    expect(
      editor().getByRole<HTMLButtonElement>("button", { name: "Delete Scene" })
        .disabled
    ).toBe(false);
  });

  it("activates with Ctrl+Enter", async () => {
    const platform = await setUp();
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    await waitFor(() => {
      expect(last(platform)?.scene?.take).toBe(1);
    });
    expect(scenes().getByText("Active")).toBeDefined();
  });

  it("toggles Blackout with the button and with B, but not while typing", async () => {
    const platform = await setUp();
    const button = screen.getByRole("button", { name: "Blackout" });
    fireEvent.click(button);
    await waitFor(() => {
      expect(last(platform)?.blackout).toBe(true);
    });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(window, { key: "b" });
    await waitFor(() => {
      expect(last(platform)?.blackout).toBe(false);
    });
    fireEvent.keyDown(editor().getByLabelText("Scene name"), { key: "b" });
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(last(platform)?.blackout).toBe(false);
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("sends saved edits to the Active Scene, and nothing for other Scenes", async () => {
    const platform = await setUp();
    fireEvent.click(editor().getByRole("button", { name: "Activate" }));
    await waitFor(() => {
      expect(last(platform)?.scene?.take).toBe(1);
    });
    const title = editor().getByLabelText("Scene title");
    fireEvent.change(title, { target: { value: "The Keep" } });
    fireEvent.blur(title);
    await waitFor(() => {
      expect(last(platform)?.scene?.title).toBe("The Keep");
    });
    expect(last(platform)?.scene?.take).toBe(1);
    // The Broadcast window takes the edit: every projection sent is newer than the last.
    expect(shownBy(platform)?.scene?.title).toBe("The Keep");
    const revisions = platform.broadcastWindow.sent.map((p) => p.revision);
    expect(
      revisions.every((r, i) => i === 0 || r > (revisions[i - 1] ?? 0))
    ).toBe(true);

    const sentBefore = platform.broadcastWindow.sent.length;
    fireEvent.click(scenes().getByRole("button", { name: /^Scene 2/ }));
    const other = editor().getByLabelText("Scene title");
    fireEvent.change(other, { target: { value: "Not on air" } });
    fireEvent.blur(other);
    await screen.findByDisplayValue("Not on air");
    const after = platform.broadcastWindow.sent.slice(sentBefore);
    expect(after.every((p) => p.scene?.title === "The Keep")).toBe(true);
  });

  it("shows what is on air in the On-air monitor", async () => {
    await setUp();
    const monitor = within(
      screen.getByRole("region", { name: "On-air monitor" })
    );
    expect(monitor.queryByRole("img")).toBeNull();
    fireEvent.click(editor().getByRole("button", { name: "Activate" }));
    const title = editor().getByLabelText("Scene title");
    fireEvent.change(title, { target: { value: "Night" } });
    fireEvent.blur(title);
    expect(await monitor.findByText("Night")).toBeDefined();
    expect(monitor.getAllByRole("presentation")).toHaveLength(1);
  });

  it("takes everything off air when the GM goes home", async () => {
    const platform = await setUp();
    fireEvent.click(editor().getByRole("button", { name: "Activate" }));
    fireEvent.click(screen.getByRole("button", { name: "Blackout" }));
    fireEvent.click(screen.getByRole("button", { name: "← Campaigns" }));
    await waitFor(() => {
      expect(last(platform)).toMatchObject({ scene: null, blackout: false });
    });
  });

  it("answers a Broadcast window that opens with what is on air", async () => {
    const platform = await setUp();
    fireEvent.click(editor().getByRole("button", { name: "Activate" }));
    await waitFor(() => {
      expect(last(platform)?.scene?.take).toBe(1);
    });
    const onAir = last(platform);
    platform.broadcastWindow.ready();
    expect(last(platform)).toBe(onAir);
  });

  it("opens the Broadcast window and toggles its fullscreen", async () => {
    const platform = await setUp();
    fireEvent.click(screen.getByRole("button", { name: "Open broadcast" }));
    fireEvent.click(screen.getByRole("button", { name: "Fullscreen" }));
    await waitFor(() => {
      expect(platform.broadcastWindow.opened).toBe(1);
      expect(platform.broadcastWindow.fullscreenToggles).toBe(1);
    });
  });

  it("says so when the Broadcast window can't open", async () => {
    const platform = await setUp();
    platform.broadcast.open = () => Promise.reject(new Error("no windows"));
    fireEvent.click(screen.getByRole("button", { name: "Open broadcast" }));
    expect(
      await screen.findByText("Couldn't open the Broadcast window: no windows")
    ).toBeDefined();
  });
});
