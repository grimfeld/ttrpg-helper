/** Guards for data from disk or a peer: it is `unknown` until one of these accepts it. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** An ISO 8601 timestamp such as `2026-11-20T01:00:00.000Z`. */
export function isTimestamp(value: unknown): value is string {
  return isString(value) && !Number.isNaN(Date.parse(value));
}
