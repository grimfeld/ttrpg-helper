// The asset-protocol URL of each of the Campaign's Media, for the Broadcast projection.
import { type Media, mediaFile } from "@ttrpg-helper/core";
import { useEffect, useState } from "react";
import type { Platform } from "./platform";

export function useMediaUrls(
  campaignId: string,
  media: readonly Media[],
  platform: Platform
): ReadonlyMap<string, string> {
  const [urls, setUrls] = useState<ReadonlyMap<string, string>>(new Map());
  useEffect(() => {
    let current = true;
    Promise.all(
      media.map(
        async (item) =>
          [
            item.id,
            await platform.mediaUrl(mediaFile(campaignId, item)),
          ] as const
      )
    ).then(
      (entries) => {
        if (current) setUrls(new Map(entries));
      },
      () => {
        // An image whose URL can't be made is left out of the projection.
      }
    );
    return () => {
      current = false;
    };
  }, [campaignId, media, platform]);
  return urls;
}
