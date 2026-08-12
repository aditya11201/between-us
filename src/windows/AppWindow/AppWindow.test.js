import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";
import { Window } from "happy-dom";

const projectRoot = new URL("../../../", import.meta.url).pathname;
const browserWindow = new Window({ url: "http://localhost/" });

Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
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
let AppWindow;
let mountedRoot;
let mountedContainer;

before(async () => {
  vite = await createServer({
    configFile: `${projectRoot}vite.config.js`,
    server: { hmr: false, middlewareMode: true, ws: false },
    appType: "custom",
  });

  ({ default: React } = await import("react"));
  ({ act } = React);
  ({ createRoot } = await import("react-dom/client"));
  ({ AppWindow } = await vite.ssrLoadModule("/src/windows/AppWindow/AppWindow.jsx"));
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

test.afterEach(async () => {
  if (mountedRoot) await act(async () => mountedRoot.unmount());
  mountedContainer?.remove();
  mountedRoot = null;
  mountedContainer = null;
});

test("applies an active window's updated geometry without another child render", async () => {
  let maximize;

  function Harness() {
    const [win, setWin] = React.useState({
      id: "safari",
      x: 120,
      y: 80,
      width: 780,
      height: 520,
      zIndex: 101,
    });
    const content = React.useMemo(() => React.createElement("div", null, "Safari"), []);
    const noop = React.useCallback(() => {}, []);

    maximize = () => setWin((current) => ({
      ...current,
      x: 0,
      y: 28,
      width: 1024,
      height: 660,
    }));

    return React.createElement(AppWindow, {
      win,
      isActive: true,
      onClose: noop,
      onMinimize: noop,
      onFocus: noop,
      children: content,
    });
  }

  mountedContainer = document.createElement("div");
  document.body.append(mountedContainer);
  mountedRoot = createRoot(mountedContainer);

  await act(async () => mountedRoot.render(React.createElement(Harness)));
  await act(async () => maximize());

  const appWindow = mountedContainer.querySelector(".app-window");
  assert.equal(appWindow.style.transform, "translate3d(0px, 28px, 0)");
  assert.equal(appWindow.style.width, "1024px");
  assert.equal(appWindow.style.height, "660px");
});

test("restores an active window after its geometry is maximized and restored externally", async () => {
  let setWindow;

  function Harness() {
    const [win, updateWindow] = React.useState({
      id: "safari",
      x: 120,
      y: 80,
      width: 780,
      height: 520,
      zIndex: 101,
    });
    const content = React.useMemo(() => React.createElement("div", null, "Safari"), []);
    const noop = React.useCallback(() => {}, []);

    setWindow = updateWindow;

    return React.createElement(AppWindow, {
      win,
      isActive: true,
      onClose: noop,
      onMinimize: noop,
      onFocus: noop,
      children: content,
    });
  }

  mountedContainer = document.createElement("div");
  document.body.append(mountedContainer);
  mountedRoot = createRoot(mountedContainer);

  await act(async () => mountedRoot.render(React.createElement(Harness)));
  await act(async () => setWindow((current) => ({
    ...current,
    x: 0,
    y: 28,
    width: 1024,
    height: 660,
  })));
  await act(async () => setWindow((current) => ({
    ...current,
    x: 120,
    y: 80,
    width: 780,
    height: 520,
  })));

  const appWindow = mountedContainer.querySelector(".app-window");
  assert.equal(appWindow.style.transform, "translate3d(120px, 80px, 0)");
  assert.equal(appWindow.style.width, "780px");
  assert.equal(appWindow.style.height, "520px");
});
