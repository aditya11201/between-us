import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";
import { setupHarness } from "./testUtils/harness.js";

const { browserWindow, document, projectRoot } = setupHarness();
const mediaQueries = [];
let viewport = { width: 375, height: 812 };
let vite;
let React;
let act;
let createRoot;
let useMobileCheck;
let container;
let root;

function matchesQuery(query) {
  const maxWidth = Number(query.match(/max-width:\s*(\d+)px/)?.[1]);
  const portrait = query.includes("orientation: portrait");
  return viewport.width <= maxWidth && (!portrait || viewport.height >= viewport.width);
}

browserWindow.matchMedia = (query) => {
  let previous = matchesQuery(query);
  const listeners = new Set();
  const mediaQuery = {
    get matches() {
      return matchesQuery(query);
    },
    addEventListener(type, listener) {
      if (type === "change") listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "change") listeners.delete(listener);
    },
    notify() {
      const next = this.matches;
      if (next === previous) return;
      previous = next;
      for (const listener of listeners) listener({ matches: next });
    },
  };
  mediaQueries.push(mediaQuery);
  return mediaQuery;
};

function OrientationProbe() {
  return React.createElement("output", null, String(useMobileCheck()));
}

async function setViewport(width, height) {
  await act(async () => {
    viewport = { width, height };
    for (const mediaQuery of mediaQueries) mediaQuery.notify();
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
  ({ useMobileCheck } = await vite.ssrLoadModule("/src/core/hooks/useMobileCheck.js"));
});

after(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  await vite?.close();
  browserWindow.close();
});

test("shows the warning only below 1024 px in portrait orientation", async () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => root.render(React.createElement(OrientationProbe)));
  assert.equal(container.textContent, "true");

  await setViewport(812, 375);
  assert.equal(container.textContent, "false");

  await setViewport(1024, 768);
  assert.equal(container.textContent, "false");

  await setViewport(1023, 1200);
  assert.equal(container.textContent, "true");
});
