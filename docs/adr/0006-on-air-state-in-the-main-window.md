# On-air state lives in the GM app's main window

The GM app's main window owns what is on air: the Active Scene, Blackout and the current Transition, held in Core. It sends the Broadcast window only the Broadcast projection, over Tauri events. The Broadcast window has no other access to the Campaign.

In regie-jdr, Electron's main process held this state. We chose the main window over Rust so that the on-air logic stays in Core, tested by Vitest, and the Tauri shell stays thin (ADR-0002).

## Consequences

- Closing the main window ends the session: nothing is on air after a restart.
- The Broadcast window asks the main window for the current projection when it opens, and ignores a projection older than the one it shows.
- The Broadcast projection is built from an allow-list of fields, so a new field can't reach players without a decision. The same projection is what the Player app will receive later (ADR-0004).
