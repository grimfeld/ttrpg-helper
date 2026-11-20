import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  createMemoryFileSystem,
  encodeDocument,
  campaignDocument,
  type FileSystem,
} from "@ttrpg-helper/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { NOTICE_DURATION_MS } from "./notices";

const user = {
  click: (element: HTMLElement) => {
    fireEvent.click(element);
    return Promise.resolve();
  },
  type: (element: HTMLElement, text: string) => {
    const input = element as HTMLInputElement;
    fireEvent.change(input, { target: { value: input.value + text } });
    return Promise.resolve();
  },
};
let ids = 0;
const newId = () => `campaign-${String(++ids)}`;

function renderApp(fileSystem: FileSystem = createMemoryFileSystem()) {
  render(<App fileSystem={fileSystem} newId={newId} />);
  return fileSystem;
}

const stored = (name: string) =>
  encodeDocument(campaignDocument, {
    name,
    createdAt: "2026-11-20T10:00:00.000Z",
    updatedAt: "2026-11-20T10:00:00.000Z",
  });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Campaign list", () => {
  it("shows a skeleton while loading, then the empty state", async () => {
    renderApp();
    expect(screen.getByLabelText("Loading Campaigns")).toBeDefined();
    expect(await screen.findByText("No Campaigns yet")).toBeDefined();
    expect(screen.getByRole("button", { name: "New Campaign" })).toBeDefined();
  });

  it("creates a Campaign and opens it, and lists it after a restart", async () => {
    const fileSystem = renderApp();
    await user.click(
      await screen.findByRole("button", { name: "New Campaign" })
    );
    await user.type(screen.getByLabelText("Campaign name"), "  Sunken Keep ");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(
      await screen.findByRole("heading", { name: "Sunken Keep" })
    ).toBeDefined();

    await user.click(screen.getByRole("button", { name: "← Campaigns" }));
    expect(
      await screen.findByRole("button", { name: "Sunken Keep" })
    ).toBeDefined();

    // A restart: a fresh app on the same files.
    cleanup();
    renderApp(fileSystem);
    await user.click(
      await screen.findByRole("button", { name: "Sunken Keep" })
    );
    expect(
      await screen.findByRole("heading", { name: "Sunken Keep" })
    ).toBeDefined();
  });

  it("says why an empty or too long name can't be saved", async () => {
    const fileSystem = renderApp();
    await user.click(
      await screen.findByRole("button", { name: "New Campaign" })
    );
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText("Give the Campaign a name.")).toBeDefined();
    await user.type(screen.getByLabelText("Campaign name"), "x".repeat(81));
    expect(screen.getByText("Use at most 80 characters.")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(await fileSystem.listDirectories("campaigns")).toEqual([]);
    expect(screen.queryByRole("heading", { name: "x".repeat(81) })).toBeNull();
  });

  it("cancels New Campaign", async () => {
    renderApp();
    await user.click(
      await screen.findByRole("button", { name: "New Campaign" })
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Campaign name")).toBeNull();
  });
});

describe("notices", () => {
  it("keeps the name on screen when the save fails", async () => {
    const failing = {
      ...createMemoryFileSystem(),
      writeText: () => Promise.reject(new Error("disk full")),
    };
    renderApp(failing);
    await user.click(
      await screen.findByRole("button", { name: "New Campaign" })
    );
    await user.type(screen.getByLabelText("Campaign name"), "Lost Mines");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(
      await screen.findByText("Couldn't save the Campaign: disk full")
    ).toBeDefined();
    expect(screen.getByLabelText<HTMLInputElement>("Campaign name").value).toBe(
      "Lost Mines"
    );
  });

  it("restores a damaged Campaign from its backup, with a notice", async () => {
    renderApp(
      createMemoryFileSystem({
        "campaigns/a/campaign.json": "{",
        "campaigns/a/campaign.json.bak": stored("Saved Copy"),
      })
    );
    expect(
      await screen.findByRole("button", { name: "Saved Copy" })
    ).toBeDefined();
    expect(
      screen.getByText(
        "campaigns/a/campaign.json was damaged and has been restored from its backup."
      )
    ).toBeDefined();
  });

  it("keeps an unreadable Campaign listed and names the file when clicked", async () => {
    renderApp(createMemoryFileSystem({ "campaigns/b/campaign.json": "{" }));
    await user.click(
      await screen.findByRole("button", { name: "Can't open (b)" })
    );
    expect(
      screen.getByText(
        "campaigns/b/campaign.json is damaged and its backup can't be read."
      )
    ).toBeDefined();
    expect(screen.queryByRole("heading", { level: 1, name: /b/ })).toBeNull();
  });

  it("keeps a Campaign from a newer app closed and says to update", async () => {
    renderApp(
      createMemoryFileSystem({
        "campaigns/c/campaign.json": '{"schemaVersion":7,"name":"Future"}',
      })
    );
    await user.click(
      await screen.findByRole("button", { name: "Can't open (c)" })
    );
    expect(screen.getByText(/Update the app to open it\./)).toBeDefined();
  });

  it("shows a notice when a listed Campaign fails to open", async () => {
    const fileSystem = createMemoryFileSystem({
      "campaigns/d/campaign.json": stored("Flaky"),
    });
    renderApp(fileSystem);
    const button = await screen.findByRole("button", { name: "Flaky" });
    fileSystem.files.set("campaigns/d/campaign.json", "{");
    await user.click(button);
    expect(
      await screen.findByText(/campaigns\/d\/campaign.json is damaged/)
    ).toBeDefined();
  });

  it("says so when the Campaigns folder can't be read", async () => {
    renderApp({
      ...createMemoryFileSystem(),
      listDirectories: () => Promise.reject(new Error("denied")),
    });
    expect(
      await screen.findByText("Couldn't read the Campaigns: denied")
    ).toBeDefined();
    expect(screen.getByText("No Campaigns yet")).toBeDefined();
  });

  it("stacks notices, dismisses one, and closes the rest by themselves", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderApp(
      createMemoryFileSystem({
        "campaigns/e/campaign.json": "{",
        "campaigns/f/campaign.json": "{",
      })
    );
    const clicker = user;
    await clicker.click(
      await screen.findByRole("button", { name: "Can't open (e)" })
    );
    await clicker.click(screen.getByRole("button", { name: "Can't open (f)" }));
    const notices = screen.getByRole("list", { name: "Notices" });
    expect(within(notices).getAllByRole("status")).toHaveLength(2);

    await clicker.click(
      within(notices).getAllByRole("button", {
        name: "Dismiss notice",
      })[0] as HTMLElement
    );
    expect(within(notices).getAllByRole("status")).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(NOTICE_DURATION_MS);
    });
    expect(within(notices).queryAllByRole("status")).toHaveLength(0);
  });
});
