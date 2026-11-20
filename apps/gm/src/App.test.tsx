import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { testPlatform } from "./testPlatform";

describe("App", () => {
  it("shows the app's name and the session line from Core", () => {
    render(<App platform={testPlatform()} />);
    expect(
      screen.getByRole("heading", { name: "TTRPG Helper GM" })
    ).toBeDefined();
    expect(screen.getByText("No players yet")).toBeDefined();
  });
});
