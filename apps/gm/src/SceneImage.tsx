// One image placement on the canvas, through the asset protocol. A Media that is gone from the
// index, or whose file won't load, shows the "Missing image" placeholder.
import {
  type CanvasRect,
  type Fit,
  fitRect,
  type Media,
  mediaFile,
} from "@ttrpg-helper/core";
import { type CSSProperties, useEffect, useState } from "react";
import type { Platform } from "./platform";

interface Props {
  readonly campaignId: string;
  readonly media: Media | undefined;
  readonly fit: Fit;
  readonly hidden: boolean;
  readonly platform: Platform;
}

const percent = (fraction: number) => `${String(fraction * 100)}%`;

function rectStyle(rect: CanvasRect): CSSProperties {
  return {
    left: percent(rect.left),
    top: percent(rect.top),
    width: percent(rect.width),
    height: percent(rect.height),
  };
}

export function SceneImage({
  campaignId,
  media,
  fit,
  hidden,
  platform,
}: Props) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (media === undefined) return;
    let current = true;
    platform.mediaUrl(mediaFile(campaignId, media)).then(
      (resolved) => {
        if (current) setUrl(resolved);
      },
      () => {
        if (current) setFailed(true);
      }
    );
    return () => {
      current = false;
    };
  }, [campaignId, media, platform]);

  const className = hidden ? "placement hidden" : "placement";
  if (media === undefined || failed) {
    return (
      <div
        className={`${className} missing`}
        role="img"
        aria-label="Missing image"
      >
        Missing image
      </div>
    );
  }
  if (url === undefined) return null;
  return (
    <img
      className={className}
      src={url}
      alt={media.originalName}
      style={rectStyle(fitRect(size, fit))}
      onLoad={(event) => {
        setSize({
          width: event.currentTarget.naturalWidth,
          height: event.currentTarget.naturalHeight,
        });
      }}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}
