// Architecture rules (ADR-0002, CONSTRAINTS.md "Architecture"). Checked by `scripts/check.sh architecture`.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "core-no-ui-or-shell",
      comment:
        "Core runs inside either app and depends on neither: no React, no Tauri.",
      severity: "error",
      from: { path: "^packages/core/" },
      to: {
        path: "(^|/)node_modules/(@types/)?(react|react-dom|@tauri-apps/[^/]+)/",
      },
    },
    {
      name: "core-no-node",
      comment:
        "Core runs in an app's webview: no Node built-ins (node:fs, path, ...).",
      severity: "error",
      from: { path: "^packages/core/" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "core-no-app",
      comment: "Core never imports an app.",
      severity: "error",
      from: { path: "^packages/core/" },
      to: { path: "^apps/" },
    },
    {
      name: "apps-independent",
      comment: "The GM app and the Player app don't import each other.",
      severity: "error",
      from: { path: "^apps/([^/]+)/" },
      to: { path: "^apps/", pathNot: "^apps/$1/" },
    },
    {
      name: "core-through-entry-point",
      comment:
        "The apps import Core only through its package entry point (@ttrpg-helper/core).",
      severity: "error",
      from: { path: "^apps/" },
      to: {
        path: "^packages/core/",
        pathNot: "^packages/core/src/index\\.ts$",
      },
    },
    {
      name: "not-to-unresolvable",
      comment: "An import that resolves to nothing is a broken build.",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: "(^|/)node_modules/" },
    exclude: { path: "^(apps/[^/]+/dist|coverage|\\.tsbuild)/" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"],
    },
  },
};
