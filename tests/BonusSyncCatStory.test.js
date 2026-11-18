import assert from "node:assert/strict";
import fs from "node:fs";
import { after, afterEach, before, test } from "node:test";
import * as sass from "sass";
import { createServer } from "vite";
import { advanceTimers, installClock } from "./testUtils/clock.js";
import { createDom } from "./testUtils/dom.js";
import { setupHarness, unmountMount } from "./testUtils/harness.js";
import { waitForCondition } from "./testUtils/waitForCondition.js";

const { browserWindow, document, projectRoot } = setupHarness();
globalThis.CustomEvent = browserWindow.CustomEvent;

let vite;
let React;
let act;
let createRoot;
let parseLRC;
let MUSIC_CATALOG;
let MusicContent;
let useMusicPlayer;
let MailContent;
let TerminalContent;
let CatStoryCanvas;
let decodeCatStoryFrames;
let WindowContext;
let WindowManagerProvider;
let useWindowManager;
let renderAppContent;
let bonusSyncModel;
let bonusSyncCoordinator;
let dom;
let originalFetch;
const mountedRoots = [];

before(async () => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => [] });

  vite = await createServer({
    configFile: `${projectRoot}vite.config.js`,
    server: { hmr: false, middlewareMode: true, ws: false },
    appType: "custom",
  });

  ({ default: React } = await import("react"));
  ({ act } = React);
  ({ createRoot } = await import("react-dom/client"));
  dom = createDom(act, browserWindow, document);
  ({ parseLRC } = await vite.ssrLoadModule("/src/features/music/lyricsParser.js"));
  ({ MUSIC_CATALOG } = await vite.ssrLoadModule("/src/features/music/musicCatalog.js"));
  ({ MusicContent, useMusicPlayer } = await vite.ssrLoadModule("/src/features/music/MusicContent.jsx"));
  ({ MailContent } = await vite.ssrLoadModule("/src/features/mail/MailContent.jsx"));
  ({ TerminalContent } = await vite.ssrLoadModule("/src/features/terminal/Terminal.jsx"));
  ({ CatStoryCanvas, decodeCatStoryFrames } = await vite.ssrLoadModule("/src/features/terminal/CatStoryCanvas.jsx"));
  ({ WindowContext } = await vite.ssrLoadModule("/src/windows/index.js"));
  ({ WindowManagerProvider, useWindowManager } = await vite.ssrLoadModule("/src/core/providers/WindowManagerProvider.jsx"));
  ({ renderAppContent } = await vite.ssrLoadModule("/src/utils/renderAppContent.jsx"));
  bonusSyncModel = await vite.ssrLoadModule("/src/features/music/bonusSyncModel.js");
  bonusSyncCoordinator = await vite.ssrLoadModule("/src/features/music/bonusSyncCoordinator.js");
});

after(async () => {
  globalThis.fetch = originalFetch;
  await vite.close();
  browserWindow.close();
});

afterEach(async () => {
  for (const mount of mountedRoots.splice(0)) {
    await unmountMount(act, mount);
  }
  document.body.replaceChildren();
  browserWindow.localStorage.clear();
  bonusSyncCoordinator?.resetBonusSyncCoordinator();
});

function createWindowContextValue() {
  return {
    onClose() {},
    onMinimize() {},
    onZoom() {},
    onTitlePointerDown() {},
  };
}

async function withMockCatCanvas(run) {
  const originalGetContext = browserWindow.HTMLCanvasElement.prototype.getContext;
  const putImageCalls = [];
  const toDataUrlCalls = [];

  browserWindow.HTMLCanvasElement.prototype.getContext = function getContext() {
    const isMain = this.className === "terminal-cat-canvas";
    return {
      fillStyle: "",
      font: "",
      textAlign: "left",
      textBaseline: "alphabetic",
      clearRect() {},
      fillText() {},
      createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData(imageData, dx, dy) {
        if (isMain) {
          putImageCalls.push({ width: imageData.width, height: imageData.height, dx, dy });
        }
      },
    };
  };

  const originalToDataURL = browserWindow.HTMLCanvasElement.prototype.toDataURL;
  browserWindow.HTMLCanvasElement.prototype.toDataURL = function toDataURL(type) {
    toDataUrlCalls.push(type);
    return "data:image/png;base64,MOCK";
  };

  try {
    await run({ putImageCalls, toDataUrlCalls });
  } finally {
    browserWindow.HTMLCanvasElement.prototype.getContext = originalGetContext;
    browserWindow.HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  }
}

function instrumentAudioElement(audio, { duration = 213, autoplayBlocked = false } = {}) {
  let paused = true;
  let currentTime = 0;
  let playbackRate = 1;
  let playCalls = 0;
  let pauseCalls = 0;

  Object.defineProperty(audio, "duration", { configurable: true, get: () => duration });
  Object.defineProperty(audio, "paused", { configurable: true, get: () => paused });
  Object.defineProperty(audio, "ended", { configurable: true, get: () => false });
  Object.defineProperty(audio, "currentTime", {
    configurable: true,
    get: () => currentTime,
    set: (value) => {
      currentTime = Number(value) || 0;
    },
  });
  Object.defineProperty(audio, "playbackRate", {
    configurable: true,
    get: () => playbackRate,
    set: (value) => {
      playbackRate = Number(value) || 1;
      audio.dispatchEvent(new browserWindow.Event("ratechange"));
    },
  });

  audio.load = () => {};
  audio.play = () => {
    playCalls += 1;
    if (autoplayBlocked) {
      paused = true;
      return Promise.reject(Object.assign(new Error("NotAllowedError"), { name: "NotAllowedError" }));
    }
    paused = false;
    audio.dispatchEvent(new browserWindow.Event("play"));
    return Promise.resolve();
  };
  audio.pause = () => {
    pauseCalls += 1;
    if (!paused) {
      paused = true;
      audio.dispatchEvent(new browserWindow.Event("pause"));
    } else {
      paused = true;
    }
  };

  return {
    get playCalls() { return playCalls; },
    get pauseCalls() { return pauseCalls; },
    setBlocked(next) { autoplayBlocked = next; },
    emitMetadata() {
      audio.dispatchEvent(new browserWindow.Event("loadedmetadata"));
    },
    seekTo(sec) {
      currentTime = sec;
      audio.dispatchEvent(new browserWindow.Event("seeked"));
    },
    advanceTo(sec) {
      currentTime = sec;
      audio.dispatchEvent(new browserWindow.Event("timeupdate"));
    },
  };
}

test("Love Me Not is registered in MUSIC_CATALOG and enhanced LRC tags strip cleanly", () => {
  const song = MUSIC_CATALOG.find((item) => item.id === "ravyn-lenae-love-me-not");
  assert.ok(song);
  assert.equal(song.title, "Love Me Not");
  assert.equal(song.artist, "Ravyn Lenae");
  assert.equal(song.album, "Bird's Eye");
  assert.equal(song.genre, "R&B");
  assert.equal(song.mimeType, "audio/mpeg");
  assert.equal(song.addedAt, "2026-11-18");

  const lrcRaw = fs.readFileSync(`${projectRoot}src/content/music/ravyn-lenae-love-me-not.lrc`, "utf8");
  const lines = parseLRC(lrcRaw);
  assert.ok(lines.length > 30);
  const chorusLead = lines.find((line) => Math.abs(line.time - 54.72) < 0.01);
  assert.equal(chorusLead?.text, "Oh, no, I don't need you, but I miss you, come here");
  assert.equal(lines.some((line) => /<\d{2}:\d{2}\.\d{2}>/.test(line.text)), false);

  const offsetLines = parseLRC(`[offset:-1000]\n${lrcRaw}`);
  const shiftedLead = offsetLines.find((line) => line.text === chorusLead.text);
  assert.equal(shiftedLead?.time, 53.72);
});

test("bonusSyncModel exports constants, offset resolution, multi-window LRC sync, and frame mapping", () => {
  const {
    BONUS_SONG_ID,
    BONUS_BASE_START_TIME,
    BONUS_SECOND_START_TIME,
    BONUS_DEFAULT_VOLUME,
    BONUS_FPS,
    BONUS_FRAME_COUNT,
    BONUS_DURATION,
    BONUS_END_TIME,
    BONUS_LYRIC_WINDOWS,
    BONUS_SYNC_SCENES,
    getBonusOffset,
    getBonusStartTime,
    resolveCatStoryFrame,
    resolveUnifiedSurpriseScene,
  } = bonusSyncModel;

  assert.equal(BONUS_SONG_ID, "ravyn-lenae-love-me-not");
  assert.equal(BONUS_BASE_START_TIME, 56.90);
  assert.equal(BONUS_SECOND_START_TIME, 132.68);
  assert.equal(BONUS_DEFAULT_VOLUME, 0.4);
  assert.equal(BONUS_FPS, 30);
  assert.equal(BONUS_FRAME_COUNT, 338);
  assert.ok(Math.abs(BONUS_DURATION - 338 / 30) < 1e-9);
  assert.ok(Math.abs(BONUS_END_TIME - (56.90 + 338 / 30)) < 1e-9);
  assert.equal(BONUS_LYRIC_WINDOWS.length, 2);
  assert.equal(BONUS_LYRIC_WINDOWS[0].startTime, 56.90);
  assert.ok(Math.abs(BONUS_LYRIC_WINDOWS[0].endTime - (56.90 + 338 / 30)) < 1e-9);
  assert.equal(BONUS_LYRIC_WINDOWS[1].startTime, 132.68);
  assert.ok(Math.abs(BONUS_LYRIC_WINDOWS[1].endTime - (132.68 + 338 / 30)) < 1e-9);
  assert.equal(BONUS_SYNC_SCENES[0].text, "I MISS YOU");
  assert.equal(BONUS_SYNC_SCENES.at(-1).text, "EVERYWHERE");

  assert.equal(getBonusOffset({ search: "", storage: null }), 0);
  assert.equal(getBonusStartTime(undefined, { search: "", storage: null }), 56.90);
  assert.equal(getBonusStartTime(0.5, { search: "?bonusOffset=-1", storage: null }), 57.40);
  assert.equal(getBonusStartTime(undefined, { search: "?bonusOffset=-0.4", storage: null }), 56.50);
  assert.equal(
    getBonusStartTime(undefined, {
      search: "",
      storage: { getItem: (k) => (k === "between-us.bonus.offset" ? "1.1" : null) },
    }),
    58.0,
  );

  assert.deepEqual(resolveCatStoryFrame(56.0), { frameIndex: 0, elapsed: 0, status: "before" });
  assert.deepEqual(resolveCatStoryFrame(56.90), { frameIndex: 0, elapsed: 0, status: "playing" });
  const mid = resolveCatStoryFrame(56.90 + 1.1);
  assert.equal(mid.frameIndex, 33);
  assert.equal(mid.status, "playing");
  assert.ok(Math.abs(mid.elapsed - 1.1) < 1e-9);

  const done = resolveCatStoryFrame(BONUS_END_TIME + 5);
  assert.equal(done.frameIndex, 337);
  assert.equal(done.status, "completed");
  assert.equal(done.elapsed, BONUS_DURATION);

  // Unified multi-window scene transitions across Chorus 1 & Chorus 2.
  const beforeW1 = resolveUnifiedSurpriseScene(56.89, { search: "", storage: null });
  assert.equal(beforeW1.mode, "gift-box");
  assert.equal(beforeW1.elapsed, 0);
  assert.equal(beforeW1.status, "before");

  const inW1Start = resolveUnifiedSurpriseScene(56.90, { search: "", storage: null });
  assert.equal(inW1Start.mode, "cat-story");
  assert.equal(inW1Start.windowIndex, 0);
  assert.equal(inW1Start.startTime, 56.90);
  assert.equal(inW1Start.frameIndex, 0);
  assert.equal(inW1Start.elapsed, 0);
  assert.equal(inW1Start.status, "playing");

  const inW1Mid = resolveUnifiedSurpriseScene(56.90 + 1.1, { search: "", storage: null });
  assert.equal(inW1Mid.mode, "cat-story");
  assert.equal(inW1Mid.windowIndex, 0);
  assert.equal(inW1Mid.frameIndex, 33);

  const betweenW1W2 = resolveUnifiedSurpriseScene(BONUS_LYRIC_WINDOWS[0].endTime, { search: "", storage: null });
  assert.equal(betweenW1W2.mode, "gift-box");
  assert.equal(betweenW1W2.elapsed, 0);
  assert.equal(betweenW1W2.status, "between");

  const beforeW2 = resolveUnifiedSurpriseScene(132.67, { search: "", storage: null });
  assert.equal(beforeW2.mode, "gift-box");
  assert.equal(beforeW2.elapsed, 0);
  assert.equal(beforeW2.status, "between");

  const inW2Start = resolveUnifiedSurpriseScene(132.68, { search: "", storage: null });
  assert.equal(inW2Start.mode, "cat-story");
  assert.equal(inW2Start.windowIndex, 1);
  assert.equal(inW2Start.startTime, 132.68);
  assert.equal(inW2Start.frameIndex, 0);
  assert.equal(inW2Start.status, "playing");

  const inW2Mid = resolveUnifiedSurpriseScene(132.68 + 1.1, { search: "", storage: null });
  assert.equal(inW2Mid.mode, "cat-story");
  assert.equal(inW2Mid.windowIndex, 1);
  assert.equal(inW2Mid.frameIndex, 33);
  assert.ok(Math.abs(inW2Mid.elapsed - 1.1) < 1e-9);

  const afterW2 = resolveUnifiedSurpriseScene(BONUS_LYRIC_WINDOWS[1].endTime, { search: "", storage: null });
  assert.equal(afterW2.mode, "gift-box");
  assert.equal(afterW2.elapsed, 0);
  assert.equal(afterW2.status, "completed");

  // Offset applies uniformly to both Chorus 1 and Chorus 2 windows.
  const shiftedBeforeW1 = resolveUnifiedSurpriseScene(56.90, { offsetOverride: 0.5, search: "", storage: null });
  assert.equal(shiftedBeforeW1.mode, "gift-box");
  const shiftedInW1 = resolveUnifiedSurpriseScene(57.40, { offsetOverride: 0.5, search: "", storage: null });
  assert.equal(shiftedInW1.mode, "cat-story");
  assert.equal(shiftedInW1.windowIndex, 0);
  assert.equal(shiftedInW1.startTime, 57.40);
  const shiftedInW2 = resolveUnifiedSurpriseScene(133.18, { offsetOverride: 0.5, search: "", storage: null });
  assert.equal(shiftedInW2.mode, "cat-story");
  assert.equal(shiftedInW2.windowIndex, 1);
  assert.equal(shiftedInW2.startTime, 133.18);
});

test("Mail renders only the single Open Surprise card and launches Music (00:00, 0.4) + maximized Terminal (syncWithMusic)", async () => {
  const openedCalls = [];
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ container, root });

  await act(async () => {
    root.render(
      React.createElement(
        WindowManagerProvider,
        null,
        React.createElement(
          WindowContext.Provider,
          { value: createWindowContextValue() },
          React.createElement(MailContent, {
            onClose() {},
            onMinimize() {},
            onMaximize() {},
            openApp: (...args) => openedCalls.push(args),
          }),
        ),
      ),
    );
  });

  const anniversaryOption = [...container.querySelectorAll('[role="option"]')].find((el) =>
    /Happy One Year, Pretty Girl/.test(el.textContent),
  );
  assert.ok(anniversaryOption);
  await dom.click(anniversaryOption);

  const cards = [...container.querySelectorAll(".mail__surprise-card")];
  assert.equal(cards.length, 1);
  assert.match(cards[0].textContent, /1st Anniversary Gift Box/);
  assert.match(cards[0].textContent, /Open interactive ASCII surprise with Love Me Not/);
  assert.match(cards[0].textContent, /Open Surprise/);
  assert.doesNotMatch(container.textContent, /Bonus for You/);

  const openBtn = [...cards[0].querySelectorAll("button")].find(
    (btn) => btn.textContent.trim() === "Open Surprise",
  );
  assert.ok(openBtn);
  await dom.click(openBtn);

  assert.equal(openedCalls.length, 2);
  assert.equal(openedCalls[0][0], "music");
  assert.equal(openedCalls[0][1], "Music");
  assert.deepEqual(openedCalls[0][2], {
    action: "bonus-play-from-start",
    songId: "ravyn-lenae-love-me-not",
    volume: 0.4,
    autoOpenTerminal: false,
    runId: openedCalls[0][2].runId,
  });
  assert.equal(typeof openedCalls[0][2].runId, "number");

  assert.equal(openedCalls[1][0], "terminal");
  assert.equal(openedCalls[1][1], "Terminal");
  assert.deepEqual(openedCalls[1][2], {
    action: "anniversary-gift",
    maximize: true,
    syncWithMusic: true,
    songId: "ravyn-lenae-love-me-not",
    runId: openedCalls[0][2].runId,
  });

  await dom.click(openBtn);
  assert.equal(openedCalls.length, 4);
  assert.equal(openedCalls[2][0], "music");
  assert.equal(openedCalls[3][0], "terminal");
  assert.equal(openedCalls[2][2].runId, openedCalls[3][2].runId);
  assert.ok(openedCalls[2][2].runId > openedCalls[0][2].runId);
});

test("Terminal does not expose any manual cat-story or bonus command", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ container, root });

  await act(async () => {
    root.render(
      React.createElement(
        WindowContext.Provider,
        { value: createWindowContextValue() },
        React.createElement(TerminalContent, {}),
      ),
    );
  });

  const input = container.querySelector(".terminal-interactive-input");
  const setInputValue = Object.getOwnPropertyDescriptor(
    browserWindow.HTMLInputElement.prototype,
    "value",
  ).set;

  for (const cmd of ["help", "cat-story", "bonus"]) {
    await act(async () => {
      setInputValue.call(input, cmd);
      input.dispatchEvent(new browserWindow.Event("input", { bubbles: true }));
      input.dispatchEvent(new browserWindow.Event("change", { bubbles: true }));
    });
    await act(async () => {
      input.dispatchEvent(new browserWindow.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
  }

  assert.doesNotMatch(container.textContent, /cat-story --sync/);
  assert.match(container.textContent, /cat-story: command not found/);
  assert.match(container.textContent, /bonus: command not found/);
});

test("StrictMode Music bonus-play-from-start plays from 00:00 at 0.4 volume, triggers Terminal once at 00:56.90, and re-arms on re-click", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ container, root });

  const openedCalls = [];
  let bridgeRef = null;
  function BridgeProbe() {
    bridgeRef = useMusicPlayer();
    return null;
  }

  const runId1 = 501;
  await act(async () => {
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(
          WindowContext.Provider,
          { value: createWindowContextValue() },
          React.createElement(MusicContent, {
            openApp: (...args) => openedCalls.push(args),
            payload: {
              action: "bonus-play-from-start",
              songId: "ravyn-lenae-love-me-not",
              startTime: 56.90,
              volume: 0.4,
              runId: runId1,
            },
          }),
          React.createElement(BridgeProbe),
        ),
      ),
    );
  });

  const audio = bridgeRef.getAudioElement();
  assert.ok(audio);
  const controls = instrumentAudioElement(audio, { duration: 213 });

  await act(async () => {
    controls.emitMetadata();
  });

  assert.equal(audio.paused, false);
  assert.equal(audio.currentTime, 0);
  assert.equal(audio.volume, 0.4);
  assert.equal(audio.muted, false);
  assert.equal(controls.playCalls, 1);
  assert.equal(openedCalls.length, 0);

  // Playback before 56.90s must NOT open Terminal.
  await act(async () => {
    controls.advanceTo(25.0);
  });
  await act(async () => {
    controls.advanceTo(56.89);
  });
  assert.equal(openedCalls.length, 0);

  // Reaching 56.90s triggers Terminal once with immediate: true.
  await act(async () => {
    controls.advanceTo(56.90);
  });
  assert.equal(openedCalls.length, 1);
  assert.deepEqual(openedCalls[0], [
    "terminal",
    "Terminal",
    {
      action: "bonus-cat-story",
      maximize: true,
      immediate: true,
      songId: "ravyn-lenae-love-me-not",
      startTime: 56.90,
      runId: runId1,
    },
  ]);

  // Further playback or seeking past 56.90s does NOT trigger Terminal again for runId1.
  await act(async () => {
    controls.advanceTo(60.0);
    controls.seekTo(40.0);
    controls.advanceTo(58.0);
  });
  assert.equal(openedCalls.length, 1);

  // Re-clicking Bonus for You with a new runId restarts from 00:00 and re-arms the cue (tested with seek + rAF).
  const runId2 = 502;
  await act(async () => {
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(
          WindowContext.Provider,
          { value: createWindowContextValue() },
          React.createElement(MusicContent, {
            openApp: (...args) => openedCalls.push(args),
            payload: {
              action: "bonus-play-from-start",
              songId: "ravyn-lenae-love-me-not",
              startTime: 56.90,
              volume: 0.4,
              runId: runId2,
            },
          }),
          React.createElement(BridgeProbe),
        ),
      ),
    );
  });

  assert.equal(audio.currentTime, 0);
  assert.equal(audio.paused, false);
  assert.equal(controls.playCalls, 2);
  assert.equal(openedCalls.length, 1);

  await act(async () => {
    controls.seekTo(56.95);
  });
  assert.equal(openedCalls.length, 2);
  assert.equal(openedCalls[1][2].runId, runId2);
  assert.equal(openedCalls[1][2].immediate, true);

  // rAF loop also detects currentTime crossing >= startTime even without timeupdate/seeked events.
  const runId3 = 503;
  await act(async () => {
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(
          WindowContext.Provider,
          { value: createWindowContextValue() },
          React.createElement(MusicContent, {
            openApp: (...args) => openedCalls.push(args),
            payload: {
              action: "bonus-play-from-start",
              songId: "ravyn-lenae-love-me-not",
              startTime: 56.90,
              volume: 0.4,
              runId: runId3,
            },
          }),
          React.createElement(BridgeProbe),
        ),
      ),
    );
  });
  assert.equal(openedCalls.length, 2);
  audio.currentTime = 56.92;
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
  assert.equal(openedCalls.length, 3);
  assert.equal(openedCalls[2][2].runId, runId3);
  assert.equal(openedCalls[2][2].immediate, true);
});

test("MusicContent cancels armed Bonus cue on song switch or close, and manual Love Me Not play does not open Terminal", async () => {
  const openedCalls = [];

  // 1. Switching to another song cancels the armed cue.
  {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push({ container, root });

    let bridgeRef = null;
    function BridgeProbe() {
      bridgeRef = useMusicPlayer();
      return null;
    }

    await act(async () => {
      root.render(
        React.createElement(
          WindowContext.Provider,
          { value: createWindowContextValue() },
          React.createElement(MusicContent, {
            openApp: (...args) => openedCalls.push(args),
            payload: {
              action: "bonus-play-from-start",
              songId: "ravyn-lenae-love-me-not",
              startTime: 56.90,
              volume: 0.4,
              runId: 601,
            },
          }),
          React.createElement(BridgeProbe),
        ),
      );
    });

    const audio = bridgeRef.getAudioElement();
    const controls = instrumentAudioElement(audio, { duration: 213 });
    await act(async () => {
      controls.emitMetadata();
    });
    assert.equal(audio.paused, false);

    // Switch to another song via track row click.
    const otherSongBtn = [...container.querySelectorAll(".music-track-main")].find(
      (btn) => !btn.textContent.includes("Love Me Not"),
    );
    assert.ok(otherSongBtn);
    await dom.click(otherSongBtn);

    await act(async () => {
      controls.emitMetadata();
      controls.seekTo(65.0);
      controls.advanceTo(70.0);
    });
    assert.equal(openedCalls.length, 0);
  }

  // 2. Closing Music before startTime cancels the armed cue.
  {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push({ container, root });

    let bridgeRef = null;
    function BridgeProbe() {
      bridgeRef = useMusicPlayer();
      return null;
    }

    let closedCount = 0;
    await act(async () => {
      root.render(
        React.createElement(
          WindowContext.Provider,
          { value: { ...createWindowContextValue(), onClose: () => { closedCount += 1; } } },
          React.createElement(MusicContent, {
            openApp: (...args) => openedCalls.push(args),
            payload: {
              action: "bonus-play-from-start",
              songId: "ravyn-lenae-love-me-not",
              startTime: 56.90,
              volume: 0.4,
              runId: 602,
            },
          }),
          React.createElement(BridgeProbe),
        ),
      );
    });

    const audio = bridgeRef.getAudioElement();
    const controls = instrumentAudioElement(audio, { duration: 213 });
    await act(async () => {
      controls.emitMetadata();
    });

    const closeBtn = container.querySelector('button[aria-label="Close Music"]');
    assert.ok(closeBtn);
    await dom.click(closeBtn);
    assert.equal(closedCount, 1);

    await act(async () => {
      controls.seekTo(60.0);
      controls.advanceTo(62.0);
    });
    assert.equal(openedCalls.length, 0);
  }

  // 3. Playing Love Me Not manually from the library does NOT auto-open Terminal at 00:56.90.
  {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push({ container, root });

    let bridgeRef = null;
    function BridgeProbe() {
      bridgeRef = useMusicPlayer();
      return null;
    }

    await act(async () => {
      root.render(
        React.createElement(
          WindowContext.Provider,
          { value: createWindowContextValue() },
          React.createElement(MusicContent, {
            openApp: (...args) => openedCalls.push(args),
          }),
          React.createElement(BridgeProbe),
        ),
      );
    });

    const loveMeNotBtn = [...container.querySelectorAll(".music-track-main")].find(
      (btn) => btn.textContent.includes("Love Me Not"),
    );
    assert.ok(loveMeNotBtn);
    await dom.click(loveMeNotBtn);

    const audio = bridgeRef.getAudioElement();
    const controls = instrumentAudioElement(audio, { duration: 213 });
    await act(async () => {
      controls.emitMetadata();
      controls.advanceTo(56.90);
      controls.seekTo(60.0);
    });
    assert.equal(openedCalls.length, 0);
  }
});

test("TerminalContent with immediate: true enters CatStoryCanvas immediately under StrictMode and syncs frames to live audio", async () => {
  await withMockCatCanvas(async ({ putImageCalls, toDataUrlCalls }) => {
    const decoded = await decodeCatStoryFrames();
    assert.equal(decoded.length, 338 * 241 * 120);

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push({ container, root });

    const runId = 701;
    let bridgeRef = null;
    function BridgeProbe() {
      bridgeRef = useMusicPlayer();
      return null;
    }

    // First mount Music playing Love Me Not, advance to 56.90s, then open Terminal with immediate: true.
    await act(async () => {
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(
            WindowContext.Provider,
            { value: createWindowContextValue() },
            React.createElement(MusicContent, {
              payload: {
                action: "bonus-play-from-start",
                songId: "ravyn-lenae-love-me-not",
                startTime: 56.90,
                volume: 0.4,
                runId,
              },
            }),
            React.createElement(BridgeProbe),
          ),
        ),
      );
    });

    const audio = bridgeRef.getAudioElement();
    assert.ok(audio);
    const controls = instrumentAudioElement(audio, { duration: 213 });
    await act(async () => {
      controls.emitMetadata();
      controls.advanceTo(56.90);
    });
    assert.equal(audio.paused, false);

    // Mount TerminalContent with immediate: true under StrictMode while audio is already playing.
    await act(async () => {
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(
            WindowContext.Provider,
            { value: createWindowContextValue() },
            React.createElement(MusicContent, {
              payload: {
                action: "bonus-play-from-start",
                songId: "ravyn-lenae-love-me-not",
                startTime: 56.90,
                volume: 0.4,
                runId,
              },
            }),
            React.createElement(TerminalContent, {
              payload: {
                action: "bonus-cat-story",
                maximize: true,
                immediate: true,
                songId: "ravyn-lenae-love-me-not",
                startTime: 56.90,
                runId,
              },
            }),
            React.createElement(BridgeProbe),
          ),
        ),
      );
    });

    // Immediate launch skips typing delay and renders .terminal-cat-stage right away.
    await waitForCondition(
      () => Boolean(container.querySelector(".terminal-cat-stage")) && putImageCalls.length > 0,
      { description: "CatStoryCanvas renders immediately and draws frame 0" },
    );

    assert.equal(audio.paused, false);
    assert.equal(audio.currentTime, 56.90);
    assert.match(container.textContent, /FRAME 001 \/ 338/);
    assert.match(container.textContent, /00:00\.00\s+\/\s+00:11\.27/);

    // Ensure no Play/Pause/Seek/Replay/Speed buttons exist in Terminal toolbar.
    const toolbarButtons = [...container.querySelectorAll(".terminal-ascii-tools button")].map((b) => b.textContent.trim());
    assert.deepEqual(toolbarButtons, ["◉ PHOSPHOR", "↓ PNG", "Back to Terminal"]);

    // Progress bar is display-only (progressbar, not slider).
    const progressEl = container.querySelector(".terminal-cat-progress");
    assert.equal(progressEl?.getAttribute("role"), "progressbar");

    // Advance audio time -> frame updates accordingly.
    await act(async () => {
      controls.advanceTo(56.90 + 1.1);
    });
    assert.match(container.textContent, /FRAME 034 \/ 338/);
    assert.match(container.textContent, /00:01\.10\s+\/\s+00:11\.27/);

    // Pause audio -> stays frozen at exact frame for audio.currentTime.
    await act(async () => {
      audio.pause();
    });
    assert.match(container.textContent, /FRAME 034 \/ 338/);

    // Seek before startTime while paused -> snaps to frame 0.
    await act(async () => {
      controls.seekTo(20);
    });
    assert.match(container.textContent, /FRAME 001 \/ 338/);

    // Seek past END_TIME -> holds final frame 338/338 without stopping music.
    await act(async () => {
      audio.play();
      controls.seekTo(80);
    });
    assert.match(container.textContent, /FRAME 338 \/ 338/);
    assert.match(container.textContent, /00:11\.27\s+\/\s+00:11\.27/);
    assert.equal(audio.paused, false);

    // Playback rate change keeps sync alive.
    await act(async () => {
      audio.playbackRate = 1.25;
      controls.seekTo(56.90 + 5.0);
    });
    assert.match(container.textContent, /FRAME 151 \/ 338/);

    // Toggle phosphor (D) and save PNG (S).
    await act(async () => {
      browserWindow.dispatchEvent(new browserWindow.KeyboardEvent("keydown", { key: "d", bubbles: true }));
    });
    assert.ok(container.querySelector(".terminal-cat-stage--phosphor"));
    assert.match(container.textContent, /◈ FULL COLOR/);

    await act(async () => {
      browserWindow.dispatchEvent(new browserWindow.KeyboardEvent("keydown", { key: "s", bubbles: true }));
    });
    assert.equal(toDataUrlCalls.length, 1);
    assert.ok(putImageCalls.length > 0);

    // Escape exits back to Terminal prompt and history has the launch command exactly once.
    await act(async () => {
      browserWindow.dispatchEvent(new browserWindow.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    assert.equal(container.querySelector(".terminal-cat-stage"), null);
    const matches = container.textContent.match(/\.\/cat-story --sync=love-me-not/g) || [];
    assert.equal(matches.length, 1);
  });
});

test("Autoplay-blocked Music shows Play Audio fallback in CatStoryCanvas and resumes on click", async () => {
  await withMockCatCanvas(async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push({ container, root });

    const runId = 777;
    let bridgeRef = null;
    function BridgeProbe() {
      bridgeRef = useMusicPlayer();
      return null;
    }

    // Order test: Terminal mounts & becomes ready BEFORE Music metadata loads.
    await act(async () => {
      root.render(
        React.createElement(
          WindowContext.Provider,
          { value: createWindowContextValue() },
          React.createElement(MusicContent, {
            payload: {
              action: "bonus-sync-prepare",
              songId: "ravyn-lenae-love-me-not",
              startTime: 56.90,
              runId,
            },
          }),
          React.createElement(CatStoryCanvas, {
            onExit() {},
            runId,
            songId: "ravyn-lenae-love-me-not",
            startTime: 56.90,
          }),
          React.createElement(BridgeProbe),
        ),
      );
    });

    await waitForCondition(
      () => bonusSyncCoordinator.getBonusSyncState().terminalReady === true,
      { description: "Terminal ready before Music metadata" },
    );

    const audio = bridgeRef.getAudioElement();
    const controls = instrumentAudioElement(audio, { duration: 213, autoplayBlocked: true });

    await act(async () => {
      controls.emitMetadata();
    });

    await waitForCondition(
      () => Boolean([...container.querySelectorAll("button")].find((b) => b.textContent.trim() === "▶ Play Audio")),
      { description: "Play Audio fallback button visible when autoplay blocked" },
    );

    const fallbackBtn = [...container.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "▶ Play Audio",
    );
    controls.setBlocked(false);
    await dom.click(fallbackBtn);

    await waitForCondition(
      () => !audio.paused && ![...container.querySelectorAll("button")].some((b) => b.textContent.trim() === "▶ Play Audio"),
      { description: "Audio plays and fallback button hides after user click" },
    );
  });
});

test("renderAppContent forwards payload to MusicContent and Terminal SCSS compiles with Cat Story styles", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ container, root });

  await act(async () => {
    root.render(
      React.createElement(
        WindowContext.Provider,
        { value: createWindowContextValue() },
        renderAppContent("music", {
          closeWindow() {},
          minimizeWindow() {},
          maximizeWindow() {},
          openApp() {},
          payload: {
            action: "bonus-play-from-start",
            songId: "ravyn-lenae-love-me-not",
            startTime: 56.90,
            volume: 0.4,
            runId: 888,
          },
        }),
      ),
    );
  });

  await waitForCondition(
    () => container.textContent.includes("Love Me Not"),
    { description: "MusicContent receives payload via renderAppContent" },
  );

  const terminalCss = sass.compile(`${projectRoot}src/styles/components/Terminal/Terminal.scss`).css;
  const catStageRule = terminalCss.match(/\.terminal-cat-stage\s*\{[^}]*\}/)?.[0] ?? "";
  const catShellRule = terminalCss.match(/\.terminal-cat-shell\s*\{[^}]*\}/)?.[0] ?? "";
  const catScreenRule = terminalCss.match(/\.terminal-cat-screen\s*\{[^}]*\}/)?.[0] ?? "";
  const catCanvasRule = terminalCss.match(/\.terminal-cat-canvas\s*\{[^}]*\}/)?.[0] ?? "";

  assert.match(catStageRule, /width:\s*100%/);
  assert.match(catStageRule, /height:\s*100%/);
  assert.match(catStageRule, /padding:\s*0/);
  assert.doesNotMatch(catStageRule, /1080px/);

  assert.match(catShellRule, /flex:\s*1/);
  assert.match(catShellRule, /width:\s*100%/);
  assert.doesNotMatch(catShellRule, /1080px|border:|border-radius:|box-shadow:/);

  assert.match(catScreenRule, /flex:\s*1/);
  assert.match(catScreenRule, /width:\s*100%/);
  assert.match(catScreenRule, /background:\s*#05080d/i);
  assert.doesNotMatch(catScreenRule, /aspect-ratio:\s*964\s*\/\s*720/);

  assert.match(catCanvasRule, /width:\s*100%/);
  assert.match(catCanvasRule, /height:\s*100%/);
  assert.match(catCanvasRule, /object-fit:\s*contain/);
  assert.match(catCanvasRule, /background:\s*transparent/);

  assert.match(terminalCss, /\.terminal-cat-stage--phosphor[^}]*background:\s*#050e09/i);
});

test("MusicContent sets volume to 0.4, unmutes, and starts at 0 on bonus-play-from-start despite saved localStorage state", async () => {
  const { PLAYER_STORAGE_KEY } = await vite.ssrLoadModule("/src/features/music/musicModel.js");
  browserWindow.localStorage.setItem(
    PLAYER_STORAGE_KEY,
    JSON.stringify({
      activeId: "ravyn-lenae-love-me-not",
      currentTime: 12,
      volume: 0.7,
      isMuted: true,
    }),
  );

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ container, root });

  let bridgeRef = null;
  function BridgeProbe() {
    bridgeRef = useMusicPlayer();
    return null;
  }

  // 1. Fresh mount with bonus-play-from-start overrides stored 0.7 / muted / currentTime 12.
  await act(async () => {
    root.render(
      React.createElement(
        WindowContext.Provider,
        { value: createWindowContextValue() },
        React.createElement(MusicContent, {
          payload: {
            action: "bonus-play-from-start",
            songId: "ravyn-lenae-love-me-not",
            startTime: 56.90,
            volume: 0.4,
            runId: 901,
          },
        }),
        React.createElement(BridgeProbe),
      ),
    );
  });

  const audio = bridgeRef.getAudioElement();
  const slider = container.querySelector(".music-volume-slider");
  const muteBtn = container.querySelector('button[aria-label="Mute"], button[aria-label="Unmute"]');
  assert.ok(audio);
  assert.ok(slider);
  assert.ok(muteBtn);
  assert.equal(audio.currentTime, 0);
  assert.equal(audio.volume, 0.4);
  assert.equal(audio.muted, false);
  assert.equal(Number(slider.value), 0.4);
  assert.equal(muteBtn.getAttribute("aria-pressed"), "false");
  assert.equal(JSON.parse(browserWindow.localStorage.getItem(PLAYER_STORAGE_KEY)).volume, 0.4);
  assert.equal(JSON.parse(browserWindow.localStorage.getItem(PLAYER_STORAGE_KEY)).isMuted, false);

  // 2. User adjusts volume slider and mutes afterwards -> stays user-controlled.
  const setInputValue = Object.getOwnPropertyDescriptor(
    browserWindow.HTMLInputElement.prototype,
    "value",
  ).set;
  await act(async () => {
    setInputValue.call(slider, "0.85");
    slider.dispatchEvent(new browserWindow.Event("input", { bubbles: true }));
    slider.dispatchEvent(new browserWindow.Event("change", { bubbles: true }));
  });
  assert.equal(audio.volume, 0.85);
  assert.equal(Number(slider.value), 0.85);

  await dom.click(muteBtn);
  assert.equal(audio.muted, true);
  assert.equal(Number(slider.value), 0);

  // 3. Re-launching bonus-play-from-start while Music is already open resets to 0.4, unmutes, and seeks to 0.
  await act(async () => {
    root.render(
      React.createElement(
        WindowContext.Provider,
        { value: createWindowContextValue() },
        React.createElement(MusicContent, {
          payload: {
            action: "bonus-play-from-start",
            songId: "ravyn-lenae-love-me-not",
            startTime: 56.90,
            runId: 902,
          },
        }),
        React.createElement(BridgeProbe),
      ),
    );
  });

  assert.equal(audio.currentTime, 0);
  assert.equal(audio.volume, 0.4);
  assert.equal(audio.muted, false);
  assert.equal(Number(slider.value), 0.4);
  assert.equal(muteBtn.getAttribute("aria-pressed"), "false");
  assert.equal(JSON.parse(browserWindow.localStorage.getItem(PLAYER_STORAGE_KEY)).volume, 0.4);
  assert.equal(JSON.parse(browserWindow.localStorage.getItem(PLAYER_STORAGE_KEY)).isMuted, false);
});

test("MusicContent with autoOpenTerminal: false plays from 00:00 at 0.4 volume and does not auto-open Terminal at lyric cues", async () => {
  const openedCalls = [];
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ container, root });

  let bridgeRef = null;
  function BridgeProbe() {
    bridgeRef = useMusicPlayer();
    return null;
  }

  await act(async () => {
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(
          WindowContext.Provider,
          { value: createWindowContextValue() },
          React.createElement(MusicContent, {
            openApp: (...args) => openedCalls.push(args),
            payload: {
              action: "bonus-play-from-start",
              songId: "ravyn-lenae-love-me-not",
              volume: 0.4,
              autoOpenTerminal: false,
              runId: 950,
            },
          }),
          React.createElement(BridgeProbe),
        ),
      ),
    );
  });

  const audio = bridgeRef.getAudioElement();
  const controls = instrumentAudioElement(audio, { duration: 213 });
  await act(async () => {
    controls.emitMetadata();
  });

  assert.equal(audio.paused, false);
  assert.equal(audio.currentTime, 0);
  assert.equal(audio.volume, 0.4);
  assert.equal(audio.muted, false);

  await act(async () => {
    controls.advanceTo(56.90);
    controls.seekTo(132.68);
    controls.advanceTo(140.0);
  });
  assert.equal(openedCalls.length, 0);
});

async function withMockUnifiedCanvases(run) {
  const originalGetContext = browserWindow.HTMLCanvasElement.prototype.getContext;
  const originalPath2D = globalThis.Path2D;
  const giftTexts = [];
  const catPutImageCalls = [];
  const trailClearRects = [];
  let offscreen1080Count = 0;

  class MockPath2D {
    moveTo() {}
    bezierCurveTo() {}
    closePath() {}
  }

  globalThis.Path2D = MockPath2D;
  browserWindow.HTMLCanvasElement.prototype.getContext = function getContext() {
    const isGift = this.className === "terminal-ascii-canvas";
    const isCat = this.className === "terminal-cat-canvas";
    let isTrailCanvas = false;
    if (!isGift && !isCat && this.width === 1080 && this.height === 960) {
      offscreen1080Count += 1;
      isTrailCanvas = offscreen1080Count === 2;
    }
    const gradient = { addColorStop() {} };
    return {
      fillStyle: "",
      strokeStyle: "",
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetY: 0,
      lineWidth: 1,
      lineCap: "butt",
      font: "",
      textAlign: "left",
      textBaseline: "alphabetic",
      globalCompositeOperation: "source-over",
      globalAlpha: 1,
      filter: "none",
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      clip() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      bezierCurveTo() {},
      quadraticCurveTo() {},
      arc() {},
      ellipse() {},
      fill() {},
      stroke() {},
      fillRect(x, y, w, h) {
        if (isTrailCanvas && this.fillStyle === "#030204") {
          trailClearRects.push({ x, y, w, h });
        }
      },
      clearRect() {},
      drawImage() {},
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      measureText: (text) => ({ width: String(text).length * 8 }),
      createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      fillText(text, x, y) {
        if (isGift) {
          giftTexts.push({ text: String(text), x, y });
        }
      },
      putImageData(imageData, dx, dy) {
        if (isCat) {
          catPutImageCalls.push({ width: imageData.width, height: imageData.height, dx, dy });
        }
      },
    };
  };

  try {
    await run({ giftTexts, catPutImageCalls, trailClearRects });
  } finally {
    browserWindow.HTMLCanvasElement.prototype.getContext = originalGetContext;
    if (originalPath2D === undefined) {
      delete globalThis.Path2D;
    } else {
      globalThis.Path2D = originalPath2D;
    }
  }
}

test("Unified Terminal + Music switches seamlessly Gift Box -> Chorus 1 Cat Story -> Gift Box -> Chorus 2 Cat Story -> Gift Box", async () => {
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancelRaf = globalThis.cancelAnimationFrame;
  let nextRafId = 1;
  const rafQueue = new Map();

  globalThis.requestAnimationFrame = (cb) => {
    const id = nextRafId++;
    rafQueue.set(id, cb);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    rafQueue.delete(id);
  };

  try {
    await withMockUnifiedCanvases(async ({ giftTexts, catPutImageCalls, trailClearRects }) => {
      await decodeCatStoryFrames();

      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      mountedRoots.push({ container, root });

      let bridgeRef = null;
      function BridgeProbe() {
        bridgeRef = useMusicPlayer();
        return null;
      }

      const runId = 1201;
      await act(async () => {
        root.render(
          React.createElement(
            React.StrictMode,
            null,
            React.createElement(
              WindowContext.Provider,
              { value: createWindowContextValue() },
              React.createElement(MusicContent, {
                payload: {
                  action: "bonus-play-from-start",
                  songId: "ravyn-lenae-love-me-not",
                  volume: 0.4,
                  autoOpenTerminal: false,
                  runId,
                },
              }),
              React.createElement(TerminalContent, {
                payload: {
                  action: "anniversary-gift",
                  maximize: true,
                  syncWithMusic: true,
                  immediate: true,
                  songId: "ravyn-lenae-love-me-not",
                  runId,
                },
              }),
              React.createElement(BridgeProbe),
            ),
          ),
        );
      });

      const audio = bridgeRef.getAudioElement();
      assert.ok(audio);
      const controls = instrumentAudioElement(audio, { duration: 213 });

      await act(async () => {
        controls.emitMetadata();
      });

      assert.equal(audio.paused, false);
      assert.equal(audio.currentTime, 0);
      assert.ok(container.querySelector(".terminal-ascii-stage"));
      assert.equal(container.querySelector(".terminal-cat-stage"), null);
      assert.equal(container.querySelector(".terminal-ascii-slot")?.style.display, "");

      const giftTimerCalls = () => giftTexts.filter((c) => /t \d{2,}\.\d{2}s$/.test(c.text));
      const parseTimer = (text) => {
        const m = /t (\d+\.\d{2})s$/.exec(text || "");
        return m ? Number(m[1]) : NaN;
      };

      // Advance Gift Box rAF past 29s (open + bloomed).
      let ms = 100;
      const stepRaf = async (count) => {
        await act(async () => {
          for (let i = 0; i < count; i += 1) {
            const entries = [...rafQueue.entries()];
            rafQueue.clear();
            for (const [, cb] of entries) {
              cb(ms);
            }
            ms += 100;
          }
        });
      };

      await stepRaf(45);
      const tBeforeCat1 = parseTimer(giftTimerCalls().at(-1)?.text);
      assert.ok(tBeforeCat1 >= 2.5, `expected Gift Box to advance past 2.5s, got ${tBeforeCat1}`);

      // Enter Chorus 1 (00:56.90) -> CatStoryCanvas overlays, Gift Box hidden via display:none.
      await act(async () => {
        controls.advanceTo(56.90);
      });
      await waitForCondition(
        () => Boolean(container.querySelector(".terminal-cat-stage")) && catPutImageCalls.length > 0,
        { description: "CatStoryCanvas activates at Chorus 1 (56.90s)" },
      );
      assert.equal(container.querySelector(".terminal-ascii-slot")?.style.display, "none");
      assert.match(container.textContent, /FRAME 001 \/ 338/);

      await act(async () => {
        controls.advanceTo(56.90 + 1.1);
      });
      assert.match(container.textContent, /FRAME 034 \/ 338/);
      assert.match(container.textContent, /00:01\.10\s+\/\s+00:11\.27/);

      // Exit Chorus 1 (01:08.17) -> CatStoryCanvas unmounts, Gift Box returns already open & bloomed.
      await act(async () => {
        controls.advanceTo(bonusSyncModel.BONUS_LYRIC_WINDOWS[0].endTime);
      });
      assert.equal(container.querySelector(".terminal-cat-stage"), null);
      assert.equal(container.querySelector(".terminal-ascii-slot")?.style.display, "");
      assert.equal(trailClearRects.length, 0);
      const tAfterCat1 = parseTimer(giftTimerCalls().at(-1)?.text);
      assert.equal(tAfterCat1, tBeforeCat1, "Gift Box must resume from preserved t without resetting to 0");

      // Enter Chorus 2 (02:12.68) -> CatStoryCanvas mounts again synced to Window 2.
      await act(async () => {
        controls.seekTo(132.68);
      });
      await waitForCondition(
        () => Boolean(container.querySelector(".terminal-cat-stage")),
        { description: "CatStoryCanvas activates at Chorus 2 (132.68s)" },
      );
      assert.match(container.textContent, /FRAME 001 \/ 338/);

      await act(async () => {
        controls.advanceTo(132.68 + 1.1);
      });
      assert.match(container.textContent, /FRAME 034 \/ 338/);
      assert.match(container.textContent, /00:01\.10\s+\/\s+00:11\.27/);

      // Exit Chorus 2 (02:23.95) -> returns to Gift Box again.
      await act(async () => {
        controls.seekTo(bonusSyncModel.BONUS_LYRIC_WINDOWS[1].endTime);
      });
      assert.equal(container.querySelector(".terminal-cat-stage"), null);
      assert.equal(container.querySelector(".terminal-ascii-slot")?.style.display, "");

      // Seek directly back into Chorus 1 -> immediate switch.
      await act(async () => {
        controls.seekTo(58.0);
      });
      await waitForCondition(
        () => Boolean(container.querySelector(".terminal-cat-stage")),
        { description: "seeked immediately switches back to Cat Story" },
      );

      // Switching Music to a different song returns Terminal to Gift Box and stops switching to Cat Story.
      const otherSongBtn = [...container.querySelectorAll(".music-track-main")].find(
        (btn) => !btn.textContent.includes("Love Me Not"),
      );
      assert.ok(otherSongBtn);
      await dom.click(otherSongBtn);
      await act(async () => {
        controls.emitMetadata();
        controls.seekTo(58.0);
      });
      assert.equal(container.querySelector(".terminal-cat-stage"), null);
      assert.equal(container.querySelector(".terminal-ascii-slot")?.style.display, "");

      // Exit via Back to Terminal -> exits to CLI and stops auto-switching even if Love Me Not plays again.
      const backBtn = [...container.querySelectorAll(".terminal-ascii-tools button")].find(
        (b) => b.textContent.trim() === "Back to Terminal",
      );
      assert.ok(backBtn);
      await dom.click(backBtn);
      assert.equal(container.querySelector(".terminal-ascii-stage"), null);
      assert.ok(container.querySelector(".terminal-interactive-input"));

      await act(async () => {
        controls.seekTo(60.0);
      });
      assert.equal(container.querySelector(".terminal-cat-stage"), null);
      assert.equal(container.querySelector(".terminal-ascii-stage"), null);
    });
  } finally {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancelRaf;
  }
});

test("Autoplay-blocked Music shows Play Audio fallback on Gift Box in unified Terminal mode and starts on click", async () => {
  await withMockUnifiedCanvases(async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push({ container, root });

    let bridgeRef = null;
    function BridgeProbe() {
      bridgeRef = useMusicPlayer();
      return null;
    }

    const runId = 1301;
    await act(async () => {
      root.render(
        React.createElement(
          WindowContext.Provider,
          { value: createWindowContextValue() },
          React.createElement(MusicContent, {
            payload: {
              action: "bonus-play-from-start",
              songId: "ravyn-lenae-love-me-not",
              volume: 0.4,
              autoOpenTerminal: false,
              runId,
            },
          }),
          React.createElement(TerminalContent, {
            payload: {
              action: "anniversary-gift",
              maximize: true,
              syncWithMusic: true,
              immediate: true,
              songId: "ravyn-lenae-love-me-not",
              runId,
            },
          }),
          React.createElement(BridgeProbe),
        ),
      );
    });

    const audio = bridgeRef.getAudioElement();
    const controls = instrumentAudioElement(audio, { duration: 213, autoplayBlocked: true });
    await act(async () => {
      controls.emitMetadata();
    });

    await waitForCondition(
      () => Boolean([...container.querySelectorAll("button")].find((b) => b.textContent.trim() === "▶ Play Audio")),
      { description: "Play Audio fallback button visible on Gift Box when autoplay blocked" },
    );

    const playAudioBtn = [...container.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "▶ Play Audio",
    );
    controls.setBlocked(false);
    await dom.click(playAudioBtn);

    await waitForCondition(
      () => !audio.paused && ![...container.querySelectorAll("button")].some((b) => b.textContent.trim() === "▶ Play Audio"),
      { description: "Audio plays and Play Audio fallback button hides after click" },
    );
  });
});
