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
  KeyboardEvent: browserWindow.KeyboardEvent,
  MouseEvent: browserWindow.MouseEvent,
  SVGElement: browserWindow.SVGElement,
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
let WindowManagerProvider;
let useWindowManager;
let WindowList;
let MenuBar;
let ThemeProvider;
let DisplaySettingsProvider;
let Dock;
let APPS;
let currentManager;
const mountedRoots = [];

function OpenAppProbe() {
  currentManager = useWindowManager();
  return null;
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
    WindowManagerProvider,
    useWindowManager,
    ThemeProvider,
    DisplaySettingsProvider,
  } = await vite.ssrLoadModule("/src/core/providers/index.js"));
  ({ WindowList } = await vite.ssrLoadModule("/src/windows/WindowList.jsx"));
  ({ MenuBar } = await vite.ssrLoadModule("/src/features/menubar/MenuBar.jsx"));
  ({ default: Dock } = await vite.ssrLoadModule("/src/windows/Dock.jsx"));
  ({ APPS } = await vite.ssrLoadModule("/src/core/constants/apps.jsx"));
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

async function render(element) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });

  await act(async () => {
    root.render(element);
  });

  return container;
}

async function settleReact() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

function previewWindowTree() {
  return React.createElement(
    WindowManagerProvider,
    null,
    React.createElement(OpenAppProbe),
    React.createElement(WindowList, { setWallpaper: () => {} }),
  );
}

// Regression: dynamic rendering must consume the payload attached to the current window.
test("dynamic render dispatch displays the current preview payload", async () => {
  const container = await render(previewWindowTree());
  const previewId = "preview:favorites/sunset.webp";
  const firstPhoto = {
    id: "favorites/sunset.webp",
    name: "sunset.webp",
    url: "/photos/sunset.webp",
  };
  const secondPhoto = {
    id: "favorites/sunset.webp",
    name: "edited-sunset.webp",
    url: "/photos/edited-sunset.webp",
  };

  await act(async () => {
    currentManager.openApp(previewId, "Preview", firstPhoto);
  });
  await settleReact();

  let image = container.querySelector(".photos-preview__image");
  assert.ok(image);
  assert.equal(image.getAttribute("src"), firstPhoto.url);
  assert.equal(image.getAttribute("alt"), firstPhoto.name);

  await act(async () => {
    currentManager.openApp(previewId, "Preview", secondPhoto);
  });
  await settleReact();

  image = container.querySelector(".photos-preview__image");
  assert.ok(image);
  assert.equal(image.getAttribute("src"), secondPhoto.url);
  assert.equal(image.getAttribute("alt"), secondPhoto.name);
  assert.equal(container.querySelectorAll(".photos-preview").length, 1);
});

test("dynamic render dispatch shows the local fallback without a payload", async () => {
  const container = await render(previewWindowTree());

  await act(async () => {
    currentManager.openApp("preview:favorites/missing.webp", "Preview");
  });
  await settleReact();

  assert.ok(container.querySelector(".photos-preview__fallback"));
  assert.equal(container.querySelector(".photos-preview__image"), null);
});

test("MenuBar exposes Preview instead of a dynamic preview ID", async () => {
  const previewId = "preview:favorites/sunset.webp";
  const container = await render(
    React.createElement(
      ThemeProvider,
      null,
      React.createElement(
        DisplaySettingsProvider,
        null,
        React.createElement(MenuBar, { activeApp: previewId }),
      ),
    ),
  );

  const appLabel = container.querySelectorAll(
    ".menuBar__left .menuBar__item",
  )[1];
  assert.equal(appLabel.textContent, "Preview");
  assert.equal(container.textContent.includes(previewId), false);
});

test("APPS and Dock do not register Preview as a launchable app", async () => {
  const container = await render(
    React.createElement(Dock, {
      onOpen: () => {},
      openApps: [],
      minimizedApps: new Set(),
      isLightTheme: false,
    }),
  );

  assert.equal(APPS.some((app) => app.id === "preview"), false);

  const dockLabels = [...container.querySelectorAll(".dock__item")].map(
    (item) => item.getAttribute("aria-label"),
  );
  assert.ok(
    dockLabels.every((label) => !(label ?? "").toLowerCase().includes("preview")),
  );
});
