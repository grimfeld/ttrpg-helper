// An open Campaign: the top bar, then the Scene list (left), the Scene editor (centre) and the
// Media panel (right). Scenes come with #14, the On-air monitor with #16.
import type { Campaign } from "@ttrpg-helper/core";
import { MediaPanel } from "./MediaPanel";
import type { Platform } from "./platform";

interface Props {
  readonly campaign: Campaign;
  readonly platform: Platform;
  readonly onBack: () => void;
}

export function CampaignView({ campaign, platform, onBack }: Props) {
  return (
    <div className="campaign-view">
      <header className="top-bar">
        <button type="button" onClick={onBack}>
          ← Campaigns
        </button>
        <h1 title={campaign.name}>{campaign.name}</h1>
      </header>
      <main className="campaign-body">
        <aside className="right-column">
          <MediaPanel campaign={campaign} platform={platform} />
        </aside>
      </main>
    </div>
  );
}
