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
