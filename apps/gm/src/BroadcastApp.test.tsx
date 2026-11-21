import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { BroadcastProjection } from "@ttrpg-helper/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BroadcastApp } from "./BroadcastApp";
import { Root } from "./BroadcastRoot";
import type { BroadcastReceiver } from "./platform";
import { testPlatform } from "./testPlatform";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function fakeReceiver() {
  let deliver: (payload: unknown) => void = () => undefined;
  const receiver: BroadcastReceiver & { readyCalls: number; escapes: number } =
    {
      readyCalls: 0,
      escapes: 0,
      onProjection(callback) {
        deliver = callback;
        return () => {
          deliver = () => undefined;
        };
      },
      ready() {
        receiver.readyCalls += 1;
      },
      escape() {
        receiver.escapes += 1;
      },
    };
  const send = (payload: unknown) => {
    act(() => {
      deliver(payload);
    });
  };
  return { receiver, send };
}

const onAir = (
  revision: number,
  take: number,
  title: string,
  blackout = false
): BroadcastProjection => ({
  revision,
  blackout,
  scene: {
    take,
    title,
    backgrounds: [{ url: `asset://${title}.png`, fit: "cover" }],
    overlays: [
      { url: "asset://token.png", position: { x: 0.5, y: 0.5 }, height: 0.3 },
    ],
  },
});

const canvas = () => screen.getByTestId("broadcast-canvas");

describe("Broadcast window", () => {
  it("starts black, asks for what is on air, and has no controls", () => {
    const { receiver } = fakeReceiver();
    render(<BroadcastApp receiver={receiver} />);
    expect(receiver.readyCalls).toBe(1);
    expect(canvas().querySelectorAll(".take")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("shows the projection's images and Scene title", () => {
    const { receiver, send } = fakeReceiver();
    render(<BroadcastApp receiver={receiver} />);
    send(onAir(1, 1, "Tavern"));
    expect(screen.getByText("Tavern")).toBeDefined();
    expect(canvas().querySelectorAll("img")).toHaveLength(2);
  });

  it("ignores a stale projection and anything that isn't one", () => {
    const { receiver, send } = fakeReceiver();
    render(<BroadcastApp receiver={receiver} />);
    send(onAir(5, 1, "Newer"));
    send(onAir(4, 2, "Older"));
    send({ revision: 9, scene: "nonsense" });
    expect(screen.getByText("Newer")).toBeDefined();
    expect(screen.queryByText("Older")).toBeNull();
  });

  it("crossfades a new take over the old one for 600 ms", () => {
    vi.useFakeTimers();
    const { receiver, send } = fakeReceiver();
    render(<BroadcastApp receiver={receiver} />);
    send(onAir(1, 1, "First"));
    send(onAir(2, 2, "Second"));
    expect(canvas().querySelectorAll(".take")).toHaveLength(2);
    const incoming = canvas().querySelector<HTMLElement>(".take.fade-in");
    expect(incoming?.style.animationDuration).toBe("600ms");
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(canvas().querySelectorAll(".take")).toHaveLength(1);
    expect(screen.queryByText("First")).toBeNull();
  });

  it("updates the picture in place for an edit within the same take", () => {
    const { receiver, send } = fakeReceiver();
    render(<BroadcastApp receiver={receiver} />);
    send(onAir(1, 1, "Before"));
    send(onAir(2, 1, "After"));
    expect(canvas().querySelectorAll(".take")).toHaveLength(1);
    expect(screen.getByText("After")).toBeDefined();
  });

  it("fades to black on Blackout and back", () => {
    const { receiver, send } = fakeReceiver();
    render(<BroadcastApp receiver={receiver} />);
    send(onAir(1, 1, "Tavern", true));
    const blackout = canvas().querySelector<HTMLElement>(".blackout");
    expect(blackout?.dataset.on).toBe("true");
    expect(blackout?.style.transitionDuration).toBe("600ms");
    send(onAir(2, 1, "Tavern", false));
    expect(blackout?.dataset.on).toBe("false");
  });

  it("leaves out an image whose file is missing", () => {
    const { receiver, send } = fakeReceiver();
    render(<BroadcastApp receiver={receiver} />);
    send(onAir(1, 1, "Tavern"));
    const [first] = canvas().querySelectorAll("img");
    if (first === undefined) throw new Error("no image");
    Object.defineProperty(first, "naturalWidth", { value: 160 });
    Object.defineProperty(first, "naturalHeight", { value: 90 });
    fireEvent.load(first);
    expect(first.style.width).toBe("100%");
    fireEvent.error(first);
    expect(canvas().querySelectorAll("img")).toHaveLength(1);
  });

  it("asks to leave fullscreen on Esc", () => {
    const { receiver } = fakeReceiver();
    render(<BroadcastApp receiver={receiver} />);
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(window, { key: "a" });
    expect(receiver.escapes).toBe(1);
  });
});

describe("Root", () => {
  it("renders the Broadcast window for ?view=broadcast, the main window otherwise", async () => {
    const { receiver } = fakeReceiver();
    render(
      <Root
        search="?view=broadcast"
        platform={testPlatform()}
        receiver={receiver}
      />
    );
    expect(receiver.readyCalls).toBe(1);
    cleanup();
    render(<Root search="" platform={testPlatform()} receiver={receiver} />);
    expect(
      await screen.findByRole("button", { name: "New Campaign" })
    ).toBeDefined();
  });
});
