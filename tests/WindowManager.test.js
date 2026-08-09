import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

const projectRoot = new URL("../", import.meta.url).pathname;
let vite;
let getNextWindowZIndexState;
let APP_WINDOW_Z_INDEX_MAX;
let windowReducer;

before(async () => {
  vite = await createServer({
    configFile: `${projectRoot}vite.config.js`,
    server: { hmr: false, middlewareMode: true, ws: false },
    appType: "custom",
  });

  ({ getNextWindowZIndexState, APP_WINDOW_Z_INDEX_MAX, windowReducer } = await vite.ssrLoadModule(
    "/src/core/providers/WindowManagerProvider.jsx"
  ));
});

after(async () => {
  await vite.close();
});

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
});
