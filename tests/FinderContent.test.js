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
  Event: browserWindow.Event,
  MouseEvent: browserWindow.MouseEvent,
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  IS_REACT_ACT_ENVIRONMENT: true,
});

let vite;
let React;
let act;
let createRoot;
let FinderContent;
let WindowContext;
const mountedRoots = [];

before(async () => {
  vite = await createServer({
    configFile: `${projectRoot}vite.config.js`,
    server: { hmr: false, middlewareMode: true, ws: false },
    appType: "custom",
  });

  ({ default: React, act } = await import("react"));
  ({ createRoot } = await import("react-dom/client"));
  ({ default: FinderContent } = await vite.ssrLoadModule(
    "/src/features/finder/FinderContent.jsx",
  ));
  ({ WindowContext } = await vite.ssrLoadModule(
    "/src/windows/AppWindow/AppWindow.jsx",
  ));
});

afterEach(async () => {
  for (const { root, container } of mountedRoots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  document.body.replaceChildren();
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

async function renderFinder() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });

  await act(async () => {
    root.render(
      React.createElement(
        WindowContext.Provider,
        {
          value: {
            onClose() {},
            onMinimize() {},
            onZoom() {},
            onTitleMouseDown() {},
          },
        },
        React.createElement(FinderContent, {
          openApp() {},
          onClose() {},
          onMinimize() {},
          onMaximize() {},
        }),
      ),
    );
  });

  return container;
}

function findSidebarItem(container, name) {
  return [...container.querySelectorAll(".finder-sidebar-item")]
    .find((item) => item.textContent.trim() === name);
}

function findFile(container, name) {
  return [...container.querySelectorAll(".finder-list-item")]
    .find((item) => item.querySelector(".finder-list-text-name")?.textContent === name);
}

async function click(element) {
  await act(async () => {
    element.dispatchEvent(new browserWindow.MouseEvent("click", { bubbles: true }));
  });
}

async function doubleClick(element) {
  await act(async () => {
    element.dispatchEvent(new browserWindow.MouseEvent("dblclick", { bubbles: true }));
  });
}

function currentNames(container) {
  return [...container.querySelectorAll(".finder-list-text-name")]
    .map((item) => item.textContent);
}

test("opens the between-us folder from Desktop and Projects", async () => {
  const container = await renderFinder();

  await click(findSidebarItem(container, "Desktop"));
  await doubleClick(findFile(container, "between-us"));

  assert.equal(container.querySelector(".finder-toolbar-title").textContent, "between-us");
  assert.deepEqual(currentNames(container), ["src", "public", "package.json", "README.md"]);

  await click(findSidebarItem(container, "Desktop"));
  await doubleClick(findFile(container, "Projects"));
  await doubleClick(findFile(container, "between-us"));

  assert.equal(container.querySelector(".finder-toolbar-title").textContent, "between-us");
  assert.deepEqual(currentNames(container), ["src", "public", "package.json", "README.md"]);
});
