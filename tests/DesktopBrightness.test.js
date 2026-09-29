import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { compile } from "sass";
import { createServer } from "vite";
import { Window } from "happy-dom";

const projectRoot = new URL("../", import.meta.url).pathname;
const browserWindow = new Window({ url: "http://localhost/" });
const { document } = browserWindow;

Object.assign(globalThis, {
  window: browserWindow,
  document,
  HTMLElement: browserWindow.HTMLElement,
  Event: browserWindow.Event,
  MouseEvent: browserWindow.MouseEvent,
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
    await act(async () => {
      container.querySelector(`[data-set-brightness="${value}"]`).dispatchEvent(
        new browserWindow.MouseEvent("click", { bubbles: true })
      );
    });
    assert.equal(overlay.style.opacity, expectedOpacity);
  }

  await act(async () => root.unmount());
  container.remove();
});

test("keeps the overlay between the desktop system layers and out of pointer input", () => {
  const { css } = compile(`${projectRoot}src/styles/features/main.scss`);
  const overlayRule = css.match(/\.desktop__brightness-overlay\s*\{([^}]*)\}/)?.[1];

  assert.ok(overlayRule);
  assert.match(overlayRule, /position:\s*fixed/);
  assert.match(overlayRule, /inset:\s*0/);
  assert.match(overlayRule, /z-index:\s*9500/);
  assert.match(overlayRule, /background:\s*#000/);
  assert.match(overlayRule, /pointer-events:\s*none/);
  assert.match(overlayRule, /transition:\s*opacity\s+0\.08s\s+linear/);
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.desktop__brightness-overlay\s*\{[\s\S]*?transition:\s*none/
  );

  const zIndex = selector => Number(
    css.match(new RegExp(`${selector}[^}]*z-index:\\s*(\\d+)`))?.[1]
  );
  assert.deepEqual(
    [zIndex(".dock-container"), zIndex(".desktop__brightness-overlay"), zIndex(".menuBar"), zIndex(".cc-panel"), zIndex(".context-menu")],
    [9000, 9500, 9999, 10005, 100000]
  );
});
