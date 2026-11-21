import {
  type BroadcastProjection,
  type Campaign,
  createCampaignRepository,
  leaveCampaign,
  nextProjection,
  type OnAir,
  offAir,
  project,
} from "@ttrpg-helper/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const nothing = () => undefined;

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

  // What is on air lives here, in the main window, in memory only (ADR-0006).
  const [onAir, setOnAir] = useState<OnAir>(() => offAir(Date.now()));
  const latest = useRef<BroadcastProjection | undefined>(undefined);
  const publish = useCallback(
    (projection: BroadcastProjection) => {
      // Each projection sent is newer than the last, or the Broadcast window would ignore it.
      const next = nextProjection(latest.current, projection);
      latest.current = next;
      platform.broadcast.send(next);
    },
    [platform]
  );
  // A Broadcast window that opens asks for what is on air.
  useEffect(
    () =>
      platform.broadcast.onReady(() => {
        if (latest.current !== undefined)
          platform.broadcast.send(latest.current);
      }),
    [platform]
  );
  // At home nothing is on air.
  useEffect(() => {
    if (campaign === null) publish(project(onAir, [], nothing));
  }, [campaign, onAir, publish]);

  if (campaign !== null) {
    return (
      <CampaignView
        campaign={campaign}
        platform={platform}
        onAir={onAir}
        setOnAir={setOnAir}
        publish={publish}
        onBack={() => {
          setOnAir(leaveCampaign);
          setCampaign(null);
        }}
      />
    );
  }
  return <CampaignList repository={repository} onOpen={setCampaign} />;
}
