import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "vite";
import { setupHarness, unmountMount } from "./testUtils/harness.js";
import { createDom } from "./testUtils/dom.js";

const { browserWindow, document, projectRoot } = setupHarness();
const originalCustomEvent = globalThis.CustomEvent;
globalThis.CustomEvent = browserWindow.CustomEvent;
let vite;
let React;
let act;
let createRoot;
let MusicContent;
let TerminalContent;
let WindowContext;
let dom;
let restoreMedia;
const mountedRoots = [];

function mockMediaPlayback() {
  const prototype = browserWindow.HTMLMediaElement.prototype;
  const original = {
    load: prototype.load,
    play: prototype.play,
    pause: prototype.pause,
  };
  let playCalls = 0;
  prototype.load = function load() {
    if (!this.getAttribute("src")) return;
    Object.defineProperty(this, "duration", { configurable: true, value: 249 });
    this.dispatchEvent(new browserWindow.Event("loadedmetadata"));
  };
  prototype.play = function play() {
    playCalls += 1;
    Object.defineProperty(this, "paused", { configurable: true, value: false });
    this.dispatchEvent(new browserWindow.Event("play"));
    return Promise.resolve();
  };
  prototype.pause = function pause() {
    Object.defineProperty(this, "paused", { configurable: true, value: true });
    this.dispatchEvent(new browserWindow.Event("pause"));
  };
  return {
    get playCalls() { return playCalls; },
    restore() {
      prototype.load = original.load;
      prototype.play = original.play;
      prototype.pause = original.pause;
    },
  };
}

async function renderMusicAndTerminal(openApp) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const mount = { container, root };
  mountedRoots.push(mount);
  await act(async () => {
    root.render(
      React.createElement(
        WindowContext.Provider,
        { value: { onClose() {}, onMinimize() {}, onZoom() {}, onTitlePointerDown() {} } },
        React.createElement(
          React.Fragment,
          null,
          React.createElement(MusicContent),
          React.createElement(TerminalContent, { openApp }),
        ),
      ),
    );
  });
  return mount;
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
  ({ MusicContent } = await vite.ssrLoadModule("/src/features/music/MusicContent.jsx"));
  ({ TerminalContent } = await vite.ssrLoadModule("/src/features/terminal/Terminal.jsx"));
  ({ WindowContext } = await vite.ssrLoadModule("/src/windows/index.js"));
  dom = createDom(act, browserWindow, document);
});

afterEach(async () => {
  for (const mount of mountedRoots.splice(0)) await unmountMount(act, mount);
  restoreMedia?.restore();
  restoreMedia = null;
  document.body.replaceChildren();
  localStorage.clear();
});

after(async () => {
  await vite.close();
  browserWindow.close();
  globalThis.CustomEvent = originalCustomEvent;
});

test("Terminal play starts the selected song in Music", async () => {
  restoreMedia = mockMediaPlayback();
  const openedApps = [];
  const mount = await renderMusicAndTerminal((appId) => openedApps.push(appId));
  const input = mount.container.querySelector(".terminal-interactive-input");

  await dom.fill(input, "play Coming Up Roses");
  await act(async () => dom.dispatch(input, "keydown", { key: "Enter" }));

  assert.equal(mount.container.querySelector(".music-now-playing-title")?.textContent, "Coming Up Roses");
  assert.equal(restoreMedia.playCalls, 1);
  assert.deepEqual(openedApps, ["music"]);
  assert.match(mount.container.querySelector(".terminal-history-area").textContent, /Now playing/);
});

test("Terminal play starts a song when Music opens on demand", async () => {
  restoreMedia = mockMediaPlayback();
  const openedApps = [];
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const mount = { container, root };
  mountedRoots.push(mount);

  let closeMusic;
  function TerminalWithMusicOnOpen() {
    const [musicOpen, setMusicOpen] = React.useState(false);
    closeMusic = () => setMusicOpen(false);
    const openApp = (appId) => {
      openedApps.push(appId);
      if (appId === "music") setMusicOpen(true);
    };
    return React.createElement(
      WindowContext.Provider,
      { value: { onClose() {}, onMinimize() {}, onZoom() {}, onTitlePointerDown() {} } },
      React.createElement(
        React.Fragment,
        null,
        musicOpen && React.createElement(MusicContent),
        React.createElement(TerminalContent, { openApp }),
      ),
    );
  }

  await act(async () => root.render(
    React.createElement(React.StrictMode, null, React.createElement(TerminalWithMusicOnOpen)),
  ));
  const input = container.querySelector(".terminal-interactive-input");
  await dom.fill(input, "play Coming Up Roses");
  await act(async () => dom.dispatch(input, "keydown", { key: "Enter" }));

  assert.equal(container.querySelector(".music-now-playing-title")?.textContent, "Coming Up Roses");
  assert.equal(restoreMedia.playCalls, 1);
  assert.deepEqual(openedApps, ["music"]);

  await act(async () => closeMusic());
  await dom.fill(input, "play Coming Up Roses");
  await act(async () => dom.dispatch(input, "keydown", { key: "Enter" }));
  assert.equal(container.querySelector(".music-now-playing-title")?.textContent, "Coming Up Roses");
  assert.equal(restoreMedia.playCalls, 2);
  assert.deepEqual(openedApps, ["music", "music"]);
});
