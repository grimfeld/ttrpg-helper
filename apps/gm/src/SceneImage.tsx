// One image placement on the canvas, through the asset protocol. A Media that is gone from the
// index, or whose file won't load, shows the "Missing image" placeholder. Where the placement
// sits comes from `layout`, given the image's natural size once it has loaded.
import { type CanvasRect, type Media, mediaFile } from "@ttrpg-helper/core";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import type { Platform } from "./platform";

export type ImageSize = { readonly width: number; readonly height: number };

interface Props {
  readonly campaignId: string;
  readonly media: Media | undefined;
  readonly layout: (size: ImageSize) => CanvasRect;
  readonly hidden: boolean;
  readonly platform: Platform;
  /** Extra props for the placement's box, such as drag handlers. */
  readonly boxProps?: React.HTMLAttributes<HTMLDivElement> & {
    readonly "data-gesture"?: string | undefined;
  };
  readonly children?: ReactNode;
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
  layout,
  hidden,
  platform,
  boxProps,
  children,
}: Props) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [size, setSize] = useState<ImageSize>({ width: 0, height: 0 });

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

  const missing = media === undefined || failed;
  const className = hidden ? "placement hidden" : "placement";
  const placeholder = (
    <span role="img" aria-label="Missing image">
      Missing image
    </span>
  );
  const image =
    url === undefined || media === undefined ? null : (
      <img
        className={boxProps === undefined ? className : undefined}
        style={boxProps === undefined ? rectStyle(layout(size)) : undefined}
        src={url}
        alt={media.originalName}
        draggable={false}
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

  // A Background is the image itself, or a placeholder filling the canvas.
  if (boxProps === undefined) {
    return missing ? (
      <div className={`${className} missing`}>{placeholder}</div>
    ) : (
      image
    );
  }
  // An Overlay is a box on the canvas holding the image and its handles.
  return (
    <div
      {...boxProps}
      className={missing ? `${className} missing` : className}
      style={rectStyle(layout(size))}
    >
      {missing ? placeholder : image}
      {children}
    </div>
  );
}
