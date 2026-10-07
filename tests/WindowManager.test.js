import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "vite";
import { waitForCondition } from "./testUtils/waitForCondition.js";
import { setupHarness, unmountMount } from "./testUtils/harness.js";

const { browserWindow, document, projectRoot } = setupHarness();

let vite;
let React;
let act;
let createRoot;
let getNextWindowZIndexState;
let APP_WINDOW_Z_INDEX_MAX;
let windowReducer;
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
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

afterEach(async () => {
  for (const { root, container } of mountedRoots.splice(0)) {
    await unmountMount(act, { root, container });
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

async function waitForWindowManagerState(container, predicate, description) {
  await act(async () => {
    await waitForCondition(
      () => predicate(readWindowManagerState(container)),
      { description },
    );
  });
  return readWindowManagerState(container);
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

function openWindow(state, appId, payload, viewport = { width: 1024, height: 768 }) {
  return windowReducer(state, {
    type: "OPEN",
    payload: { appId, appName: "Preview", payload, viewport },
  });
}

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

test("dynamic preview windows use the centered preview size", () => {
  const next = openWindow(
    createWindowState(),
    "preview:one",
    { src: "/photos/one.jpg" },
  );
  const preview = next.windows[0];

  assert.deepEqual(
    { x: preview.x, y: preview.y, width: preview.width, height: preview.height },
    { x: 152, y: 78, width: 720, height: 560 },
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

  const state = await waitForWindowManagerState(
    container,
    ({ windows, openApps }) =>
      windows[0]?.payload?.url === payload.url &&
      openApps.includes("preview:favorites/sunset.webp"),
    "dynamic preview payload in the public window-manager state",
  );
  assert.deepEqual(state.windows[0].payload, payload);
  assert.deepEqual(state.openApps, ["preview:favorites/sunset.webp"]);
});

test("public openApp keeps ordinary calls payload-free", async () => {
  const container = await renderWindowManager();

  await act(async () => {
    currentManager.openApp("finder", "Finder");
  });

  const state = await waitForWindowManagerState(
    container,
    ({ windows, openApps }) =>
      windows[0]?.id === "finder" && openApps.includes("finder"),
    "ordinary Finder window in the public window-manager state",
  );
  assert.deepEqual(state.openApps, ["finder"]);
  assert.equal(state.windows[0].id, "finder");
  assert.equal(state.windows[0].payload, undefined);
});

test("public openApp centers and caps windows to the current viewport", async () => {
  const container = await renderWindowManager();
  const setViewport = (width, height) => {
    Object.defineProperty(browserWindow, "innerWidth", { configurable: true, value: width });
    Object.defineProperty(browserWindow, "innerHeight", { configurable: true, value: height });
  };

  try {
    setViewport(1440, 900);
    await act(async () => currentManager.openApp("photos", "Photos"));
    let state = await waitForWindowManagerState(
      container,
      ({ windows }) => windows[0]?.id === "photos",
      "centered Photos window on a desktop viewport",
    );
    assert.deepEqual(
      {
        x: state.windows[0].x,
        y: state.windows[0].y,
        width: state.windows[0].width,
        height: state.windows[0].height,
      },
      { x: 230, y: 99, width: 980, height: 650 },
    );

    await act(async () => currentManager.closeWindow("photos"));
    await waitForWindowManagerState(
      container,
      ({ windows }) => windows.length === 0,
      "closed Photos before changing viewport",
    );

    setViewport(812, 375);
    await act(async () => currentManager.openApp("photos", "Photos"));
    state = await waitForWindowManagerState(
      container,
      ({ windows }) => windows[0]?.id === "photos",
      "viewport-sized Photos window on a small landscape display",
    );
    assert.deepEqual(
      {
        x: state.windows[0].x,
        y: state.windows[0].y,
        width: state.windows[0].width,
        height: state.windows[0].height,
      },
      { x: 24, y: 44, width: 764, height: 235 },
    );
  } finally {
    delete browserWindow.innerWidth;
    delete browserWindow.innerHeight;
  }
});

test("public maximizeWindow restores the saved rectangle on the second call", async () => {
  const container = await renderWindowManager();

  await act(async () => {
    currentManager.openApp("safari", "Safari");
  });
  const initialState = await waitForWindowManagerState(
    container,
    ({ windows }) => windows[0]?.id === "safari",
    "initial Safari window before maximizing",
  );
  const initialWindow = initialState.windows[0];

  await act(async () => {
    currentManager.maximizeWindow("safari");
  });
  await waitForWindowManagerState(
    container,
    ({ windows }) => windows[0]?.x === 0 && windows[0]?.y === 28,
    "maximized Safari window",
  );

  await act(async () => {
    currentManager.maximizeWindow("safari");
  });
  const restoredState = await waitForWindowManagerState(
    container,
    ({ windows }) => (
      windows[0]?.x === initialWindow.x
      && windows[0]?.y === initialWindow.y
      && windows[0]?.width === initialWindow.width
      && windows[0]?.height === initialWindow.height
    ),
    "restored Safari window after the second maximize call",
  );

  assert.deepEqual(
    {
      x: restoredState.windows[0].x,
      y: restoredState.windows[0].y,
      width: restoredState.windows[0].width,
      height: restoredState.windows[0].height,
    },
    {
      x: initialWindow.x,
      y: initialWindow.y,
      width: initialWindow.width,
      height: initialWindow.height,
    },
  );
});

test("public openApp updates a same-ID payload without duplicating openApps", async () => {
  const container = await renderWindowManager();
  const previewId = "preview:favorites/sunset.webp";
  const firstPayload = { id: "favorites/sunset.webp", url: "/photos/sunset.webp" };
  const secondPayload = { id: "favorites/sunset.webp", url: "/photos/edited-sunset.webp" };

  await act(async () => {
    currentManager.openApp(previewId, "Preview", firstPayload);
  });
  await waitForWindowManagerState(
    container,
    ({ windows }) => windows[0]?.payload?.url === firstPayload.url,
    "first preview payload in the public window-manager state",
  );

  await act(async () => {
    currentManager.openApp(previewId, "Preview", secondPayload);
  });

  const state = await waitForWindowManagerState(
    container,
    ({ windows }) => windows[0]?.payload?.url === secondPayload.url,
    "updated preview payload in the public window-manager state",
  );
  assert.equal(state.windows.length, 1);
  assert.deepEqual(state.openApps, [previewId]);
  assert.deepEqual(state.windows[0].payload, secondPayload);
});

test("public openApp reopens a minimized preview, promotes it, and focuses it above Finder", async () => {
  const container = await renderWindowManager();
  const previewId = "preview:favorites/sunset.webp";
  const payload = { id: "favorites/sunset.webp", url: "/photos/sunset.webp" };

  await act(async () => {
    currentManager.openApp(previewId, "Preview", payload);
  });
  const openedState = await waitForWindowManagerState(
    container,
    ({ windows }) => windows[0]?.payload?.url === payload.url,
    "opened preview before minimizing it",
  );
  const previewBeforeMinimize = openedState.windows.find(
    (window) => window.id === previewId,
  );

  await act(async () => {
    currentManager.openApp("finder", "Finder");
  });
  const finderState = await waitForWindowManagerState(
    container,
    ({ activeWin, windows }) =>
      activeWin === "finder" && windows.some((window) => window.id === "finder"),
    "another active window before reopening the preview",
  );
  const finderBeforeMinimize = finderState.windows.find(
    (window) => window.id === "finder",
  );
  assert.ok(finderBeforeMinimize.zIndex > previewBeforeMinimize.zIndex);

  await act(async () => {
    currentManager.minimizeWindow(previewId);
  });
  await waitForWindowManagerState(
    container,
    ({ minimizedApps }) => minimizedApps.includes(previewId),
    "minimized preview in the public window-manager state",
  );

  await act(async () => {
    currentManager.openApp(previewId, "Preview", payload);
  });

  const state = await waitForWindowManagerState(
    container,
    ({ activeWin, minimizedApps }) =>
      activeWin === previewId && minimizedApps.length === 0,
    "reopened preview focus in the public window-manager state",
  );
  const reopenedPreview = state.windows.find((window) => window.id === previewId);
  const finder = state.windows.find((window) => window.id === "finder");
  assert.deepEqual(state.openApps, [previewId, "finder"]);
  assert.deepEqual(state.minimizedApps, []);
  assert.equal(state.activeWin, previewId);
  assert.ok(reopenedPreview.zIndex > previewBeforeMinimize.zIndex);
  assert.ok(reopenedPreview.zIndex > finder.zIndex);
  assert.notEqual(finder.zIndex, Math.max(...state.windows.map((window) => window.zIndex)));
});
