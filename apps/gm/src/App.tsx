import {
  type Campaign,
  createCampaignRepository,
  type FileSystem,
} from "@ttrpg-helper/core";
import { useMemo, useState } from "react";
import { CampaignList } from "./CampaignList";
import { CampaignView } from "./CampaignView";
import { NoticesProvider, useNotify } from "./notices";

interface Props {
  readonly fileSystem: FileSystem;
  readonly newId: () => string;
}

export function App(props: Props) {
  return (
    <NoticesProvider>
      <Screens {...props} />
    </NoticesProvider>
  );
}

function Screens({ fileSystem, newId }: Props) {
  const notify = useNotify();
  const repository = useMemo(
    () =>
      createCampaignRepository(fileSystem, {
        newId,
        onRecovered: ({ file }) => {
          notify(`${file} was damaged and has been restored from its backup.`);
        },
      }),
    [fileSystem, newId, notify]
  );
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  if (campaign !== null) {
    return (
      <CampaignView
        campaign={campaign}
        onBack={() => {
          setCampaign(null);
        }}
      />
    );
  }
  return <CampaignList repository={repository} onOpen={setCampaign} />;
}
