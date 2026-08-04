import assert from "node:assert/strict";
import { after, before, test } from "node:test";
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
let DisplaySettingsProvider;
let ThemeProvider;
let MenuBar;
let DisplaysSettings;
let useDisplaySettings;

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
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

test("shares the default brightness and updates all provider consumers", async () => {
  const { container, root } = await render(
    React.createElement(
      DisplaySettingsProvider,
      null,
      React.createElement(BrightnessProbe, { name: "first" }),
      React.createElement(BrightnessProbe, { name: "second" })
    )
  );

  const probes = container.querySelectorAll("[data-brightness-probe]");
  assert.deepEqual([...probes].map(probe => probe.textContent), ["75", "75"]);

  await act(async () => {
    probes[0].dispatchEvent(new browserWindow.MouseEvent("click", { bubbles: true }));
  });

  assert.deepEqual([...probes].map(probe => probe.textContent), ["42", "42"]);

  await act(async () => root.unmount());
  container.remove();
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

  await act(async () => {
    probe.dispatchEvent(new browserWindow.MouseEvent("click", { bubbles: true }));
  });
  assert.equal(range.value, "42");

  await act(async () => {
    Object.getOwnPropertyDescriptor(browserWindow.HTMLInputElement.prototype, "value").set.call(
      range,
      "37"
    );
    range.dispatchEvent(new browserWindow.Event("input", { bubbles: true }));
  });
  assert.equal(probe.textContent, "37");
  assert.equal(probe.dataset.brightnessType, "number");

  await act(async () => root.unmount());
  container.remove();
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

  await act(async () => {
    container.querySelector(".menuBar__controlCenterBtn").dispatchEvent(
      new browserWindow.MouseEvent("click", { bubbles: true })
    );
  });

  const probe = container.querySelector('[data-brightness-probe="menubar"]');
  const slider = container.querySelector('[aria-label="Display brightness"]');
  assert.equal(slider.getAttribute("aria-valuenow"), "75");

  await act(async () => {
    probe.dispatchEvent(new browserWindow.MouseEvent("click", { bubbles: true }));
  });
  assert.equal(slider.getAttribute("aria-valuenow"), "42");

  await act(async () => {
    slider.dispatchEvent(
      new browserWindow.KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "ArrowDown",
      })
    );
  });

  assert.equal(probe.textContent, "41");
  assert.equal(slider.getAttribute("aria-valuenow"), "41");

  await act(async () => root.unmount());
  container.remove();
});
