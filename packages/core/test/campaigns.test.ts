import { describe, expect, it } from "vitest";
import {
  campaignFile,
  checkCampaignName,
  createCampaignRepository,
  createMemoryFileSystem,
  describeError,
} from "../src/index";

const fixedClock = () => new Date("2026-11-20T10:00:00.000Z");

function setup(initial: Record<string, string> = {}) {
  const fileSystem = createMemoryFileSystem(initial);
  let next = 0;
  const repository = createCampaignRepository(fileSystem, {
    newId: () => `id-${String(++next)}`,
    now: fixedClock,
  });
  return { fileSystem, repository };
}

describe("checkCampaignName", () => {
  it("trims the name", () => {
    expect(checkCampaignName("  Dragons  ")).toEqual({
      ok: true,
      name: "Dragons",
    });
  });

  it("refuses an empty name", () => {
    expect(checkCampaignName("   ")).toEqual({
      ok: false,
      reason: "Give the Campaign a name.",
    });
  });

  it("accepts 80 characters and refuses 81", () => {
    expect(checkCampaignName("x".repeat(80)).ok).toBe(true);
    expect(checkCampaignName("x".repeat(81))).toEqual({
      ok: false,
      reason: "Use at most 80 characters.",
    });
  });
});

describe("createCampaignRepository", () => {
  it("lists nothing before the first Campaign", async () => {
    expect(await setup().repository.list()).toEqual([]);
  });

  it("creates a Campaign in its own folder, without the id in the file", async () => {
    const { fileSystem, repository } = setup();
    const campaign = await repository.create(" Dragons ");
    expect(campaign).toEqual({
      id: "id-1",
      name: "Dragons",
      createdAt: "2026-11-20T10:00:00.000Z",
      updatedAt: "2026-11-20T10:00:00.000Z",
    });
    expect(
      JSON.parse(fileSystem.files.get(campaignFile("id-1")) ?? "")
    ).toEqual({
      schemaVersion: 1,
      name: "Dragons",
      createdAt: "2026-11-20T10:00:00.000Z",
      updatedAt: "2026-11-20T10:00:00.000Z",
    });
  });

  it("refuses to create a Campaign with an invalid name", async () => {
    await expect(setup().repository.create("")).rejects.toThrow(
      "Give the Campaign a name."
    );
  });

  it("lists Campaigns by name and reopens them from disk", async () => {
    const { fileSystem, repository } = setup();
    await repository.create("Zeppelins");
    await repository.create("Airships");
    const reopened = createCampaignRepository(fileSystem, {
      newId: () => "unused",
    });
    const list = await reopened.list();
    expect(
      list.map((entry) => entry.status === "ok" && entry.campaign.name)
    ).toEqual(["Airships", "Zeppelins"]);
    expect((await reopened.open("id-1")).name).toBe("Zeppelins");
  });

  it("keeps an unreadable Campaign in the list with its problem", async () => {
    const { repository } = setup({
      "campaigns/broken/campaign.json": "{",
    });
    expect(await repository.list()).toEqual([
      {
        id: "broken",
        status: "unreadable",
        problem:
          "campaigns/broken/campaign.json is damaged and its backup can't be read.",
      },
    ]);
  });

  it("refuses to open a folder with no campaign.json", async () => {
    const { repository } = setup({ "campaigns/empty/other.txt": "" });
    await expect(repository.open("empty")).rejects.toThrow(
      "campaigns/empty/campaign.json is missing."
    );
  });
});

describe("describeError", () => {
  it("uses an Error's message, or the value as text", () => {
    expect(describeError(new Error("boom"))).toBe("boom");
    expect(describeError("plain")).toBe("plain");
  });
});
