# ttrpg-helper

Tools for running a tabletop RPG session, made of at least two apps:

- **GM app**: the Game Master's console. It is inspired by [grimfeld/regie-jdr](https://github.com/grimfeld/regie-jdr), a visual and audio control desk for the GM, and extends it.
- **Player companion app**: what players use at the table. It must stay simple and quick to use mid-session; a feature that slows a player down belongs in the GM app or nowhere.

The apps sync a session **peer to peer, with no server**: session data never goes through a host we run or pay for, and is never published on the internet. [iroh](https://www.iroh.computer/) is the candidate transport (not decided, see Open decisions).

## Stack

- Tauri, TypeScript and React.
- Desktop only for now (Windows, macOS, Linux). A mobile player app may come later; don't design it out, don't build for it yet.

## Commands

None yet. Add build, dev, test, lint and typecheck here with the first code, and copy them to "Checks" in `docs/agents/shipping.md`.

## Boundaries

- **No server, no cloud.** Don't add a backend, a hosted sync service, telemetry or analytics. Data moves only between the GM's and the players' devices.
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

## Open decisions

Don't pick these silently; ask, then record the answer as an ADR.

- **Sync transport.** iroh or another peer-to-peer library. iroh's default setup goes through public relay servers when a direct connection fails (traffic stays end-to-end encrypted): decide whether that counts as "no server".
- **Repo layout.** One repo holding both apps and a shared core (workspace), and the package manager.
- **UI language.** regie-jdr's UI is French; decide French, English, or both.
- **Who owns the session state.** Whether the GM app is the source of truth that players' apps mirror, or the state is shared.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on grimfeld/ttrpg-helper, using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

How work ships: `docs/agents/shipping.md`.
