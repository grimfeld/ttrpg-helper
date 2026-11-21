// Which window this webview is: the Broadcast window (?view=broadcast) or the main window.
import { App } from "./App";
import { BroadcastApp } from "./BroadcastApp";
import type { BroadcastReceiver, Platform } from "./platform";

interface Props {
  readonly search: string;
  readonly platform: Platform;
  readonly receiver: BroadcastReceiver;
}

export function Root({ search, platform, receiver }: Props) {
  return new URLSearchParams(search).get("view") === "broadcast" ? (
    <BroadcastApp receiver={receiver} />
  ) : (
    <App platform={platform} />
  );
}
