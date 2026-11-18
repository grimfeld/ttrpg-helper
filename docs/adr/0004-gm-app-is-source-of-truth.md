# The GM app is the source of truth for a session

The GM app holds the session state. Player apps don't edit it: they send requests to the GM app, which checks each one, applies it or refuses it, and sends the players the resulting state.

We chose this over state shared between peers because the GM decides what happens at the table and what each player gets to know. With one owner, there are no conflicting edits to merge and no secrets on players' devices. A peer-to-peer merge scheme (CRDTs) would make player apps work better offline, but the session can't go on without the GM anyway.

## Consequences

- A session runs only while the GM app is connected. A player app that loses its connection shows the last state it received and says it's offline.
- What a player app receives carries only what that player may see: a projection of the GM's state, like regie-jdr's broadcast projection. Hidden information is never sent, rather than sent and hidden.
- A player's request is untrusted input: the GM app parses and checks it before applying it.
- The sync protocol in the shared core has two parts: requests from players to the GM, and state from the GM to players.
