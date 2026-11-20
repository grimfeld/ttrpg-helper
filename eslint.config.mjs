// Lint rules. Carried over from regie-jdr: no `any`, no non-null `!`, no floating promises,
// exhaustive `switch`, `import type` for types, `console` only as `error`/`warn`.
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "coverage/",
      ".tsbuild/",
      ".agentic-metrics/",
      ".claude/",
    ],
  },

  js.configs.recommended,

  // A suppression comment that suppresses nothing is an error, not dead text.
  { linterOptions: { reportUnusedDisableDirectives: "error" } },

  // TypeScript: strict, type-aware rules everywhere.
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        {
          considerDefaultExhaustiveForUnions: false,
          requireDefaultForNonUnion: false,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["error", "warn"] }],
    },
  },

  // The apps: React in a browser window.
  {
    files: ["apps/*/src/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat["recommended-latest"]],
    languageOptions: { globals: { ...globals.browser } },
  },

  // main.tsx mounts the root component and nothing else.
  {
    files: ["apps/*/src/main.tsx"],
    rules: {
      "max-lines": [
        "error",
        { max: 15, skipBlankLines: true, skipComments: true },
      ],
    },
  },

  // Plain JavaScript (configs, scripts): Node, no type information.
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
  }
);
