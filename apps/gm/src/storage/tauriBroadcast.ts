// The Broadcast window over Tauri: a second webview window (label "broadcast") and events.
// The Broadcast window's capability lets it listen and emit to the main window only.
import { emitTo, listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { BroadcastLink, BroadcastReceiver } from "../platform";

export const BROADCAST_LABEL = "broadcast";
export const MAIN_LABEL = "main";
export const EVENTS = {
  projection: "broadcast:projection",
  ready: "broadcast:ready",
  escape: "broadcast:escape",
} as const;

/** Runs `listen` and hands back a synchronous unsubscribe. */
function subscribe(
  event: string,
  callback: (payload: unknown) => void
): () => void {
  let unlisten: (() => void) | undefined;
  let stopped = false;
  void listen(event, (message) => {
    callback(message.payload);
  }).then((stop) => {
    if (stopped) stop();
    else unlisten = stop;
  });
  return () => {
    stopped = true;
    unlisten?.();
  };
}

async function broadcastWindow() {
  return WebviewWindow.getByLabel(BROADCAST_LABEL);
}

async function leaveFullscreen() {
  await (await broadcastWindow())?.setFullscreen(false);
}

export const tauriBroadcast: BroadcastLink = {
  async open() {
    const existing = await broadcastWindow();
    if (existing !== null) {
      await existing.setFocus();
      return;
    }
    new WebviewWindow(BROADCAST_LABEL, {
      url: "index.html?view=broadcast",
      title: "TTRPG Helper Broadcast",
      width: 1280,
      height: 720,
    });
  },
  async toggleFullscreen() {
    const window = await broadcastWindow();
    if (window === null) return;
    await window.setFullscreen(!(await window.isFullscreen()));
  },
  send(projection) {
    emitTo(BROADCAST_LABEL, EVENTS.projection, projection).catch(
      () => undefined
    );
  },
  onReady(callback) {
    const stopReady = subscribe(EVENTS.ready, callback);
    const stopEscape = subscribe(EVENTS.escape, () => {
      void leaveFullscreen();
    });
    return () => {
      stopReady();
      stopEscape();
    };
  },
};

export const tauriBroadcastReceiver: BroadcastReceiver = {
  onProjection: (callback) => subscribe(EVENTS.projection, callback),
  ready() {
    void emitTo(MAIN_LABEL, EVENTS.ready);
  },
  escape() {
    void emitTo(MAIN_LABEL, EVENTS.escape);
  },
};
