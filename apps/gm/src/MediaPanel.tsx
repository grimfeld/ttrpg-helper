// The Media panel, in the Campaign view's right column: the Campaign's images and Import.
import {
  type Campaign,
  createMediaLibrary,
  describeError,
  type Media,
} from "@ttrpg-helper/core";
import { useEffect, useMemo, useState } from "react";
import { useNotify } from "./notices";
import type { Platform } from "./platform";

interface Props {
  readonly campaign: Campaign;
  readonly platform: Platform;
}

export function MediaPanel({ campaign, platform }: Props) {
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

  async function importImages() {
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
  }

  return (
    <section className="media-panel" aria-label="Media">
      <header className="panel-header">
        <h2>Media</h2>
        <button
          type="button"
          disabled={importing}
          aria-busy={importing}
          onClick={() => void importImages()}
        >
          {importing && <span className="spinner" aria-hidden="true" />}
          {importing ? "Importing…" : "Import"}
        </button>
      </header>
      {media.length === 0 ? (
        <p className="empty">No images yet</p>
      ) : (
        <ul className="media-list">
          {media.map((item) => (
            <li key={item.id} title={item.originalName}>
              {item.originalName}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
