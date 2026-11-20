// One Vitest run for the whole workspace: Core in Node, the apps in jsdom.
// Coverage writes lcov for diff-cover (CONSTRAINTS.md, Coverage: TypeScript).
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "core",
          root: "packages/core",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      ...["gm", "player"].map((app) => ({
        plugins: [react()],
        test: {
          name: app,
          root: `apps/${app}`,
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
        },
      })),
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      reportsDirectory: "coverage",
      include: ["packages/*/src/**/*.{ts,tsx}", "apps/*/src/**/*.{ts,tsx}"],
      // main.tsx is bootstrap only and outside the coverage rule (CONSTRAINTS.md).
      exclude: ["**/*.test.{ts,tsx}", "apps/*/src/main.tsx"],
    },
  },
});
