import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "vite";
import { Window } from "happy-dom";
import { DEMO_MAIL_PASSWORD } from "../src/features/mail/mailLock.js";
import { waitForCondition } from "./testUtils/waitForCondition.js";

const projectRoot = new URL("../", import.meta.url).pathname;
const browserWindow = new Window({ url: "http://localhost/" });
const { document } = browserWindow;

Object.assign(globalThis, {
  window: browserWindow,
  document,
  localStorage: browserWindow.localStorage,
  Image: browserWindow.Image,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  Event: browserWindow.Event,
  KeyboardEvent: browserWindow.KeyboardEvent,
  MouseEvent: browserWindow.MouseEvent,
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  IS_REACT_ACT_ENVIRONMENT: true,
});

Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: browserWindow.navigator,
});

if (!browserWindow.matchMedia) {
  browserWindow.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
}

let vite;
let React;
let act;
let createRoot;
let AppContent;
let ThemeProvider;
let DisplaySettingsProvider;
let WindowManagerProvider;
let AppWindow;
let WindowContext;
let ExternalSiteFrame;
const mountedRoots = [];

before(async () => {
  vite = await createServer({
    configFile: `${projectRoot}vite.config.js`,
    server: { hmr: false, middlewareMode: true, ws: false },
    appType: "custom",
  });

  ({ default: React, act } = await import("react"));
  ({ createRoot } = await import("react-dom/client"));
  ({ AppContent } = await vite.ssrLoadModule("/src/App.jsx"));
  ({
    ThemeProvider,
    DisplaySettingsProvider,
    WindowManagerProvider,
  } = await vite.ssrLoadModule("/src/core/providers/index.js"));
  ({ AppWindow, WindowContext } = await vite.ssrLoadModule(
    "/src/windows/AppWindow/AppWindow.jsx",
  ));
  ({ ExternalSiteFrame } = await vite.ssrLoadModule(
    "/src/features/safari/ExternalSiteFrame.jsx",
  ));
});

afterEach(async () => {
  for (const { root, container } of mountedRoots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  document.body.replaceChildren();
  browserWindow.localStorage.clear();
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

async function renderApp({ beforeMount, extra = null } = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });
  beforeMount?.();

  await act(async () => {
    root.render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(
          DisplaySettingsProvider,
          null,
          React.createElement(
            WindowManagerProvider,
            null,
            React.createElement(
              React.Fragment,
              null,
              React.createElement(AppContent),
              extra,
            ),
          ),
        ),
      ),
    );
  });

  return { container, root };
}

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(
    browserWindow.HTMLInputElement.prototype,
    "value",
  ).set;
  setter.call(input, value);
  input.dispatchEvent(new browserWindow.Event("input", { bubbles: true }));
  input.dispatchEvent(new browserWindow.Event("change", { bubbles: true }));
}

async function unlockApp(container) {
  const lock = container.querySelector(".lock-screen");
  await act(async () => {
    lock.dispatchEvent(new browserWindow.Event("pointerdown", { bubbles: true }));
  });

  const input = container.querySelector("#password");
  await act(async () => setInputValue(input, DEMO_MAIL_PASSWORD));
  await act(async () => {
    container.querySelector(".login").dispatchEvent(
      new browserWindow.Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
  });
}

function click(element) {
  return act(async () => {
    element.dispatchEvent(new browserWindow.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    }));
  });
}

function appleOverlay(container) {
  return container.querySelector(".menuBar__item-click-overlay");
}

function GestureHandle() {
  const { onTitleMouseDown } = React.useContext(WindowContext);
  return React.createElement("div", { "data-gesture-handle": true, onMouseDown: onTitleMouseDown });
}

async function renderAppWindow() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });

  await act(async () => {
    root.render(
      React.createElement(AppWindow, {
        win: { id: "finder", x: 100, y: 100, width: 500, height: 300, zIndex: 1 },
        onClose: () => {},
        onMinimize: () => {},
        onFocus: () => {},
        isActive: true,
      }, React.createElement(GestureHandle)),
    );
  });

  return { container, root };
}

test("starts locked with an inert desktop and a persistent overlay", async () => {
  const { container } = await renderApp();

  assert.equal(container.querySelector(".desktop").hasAttribute("inert"), true);
  assert.equal(container.querySelector(".lock-screen").getAttribute("aria-hidden"), "false");
  assert.equal(container.querySelector(".desktop").nextElementSibling.className, "lock-screen");
});

test("uses the Mail password to unlock without replacing Desktop", async () => {
  const { container } = await renderApp();
  const desktop = container.querySelector(".desktop");

  await unlockApp(container);

  assert.equal(container.querySelector(".desktop"), desktop);
  assert.equal(desktop.hasAttribute("inert"), false);
  assert.equal(container.querySelector(".lock-screen").getAttribute("aria-hidden"), "true");

  await click(container.querySelector('[aria-label="Launch Mail app"]'));
  await waitForCondition(
    () => Boolean(container.querySelector(".mail")),
    { description: "Mail window after unlocking the desktop" },
  );
  assert.equal(container.querySelector(".desktop"), desktop);
});

test("Apple Lock Screen relocks and clears menu, Control Center, and About UI", async () => {
  const { container } = await renderApp();
  await unlockApp(container);

  await click(appleOverlay(container));
  const about = [...container.querySelectorAll(".apple-menu .menuBar__dropdownItem")]
    .find((item) => item.textContent.includes("About This Mac"));
  await click(about);
  await click(container.querySelector(".menuBar__controlCenterBtn"));
  assert.ok(container.querySelector(".about-mac-backdrop"));
  assert.ok(container.querySelector(".cc-panel"));

  await click(appleOverlay(container));
  const lock = [...container.querySelectorAll(".apple-menu .menuBar__dropdownItem")]
    .find((item) => item.textContent.includes("Lock Screen"));
  await click(lock);

  assert.equal(container.querySelector(".lock-screen").getAttribute("aria-hidden"), "false");
  assert.equal(container.querySelector(".apple-menu"), null);
  assert.equal(container.querySelector(".cc-panel"), null);
  assert.equal(container.querySelector(".about-mac-backdrop"), null);
});

test("Ctrl+Command+Q prevents the default, relocks, and closes the context menu", async () => {
  const { container } = await renderApp();
  await unlockApp(container);

  const desktop = container.querySelector(".desktop");
  await act(async () => {
    desktop.dispatchEvent(new browserWindow.MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100,
    }));
  });
  assert.ok(container.querySelector(".context-menu"));

  const shortcut = new browserWindow.KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
    metaKey: true,
    key: "q",
  });
  await act(async () => {
    browserWindow.dispatchEvent(shortcut);
    await Promise.resolve();
  });

  assert.equal(shortcut.defaultPrevented, true);
  assert.equal(desktop.hasAttribute("inert"), true);
  assert.equal(container.querySelector(".lock-screen").getAttribute("aria-hidden"), "false");
  assert.equal(container.querySelector(".context-menu"), null);
});

test("Ctrl+Command+Q wins over a Safari-like bubbling key handler", async () => {
  const safariLikeHandler = (event) => {
    if (event.ctrlKey && event.metaKey && event.key.toLowerCase() === "q") {
      event.stopImmediatePropagation();
    }
  };
  const { container } = await renderApp({
    beforeMount: () => browserWindow.addEventListener("keydown", safariLikeHandler),
  });

  try {
    await unlockApp(container);
    const shortcut = new browserWindow.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      metaKey: true,
      key: "q",
    });
    await act(async () => {
      browserWindow.dispatchEvent(shortcut);
      await Promise.resolve();
    });

    assert.equal(shortcut.defaultPrevented, true);
    assert.equal(container.querySelector(".lock-screen").getAttribute("aria-hidden"), "false");
  } finally {
    browserWindow.removeEventListener("keydown", safariLikeHandler);
  }
});

test("lock signal cancels active AppWindow drag and resize gestures", async () => {
  const { container } = await renderAppWindow();
  const appWindow = container.querySelector(".app-window");
  const initialTransform = appWindow.style.transform;

  await act(async () => {
    container.querySelector("[data-gesture-handle]").dispatchEvent(
      new browserWindow.MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: 120,
        clientY: 140,
      }),
    );
    browserWindow.document.dispatchEvent(new browserWindow.MouseEvent("mousemove", {
      bubbles: true,
      clientX: 300,
      clientY: 320,
    }));
  });
  assert.equal(appWindow.classList.contains("app-window--dragging"), true);
  assert.notEqual(appWindow.style.transform, initialTransform);

  await act(async () => browserWindow.dispatchEvent(new browserWindow.Event("between-us:lock")));
  assert.equal(appWindow.classList.contains("app-window--dragging"), false);
  assert.equal(appWindow.style.transform, initialTransform);

  await act(async () => {
    browserWindow.document.dispatchEvent(new browserWindow.MouseEvent("mousemove", {
      bubbles: true,
      clientX: 500,
      clientY: 520,
    }));
    browserWindow.document.dispatchEvent(new browserWindow.MouseEvent("mouseup", {
      bubbles: true,
      clientX: 500,
      clientY: 520,
    }));
  });
  assert.equal(appWindow.style.transform, initialTransform);

  const resizeHandle = container.querySelector(".resize-handle");
  await act(async () => {
    resizeHandle.dispatchEvent(new browserWindow.MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: 500,
      clientY: 300,
    }));
    browserWindow.document.dispatchEvent(new browserWindow.MouseEvent("mousemove", {
      bubbles: true,
      clientX: 700,
      clientY: 500,
    }));
  });
  assert.equal(appWindow.classList.contains("app-window--resizing"), true);
  assert.equal(appWindow.style.width, "700px");
  assert.equal(appWindow.style.height, "500px");

  await act(async () => browserWindow.dispatchEvent(new browserWindow.Event("between-us:lock")));
  assert.equal(appWindow.classList.contains("app-window--resizing"), false);
  assert.equal(appWindow.style.width, "500px");
  assert.equal(appWindow.style.height, "300px");

  await act(async () => {
    browserWindow.document.dispatchEvent(new browserWindow.MouseEvent("mousemove", {
      bubbles: true,
      clientX: 900,
      clientY: 800,
    }));
    browserWindow.document.dispatchEvent(new browserWindow.MouseEvent("mouseup", {
      bubbles: true,
      clientX: 900,
      clientY: 800,
    }));
  });
  assert.equal(appWindow.style.width, "500px");
  assert.equal(appWindow.style.height, "300px");
});

test("same-origin Safari iframe Ctrl+Command+Q bridges to the parent lock handler", async () => {
  const { container } = await renderApp({
    extra: React.createElement(ExternalSiteFrame, {
      tabId: "tab-1",
      url: "about:blank",
      isActive: true,
      reloadToken: 0,
      onReady: () => {},
      onNavigate: () => {},
      onUnsupported: () => {},
    }),
  });
  await unlockApp(container);

  const iframe = container.querySelector("iframe");
  assert.ok(iframe?.contentWindow);
  await act(async () => iframe.dispatchEvent(new browserWindow.Event("load")));

  const shortcut = new iframe.contentWindow.KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
    metaKey: true,
    key: "q",
  });
  await act(async () => {
    iframe.contentDocument.dispatchEvent(shortcut);
    await Promise.resolve();
  });

  assert.equal(shortcut.defaultPrevented, true);
  assert.equal(container.querySelector(".lock-screen").getAttribute("aria-hidden"), "false");
});
