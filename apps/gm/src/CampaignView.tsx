// An open Campaign. Later parts fill the area below the top bar (#13 to #16).
import type { Campaign } from "@ttrpg-helper/core";

interface Props {
  readonly campaign: Campaign;
  readonly onBack: () => void;
}

export function CampaignView({ campaign, onBack }: Props) {
  return (
    <div className="campaign-view">
      <header className="top-bar">
        <button type="button" onClick={onBack}>
          ← Campaigns
        </button>
        <h1 title={campaign.name}>{campaign.name}</h1>
      </header>
      <main className="campaign-body" />
    </div>
  );
}
