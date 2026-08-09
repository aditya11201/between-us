import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "vite";
import { Window } from "happy-dom";

const projectRoot = new URL("../", import.meta.url).pathname;
const browserWindow = new Window({ url: "http://localhost/" });
const { document } = browserWindow;

Object.assign(globalThis, {
  window: browserWindow,
  document,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLAudioElement: browserWindow.HTMLAudioElement,
  HTMLMediaElement: browserWindow.HTMLMediaElement,
  Event: browserWindow.Event,
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: browserWindow.navigator,
});

let vite;
let React;
let act;
let createRoot;
let BootScreen;
let activeAudio;
let activeClock;
const mountedRoots = [];

function replaceMethod(target, name, replacement) {
  if (!target) return () => {};

  const original = Object.getOwnPropertyDescriptor(target, name);
  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: original?.enumerable ?? false,
    writable: true,
    value: replacement,
  });

  return () => {
    if (original) {
      Object.defineProperty(target, name, original);
    } else {
      delete target[name];
    }
  };
}

function installClock() {
  const originals = {
    globalSetTimeout: globalThis.setTimeout,
    globalClearTimeout: globalThis.clearTimeout,
    globalSetInterval: globalThis.setInterval,
    globalClearInterval: globalThis.clearInterval,
    windowSetTimeout: browserWindow.setTimeout,
    windowClearTimeout: browserWindow.clearTimeout,
    windowSetInterval: browserWindow.setInterval,
    windowClearInterval: browserWindow.clearInterval,
  };
  const timeouts = new Map();
  const intervals = new Map();
  let currentTime = 0;
  let nextId = 1;

  function schedule(store, callback, delay, args) {
    const id = nextId++;
    store.set(id, {
      args,
      callback,
      delay: Math.max(1, Number(delay) || 0),
      due: currentTime + Math.max(1, Number(delay) || 0),
    });
    return id;
  }

  function setTimeoutMock(callback, delay, ...args) {
    return schedule(timeouts, callback, delay, args);
  }

  function setIntervalMock(callback, delay, ...args) {
    return schedule(intervals, callback, delay, args);
  }

  function clearTimeoutMock(id) {
    timeouts.delete(id);
  }

  function clearIntervalMock(id) {
    intervals.delete(id);
  }

  function nextDueTask(limit) {
    const tasks = [
      ...[...timeouts].map(([id, task]) => ({ id, store: timeouts, task })),
      ...[...intervals].map(([id, task]) => ({ id, store: intervals, task })),
    ];
    return tasks
      .filter(({ task }) => task.due <= limit)
      .sort((left, right) => left.task.due - right.task.due)[0];
  }

  function advance(milliseconds) {
    const target = currentTime + milliseconds;
    let nextTask;

    while ((nextTask = nextDueTask(target))) {
      currentTime = nextTask.task.due;

      if (nextTask.store === intervals) {
        nextTask.task.due += nextTask.task.delay;
        nextTask.task.callback(...nextTask.task.args);
      } else {
        nextTask.store.delete(nextTask.id);
        nextTask.task.callback(...nextTask.task.args);
      }
    }

    currentTime = target;
  }

  Object.assign(globalThis, {
    setTimeout: setTimeoutMock,
    clearTimeout: clearTimeoutMock,
    setInterval: setIntervalMock,
    clearInterval: clearIntervalMock,
  });
  Object.assign(browserWindow, {
    setTimeout: setTimeoutMock,
    clearTimeout: clearTimeoutMock,
    setInterval: setIntervalMock,
    clearInterval: clearIntervalMock,
  });

  const clock = {
    activeIntervalCount: () => intervals.size,
    activeTimerCount: () => timeouts.size + intervals.size,
    advance,
    restore() {
      Object.assign(globalThis, {
        setTimeout: originals.globalSetTimeout,
        clearTimeout: originals.globalClearTimeout,
        setInterval: originals.globalSetInterval,
        clearInterval: originals.globalClearInterval,
      });
      Object.assign(browserWindow, {
        setTimeout: originals.windowSetTimeout,
        clearTimeout: originals.windowClearTimeout,
        setInterval: originals.windowSetInterval,
        clearInterval: originals.windowClearInterval,
      });
      timeouts.clear();
      intervals.clear();
    },
  };

  activeClock = clock;
  return clock;
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
    prototypeRestorers.push(
      replaceMethod(prototype, "play", function play() {
        return controller.play(this);
      }),
    );
    prototypeRestorers.push(
      replaceMethod(prototype, "pause", function pause() {
        controller.pause(this);
      }),
    );
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
  await act(async () => {
    activeClock.advance(milliseconds);
    await Promise.resolve();
  });
}

async function unmount(mount) {
  if (!mount.unmounted) {
    await act(async () => mount.root.unmount());
    mount.unmounted = true;
  }
  mount.container.remove();
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

test("shows the logo before play and gates progress until audio ends", async () => {
  // Arrange: successful playback starts but does not end until the test signals it.
  const clock = installClock();
  const audio = installAudioMock("resolve");
  const mount = await renderBoot();

  // Act: allow the logo transition, then let the successful audio remain active.
  await advanceTimers(200);
  const startupAudio = requireAudio(mount.container, audio);
  await flushEffects();
  await advanceTimers(1000);

  // Assert: the logo preceded playback, and loading did not begin before ended.
  assert.deepEqual(audio.logoVisibleAtPlay, [true]);
  assert.equal(mount.container.querySelector(".boot-progress"), null);
  assert.equal(clock.activeIntervalCount(), 0);

  // Act: signal the media completion and advance the existing progress delay.
  await act(async () => audio.dispatch(startupAudio, "ended"));
  await advanceTimers(500);

  // Assert: the existing boot flow proceeds only after the chime completes.
  assert.ok(mount.container.querySelector(".boot-progress"));
});

test("sets startup audio to 50% volume and disables looping", async () => {
  // Arrange: mount the boot screen with a deterministic, never-ending media mock.
  installClock();
  const audio = installAudioMock("pending");
  const mount = await renderBoot();

  // Act: wait for the effect that configures and starts the chime.
  await advanceTimers(200);
  const startupAudio = requireAudio(mount.container, audio);

  // Assert: the audio contract is audible at half volume and completion-driven.
  assert.equal(startupAudio.volume, 0.5);
  assert.equal(startupAudio.loop, false);
});

test("continues boot when play is rejected by autoplay policy", async () => {
  // Arrange: the browser rejects audible playback, as an autoplay policy may.
  const clock = installClock();
  const audio = installAudioMock("reject");
  const mount = await renderBoot();

  // Act: flush the rejected play promise and allow fallback loading to start.
  await advanceTimers(200);
  requireAudio(mount.container, audio);
  await flushEffects();
  await advanceTimers(500);

  // Assert: rejection falls through to boot instead of waiting for ended.
  assert.equal(audio.playCalls, 1);
  assert.ok(mount.container.querySelector(".boot-progress"));
  assert.ok(clock.activeIntervalCount() > 0);
});

test("continues boot when the startup audio emits a media error", async () => {
  // Arrange: playback remains pending so only the media error can release boot.
  installClock();
  const audio = installAudioMock("pending");
  const mount = await renderBoot();

  // Act: emit an audio load/error failure without emitting ended.
  await advanceTimers(200);
  const startupAudio = requireAudio(mount.container, audio);
  await act(async () => audio.dispatch(startupAudio, "error"));
  await advanceTimers(500);

  // Assert: media failure also releases the progress gate.
  assert.ok(mount.container.querySelector(".boot-progress"));
});

test("cleans up audio and delayed boot work on unmount", async () => {
  // Arrange: mount with a pending play promise and a completion spy.
  const clock = installClock();
  const audio = installAudioMock("pending");
  const completions = [];
  const mount = await renderBoot({
    onComplete: () => completions.push("complete"),
  });
  await advanceTimers(200);
  const startupAudio = requireAudio(mount.container, audio);

  // Act: unmount, then deliver late media events and advance all delayed work.
  await unmount(mount);
  await act(async () => {
    audio.dispatch(startupAudio, "ended");
    audio.dispatch(startupAudio, "error");
  });
  await advanceTimers(6000);

  // Assert: cleanup pauses media and prevents late timers/events from completing boot.
  assert.ok(audio.pauseCalls >= 1);
  assert.equal(clock.activeTimerCount(), 0);
  assert.deepEqual(completions, []);
});
