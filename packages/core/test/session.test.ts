import { describe, expect, it } from "vitest";
import { describeSession } from "../src/index";

describe("describeSession", () => {
  it("says when nobody has joined", () => {
    expect(describeSession({ playerCount: 0 })).toBe("No players yet");
  });

  it("uses the singular for one player", () => {
    expect(describeSession({ playerCount: 1 })).toBe("1 player");
  });

  it("counts several players", () => {
    expect(describeSession({ playerCount: 4 })).toBe("4 players");
  });
});
