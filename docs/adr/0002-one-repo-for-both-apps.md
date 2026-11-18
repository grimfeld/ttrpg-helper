# One repository holding both apps and a shared core

The GM app and the player companion app live in this one repository, as a workspace: one package per app plus a shared core package. The core holds the domain logic and the session sync protocol, in plain TypeScript that tests can run without Tauri.

We chose one repository because both apps speak the same sync protocol and share the same domain model: a change to either must land in both apps at once, in one PR, checked by one CI run.

## Consequences

- A change to the sync protocol or the shared model updates the core and both apps together.
- Each app stays a thin Tauri and React shell over the core.
- The package manager isn't chosen yet.
