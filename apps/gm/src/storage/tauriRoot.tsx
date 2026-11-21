// The app's root element on Tauri: the main window or the Broadcast window, by the URL.
import { StrictMode } from "react";
import { Root } from "../BroadcastRoot";
import { tauriBroadcastReceiver } from "./tauriBroadcast";
import { tauriPlatform } from "./tauriPlatform";

export function tauriRoot(search: string) {
  return (
    <StrictMode>
      <Root
        search={search}
        platform={tauriPlatform}
        receiver={tauriBroadcastReceiver}
      />
    </StrictMode>
  );
}
