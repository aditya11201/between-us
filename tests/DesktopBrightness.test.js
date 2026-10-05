import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "vite";
import { setupHarness, unmountMount } from "./testUtils/harness.js";
import { createDom } from "./testUtils/dom.js";

const { browserWindow, document, projectRoot } = setupHarness();

let vite;
let React;
let act;
let createRoot;
let Desktop;
let DisplaySettingsProvider;
let useDisplaySettings;

function BrightnessControls() {
  const { setBrightness } = useDisplaySettings();

  return React.createElement(
    "div",
    null,
    [0, 100].map(value => React.createElement(
      "button",
      {
        key: value,
        "data-set-brightness": value,
        onClick: () => setBrightness(value),
      },
      String(value)
    ))
  );
}

let dom;

async function renderDesktop() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(
        DisplaySettingsProvider,
        null,
        React.createElement(
          Desktop,
          { wallpaper: null },
          React.createElement("span", { "data-desktop-content": true }, "content")
        ),
        React.createElement(BrightnessControls)
      )
    );
  });

  return { container, root };
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
  ({ Desktop } = await vite.ssrLoadModule("/src/windows/Desktop.jsx"));
  ({ DisplaySettingsProvider, useDisplaySettings } = await vite.ssrLoadModule(
    "/src/core/providers/index.js"
  ));
  dom = createDom(act, browserWindow, document);
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

test("applies shared brightness to the non-interactive desktop overlay", async () => {
  const { container, root } = await renderDesktop();
  const desktop = container.querySelector(".desktop");
  const overlay = desktop.querySelector(".desktop__brightness-overlay");

  assert.ok(overlay);
  assert.equal(overlay.getAttribute("aria-hidden"), "true");
  assert.equal(overlay.style.opacity, "0.25");
  assert.equal(desktop.firstElementChild, overlay);

  for (const [value, expectedOpacity] of [[0, "1"], [100, "0"]]) {
    await dom.click(container.querySelector(`[data-set-brightness="${value}"]`));
    assert.equal(overlay.style.opacity, expectedOpacity);
  }

  await unmountMount(act, { root, container });
});

