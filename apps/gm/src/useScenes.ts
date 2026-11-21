// The open Campaign's Scenes. Each edit shows at once and saves the whole scenes.json; a failed
// save keeps the edit on screen and says so.
import {
  type Campaign,
  createSceneStore,
  describeError,
  type Scene,
} from "@ttrpg-helper/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotify } from "./notices";
import type { Platform } from "./platform";

export type ScenesEdit = (scenes: readonly Scene[]) => readonly Scene[];

export interface ScenesState {
  /** Undefined while loading, or when scenes.json can't be read (nothing is saved then). */
  readonly scenes: readonly Scene[] | undefined;
  readonly apply: (edit: ScenesEdit) => void;
}

export function useScenes(campaign: Campaign, platform: Platform): ScenesState {
  const notify = useNotify();
  const store = useMemo(
    () =>
      createSceneStore(platform.fileSystem, campaign.id, {
        onRecovered: ({ file }) => {
          notify(`${file} was damaged and has been restored from its backup.`);
        },
      }),
    [campaign.id, platform, notify]
  );
  const [scenes, setScenes] = useState<readonly Scene[] | undefined>(undefined);
  // The latest list, so an edit made later (on a drag's release) never starts from an old one.
  const latest = useRef<readonly Scene[] | undefined>(undefined);

  useEffect(() => {
    let current = true;
    store.load().then(
      (loaded) => {
        if (!current) return;
        latest.current = loaded;
        setScenes(loaded);
      },
      (error: unknown) => {
        if (current)
          notify(`Couldn't read the Scenes: ${describeError(error)}`);
      }
    );
    return () => {
      current = false;
    };
  }, [store, notify]);

  const apply = useCallback(
    (edit: ScenesEdit) => {
      if (latest.current === undefined) return;
      const next = edit(latest.current);
      latest.current = next;
      setScenes(next);
      store.save(next).catch((error: unknown) => {
        notify(`Couldn't save the Scenes: ${describeError(error)}`);
      });
    },
    [store, notify]
  );

  return { scenes, apply };
}
