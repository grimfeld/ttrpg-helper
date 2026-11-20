# ttrpg-helper

A helper for running tabletop RPGs: a desktop app for the Game Master (the GM app) and one for each player (the Player app).

- How work ships: [`docs/agents/shipping.md`](docs/agents/shipping.md)
- Agent setup: [`CLAUDE.md`](CLAUDE.md)

## Prerequisites

- **Node 22** (`.node-version`) and **pnpm** (the version in `package.json` `packageManager`; `corepack enable` provides it).
- **Rust**, through [rustup](https://rustup.rs/): `rust-toolchain.toml` pins the version and its components, and rustup installs them on first use.
- **Tauri's system packages.** On Debian or Ubuntu:

  ```sh
  sudo apt-get install libwebkit2gtk-4.1-dev build-essential curl wget file \
    libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
  ```

  macOS needs the Xcode Command Line Tools; Windows needs the Microsoft C++ Build Tools and WebView2. See [Tauri's prerequisites](https://v2.tauri.app/start/prerequisites/).

## Running the apps

```sh
pnpm install
pnpm dev:gm       # the GM app, in a window titled "TTRPG Helper GM"
pnpm dev:player   # the Player app, in a window titled "TTRPG Helper Player"
```

Each command starts the app's Vite dev server (GM on port 5173, Player on 5174) and opens the Tauri window on it. `pnpm check` runs the checks a change must pass (`CONSTRAINTS.md`).
