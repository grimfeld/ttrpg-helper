# ttrpg-helper

Tools for running a tabletop RPG session, made of at least two apps:

- **GM app**: the Game Master's console. It is inspired by [grimfeld/regie-jdr](https://github.com/grimfeld/regie-jdr), a visual and audio control desk for the GM, and extends it.
- **Player companion app**: what players use at the table. It must stay simple and quick to use mid-session; a feature that slows a player down belongs in the GM app or nowhere.

The apps sync a session **peer to peer, with no server**: session data is never stored or read by a server, and never published on the internet. The transport is [iroh](https://www.iroh.computer/), with a relay we host ourselves for connections that can't go direct (ADR-0001). The GM app is the source of truth: player apps send it requests and receive only what each player may see (ADR-0004).

## Stack

- Tauri, TypeScript and React.
- One repo: a pnpm workspace with a package per app and a shared core holding the domain logic and sync protocol (ADR-0002).
- UI text in English; translations come later (ADR-0003).
- Desktop only for now (Windows, macOS, Linux). A mobile player app may come later; don't design it out, don't build for it yet.

## Constraints

Read `CONSTRAINTS.md` before writing code. Do not weaken it to make a change pass.

## Commands

Root pnpm scripts (Node 22, `.node-version`):

- `pnpm install`: install the workspace (`apps/gm`, `apps/player`, `packages/core`).
- `pnpm build`: build both apps' web bundles with Vite.
- `pnpm lint`, `pnpm typecheck`, `pnpm architecture`: ESLint, `tsc -b` and dependency-cruiser, through `scripts/check.sh`.
- `pnpm test`: Vitest across the workspace. The pre-commit hook runs it with `pnpm typecheck`.
- `pnpm check`: `scripts/check.sh task`, below.

Checks (`CONSTRAINTS.md`):

- `scripts/check.sh fast`: floor and secrets. A hook runs it after every edit.
- `scripts/check.sh task`: the fast checks plus format, lint, typecheck, architecture, and Vitest with `diff-cover` (changed lines ≥ 80% covered). The Stop hook runs it before you hand work back. `pnpm exec prettier --write <file>` fixes formatting. `diff-cover` comes from pipx, like Semgrep.
- `scripts/check.sh full`: everything CI runs, including the dependency and code scans.

## Boundaries

- **No server, no cloud.** Don't add a backend, a hosted sync service, telemetry or analytics. Data moves only between the GM's and the players' devices. Our iroh relay is the one exception: it only forwards encrypted traffic (ADR-0001). Never use iroh's public relays.
- **No secrets in git**: no `.env` files, keys or tokens.
- **Ask before adding a dependency**, and say why it's needed.
- **Checks pass before a PR leaves draft** (see `docs/agents/shipping.md`).
- **No game-system IP.** Don't copy rules text, stat blocks, names or art from published games (D&D and others). Use SRD/open-licensed content with its attribution, or original content.

## Borrowing from regie-jdr

Read it for practices, not layout: it is an Electron app, so its folder and IPC rules don't transfer as written. Worth carrying over:

- a `GLOSSARY.md` of domain terms and ADRs in `docs/adr/` for decisions;
- a `CODING_STANDARDS.md` whose rules are checkable on a diff, enforced by lint where possible;
- domain logic in a plain TypeScript core, testable without the app shell;
- data from disk or the network is `unknown` until a guard parses it: a peer is untrusted input;
- stored documents carry a version and a migration per older version.

Before building a GM feature regie-jdr already has, read how it does it and its ADRs.

## Decisions

Recorded as ADRs in `docs/adr/`. A choice they don't cover that shapes the code (a library, a data format, a protocol change) is a question for the user, not a guess; record the answer as a new ADR.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on grimfeld/ttrpg-helper, using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

How work ships: `docs/agents/shipping.md`.
