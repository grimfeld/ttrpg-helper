// What players see: the Broadcast window, and the On-air monitor at a smaller size. A new take
// crossfades over the previous one; Blackout fades to black; the 16:9 canvas letterboxes in
// any frame. It shows only what the Broadcast projection carries.
import {
  type BroadcastProjection,
  CROSSFADE_MS,
  fitRect,
  overlayRect,
  type ProjectedScene,
} from "@ttrpg-helper/core";
import { type CSSProperties, useEffect, useState } from "react";

interface Props {
  readonly projection: BroadcastProjection | undefined;
}

const percent = (fraction: number) => `${String(fraction * 100)}%`;

export function BroadcastView({ projection }: Props) {
  const scene = projection?.scene ?? null;
  // The previous take stays underneath while the new one fades in.
  const [previous, setPrevious] = useState<ProjectedScene | null>(null);
  const [current, setCurrent] = useState<ProjectedScene | null>(scene);
  if (scene?.take !== current?.take) {
    setPrevious(current);
    setCurrent(scene);
  } else if (scene !== current) {
    setCurrent(scene);
  }
  useEffect(() => {
    if (previous === null) return;
    const timer = setTimeout(() => {
      setPrevious(null);
    }, CROSSFADE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [previous]);

  return (
    <div className="broadcast-frame">
      <div className="broadcast-canvas" data-testid="broadcast-canvas">
        {previous !== null && (
          <Take key={`take-${String(previous.take)}`} scene={previous} />
        )}
        {current !== null && (
          <Take key={`take-${String(current.take)}`} scene={current} fadeIn />
        )}
        {/* Black covers the picture on Blackout, and fades in when nothing is on air, so
            going off air is a fade to black, never a cut. */}
        <div
          className="blackout"
          data-on={
            projection?.blackout === true || scene === null ? "true" : "false"
          }
          style={{ transitionDuration: `${String(CROSSFADE_MS)}ms` }}
        />
      </div>
    </div>
  );
}

function Take({
  scene,
  fadeIn = false,
}: {
  readonly scene: ProjectedScene;
  readonly fadeIn?: boolean;
}) {
  const style: CSSProperties = fadeIn
    ? { animationDuration: `${String(CROSSFADE_MS)}ms` }
    : {};
  return (
    <div className={fadeIn ? "take fade-in" : "take"} style={style}>
      {scene.backgrounds.map((background, index) => (
        <BroadcastImage
          key={`b${String(index)}:${background.url}`}
          url={background.url}
          rect={(size) => fitRect(size, background.fit)}
        />
      ))}
      {scene.overlays.map((overlay, index) => (
        <BroadcastImage
          key={`o${String(index)}:${overlay.url}`}
          url={overlay.url}
          rect={(size) => overlayRect(overlay, size)}
        />
      ))}
      {scene.title !== "" && <p className="scene-title">{scene.title}</p>}
    </div>
  );
}

function BroadcastImage({
  url,
  rect,
}: {
  readonly url: string;
  readonly rect: (size: { width: number; height: number }) => {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  // A missing image file is left out of what players see.
  if (failed) return null;
  const box = rect(size);
  return (
    <img
      className="broadcast-image"
      src={url}
      alt=""
      style={{
        left: percent(box.left),
        top: percent(box.top),
        width: percent(box.width),
        height: percent(box.height),
      }}
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
