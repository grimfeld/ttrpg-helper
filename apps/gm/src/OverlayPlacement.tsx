// An Overlay on the canvas: drag it to move, drag its corner handle to resize. Nothing moves
// during the drag; the edit is made, and saved, on release. Escape or leaving the window
// cancels a drag, and a drag ends with the Overlay if it goes away.
import { type Media, type Overlay, overlayRect } from "@ttrpg-helper/core";
import { useEffect, useState } from "react";
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

interface Gesture {
  readonly kind: "move" | "resize";
  readonly startX: number;
  readonly startY: number;
  /** The canvas's size in pixels when the press began. */
  readonly canvas: { readonly width: number; readonly height: number };
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

  useEffect(() => {
    if (gesture === undefined) return;
    const end = () => {
      setGesture(undefined);
    };
    const release = (up: MouseEvent) => {
      end();
      const dx = (up.clientX - gesture.startX) / gesture.canvas.width;
      const dy = (up.clientY - gesture.startY) / gesture.canvas.height;
      if (dx === 0 && dy === 0) return;
      if (gesture.kind === "move") {
        onMove(overlay.position.x + dx, overlay.position.y + dy);
      } else {
        // The corner handle moves; the centre stays, so the height changes twice as much.
        onResize(overlay.height + 2 * dy);
      }
    };
    const cancelOnEscape = (key: KeyboardEvent) => {
      if (key.key === "Escape") end();
    };
    window.addEventListener("mouseup", release);
    window.addEventListener("blur", end);
    window.addEventListener("keydown", cancelOnEscape);
    return () => {
      window.removeEventListener("mouseup", release);
      window.removeEventListener("blur", end);
      window.removeEventListener("keydown", cancelOnEscape);
    };
  }, [gesture, overlay, onMove, onResize]);

  const start = (
    kind: Gesture["kind"],
    event: React.MouseEvent<HTMLElement>
  ) => {
    if (event.button !== 0 || gesture !== undefined) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = event.currentTarget
      .closest(".canvas")
      ?.getBoundingClientRect();
    if (canvas === undefined || canvas.width === 0 || canvas.height === 0)
      return;
    setGesture({
      kind,
      startX: event.clientX,
      startY: event.clientY,
      canvas: { width: canvas.width, height: canvas.height },
    });
  };

  const name = media?.originalName ?? "Missing image";
  return (
    <SceneImage
      campaignId={campaignId}
      media={media}
      layout={(size) => overlayRect(overlay, size)}
      hidden={!overlay.visible}
      platform={platform}
      boxProps={{
        "aria-label": `Overlay ${name}`,
        "data-gesture": gesture?.kind,
        onMouseDown: (event) => {
          start("move", event);
        },
      }}
    >
      <span
        className="resize-handle"
        role="presentation"
        aria-label={`Resize ${name}`}
        onMouseDown={(event) => {
          start("resize", event);
        }}
      />
    </SceneImage>
  );
}
