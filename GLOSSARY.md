# ttrpg-helper

Tools for running a tabletop RPG session: one app for the Game Master, one for each player, synced peer to peer.

## Apps

**GM app**:
The Game Master's desktop app. It holds the session state (ADR-0004) and decides what each player sees.
_Avoid_: GM window, main app, host, server

**Player app**:
The desktop app each player uses at the table. It shows what the GM app sends it and sends requests back; it must stay simple and quick to use mid-session.
_Avoid_: companion, companion app, client, player window

**Core**:
The domain logic and sync protocol shared by the GM app and the Player app. It runs inside either app and depends on neither.
_Avoid_: shared, common, lib

## Campaigns and Media

**Campaign**:
An independent collection of Scenes and Media, prepared by the GM for one game. Nothing is shared between Campaigns.

**Media**:
An image the GM imported into a Campaign.

## Scenes

**Scene**:
A saved composition of Backgrounds and Overlays, with an optional Scene title.

**Background**:
A full-canvas image placement, always below every Overlay. Several can be stacked.

**Hidden**:
Placed in a Scene but not shown to players. New placements start Hidden.
_Avoid_: invisible, off

**Scene title**:
An optional title shown to players, separate from the Scene's private name.

**Selected Scene**:
The Scene open in the editor. It may or may not be the Active Scene.

**Overlay**:
An image placement positioned and sized freely, above the Backgrounds.

## On air

**Active Scene**:
The single Scene on air.
_Avoid_: current scene, live scene

**Activate**:
Put a Scene on air.

**Transition**:
How the Broadcast window moves from one Active Scene to the next.

**Blackout**:
A temporary fade to black of the Broadcast window. It is not saved.

**Broadcast window**:
The GM app's player-facing window, shared with players (for example over Discord). It shows only the Broadcast projection.
_Avoid_: player window, second screen

**Broadcast projection**:
What of the Active Scene reaches players: shown placements and the Scene title, never Hidden placements or private names.

**On-air monitor**:
A small read-only copy of the Broadcast window inside the GM app's main window.
