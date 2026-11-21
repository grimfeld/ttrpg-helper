// The open Campaign's Media: the list, and Import with its notices. Shared by the Media panel
// and the Scene editor's Media picker.
import {
  type Campaign,
  createMediaLibrary,
  describeError,
  type Media,
} from "@ttrpg-helper/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "./notices";
import type { Platform } from "./platform";

export interface MediaState {
  readonly media: readonly Media[];
  readonly importing: boolean;
  readonly importImages: () => Promise<void>;
}

export function useMediaLibrary(
  campaign: Campaign,
  platform: Platform
): MediaState {
  const notify = useNotify();
  const library = useMemo(
    () =>
      createMediaLibrary(platform.fileSystem, campaign.id, {
        newId: platform.newId,
        sha256: platform.sha256,
        onRecovered: ({ file }) => {
          notify(`${file} was damaged and has been restored from its backup.`);
        },
      }),
    [campaign.id, platform, notify]
  );
  const [media, setMedia] = useState<readonly Media[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let current = true;
    library.list().then(
      (list) => {
        if (current) setMedia(list);
      },
      (error: unknown) => {
        if (current) notify(`Couldn't read the Media: ${describeError(error)}`);
      }
    );
    return () => {
      current = false;
    };
  }, [library, notify]);

  const importImages = useCallback(async () => {
    try {
      const files = await platform.pickImages();
      if (files.length === 0) return;
      // The spinner shows while the files are read, hashed and copied, not while picking.
      setImporting(true);
      const result = await library.import(files);
      setMedia(result.media);
      for (const { name, reason } of result.failed) {
        notify(`${name} ${reason}, so it wasn't imported.`);
      }
    } catch (error) {
      notify(`Couldn't import the images: ${describeError(error)}`);
    } finally {
      setImporting(false);
    }
  }, [library, platform, notify]);

  return { media, importing, importImages };
}
