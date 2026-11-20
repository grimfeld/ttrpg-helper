import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("shows the app's name and the session line from Core", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "TTRPG Helper Player" })
    ).toBeDefined();
    expect(screen.getByText("No players yet")).toBeDefined();
  });
});
