import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "vite";
import { waitForPreviewState as waitForPreviewStateShared } from "./testUtils/waitForCondition.js";
import { setupHarness, unmountMount } from "./testUtils/harness.js";

const { browserWindow, document, projectRoot } = setupHarness();

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
    await unmountMount(act, { root, container });
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

function waitForPreviewState(container, predicate, description) {
  return waitForPreviewStateShared(act, container, predicate, description);
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
  await waitForPreviewState(
    container,
    (root) => root.querySelector(".photos-preview__image")?.getAttribute("src") === firstPhoto.url,
    "first preview image in WindowList",
  );

  let image = container.querySelector(".photos-preview__image");
  assert.ok(image);
  assert.equal(image.getAttribute("src"), firstPhoto.url);
  assert.equal(image.getAttribute("alt"), firstPhoto.name);

  await act(async () => {
    currentManager.openApp(previewId, "Preview", secondPhoto);
  });
  await waitForPreviewState(
    container,
    (root) => root.querySelector(".photos-preview__image")?.getAttribute("src") === secondPhoto.url,
    "updated preview image in WindowList",
  );

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
  await waitForPreviewState(
    container,
    (root) => root.querySelector('[role="status"]')?.textContent.includes("No photo is available to preview.") === true,
    "missing-payload preview fallback message",
  );

  const fallback = container.querySelector('[role="status"]');
  assert.ok(fallback);
  assert.match(fallback.textContent, /Preview unavailable/);
  assert.match(fallback.textContent, /No photo is available to preview\./);
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

  const activeAppLabel = container.querySelector(
    '[role="heading"][aria-label="Active application: Preview"]',
  );
  assert.ok(activeAppLabel);
  assert.equal(activeAppLabel.textContent, "Preview");
  assert.equal(container.textContent.includes(previewId), false);
});

