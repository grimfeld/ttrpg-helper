// An Overlay on the canvas: drag it to move, drag its corner handle to resize. Nothing moves
// during the drag; the edit is made, and saved, on release.
import { type Media, type Overlay, overlayRect } from "@ttrpg-helper/core";
import { useState } from "react";
import type { Platform } from "./platform";
import { SceneImage } from "./SceneImage";

interface Props {
  readonly campaignId: string;
  readonly overlay: Overlay;
  readonly media: Media | undefined;
  readonly platform: Platform;
  readonly onMove: (x: number, y: number) => void;
  readonly onResize: (height: number) => void;
}

type Gesture = "move" | "resize";

/** Follows one press until release, then reports how far it went as fractions of the canvas. */
function track(
  event: React.MouseEvent<HTMLElement>,
  onRelease: (dx: number, dy: number) => void,
  onEnd: () => void
) {
  const canvas = event.currentTarget
    .closest(".canvas")
    ?.getBoundingClientRect();
  if (canvas === undefined || canvas.width === 0 || canvas.height === 0)
    return false;
  const start = { x: event.clientX, y: event.clientY };
  const release = (up: MouseEvent) => {
    window.removeEventListener("mouseup", release);
    onEnd();
    const dx = (up.clientX - start.x) / canvas.width;
    const dy = (up.clientY - start.y) / canvas.height;
    if (dx !== 0 || dy !== 0) onRelease(dx, dy);
  };
  window.addEventListener("mouseup", release);
  return true;
}

export function OverlayPlacement({
  campaignId,
  overlay,
  media,
  platform,
  onMove,
  onResize,
}: Props) {
  const [gesture, setGesture] = useState<Gesture | undefined>(undefined);
  const start = (kind: Gesture, event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const started = track(
      event,
      (dx, dy) => {
        if (kind === "move") {
          onMove(overlay.position.x + dx, overlay.position.y + dy);
        } else {
          // The corner handle moves; the centre stays, so the height changes twice as much.
          onResize(overlay.height + 2 * dy);
        }
      },
      () => {
        setGesture(undefined);
      }
    );
    if (started) setGesture(kind);
  };

  return (
    <SceneImage
      campaignId={campaignId}
      media={media}
      layout={(size) => overlayRect(overlay, size)}
      hidden={!overlay.visible}
      platform={platform}
      boxProps={{
        "aria-label": `Overlay ${media?.originalName ?? "Missing image"}`,
        "data-gesture": gesture,
        onMouseDown: (event) => {
          start("move", event);
        },
      }}
    >
      <span
        className="resize-handle"
        aria-label={`Resize ${media?.originalName ?? "Missing image"}`}
        onMouseDown={(event) => {
          start("resize", event);
        }}
      />
    </SceneImage>
  );
}
