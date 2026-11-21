import { beforeEach, describe, expect, it, vi } from "vitest";

const event = vi.hoisted(() => ({
  emitTo: vi.fn(() => Promise.resolve()),
  listen: vi.fn(),
}));
const windows = vi.hoisted(() => {
  const existing = {
    setFocus: vi.fn(() => Promise.resolve()),
    setFullscreen: vi.fn(() => Promise.resolve()),
    isFullscreen: vi.fn(() => Promise.resolve(false)),
  };
  const WebviewWindow = Object.assign(vi.fn(), { getByLabel: vi.fn() });
  return { existing, WebviewWindow };
});
vi.mock("@tauri-apps/api/event", () => event);
vi.mock("@tauri-apps/api/webviewWindow", () => ({
  WebviewWindow: windows.WebviewWindow,
}));

const { tauriBroadcast, tauriBroadcastReceiver, EVENTS } =
  await import("./tauriBroadcast");
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tauriBroadcast", () => {
  it("opens the Broadcast window, or focuses it when it is open", async () => {
    windows.WebviewWindow.getByLabel.mockResolvedValueOnce(null);
    await tauriBroadcast.open();
    expect(windows.WebviewWindow).toHaveBeenCalledWith("broadcast", {
      url: "index.html?view=broadcast",
      title: "TTRPG Helper Broadcast",
      width: 1280,
      height: 720,
    });
    windows.WebviewWindow.getByLabel.mockResolvedValueOnce(windows.existing);
    await tauriBroadcast.open();
    expect(windows.existing.setFocus).toHaveBeenCalled();
  });

  it("toggles fullscreen when the window is open", async () => {
    windows.WebviewWindow.getByLabel.mockResolvedValueOnce(windows.existing);
    await tauriBroadcast.toggleFullscreen();
    expect(windows.existing.setFullscreen).toHaveBeenCalledWith(true);
    windows.WebviewWindow.getByLabel.mockResolvedValueOnce(null);
    await tauriBroadcast.toggleFullscreen();
    expect(windows.existing.setFullscreen).toHaveBeenCalledTimes(1);
  });

  it("sends projections only to the Broadcast window", () => {
    const projection = { revision: 1, blackout: false, scene: null };
    tauriBroadcast.send(projection);
    expect(event.emitTo).toHaveBeenCalledWith(
      "broadcast",
      EVENTS.projection,
      projection
    );
  });

  it("calls back on ready, leaves fullscreen on escape, and stops listening", async () => {
    const handlers = new Map<string, (message: { payload: unknown }) => void>();
    const unlisten = vi.fn();
    event.listen.mockImplementation(
      (name: string, handler: (message: { payload: unknown }) => void) => {
        handlers.set(name, handler);
        return Promise.resolve(unlisten);
      }
    );
    const ready = vi.fn();
    const stop = tauriBroadcast.onReady(ready);
    await flush();
    handlers.get(EVENTS.ready)?.({ payload: null });
    expect(ready).toHaveBeenCalled();
    windows.WebviewWindow.getByLabel.mockResolvedValueOnce(windows.existing);
    handlers.get(EVENTS.escape)?.({ payload: null });
    await flush();
    expect(windows.existing.setFullscreen).toHaveBeenCalledWith(false);
    stop();
    expect(unlisten).toHaveBeenCalledTimes(2);
  });

  it("stops a listener that registers after it was stopped", async () => {
    const unlisten = vi.fn();
    event.listen.mockReturnValue(Promise.resolve(unlisten));
    const stop = tauriBroadcastReceiver.onProjection(vi.fn());
    stop();
    await flush();
    expect(unlisten).toHaveBeenCalled();
  });
});

describe("tauriBroadcastReceiver", () => {
  it("asks the main window for the projection and to leave fullscreen", () => {
    tauriBroadcastReceiver.ready();
    tauriBroadcastReceiver.escape();
    expect(event.emitTo).toHaveBeenCalledWith("main", EVENTS.ready);
    expect(event.emitTo).toHaveBeenCalledWith("main", EVENTS.escape);
  });

  it("hands each projection's payload on", async () => {
    let handler: (message: { payload: unknown }) => void = () => undefined;
    event.listen.mockImplementation(
      (_name: string, h: (message: { payload: unknown }) => void) => {
        handler = h;
        return Promise.resolve(vi.fn());
      }
    );
    const received = vi.fn();
    tauriBroadcastReceiver.onProjection(received);
    await flush();
    handler({ payload: { revision: 1 } });
    expect(received).toHaveBeenCalledWith({ revision: 1 });
  });
});
