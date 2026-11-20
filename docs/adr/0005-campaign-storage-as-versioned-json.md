# Campaigns stored as versioned JSON documents, written from TypeScript

The GM app stores each Campaign as one folder in the app's data folder:

- a JSON document each for the Campaign, its Media index and its Scenes;
- each document carrying a `schemaVersion` and a migration from each older version;
- every write going to a temporary file then renamed over the old one, with the previous good copy kept as `.bak`;
- imported Media files named by their SHA-256 hash.

This is regie-jdr's format (its ADR-0001). We chose it over SQLite because the data is small, needs no native build, stays readable on disk, and has already proved itself in regie-jdr.

The reading, parsing, migration and writing logic lives in Core, behind a repository interface. The GM app implements the interface with Tauri's fs plugin, scoped to the app data folder. We chose this over custom Rust commands so the storage logic stays in TypeScript, where Vitest tests it without the app shell.

## Consequences

- A document is `unknown` until a guard parses it. A corrupt document is restored from its `.bak`, and a document newer than the app understands is refused.
- Any change to a stored document's shape bumps its version and adds a migration.
- The webviews display stored images through Tauri's asset protocol, scoped to the Campaigns folder.
