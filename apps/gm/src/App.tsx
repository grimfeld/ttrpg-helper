import { type Campaign, createCampaignRepository } from "@ttrpg-helper/core";
import { useMemo, useState } from "react";
import { CampaignList } from "./CampaignList";
import { CampaignView } from "./CampaignView";
import { NoticesProvider, useNotify } from "./notices";
import type { Platform } from "./platform";

interface Props {
  readonly platform: Platform;
}

export function App(props: Props) {
  return (
    <NoticesProvider>
      <Screens {...props} />
    </NoticesProvider>
  );
}

function Screens({ platform }: Props) {
  const notify = useNotify();
  const repository = useMemo(
    () =>
      createCampaignRepository(platform.fileSystem, {
        newId: platform.newId,
        onRecovered: ({ file }) => {
          notify(`${file} was damaged and has been restored from its backup.`);
        },
      }),
    [platform, notify]
  );
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  if (campaign !== null) {
    return (
      <CampaignView
        campaign={campaign}
        platform={platform}
        onBack={() => {
          setCampaign(null);
        }}
      />
    );
  }
  return <CampaignList repository={repository} onOpen={setCampaign} />;
}
