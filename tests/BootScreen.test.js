import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "vite";
import { setupHarness, unmountMount } from "./testUtils/harness.js";
import { installClock as installClockShared, advanceTimers as advanceClock } from "./testUtils/clock.js";

const { browserWindow, document, projectRoot } = setupHarness();

let vite;
let React;
let act;
let createRoot;
let BootScreen;
let activeAudio;
let activeClock;
const mountedRoots = [];

function installClock() {
  return activeClock = installClockShared(browserWindow);
}

function installAudioMock(outcome) {
  const instances = [];
  const prototypeRestorers = [];
  const globalAudioDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Audio");
  const windowAudioDescriptor = Object.getOwnPropertyDescriptor(browserWindow, "Audio");
  let container;

  const controller = {
    instances,
    logoVisibleAtPlay: [],
    pauseCalls: 0,
    playCalls: 0,
    setContainer(nextContainer) {
      container = nextContainer;
    },
    capture(audio) {
      if (!instances.includes(audio)) instances.push(audio);
      return audio;
    },
    play(audio) {
      this.capture(audio);
      this.playCalls += 1;
      this.logoVisibleAtPlay.push(
        Boolean(container?.querySelector(".boot-logo--show")),
      );

      if (outcome === "resolve") return Promise.resolve();
      if (outcome === "reject") {
        const rejection = Promise.reject(new Error("Autoplay was blocked"));
        rejection.catch(() => {});
        return rejection;
      }

      return new Promise(() => {});
    },
    pause(audio) {
      this.capture(audio);
      this.pauseCalls += 1;
    },
    dispatch(audio, type) {
      audio.dispatchEvent(new browserWindow.Event(type));
    },
    restore() {
      for (const restore of prototypeRestorers.reverse()) restore();

      if (globalAudioDescriptor) {
        Object.defineProperty(globalThis, "Audio", globalAudioDescriptor);
      } else {
        delete globalThis.Audio;
      }

      if (windowAudioDescriptor) {
        Object.defineProperty(browserWindow, "Audio", windowAudioDescriptor);
      } else {
        delete browserWindow.Audio;
      }
      activeAudio = null;
    },
  };

  class MockAudio {
    constructor(source = "") {
      this.src = source;
      this.volume = 1;
      this.loop = false;
      this.listeners = new Map();
      this.onended = null;
      this.onerror = null;
      controller.capture(this);
    }

    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) ?? new Set();
      listeners.add(listener);
      this.listeners.set(type, listeners);
    }

    removeEventListener(type, listener) {
      this.listeners.get(type)?.delete(listener);
    }

    dispatchEvent(event) {
      const type = typeof event === "string" ? event : event.type;
      const dispatchedEvent = typeof event === "string"
        ? new browserWindow.Event(event)
        : event;

      for (const listener of [...(this.listeners.get(type) ?? [])]) {
        listener.call(this, dispatchedEvent);
      }

      this[`on${type}`]?.call(this, dispatchedEvent);
      return true;
    }

    play() {
      return controller.play(this);
    }

    pause() {
      controller.pause(this);
    }

    load() {}
  }

  Object.defineProperty(globalThis, "Audio", {
    configurable: true,
    value: MockAudio,
  });
  Object.defineProperty(browserWindow, "Audio", {
    configurable: true,
    value: MockAudio,
  });

  for (const prototype of [
    browserWindow.HTMLMediaElement?.prototype,
    browserWindow.HTMLAudioElement?.prototype,
  ]) {
    if (!prototype) continue;
    for (const [name, replacement] of [
      ["play", function play() { return controller.play(this); }],
      ["pause", function pause() { controller.pause(this); }],
    ]) {
      const original = Object.getOwnPropertyDescriptor(prototype, name);
      Object.defineProperty(prototype, name, {
        configurable: true,
        enumerable: original?.enumerable ?? false,
        writable: true,
        value: replacement,
      });
      prototypeRestorers.push(() => {
        if (original) {
          Object.defineProperty(prototype, name, original);
        } else {
          delete prototype[name];
        }
      });
    }
  }

  activeAudio = controller;
  return controller;
}

function findAudio(container, controller) {
  return controller.instances[0] ?? container.querySelector("audio");
}

function requireAudio(container, controller) {
  const audio = findAudio(container, controller);
  assert.ok(audio, "BootScreen should create startup audio");
  return audio;
}

function requireStartButton(container) {
  const logo = container.querySelector(".boot-logo");
  assert.ok(logo, "BootScreen should render the Apple logo control");
  assert.equal(logo.tagName, "BUTTON");
  assert.equal(logo.getAttribute("aria-label"), "Start macOS");
  return logo;
}

async function renderBoot({ onComplete = () => {} } = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const mount = { container, root, unmounted: false };
  mountedRoots.push(mount);

  activeAudio?.setContainer(container);
  await act(async () => {
    root.render(React.createElement(BootScreen, { onComplete }));
  });

  return mount;
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function advanceTimers(milliseconds) {
  await advanceClock(act, activeClock, milliseconds);
}

async function unmount(mount) {
  if (!mount.unmounted) {
    await unmountMount(act, mount);
    mount.unmounted = true;
  } else {
    mount.container.remove();
  }
}

before(async () => {
  vite = await createServer({
    configFile: `${projectRoot}vite.config.js`,
    server: { hmr: false, middlewareMode: true, ws: false },
    appType: "custom",
  });

  ({ default: React } = await import("react"));
  ({ act } = React);
  ({ createRoot } = await import("react-dom/client"));
  ({ default: BootScreen } = await vite.ssrLoadModule(
    "/src/ui/BootScreen/BootScreen.jsx",
  ));
});

afterEach(async () => {
  for (const mount of mountedRoots.splice(0)) await unmount(mount);
  document.body.replaceChildren();
  activeAudio?.restore();
  activeClock?.restore();
  activeAudio = null;
  activeClock = null;
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

test("reveals a native Start macOS button without starting boot", async () => {
  // Arrange: mount with a deterministic, never-ending audio mock.
  const clock = installClock();
  const audio = installAudioMock("pending");
  const mount = await renderBoot();

  // Act: allow the logo timer to reveal the start control.
  await advanceTimers(200);
  requireStartButton(mount.container);

  // Assert: the logo is the accessible affordance and boot remains idle.
  assert.equal(audio.playCalls, 0);
  assert.equal(mount.container.querySelector(".boot-progress"), null);
  assert.equal(clock.activeIntervalCount(), 0);
});

test("starts playback only from one logo click and gates progress until ended", async () => {
  // Arrange: successful playback resolves but does not emit ended automatically.
  const clock = installClock();
  const audio = installAudioMock("resolve");
  const mount = await renderBoot();

  // Act: reveal the button, click it, and wait beyond the progress delay.
  await advanceTimers(200);
  const startButton = requireStartButton(mount.container);
  const startupAudio = requireAudio(mount.container, audio);
  await act(async () => {
    startButton.dispatchEvent(
      new browserWindow.MouseEvent("click", { bubbles: true }),
    );
  });
  await flushEffects();
  await advanceTimers(1000);

  // Assert: the user click starts playback, but ended still gates loading.
  assert.equal(audio.playCalls, 1);
  assert.deepEqual(audio.logoVisibleAtPlay, [true]);
  assert.equal(mount.container.querySelector(".boot-progress"), null);
  assert.equal(clock.activeIntervalCount(), 0);

  // Act: signal media completion and advance the existing progress delay.
  await act(async () => audio.dispatch(startupAudio, "ended"));
  await advanceTimers(500);

  // Assert: progress starts only after successful playback ends.
  assert.ok(mount.container.querySelector(".boot-progress"));
});

test("releases the progress gate when clicked playback is rejected", async () => {
  // Arrange: the browser rejects the user-initiated playback promise.
  const clock = installClock();
  const audio = installAudioMock("reject");
  const mount = await renderBoot();

  // Act: click after the logo appears, then flush the rejection fallback.
  await advanceTimers(200);
  const startButton = requireStartButton(mount.container);
  assert.equal(audio.playCalls, 0);
  await act(async () => {
    startButton.dispatchEvent(
      new browserWindow.MouseEvent("click", { bubbles: true }),
    );
  });
  await flushEffects();
  await advanceTimers(500);

  // Assert: rejection releases loading instead of leaving boot blocked.
  assert.equal(audio.playCalls, 1);
  assert.ok(mount.container.querySelector(".boot-progress"));
  assert.ok(clock.activeIntervalCount() > 0);
});

test("releases the progress gate when clicked audio emits a media error", async () => {
  // Arrange: playback stays pending so only the media error can release boot.
  const clock = installClock();
  const audio = installAudioMock("pending");
  const mount = await renderBoot();

  // Act: click the logo, then emit an audio load/error failure.
  await advanceTimers(200);
  const startButton = requireStartButton(mount.container);
  const startupAudio = requireAudio(mount.container, audio);
  await act(async () => {
    startButton.dispatchEvent(
      new browserWindow.MouseEvent("click", { bubbles: true }),
    );
  });
  assert.equal(audio.playCalls, 1);
  assert.equal(mount.container.querySelector(".boot-progress"), null);
  await act(async () => audio.dispatch(startupAudio, "error"));
  await advanceTimers(500);

  // Assert: media failure releases the gate and starts fallback progress.
  assert.ok(mount.container.querySelector(".boot-progress"));
  assert.ok(clock.activeIntervalCount() > 0);
});

test("does not duplicate playback for duplicate logo clicks", async () => {
  // Arrange: use pending playback so duplicate activation is observable.
  const clock = installClock();
  const audio = installAudioMock("pending");
  const mount = await renderBoot();

  // Act: send two click events before media can end.
  await advanceTimers(200);
  const startButton = requireStartButton(mount.container);
  await act(async () => {
    const click = () => startButton.dispatchEvent(
      new browserWindow.MouseEvent("click", { bubbles: true }),
    );
    click();
    click();
  });
  await advanceTimers(1000);

  // Assert: one user gesture sequence produces one play call and no progress.
  assert.equal(audio.playCalls, 1);
  assert.equal(mount.container.querySelector(".boot-progress"), null);
  assert.equal(clock.activeIntervalCount(), 0);
});

test("cleans up audio and delayed boot work after click-time unmount", async () => {
  // Arrange: start a pending chime and provide a completion spy.
  const clock = installClock();
  const audio = installAudioMock("pending");
  const completions = [];
  const mount = await renderBoot({
    onComplete: () => completions.push("complete"),
  });
  await advanceTimers(200);
  const startButton = requireStartButton(mount.container);
  const startupAudio = requireAudio(mount.container, audio);

  // Act: click, release the gate, unmount, then deliver late work.
  await act(async () => {
    startButton.dispatchEvent(
      new browserWindow.MouseEvent("click", { bubbles: true }),
    );
  });
  assert.equal(audio.playCalls, 1);
  await act(async () => audio.dispatch(startupAudio, "ended"));
  await advanceTimers(500);
  assert.ok(mount.container.querySelector(".boot-progress"));
  await unmount(mount);
  await act(async () => {
    audio.dispatch(startupAudio, "ended");
    audio.dispatch(startupAudio, "error");
  });
  await advanceTimers(6000);

  // Assert: cleanup pauses media, clears timers, and blocks late completion.
  assert.ok(audio.pauseCalls >= 1);
  assert.equal(clock.activeTimerCount(), 0);
  assert.deepEqual(completions, []);
});
