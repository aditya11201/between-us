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
  localStorage: browserWindow.localStorage,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  Event: browserWindow.Event,
  MouseEvent: browserWindow.MouseEvent,
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
let getNextWindowZIndexState;
let APP_WINDOW_Z_INDEX_MAX;
let windowReducer;
let INITIAL_POSITIONS;
let WindowManagerProvider;
let useWindowManager;
let currentManager;
const mountedRoots = [];

function WindowManagerProbe() {
  currentManager = useWindowManager();

  return React.createElement("output", {
    "data-windows": JSON.stringify(currentManager.windows),
    "data-open-apps": JSON.stringify(currentManager.openApps),
    "data-active-win": currentManager.activeWin ?? "",
    "data-minimized-apps": JSON.stringify([...currentManager.minimizedApps]),
  });
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

  ({
    getNextWindowZIndexState,
    APP_WINDOW_Z_INDEX_MAX,
    windowReducer,
    WindowManagerProvider,
    useWindowManager,
  } = await vite.ssrLoadModule("/src/core/providers/WindowManagerProvider.jsx"));
  ({ INITIAL_POSITIONS } = await vite.ssrLoadModule(
    "/src/core/constants/positions.jsx"
  ));
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

afterEach(async () => {
  for (const { root, container } of mountedRoots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  currentManager = null;
});

async function renderWindowManager() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });

  await act(async () => {
    root.render(
      React.createElement(
        WindowManagerProvider,
        null,
        React.createElement(WindowManagerProbe),
      ),
    );
  });

  return container;
}

async function settleReact() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function readWindowManagerState(container) {
  const output = container.querySelector("output");
  return {
    windows: JSON.parse(output.dataset.windows),
    openApps: JSON.parse(output.dataset.openApps),
    activeWin: output.dataset.activeWin || null,
    minimizedApps: JSON.parse(output.dataset.minimizedApps),
  };
}

test("normalizes app window layers below the brightness overlay at the reservation boundary", () => {
  assert.equal(typeof getNextWindowZIndexState, "function");
  assert.ok(APP_WINDOW_Z_INDEX_MAX < 9500);

  const windows = [
    { id: "front", zIndex: APP_WINDOW_Z_INDEX_MAX },
    { id: "back", zIndex: APP_WINDOW_Z_INDEX_MAX - 20 },
    { id: "middle", zIndex: APP_WINDOW_Z_INDEX_MAX - 10 },
  ];
  const next = getNextWindowZIndexState(windows, APP_WINDOW_Z_INDEX_MAX);

  assert.equal(next.zIndex, 103);
  assert.equal(next.windows.find(window => window.id === "back").zIndex, 100);
  assert.equal(next.windows.find(window => window.id === "middle").zIndex, 101);
  assert.equal(next.windows.find(window => window.id === "front").zIndex, 102);
  assert.ok(next.windows.every(window => window.zIndex <= APP_WINDOW_Z_INDEX_MAX));
  assert.ok(next.zIndex <= APP_WINDOW_Z_INDEX_MAX);

  const ordinary = [{ id: "window", zIndex: 101 }];
  const ordinaryNext = getNextWindowZIndexState(ordinary, 101);
  assert.equal(ordinaryNext.zIndex, 102);
  assert.strictEqual(ordinaryNext.windows, ordinary);
});

function createWindowState(overrides = {}) {
  return {
    windows: [],
    openApps: [],
    activeWin: null,
    minimizedApps: new Set(),
    windowStates: {},
    zCounter: 100,
    ...overrides,
  };
}

function openWindow(state, appId, payload) {
  return windowReducer(state, {
    type: "OPEN",
    payload: { appId, appName: "Preview", payload },
  });
}

test("opening a dynamic preview window stores its payload", () => {
  const payload = { src: "/photos/one.jpg", title: "One" };

  const next = openWindow(createWindowState(), "preview:one", payload);

  assert.deepEqual(next.windows[0].payload, payload);
});

test("reopening a preview window updates its payload without duplicating it", () => {
  const firstPayload = { src: "/photos/one.jpg" };
  const secondPayload = { src: "/photos/two.jpg" };
  const opened = openWindow(createWindowState(), "preview:one", firstPayload);

  const updated = openWindow(opened, "preview:one", secondPayload);
  const preserved = windowReducer(updated, {
    type: "OPEN",
    payload: { appId: "preview:one", appName: "Preview" },
  });

  assert.equal(updated.windows.length, 1);
  assert.deepEqual(updated.openApps, ["preview:one"]);
  assert.deepEqual(updated.windows[0].payload, secondPayload);
  assert.deepEqual(preserved.windows[0].payload, secondPayload);
});

test("reopening a minimized preview window clears its minimized state", () => {
  const opened = openWindow(createWindowState(), "preview:one", { src: "/photos/one.jpg" });
  const minimized = {
    ...opened,
    activeWin: null,
    minimizedApps: new Set(["preview:one"]),
  };

  const reopened = windowReducer(minimized, {
    type: "OPEN",
    payload: { appId: "preview:one", appName: "Preview" },
  });

  assert.equal(reopened.minimizedApps.has("preview:one"), false);
  assert.equal(reopened.activeWin, "preview:one");
});

test("dynamic preview windows use the preview initial position", () => {
  const next = openWindow(createWindowState(), "preview:one", { src: "/photos/one.jpg" });
  const preview = next.windows[0];

  assert.deepEqual(
    { x: preview.x, y: preview.y, width: preview.width, height: preview.height },
    { x: 220, y: 90, width: 720, height: 560 }
  );
  assert.deepEqual(
    { x: preview.x, y: preview.y, width: preview.width, height: preview.height },
    {
      x: INITIAL_POSITIONS.preview.x,
      y: INITIAL_POSITIONS.preview.y,
      width: INITIAL_POSITIONS.preview.w,
      height: INITIAL_POSITIONS.preview.h,
    },
  );
});

test("distinct dynamic preview IDs create distinct reducer windows", () => {
  const first = openWindow(
    createWindowState(),
    "preview:favorites/sunset.webp",
    { src: "/photos/sunset.webp" },
  );
  const next = openWindow(
    first,
    "preview:travel/mountain.webp",
    { src: "/photos/mountain.webp" },
  );

  assert.equal(next.windows.length, 2);
  assert.deepEqual(next.openApps, [
    "preview:favorites/sunset.webp",
    "preview:travel/mountain.webp",
  ]);
  assert.notEqual(next.windows[0].id, next.windows[1].id);
});

// Regression: the public provider API must preserve payload boundaries and focus semantics.
test("public openApp stores a dynamic preview payload", async () => {
  const container = await renderWindowManager();
  const payload = {
    id: "favorites/sunset.webp",
    name: "sunset.webp",
    url: "/photos/sunset.webp",
  };

  await act(async () => {
    currentManager.openApp("preview:favorites/sunset.webp", "Preview", payload);
  });
  await settleReact();

  const state = readWindowManagerState(container);
  assert.deepEqual(state.windows[0].payload, payload);
  assert.deepEqual(state.openApps, ["preview:favorites/sunset.webp"]);
});

test("public openApp keeps ordinary calls payload-free", async () => {
  const container = await renderWindowManager();

  await act(async () => {
    currentManager.openApp("finder", "Finder");
  });
  await settleReact();

  const state = readWindowManagerState(container);
  assert.deepEqual(state.openApps, ["finder"]);
  assert.equal(state.windows[0].id, "finder");
  assert.equal("payload" in state.windows[0], false);
});

test("public openApp updates a same-ID payload without duplicating openApps", async () => {
  const container = await renderWindowManager();
  const previewId = "preview:favorites/sunset.webp";
  const firstPayload = { id: "favorites/sunset.webp", url: "/photos/sunset.webp" };
  const secondPayload = { id: "favorites/sunset.webp", url: "/photos/edited-sunset.webp" };

  await act(async () => {
    currentManager.openApp(previewId, "Preview", firstPayload);
  });
  await settleReact();

  await act(async () => {
    currentManager.openApp(previewId, "Preview", secondPayload);
  });
  await settleReact();

  const state = readWindowManagerState(container);
  assert.equal(state.windows.length, 1);
  assert.deepEqual(state.openApps, [previewId]);
  assert.deepEqual(state.windows[0].payload, secondPayload);
});

test("public openApp reopens a minimized preview and focuses it", async () => {
  const container = await renderWindowManager();
  const previewId = "preview:favorites/sunset.webp";
  const payload = { id: "favorites/sunset.webp", url: "/photos/sunset.webp" };

  await act(async () => {
    currentManager.openApp(previewId, "Preview", payload);
  });
  await settleReact();

  await act(async () => {
    currentManager.minimizeWindow(previewId);
  });
  await settleReact();
  assert.deepEqual(readWindowManagerState(container).minimizedApps, [previewId]);

  await act(async () => {
    currentManager.openApp(previewId, "Preview", payload);
  });
  await settleReact();

  const state = readWindowManagerState(container);
  assert.deepEqual(state.openApps, [previewId]);
  assert.deepEqual(state.minimizedApps, []);
  assert.equal(state.activeWin, previewId);
});
