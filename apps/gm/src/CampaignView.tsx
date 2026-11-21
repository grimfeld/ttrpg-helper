// An open Campaign: the top bar, then the Scene list (left), the Scene editor (centre) and the
// Media panel (right). The On-air monitor joins the right column with #16.
import { type Campaign, createScene } from "@ttrpg-helper/core";
import { useState } from "react";
import { MediaPanel } from "./MediaPanel";
import type { Platform } from "./platform";
import { SceneEditor } from "./SceneEditor";
import { SceneList } from "./SceneList";
import { useMediaLibrary } from "./useMediaLibrary";
import { useScenes } from "./useScenes";

interface Props {
  readonly campaign: Campaign;
  readonly platform: Platform;
  readonly onBack: () => void;
}

export function CampaignView({ campaign, platform, onBack }: Props) {
  const mediaState = useMediaLibrary(campaign, platform);
  const { scenes, apply } = useScenes(campaign, platform);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const selected = scenes?.find((scene) => scene.id === selectedId);

  return (
    <div className="campaign-view">
      <header className="top-bar">
        <button type="button" onClick={onBack}>
          ← Campaigns
        </button>
        <h1 title={campaign.name}>{campaign.name}</h1>
      </header>
      <main className="campaign-body">
        <aside className="left-column">
          {scenes !== undefined && (
            <SceneList
              scenes={scenes}
              selectedId={selectedId}
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
            />
          )}
        </div>
        <aside className="right-column">
          <MediaPanel {...mediaState} />
        </aside>
      </main>
    </div>
  );
}
