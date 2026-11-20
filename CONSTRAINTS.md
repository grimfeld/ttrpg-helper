# Constraints

What "good enough to ship" means in this repo. Every rule names the command that decides it; a rule without one is an aspiration, not a constraint. `scripts/check.sh` mirrors this file; if they disagree, this file wins.

Last reviewed: 2026-11-19 by grimfeld

Every check **blocks**: agents here run unattended and merge through `ship`, and a warning nobody reads changes nothing.

## Floor (always enforced)

- No new suppressions: `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`, `eslint-disable`, coverage ignores (`istanbul`/`c8`/`v8 ignore`), `nosemgrep`, `gitleaks:allow`, Rust `#[allow(...)]` / `#[expect(...)]`.
- No unfinished work: `TODO`, `FIXME`, `todo!()`, `unimplemented!()`, a "not implemented" throw, an empty `catch`.
- No easier tests: no `.skip`/`.todo`/`.fixme`, `#[ignore]`, deleted test file, or assertion removed from a test that stayed.
- No secrets in the repo or its history.
- This file and `.gitleaks.toml` are not weakened to make a change pass. Raising the bar is a normal change; lowering it is a separate PR that says why.

An exception goes in the Exceptions table, with an owner and an expiry; the floor guard reports each new row so the review sees it.

## Enforced with numbers

| Dimension              | Rule                                                                                                                                                                                   | Checked by                                                                              | Runs at                                | Status      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------- | ----------- |
| Floor                  | Zero findings in the diff against `main`                                                                                                                                               | `node scripts/floor-guard.mjs`                                                          | every edit, task end, CI               | live        |
| Secrets                | Zero findings, history included in CI                                                                                                                                                  | `gitleaks dir .` (local), `gitleaks git` (CI), both `--redact --ignore-gitleaks-allow`  | every edit, CI                         | live        |
| Security: dependencies | Block at a cut-off of at most 7.0 CVSS (high), unscored advisories included                                                                                                            | `osv-scanner scan source -r` graded by `scripts/quality-gate.mjs osv`                   | CI                                     | live        |
| Security: code         | Zero findings at ERROR, HIGH or CRITICAL                                                                                                                                               | `semgrep scan --config p/default --strict` graded by `scripts/quality-gate.mjs semgrep` | CI                                     | live        |
| Coverage: TypeScript   | Changed lines ≥ 80% covered, outside each app's bootstrap-only `src/main.tsx` (≤ 15 lines, ESLint `max-lines`)                                                                         | `vitest run --coverage` (lcov), then `diff-cover --fail-under=80` against the base      | pre-commit (tests only), task end, CI  | live        |
| Coverage: Rust         | Changed lines ≥ 80% covered                                                                                                                                                            | `cargo llvm-cov --lcov` intersected with the diff                                       | CI                                     | pending #11 |
| Architecture           | Zero violations: Core imports no `react`, `@tauri-apps/*`, `node:*` or app package; the two apps don't import each other; the apps import Core only through its entry point (ADR-0002) | `depcruise apps packages` (`.dependency-cruiser.cjs`)                                   | task end, CI                           | live        |
| Types                  | Zero errors                                                                                                                                                                            | `tsc -b` (live), `cargo clippy -- -D warnings` (pending #11)                            | pre-commit, task end, CI               | live        |
| Lint                   | Zero errors or warnings                                                                                                                                                                | `eslint . --max-warnings 0` (`strict-type-checked`, `react-hooks`)                      | task end, CI                           | live        |
| Format                 | Zero files differing from Prettier's output                                                                                                                                            | `prettier --check .`                                                                    | commit (pre-commit hook), task end, CI | live        |

A pending row becomes live in the PR that installs its tool, after the command has been seen to fail on a deliberate violation and pass on clean code.

Why these numbers:

- **80% of changed lines**: high enough that new logic needs a test, low enough that a line of config doesn't.
- **CVSS 7.0**: high and critical are worth stopping a merge for; below that is mostly noise. An unscored advisory blocks because unknown is not harmless.
- **Semgrep ERROR and above**: the registry's own "this is a bug or a vulnerability" level.

## Where checks run

| Stage               | Command                                                                                                                                                                              | Budget     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| After each edit     | `scripts/check.sh fast` (floor, secrets)                                                                                                                                             | under 5 s  |
| Before each commit  | lint-staged (Prettier), `pnpm typecheck`, `pnpm test` (`.husky/pre-commit`)                                                                                                          | under 30 s |
| When a task is done | `scripts/check.sh task` (`pnpm check`): fast, plus format, lint, typecheck, architecture and test                                                                                    | under 90 s |
| CI, on every PR     | `scripts/check.sh full`, as one job per check: `floor`, `secrets`, `dependencies`, `code-scan` (`constraints.yml`); `format`, `lint`, `typecheck`, `architecture`, `test` (`ci.yml`) | no limit   |

Rust builds are too slow for the task stage, so Rust tests and coverage run in CI only. A check that outgrows its budget moves to a later stage; it isn't dropped.

Outside opinions: osv-scanner (a public vulnerability database), Semgrep's registry rules and gitleaks' default rules judge the code without trusting this project's own tests.

## Measured, not yet enforced

| Metric                        | Today                                    | Direction     |
| ----------------------------- | ---------------------------------------- | ------------- |
| Project coverage (TypeScript) | 100% of lines (6/6), 2026-11-20, #10     | must not fall |
| Project coverage (Rust)       | no code yet; recorded by the scaffold PR | must not fall |

A drop of up to 0.5% is drift, not a regression.

## Exceptions

Each expires within 90 days.

| ID  | Rule | Path | Reason | Owner | Expires |
| --- | ---- | ---- | ------ | ----- | ------- |
