/**
 * Scenes: compositions of Backgrounds (and, from #15, Overlays) on the 16:9 canvas, stored
 * in the Campaign's `scenes.json`. Edits are pure commands that return new values; the app
 * saves the whole document after each one.
 */
import { campaignFolder } from "./campaigns";
import type { Fit } from "./canvas";
import {
  createDocumentStore,
  type DocumentStoreOptions,
  type DocumentType,
} from "./documents";
import { type FileSystem, joinPath } from "./fileSystem";
import { isRecord, isString } from "./guards";

export const SCENE_NAME_MAX_LENGTH = 80;
export const SCENE_TITLE_MAX_LENGTH = 120;

export interface Background {
  readonly id: string;
  readonly mediaId: string;
  readonly fit: Fit;
  readonly visible: boolean;
}

export interface Overlay {
  readonly id: string;
  readonly mediaId: string;
  /** The centre, as fractions of the canvas (0..1). */
  readonly position: { readonly x: number; readonly y: number };
  /** A fraction of the canvas height. */
  readonly height: number;
  readonly visible: boolean;
}

export interface Scene {
  readonly id: string;
  readonly name: string;
  /** Shown to players; `""` for none. */
  readonly title: string;
  /** Stacking order: the last draws on top. */
  readonly backgrounds: readonly Background[];
  /** Stacking order: the last draws on top. Always above every Background. */
  readonly overlays: readonly Overlay[];
}

export type TextCheck =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly reason: string };

/** A Scene name is required, trimmed, and at most 80 characters. Duplicates are fine. */
export function checkSceneName(input: string): TextCheck {
  const value = input.trim();
  if (value === "") return { ok: false, reason: "Give the Scene a name." };
  if (value.length > SCENE_NAME_MAX_LENGTH) {
    return {
      ok: false,
      reason: `Use at most ${String(SCENE_NAME_MAX_LENGTH)} characters.`,
    };
  }
  return { ok: true, value };
}

/** A Scene title is optional, trimmed, and at most 120 characters. */
export function checkSceneTitle(input: string): TextCheck {
  const value = input.trim();
  if (value.length > SCENE_TITLE_MAX_LENGTH) {
    return {
      ok: false,
      reason: `Use at most ${String(SCENE_TITLE_MAX_LENGTH)} characters.`,
    };
  }
  return { ok: true, value };
}

// --- Edits: pure functions over the Scene list -------------------------------------------

/** Appends "Scene N", N being one more than the highest "Scene k" so far. */
export function createScene(
  scenes: readonly Scene[],
  id: string
): readonly Scene[] {
  const numbers = scenes
    .map((scene) => /^Scene (\d+)$/.exec(scene.name)?.[1])
    .filter((n) => n !== undefined)
    .map(Number);
  const next = Math.max(scenes.length, ...numbers) + 1;
  return [
    ...scenes,
    {
      id,
      name: `Scene ${String(next)}`,
      title: "",
      backgrounds: [],
      overlays: [],
    },
  ];
}

export function deleteScene(
  scenes: readonly Scene[],
  sceneId: string
): readonly Scene[] {
  return scenes.filter((scene) => scene.id !== sceneId);
}

/** Replaces one Scene with the result of an edit. */
export function updateScene(
  scenes: readonly Scene[],
  sceneId: string,
  edit: (scene: Scene) => Scene
): readonly Scene[] {
  return scenes.map((scene) => (scene.id === sceneId ? edit(scene) : scene));
}

export const renameScene =
  (name: string) =>
  (scene: Scene): Scene => ({ ...scene, name });

export const setSceneTitle =
  (title: string) =>
  (scene: Scene): Scene => ({ ...scene, title });

/** Places a Media as the top Background, Hidden and Cover. */
export const addBackground =
  (id: string, mediaId: string) =>
  (scene: Scene): Scene => ({
    ...scene,
    backgrounds: [
      ...scene.backgrounds,
      { id, mediaId, fit: "cover", visible: false },
    ],
  });

const editBackground =
  (backgroundId: string, edit: (background: Background) => Background) =>
  (scene: Scene): Scene => ({
    ...scene,
    backgrounds: scene.backgrounds.map((background) =>
      background.id === backgroundId ? edit(background) : background
    ),
  });

export const setBackgroundFit = (backgroundId: string, fit: Fit) =>
  editBackground(backgroundId, (background) => ({ ...background, fit }));

export const setBackgroundVisible = (backgroundId: string, visible: boolean) =>
  editBackground(backgroundId, (background) => ({ ...background, visible }));

export const removeBackground =
  (backgroundId: string) =>
  (scene: Scene): Scene => ({
    ...scene,
    backgrounds: scene.backgrounds.filter(
      (background) => background.id !== backgroundId
    ),
  });

// --- Storage -----------------------------------------------------------------------------

const isFraction = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1;

const isId = (value: unknown): value is string =>
  isString(value) && value !== "";

function parseBackground(value: unknown): Background | undefined {
  if (!isRecord(value)) return undefined;
  const { id, mediaId, fit, visible } = value;
  if (!isId(id) || !isId(mediaId) || typeof visible !== "boolean")
    return undefined;
  if (fit !== "cover" && fit !== "contain") return undefined;
  return { id, mediaId, fit, visible };
}

function parseOverlay(value: unknown): Overlay | undefined {
  if (!isRecord(value)) return undefined;
  const { id, mediaId, position, height, visible } = value;
  if (!isId(id) || !isId(mediaId) || typeof visible !== "boolean")
    return undefined;
  if (!isRecord(position) || !isFraction(position.x) || !isFraction(position.y))
    return undefined;
  if (!isFraction(height) || height === 0) return undefined;
  return {
    id,
    mediaId,
    position: { x: position.x, y: position.y },
    height,
    visible,
  };
}

function parseList<T>(
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

function parseScene(value: unknown): Scene | undefined {
  if (!isRecord(value)) return undefined;
  const { id, name, title, backgrounds, overlays } = value;
  if (!isId(id) || !isString(name) || !checkSceneName(name).ok)
    return undefined;
  if (!isString(title) || !checkSceneTitle(title).ok) return undefined;
  const parsedBackgrounds = parseList(backgrounds, parseBackground);
  const parsedOverlays = parseList(overlays, parseOverlay);
  if (parsedBackgrounds === undefined || parsedOverlays === undefined)
    return undefined;
  return {
    id,
    name,
    title,
    backgrounds: parsedBackgrounds,
    overlays: parsedOverlays,
  };
}

export interface SceneList {
  readonly scenes: readonly Scene[];
}

/** `scenes.json`, version 1: `{ schemaVersion, scenes: [Scene] }`, in creation order. */
export const scenesDocument: DocumentType<SceneList> = {
  name: "scene list",
  version: 1,
  migrations: {},
  parse({ scenes }) {
    const parsed = parseList(scenes, parseScene);
    return parsed === undefined ? undefined : { scenes: parsed };
  },
  serialize: ({ scenes }) => ({ scenes: structuredCloneScenes(scenes) }),
};

function structuredCloneScenes(scenes: readonly Scene[]) {
  return scenes.map(({ id, name, title, backgrounds, overlays }) => ({
    id,
    name,
    title,
    backgrounds: backgrounds.map(({ id: b, mediaId, fit, visible }) => ({
      id: b,
      mediaId,
      fit,
      visible,
    })),
    overlays: overlays.map(({ id: o, mediaId, position, height, visible }) => ({
      id: o,
      mediaId,
      position: { x: position.x, y: position.y },
      height,
      visible,
    })),
  }));
}

export function scenesFile(campaignId: string): string {
  return joinPath(campaignFolder(campaignId), "scenes.json");
}

export interface SceneStore {
  load(): Promise<readonly Scene[]>;
  save(scenes: readonly Scene[]): Promise<void>;
}

export function createSceneStore(
  fileSystem: FileSystem,
  campaignId: string,
  options: DocumentStoreOptions = {}
): SceneStore {
  const store = createDocumentStore(fileSystem, options);
  const file = scenesFile(campaignId);
  return {
    load: async () => (await store.read(file, scenesDocument))?.scenes ?? [],
    save: (scenes) => store.write(file, scenesDocument, { scenes }),
  };
}
