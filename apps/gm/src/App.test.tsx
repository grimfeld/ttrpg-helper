import { render, screen } from "@testing-library/react";
import { createMemoryFileSystem } from "@ttrpg-helper/core";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("shows the app's name and the session line from Core", () => {
    render(
      <App fileSystem={createMemoryFileSystem()} newId={() => "unused"} />
    );
    expect(
      screen.getByRole("heading", { name: "TTRPG Helper GM" })
    ).toBeDefined();
    expect(screen.getByText("No players yet")).toBeDefined();
  });
});
