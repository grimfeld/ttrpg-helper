// The Broadcast window: black, no controls, no cursor, no notices. It asks the main window for
// what is on air when it opens, and shows each newer projection it receives.
import {
  type BroadcastProjection,
  isNewer,
  parseProjection,
} from "@ttrpg-helper/core";
import { useEffect, useState } from "react";
import { BroadcastView } from "./BroadcastView";
import type { BroadcastReceiver } from "./platform";

export function BroadcastApp({
  receiver,
}: {
  readonly receiver: BroadcastReceiver;
}) {
  const [shown, setShown] = useState<BroadcastProjection | undefined>(
    undefined
  );

  useEffect(() => {
    const stop = receiver.onProjection((payload) => {
      const incoming = parseProjection(payload);
      if (incoming === undefined) return;
      setShown((current) => (isNewer(incoming, current) ? incoming : current));
    });
    receiver.ready();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") receiver.escape();
    };
    window.addEventListener("keydown", escape);
    return () => {
      stop();
      window.removeEventListener("keydown", escape);
    };
  }, [receiver]);

  return (
    <div className="broadcast-window">
      <BroadcastView projection={shown} />
    </div>
  );
}
