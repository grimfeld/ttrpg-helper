/** What an app knows about the current session, before any sync exists. */
export interface SessionSummary {
  readonly playerCount: number;
}

/** A one-line description of a session for the apps' headers. */
export function describeSession(session: SessionSummary): string {
  switch (session.playerCount) {
    case 0:
      return "No players yet";
    case 1:
      return "1 player";
    default:
      return `${String(session.playerCount)} players`;
  }
}
