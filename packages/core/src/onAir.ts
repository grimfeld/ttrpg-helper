/**
 * What is on air (ADR-0006): the Active Scene and Blackout, held by the GM app's main window
 * in memory only, and the Broadcast projection it sends the Broadcast window.
 *
 * Every change raises `revision`, so the Broadcast window can ignore a projection older than
 * the one it shows. `take` counts Activations: a new take crossfades, an edit to the Active
 * Scene doesn't.
 */
import type { Fit } from "./canvas";
import { isRecord, isString } from "./guards";
import type { Scene } from "./scenes";

/** How long a Transition (the crossfade) and a Blackout fade take. */
export const CROSSFADE_MS = 600;

export interface OnAir {
  readonly activeSceneId: string | null;
  readonly blackout: boolean;
  readonly take: number;
  readonly revision: number;
}

/**
 * Nothing on air. Start `revision` from the clock, so a restarted main window's projections
 * are newer than any a Broadcast window kept from before.
 */
export function offAir(revision: number): OnAir {
  return { activeSceneId: null, blackout: false, take: 0, revision };
}

/** Puts a Scene on air with a new Transition. Blackout stays as it is. */
export function activate(state: OnAir, sceneId: string): OnAir {
  return {
    ...state,
    activeSceneId: sceneId,
    take: state.take + 1,
    revision: state.revision + 1,
  };
}

export function toggleBlackout(state: OnAir): OnAir {
  return { ...state, blackout: !state.blackout, revision: state.revision + 1 };
}

/** Leaving a Campaign (going home, opening another): nothing is on air. */
export function leaveCampaign(state: OnAir): OnAir {
  return {
    ...state,
    activeSceneId: null,
    blackout: false,
    revision: state.revision + 1,
  };
}

// --- The Broadcast projection ------------------------------------------------------------

export interface ProjectedBackground {
  readonly url: string;
  readonly fit: Fit;
}

export interface ProjectedOverlay {
  readonly url: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly height: number;
}

export interface ProjectedScene {
  readonly take: number;
  readonly title: string;
  readonly backgrounds: readonly ProjectedBackground[];
  readonly overlays: readonly ProjectedOverlay[];
}

/** Everything that reaches the Broadcast window. Each field is on an allow-list. */
export interface BroadcastProjection {
  readonly revision: number;
  readonly blackout: boolean;
  /** Null when nothing is on air. */
  readonly scene: ProjectedScene | null;
}

/**
 * Builds the projection field by field: shown placements and the Scene title only, never
 * Hidden placements, Scene names, Media names or ids. `urlFor` gives an image's asset URL, or
 * undefined when its Media is gone, which leaves that placement out.
 */
export function project(
  state: OnAir,
  scenes: readonly Scene[],
  urlFor: (mediaId: string) => string | undefined
): BroadcastProjection {
  const active = scenes.find((scene) => scene.id === state.activeSceneId);
  if (active === undefined) {
    return { revision: state.revision, blackout: state.blackout, scene: null };
  }
  const backgrounds: ProjectedBackground[] = [];
  for (const background of active.backgrounds) {
    const url = background.visible ? urlFor(background.mediaId) : undefined;
    if (url !== undefined) backgrounds.push({ url, fit: background.fit });
  }
  const overlays: ProjectedOverlay[] = [];
  for (const overlay of active.overlays) {
    const url = overlay.visible ? urlFor(overlay.mediaId) : undefined;
    if (url !== undefined) {
      overlays.push({
        url,
        position: { x: overlay.position.x, y: overlay.position.y },
        height: overlay.height,
      });
    }
  }
  return {
    revision: state.revision,
    blackout: state.blackout,
    scene: { take: state.take, title: active.title, backgrounds, overlays },
  };
}

/**
 * The projection to send after `previous`: its revision is always higher, so the Broadcast
 * window takes it, even when only the Active Scene's saved content changed.
 */
export function nextProjection(
  previous: BroadcastProjection | undefined,
  projection: BroadcastProjection
): BroadcastProjection {
  if (previous === undefined || projection.revision > previous.revision)
    return projection;
  return { ...projection, revision: previous.revision + 1 };
}

/** True when `incoming` should replace what the Broadcast window shows. */
export function isNewer(
  incoming: BroadcastProjection,
  shown: BroadcastProjection | undefined
): boolean {
  return shown === undefined || incoming.revision > shown.revision;
}

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function parseItems<T>(
  value: unknown,
  parse: (item: unknown) => T | undefined
): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items: T[] = [];
  for (const item of value) {
    const parsed = parse(item);
    if (parsed === undefined) return undefined;
    items.push(parsed);
  }
  return items;
}

/** The Broadcast window's guard: a projection arrives as `unknown`, like any message. */
export function parseProjection(
  value: unknown
): BroadcastProjection | undefined {
  if (!isRecord(value)) return undefined;
  const { revision, blackout, scene } = value;
  if (!isNumber(revision) || typeof blackout !== "boolean") return undefined;
  if (scene === null) return { revision, blackout, scene: null };
  if (!isRecord(scene)) return undefined;
  const { take, title } = scene;
  if (!isNumber(take) || !isString(title)) return undefined;
  const backgrounds = parseItems(
    scene.backgrounds,
    (item): ProjectedBackground | undefined => {
      if (!isRecord(item) || !isString(item.url)) return undefined;
      return item.fit === "cover" || item.fit === "contain"
        ? { url: item.url, fit: item.fit }
        : undefined;
    }
  );
  const overlays = parseItems(
    scene.overlays,
    (item): ProjectedOverlay | undefined => {
      if (!isRecord(item) || !isString(item.url) || !isNumber(item.height))
        return undefined;
      const { position } = item;
      if (!isRecord(position) || !isNumber(position.x) || !isNumber(position.y))
        return undefined;
      return {
        url: item.url,
        position: { x: position.x, y: position.y },
        height: item.height,
      };
    }
  );
  if (backgrounds === undefined || overlays === undefined) return undefined;
  return { revision, blackout, scene: { take, title, backgrounds, overlays } };
}
