import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";
import { Window } from "happy-dom";

const projectRoot = new URL("../", import.meta.url).pathname;
const window = new Window({ url: "http://localhost/" });
const { document } = window;

Object.assign(globalThis, {
  window,
  document,
  HTMLElement: window.HTMLElement,
  Event: window.Event,
  WheelEvent: window.WheelEvent,
  PointerEvent: window.PointerEvent,
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: window.navigator,
});

let vite;
let React;
let act;
let createRoot;
let VerticalSlider;
let animationFrames;
let nextAnimationFrameId;

function flushAnimationFrames() {
  const callbacks = [...animationFrames.values()];
  animationFrames.clear();
  callbacks.forEach(callback => callback(Date.now()));
}

async function renderSlider({ value = 75, label = "Display brightness", onChange } = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(VerticalSlider, {
        value,
        label,
        onChange,
      })
    );
  });

  return {
    bar: container.querySelector(".cc-slider-bar"),
    container,
    root,
  };
}

function wheelEvent({ deltaY = 10, ctrlKey = false } = {}) {
  const event = new window.WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    deltaY,
  });
  Object.defineProperty(event, "ctrlKey", { value: ctrlKey });
  return event;
}

before(async () => {
  vite = await createServer({
    configFile: `${projectRoot}vite.config.js`,
    server: { hmr: false, middlewareMode: true },
    appType: "custom",
  });

  ({ default: React } = await import("react"));
  ({ act } = React);
  ({ createRoot } = await import("react-dom/client"));
  ({ VerticalSlider } = await vite.ssrLoadModule(
    "/src/features/menubar/MenuBar/VerticalSlider.jsx"
  ));
});

beforeEach(() => {
  animationFrames = new Map();
  nextAnimationFrameId = 1;
  globalThis.requestAnimationFrame = callback => {
    const id = nextAnimationFrameId++;
    animationFrames.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = id => animationFrames.delete(id);
});

after(async () => {
  await vite.close();
  window.close();
});

test("registers a non-passive native wheel listener and removes it on unmount", async () => {
  const additions = [];
  const removals = [];
  const originalAddEventListener = window.Element.prototype.addEventListener;
  const originalRemoveEventListener = window.Element.prototype.removeEventListener;

  window.Element.prototype.addEventListener = function (type, listener, options) {
    if (type === "wheel") additions.push({ listener, options, target: this });
    return originalAddEventListener.call(this, type, listener, options);
  };
  window.Element.prototype.removeEventListener = function (type, listener, options) {
    if (type === "wheel") removals.push({ listener, options, target: this });
    return originalRemoveEventListener.call(this, type, listener, options);
  };

  try {
    const { bar, container, root } = await renderSlider();
    const nativeAdd = additions.find(addition => addition.target === bar);

    assert.ok(nativeAdd);
    assert.equal(nativeAdd.options.passive, false);

    await act(async () => root.unmount());

    const nativeRemove = removals.find(removal => removal.target === bar);
    assert.ok(nativeRemove);
    assert.equal(nativeRemove.listener, nativeAdd.listener);
    assert.equal(nativeRemove.options, nativeAdd.options);
    container.remove();
  } finally {
    window.Element.prototype.addEventListener = originalAddEventListener;
    window.Element.prototype.removeEventListener = originalRemoveEventListener;
  }
});

test("cancels ordinary wheel input but leaves Ctrl+wheel available", async () => {
  const changes = [];
  const { bar, container, root } = await renderSlider({ onChange: value => changes.push(value) });

  await act(async () => {
    const event = wheelEvent();
    bar.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.deepEqual(changes, []);
    flushAnimationFrames();
  });
  assert.deepEqual(changes, [74]);

  await act(async () => {
    const event = wheelEvent({ ctrlKey: true });
    bar.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
    flushAnimationFrames();
  });
  assert.deepEqual(changes, [74]);

  await act(async () => root.unmount());
  container.remove();
});

test("commits the latest wheel value on the queued animation frame", async () => {
  const changes = [];
  const { bar, container, root } = await renderSlider({ onChange: value => changes.push(value) });

  await act(async () => {
    bar.dispatchEvent(wheelEvent({ deltaY: 10 }));
    bar.dispatchEvent(wheelEvent({ deltaY: 10 }));
  });
  assert.deepEqual(changes, []);

  await act(async () => flushAnimationFrames());
  assert.deepEqual(changes, [73]);

  await act(async () => root.unmount());
  container.remove();
});

test("keyboard, Home, and End input supersede a queued wheel commit", async () => {
  for (const [key, expected] of [["ArrowUp", 75], ["Home", 0], ["End", 100]]) {
    const changes = [];
    const { bar, container, root } = await renderSlider({ onChange: value => changes.push(value) });

    await act(async () => {
      bar.dispatchEvent(wheelEvent({ deltaY: 10 }));
      bar.dispatchEvent(new window.KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key,
      }));
    });
    assert.deepEqual(changes, [expected]);

    await act(async () => flushAnimationFrames());
    assert.deepEqual(changes, [expected]);

    await act(async () => root.unmount());
    container.remove();
  }
});

test("exposes the slider label and value metadata", async () => {
  const { bar, container, root } = await renderSlider({ label: "Sound volume" });

  assert.equal(bar.getAttribute("role"), "slider");
  assert.equal(bar.getAttribute("aria-label"), "Sound volume");
  assert.equal(bar.getAttribute("aria-orientation"), "horizontal");
  assert.equal(bar.getAttribute("aria-valuemin"), "0");
  assert.equal(bar.getAttribute("aria-valuemax"), "100");
  assert.equal(bar.getAttribute("aria-valuenow"), "75");

  await act(async () => root.unmount());
  container.remove();
});
