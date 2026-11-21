// An open Campaign: the top bar (back, the name, Open broadcast, Fullscreen, Blackout), then
// the Scene list (left), the Scene editor (centre) and the On-air monitor above the Media
// panel (right). Keys: Ctrl+Enter Activates the Selected Scene; B toggles Blackout, except
// while typing in a field.
import {
  activate,
  type BroadcastProjection,
  type Campaign,
  createScene,
  type OnAir,
  project,
  toggleBlackout,
} from "@ttrpg-helper/core";
import { useEffect, useMemo, useState } from "react";
import { BroadcastView } from "./BroadcastView";
import { MediaPanel } from "./MediaPanel";
import { useNotify } from "./notices";
import type { Platform } from "./platform";
import { SceneEditor } from "./SceneEditor";
import { SceneList } from "./SceneList";
import { useMediaLibrary } from "./useMediaLibrary";
import { useMediaUrls } from "./useMediaUrls";
import { useScenes } from "./useScenes";

interface Props {
  readonly campaign: Campaign;
  readonly platform: Platform;
  readonly onAir: OnAir;
  readonly setOnAir: (change: (state: OnAir) => OnAir) => void;
  readonly publish: (projection: BroadcastProjection) => void;
  readonly onBack: () => void;
}

/** True while the focus is somewhere the GM types, where a letter key is text, not a command. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function CampaignView({
  campaign,
  platform,
  onAir,
  setOnAir,
  publish,
  onBack,
}: Props) {
  const notify = useNotify();
  const mediaState = useMediaLibrary(campaign, platform);
  const { scenes, apply } = useScenes(campaign, platform);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const selected = scenes?.find((scene) => scene.id === selectedId);
  const urls = useMediaUrls(campaign.id, mediaState.media, platform);

  // The projection follows the saved Scenes, so saved edits to the Active Scene go live and
  // edits to other Scenes change nothing players see.
  const projection = useMemo(
    () => project(onAir, scenes ?? [], (mediaId) => urls.get(mediaId)),
    [onAir, scenes, urls]
  );
  useEffect(() => {
    publish(projection);
  }, [projection, publish]);

  const activateSelected = () => {
    if (selected !== undefined)
      setOnAir((state) => activate(state, selected.id));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (selectedId !== undefined)
          setOnAir((state) => activate(state, selectedId));
        return;
      }
      const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
      if (
        plain &&
        (event.key === "b" || event.key === "B") &&
        !isTyping(event.target)
      ) {
        event.preventDefault();
        setOnAir(toggleBlackout);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedId, setOnAir]);

  const run = (action: () => Promise<void>, what: string) => {
    action().catch((error: unknown) => {
      notify(
        `Couldn't ${what}: ${error instanceof Error ? error.message : String(error)}`
      );
    });
  };

  return (
    <div className="campaign-view">
      <header className="top-bar">
        <button type="button" onClick={onBack}>
          ← Campaigns
        </button>
        <h1 title={campaign.name}>{campaign.name}</h1>
        <div className="top-bar-actions">
          <button
            type="button"
            onClick={() => {
              run(() => platform.broadcast.open(), "open the Broadcast window");
            }}
          >
            Open broadcast
          </button>
          <button
            type="button"
            onClick={() => {
              run(
                () => platform.broadcast.toggleFullscreen(),
                "toggle fullscreen"
              );
            }}
          >
            Fullscreen
          </button>
          <button
            type="button"
            className="blackout-button"
            aria-pressed={onAir.blackout}
            title="Fade the Broadcast window to black and back (B)"
            onClick={() => {
              setOnAir(toggleBlackout);
            }}
          >
            Blackout
          </button>
        </div>
      </header>
      <main className="campaign-body">
        <aside className="left-column">
          {scenes !== undefined && (
            <SceneList
              scenes={scenes}
              selectedId={selectedId}
              activeId={onAir.activeSceneId}
              onSelect={setSelectedId}
              onNew={() => {
                const id = platform.newId();
                apply((current) => createScene(current, id));
                setSelectedId(id);
              }}
            />
          )}
        </aside>
        <div className="centre-column">
          {selected === undefined ? (
            <p className="empty prompt">
              Create a Scene or select one to edit it.
            </p>
          ) : (
            <SceneEditor
              key={selected.id}
              campaignId={campaign.id}
              scene={selected}
              media={mediaState.media}
              platform={platform}
              apply={apply}
              isActive={selected.id === onAir.activeSceneId}
              onActivate={activateSelected}
            />
          )}
        </div>
        <aside className="right-column">
          <section className="on-air-monitor" aria-label="On-air monitor">
            <h2>On air</h2>
            <BroadcastView projection={projection} />
          </section>
          <MediaPanel {...mediaState} />
        </aside>
      </main>
    </div>
  );
}
