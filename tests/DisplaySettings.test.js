import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";
import { setupHarness, unmountMount } from "./testUtils/harness.js";
import { createDom } from "./testUtils/dom.js";

const { browserWindow, document, projectRoot } = setupHarness();

let vite;
let React;
let act;
let createRoot;
let DisplaySettingsProvider;
let ThemeProvider;
let MenuBar;
let DisplaysSettings;
let useDisplaySettings;
let dom;

function BrightnessProbe({ name }) {
  const { brightness, setBrightness } = useDisplaySettings();

  return React.createElement(
    "button",
    {
      "data-brightness-probe": name,
      "data-brightness-type": typeof brightness,
      onClick: () => setBrightness(42),
    },
    String(brightness)
  );
}

async function render(element) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
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

  ({
    DisplaySettingsProvider,
    ThemeProvider,
    useDisplaySettings,
  } = await vite.ssrLoadModule("/src/core/providers/index.js"));
  ({ MenuBar } = await vite.ssrLoadModule("/src/features/menubar/MenuBar.jsx"));
  ({ DisplaysSettings } = await vite.ssrLoadModule(
    "/src/features/settings/Settings_Components/panels/General/DisplaysSettings.jsx"
  ));
  dom = createDom(act, browserWindow, document);
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

test("Displays Settings stays synchronized with the shared numeric brightness", async () => {
  const { container, root } = await render(
    React.createElement(
      DisplaySettingsProvider,
      null,
      React.createElement(BrightnessProbe, { name: "displays" }),
      React.createElement(DisplaysSettings)
    )
  );

  const probe = container.querySelector('[data-brightness-probe="displays"]');
  const range = container.querySelector('input[type="range"]');
  assert.equal(range.getAttribute("aria-label"), "Display brightness");
  assert.equal(range.value, "75");
  assert.equal(probe.dataset.brightnessType, "number");

  await dom.click(probe);
  assert.equal(range.value, "42");

  await act(async () => {
    dom.setValue(range, "37");
  });
  assert.equal(probe.textContent, "37");
  assert.equal(probe.dataset.brightnessType, "number");

  await unmountMount(act, { root, container });
});

test("MenuBar reads and writes the shared brightness value", async () => {
  const { container, root } = await render(
    React.createElement(
      ThemeProvider,
      null,
      React.createElement(
        DisplaySettingsProvider,
        null,
        React.createElement(BrightnessProbe, { name: "menubar" }),
        React.createElement(MenuBar, { activeApp: "Finder" })
      )
    )
  );

  await dom.click(container.querySelector(".menuBar__controlCenterBtn"));

  const probe = container.querySelector('[data-brightness-probe="menubar"]');
  const slider = container.querySelector('[aria-label="Display brightness"]');
  assert.equal(slider.getAttribute("aria-valuenow"), "75");

  await dom.click(probe);
  assert.equal(slider.getAttribute("aria-valuenow"), "42");

  await act(async () => {
    dom.dispatch(slider, "keydown", { key: "ArrowDown" });
  });

  assert.equal(probe.textContent, "41");
  assert.equal(slider.getAttribute("aria-valuenow"), "41");

  await unmountMount(act, { root, container });
});
