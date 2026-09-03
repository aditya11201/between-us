import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "vite";
import { Window } from "happy-dom";
import { DEMO_MAIL_PASSWORD } from "../src/features/mail/mailLock.js";

const projectRoot = new URL("../", import.meta.url).pathname;
const browserWindow = new Window({ url: "http://localhost/" });
const { document } = browserWindow;

Object.assign(globalThis, {
  window: browserWindow,
  document,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  Event: browserWindow.Event,
  KeyboardEvent: browserWindow.KeyboardEvent,
  MouseEvent: browserWindow.MouseEvent,
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  IS_REACT_ACT_ENVIRONMENT: true,
});

let vite;
let React;
let act;
let createRoot;
let LockScreen;
let NamedLockScreen;
let activeClock;
const mountedRoots = [];

function installClock() {
  const originals = {
    globalSetTimeout: globalThis.setTimeout,
    globalClearTimeout: globalThis.clearTimeout,
    globalSetInterval: globalThis.setInterval,
    globalClearInterval: globalThis.clearInterval,
    windowSetTimeout: browserWindow.setTimeout,
    windowClearTimeout: browserWindow.clearTimeout,
    windowSetInterval: browserWindow.setInterval,
    windowClearInterval: browserWindow.clearInterval,
  };
  const timeouts = new Map();
  const intervals = new Map();
  let now = 0;
  let nextId = 1;

  function schedule(store, callback, delay, args) {
    const duration = Math.max(1, Number(delay) || 0);
    const id = nextId++;
    store.set(id, { callback, args, duration, due: now + duration });
    return id;
  }

  function setTimeoutMock(callback, delay, ...args) {
    return schedule(timeouts, callback, delay, args);
  }

  function setIntervalMock(callback, delay, ...args) {
    return schedule(intervals, callback, delay, args);
  }

  function clearTimeoutMock(id) {
    timeouts.delete(id);
  }

  function clearIntervalMock(id) {
    intervals.delete(id);
  }

  function nextTask(target) {
    return [
      ...[...timeouts].map(([id, task]) => ({ id, store: timeouts, task })),
      ...[...intervals].map(([id, task]) => ({ id, store: intervals, task })),
    ]
      .filter(({ task }) => task.due <= target)
      .sort((left, right) => left.task.due - right.task.due)[0];
  }

  function advance(milliseconds) {
    const target = now + milliseconds;
    let task;

    while ((task = nextTask(target))) {
      now = task.task.due;
      if (task.store === intervals) {
        task.task.due += task.task.duration;
      } else {
        task.store.delete(task.id);
      }
      task.task.callback(...task.task.args);
    }

    now = target;
  }

  Object.assign(globalThis, {
    setTimeout: setTimeoutMock,
    clearTimeout: clearTimeoutMock,
    setInterval: setIntervalMock,
    clearInterval: clearIntervalMock,
  });
  Object.assign(browserWindow, {
    setTimeout: setTimeoutMock,
    clearTimeout: clearTimeoutMock,
    setInterval: setIntervalMock,
    clearInterval: clearIntervalMock,
  });

  const clock = {
    advance,
    activeTimerCount: () => timeouts.size + intervals.size,
    activeTimers: () => [
      ...[...timeouts].map(([id, task]) => ({ id, type: "timeout", ...task })),
      ...[...intervals].map(([id, task]) => ({ id, type: "interval", ...task })),
    ],
    restore() {
      Object.assign(globalThis, {
        setTimeout: originals.globalSetTimeout,
        clearTimeout: originals.globalClearTimeout,
        setInterval: originals.globalSetInterval,
        clearInterval: originals.globalClearInterval,
      });
      Object.assign(browserWindow, {
        setTimeout: originals.windowSetTimeout,
        clearTimeout: originals.windowClearTimeout,
        setInterval: originals.windowSetInterval,
        clearInterval: originals.windowClearInterval,
      });
      timeouts.clear();
      intervals.clear();
    },
  };

  activeClock = clock;
  return clock;
}

function timersAddedSince(clock, baseline, predicate) {
  const baselineIds = new Set(baseline.map(({ id }) => id));
  return new Set(
    clock
      .activeTimers()
      .filter((timer) => !baselineIds.has(timer.id) && predicate(timer))
      .map(({ id }) => id),
  );
}

function assertTimersCleared(clock, timerIds) {
  const activeIds = new Set(clock.activeTimers().map(({ id }) => id));
  for (const timerId of timerIds) assert.equal(activeIds.has(timerId), false);
}

function dispatch(element, type, init = {}) {
  const EventConstructor = type === "keydown"
    ? browserWindow.KeyboardEvent
    : browserWindow.MouseEvent;
  const event = new EventConstructor(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  element.dispatchEvent(event);
  return event;
}

async function renderLock({ isLocked = true, onUnlock = () => {}, strict = false } = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const mount = { container, root };
  mountedRoots.push(mount);

  const lock = React.createElement(LockScreen, { isLocked, onUnlock });
  await act(async () => {
    root.render(strict ? React.createElement(React.StrictMode, null, lock) : lock);
  });

  return mount;
}

async function updateLock(mount, props) {
  await act(async () => {
    mount.root.render(React.createElement(LockScreen, props));
  });
}

async function revealWithPointer(mount) {
  await act(async () => {
    dispatch(mount.container.querySelector(".lock-screen"), "pointerdown");
  });
}

async function advanceTimers(milliseconds) {
  await act(async () => {
    activeClock.advance(milliseconds);
    await Promise.resolve();
  });
}

function getInput(container) {
  const input = container.querySelector("#password");
  assert.ok(input, "Expected the password input");
  return input;
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

async function fill(input, value) {
  await act(async () => setInputValue(input, value));
}

async function submit(container) {
  await act(async () => {
    container.querySelector("form").dispatchEvent(
      new browserWindow.Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}

async function unmount(mount) {
  await act(async () => mount.root.unmount());
  mount.container.remove();
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
  ({ default: LockScreen, LockScreen: NamedLockScreen } = await vite.ssrLoadModule(
    "/src/ui/LockScreen/LockScreen.jsx",
  ));
});

afterEach(async () => {
  for (const mount of mountedRoots.splice(0)) await unmount(mount);
  document.body.replaceChildren();
  activeClock?.restore();
  activeClock = null;
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

test("exports the lock screen both ways and renders the locked reference copy", async () => {
  installClock();
  const mount = await renderLock();
  const root = mount.container.firstElementChild;

  assert.equal(NamedLockScreen, LockScreen);
  assert.equal(root.tagName, "DIV");
  assert.equal(root.classList.contains("lock-screen"), true);
  assert.equal(mount.container.querySelector("main"), null);
  assert.equal(getInput(mount.container).disabled, true);
  assert.equal(mount.container.querySelector(".user-name").textContent, "My Pretty Princess S");
  assert.equal(
    mount.container.querySelector(".hint").textContent,
    "Click or press any key to log in",
  );
  assert.ok(mount.container.querySelector(".time-ghost"));
  assert.ok(mount.container.querySelector(".time-glass"));
});

test("keeps the persistent overlay inert and controls disabled when unlocked", async () => {
  installClock();
  const mount = await renderLock();
  await revealWithPointer(mount);
  await fill(getInput(mount.container), "draft-password");
  await updateLock(mount, { isLocked: false, onUnlock: () => {} });

  const root = mount.container.querySelector(".lock-screen");
  assert.equal(root.classList.contains("lock-screen--unlocked"), true);
  assert.equal(root.getAttribute("aria-hidden"), "true");
  assert.equal(root.hasAttribute("inert"), true);
  assert.equal(getInput(mount.container).disabled, true);
  assert.equal(mount.container.querySelector("button[type=submit]").disabled, true);
});

test("reveals from an outside pointer-down and focuses after exactly 260ms", async () => {
  const clock = installClock();
  const mount = await renderLock();
  const root = mount.container.querySelector(".lock-screen");
  const input = getInput(mount.container);

  await revealWithPointer(mount);
  assert.equal(root.classList.contains("lock-screen--revealed"), true);
  assert.equal(input.disabled, false);
  assert.notEqual(document.activeElement, input);

  await advanceTimers(259);
  assert.notEqual(document.activeElement, input);
  await advanceTimers(1);
  assert.equal(document.activeElement, input);
  assert.equal(clock.activeTimerCount() > 0, true);
});

test("intercepts locked keydowns without preventing default or reaching hidden app handlers", async () => {
  installClock();
  const mount = await renderLock();
  const root = mount.container.querySelector(".lock-screen");
  let propagated = 0;
  const onKeydown = () => { propagated += 1; };
  browserWindow.addEventListener("keydown", onKeydown);

  try {
    const tab = new browserWindow.KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      root.dispatchEvent(tab);
      await Promise.resolve();
    });
    assert.equal(root.classList.contains("lock-screen--revealed"), false);
    assert.equal(tab.defaultPrevented, false);
    assert.equal(propagated, 0);

    const enter = new browserWindow.KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      root.dispatchEvent(enter);
      await Promise.resolve();
    });
    assert.equal(root.classList.contains("lock-screen--revealed"), true);
    assert.equal(enter.defaultPrevented, false);
    assert.equal(propagated, 0);
  } finally {
    browserWindow.removeEventListener("keydown", onKeydown);
  }
});

test("keeps locked pointer, mouse, and click events from reaching the document", async () => {
  installClock();
  const mount = await renderLock();
  const root = mount.container.querySelector(".lock-screen");
  let propagated = 0;
  const onPointerDown = () => { propagated += 1; };
  const onMouseDown = () => { propagated += 1; };
  const onClick = () => { propagated += 1; };
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("click", onClick);

  try {
    await act(async () => {
      dispatch(root, "pointerdown");
      dispatch(root, "mousedown");
      dispatch(root, "click");
    });

    assert.equal(propagated, 0);
  } finally {
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("click", onClick);
  }
});

test("isolates locked move and release events after relock without blocking form submission", async () => {
  installClock();
  let unlocks = 0;
  const mount = await renderLock({ onUnlock: () => { unlocks += 1; } });
  await revealWithPointer(mount);
  await fill(getInput(mount.container), DEMO_MAIL_PASSWORD);

  const submitButton = getInput(mount.container).form.querySelector("button[type=submit]");
  const click = new browserWindow.MouseEvent("click", {
    bubbles: true,
    cancelable: true,
  });
  await act(async () => submitButton.dispatchEvent(click));
  assert.equal(click.defaultPrevented, false);
  await submit(mount.container);
  assert.equal(mount.container.querySelector(".go").classList.contains("busy"), true);

  await updateLock(mount, { isLocked: false, onUnlock: () => { unlocks += 1; } });
  await updateLock(mount, { isLocked: true, onUnlock: () => { unlocks += 1; } });

  const propagated = [];
  const onHiddenEvent = (event) => propagated.push(event.type);
  const eventTypes = [
    "pointermove",
    "pointerup",
    "pointercancel",
    "mousemove",
    "mouseup",
    "mouseleave",
  ];
  const dispatched = [];
  for (const type of eventTypes) {
    document.addEventListener(type, onHiddenEvent);
    browserWindow.addEventListener(type, onHiddenEvent);
  }

  try {
    await act(async () => {
      for (const type of eventTypes) {
        dispatched.push(dispatch(mount.container.querySelector(".lock-screen"), type));
      }
    });
    assert.deepEqual(propagated, []);
    assert.equal(dispatched.every((event) => !event.defaultPrevented), true);
    await advanceTimers(750);
    assert.equal(unlocks, 0);
  } finally {
    for (const type of eventTypes) {
      document.removeEventListener(type, onHiddenEvent);
      browserWindow.removeEventListener(type, onHiddenEvent);
    }
  }
});

test("shakes empty input without an error and reports incorrect passwords", async () => {
  installClock();
  const mount = await renderLock();
  await revealWithPointer(mount);
  await submit(mount.container);

  assert.equal(mount.container.querySelector('[role="alert"]'), null);
  assert.match(mount.container.querySelector(".pass-pill").className, /shake/);

  await submit(mount.container);
  assert.match(mount.container.querySelector(".pass-pill").className, /shake/);

  await fill(getInput(mount.container), "wrong-password");
  await submit(mount.container);
  assert.equal(
    mount.container.querySelector('[role="alert"]').textContent,
    "Incorrect password",
  );
  assert.equal(
    mount.container.querySelector(".lock-screen").classList.contains("lock-screen--unlocked"),
    false,
  );
});

test("uses a 750ms busy delay, clears the password, and unlocks once", async () => {
  installClock();
  let unlocks = 0;
  let locked = true;
  const mount = await renderLock({
    onUnlock: () => { unlocks += 1; },
  });
  await revealWithPointer(mount);
  await fill(getInput(mount.container), DEMO_MAIL_PASSWORD);
  await submit(mount.container);
  assert.equal(mount.container.querySelector(".go").classList.contains("busy"), true);

  await advanceTimers(749);
  assert.equal(unlocks, 0);
  await advanceTimers(1);
  assert.equal(unlocks, 1);
  assert.equal(getInput(mount.container).value, "");

  // The callback is intentionally independent from the assertion above; the
  // parent owns the public locked state.
  locked = false;
  await updateLock(mount, { isLocked: locked, onUnlock: () => { unlocks += 1; } });
  assert.equal(mount.container.querySelector(".lock-screen").classList.contains("lock-screen--unlocked"), true);
  const unlockCount = unlocks;
  await advanceTimers(750);
  assert.equal(unlocks, unlockCount);
});

test("keeps a submit click functional while isolating its locked bubbling", async () => {
  installClock();
  let unlocks = 0;
  let locked = true;
  const onUnlock = () => {
    unlocks += 1;
    locked = false;
  };
  const mount = await renderLock({ isLocked: locked, onUnlock });
  await revealWithPointer(mount);
  await fill(getInput(mount.container), DEMO_MAIL_PASSWORD);
  const submitButton = getInput(mount.container).form.querySelector("button[type=submit]");
  const click = new browserWindow.MouseEvent("click", {
    bubbles: true,
    cancelable: true,
  });

  await act(async () => {
    submitButton.dispatchEvent(click);
    await Promise.resolve();
  });

  assert.equal(click.defaultPrevented, false);
  await submit(mount.container);
  assert.equal(mount.container.querySelector(".go").classList.contains("busy"), true);
  await advanceTimers(750);
  assert.equal(unlocks, 1);
  await updateLock(mount, { isLocked: locked, onUnlock });
  assert.equal(mount.container.querySelector(".lock-screen").classList.contains("lock-screen--unlocked"), true);
});

test("ignores duplicate submissions while the unlock delay is busy", async () => {
  const clock = installClock();
  let unlocks = 0;
  const mount = await renderLock({ onUnlock: () => { unlocks += 1; } });
  await revealWithPointer(mount);
  await fill(getInput(mount.container), DEMO_MAIL_PASSWORD);
  await submit(mount.container);
  await submit(mount.container);
  await advanceTimers(750);

  assert.equal(unlocks, 1);
});

test("resets transient state and cancels timers when relocked", async () => {
  const clock = installClock();
  let unlocks = 0;
  const onUnlock = () => { unlocks += 1; };
  const mount = await renderLock({ onUnlock });
  await revealWithPointer(mount);
  await fill(getInput(mount.container), "stale-password");
  await submit(mount.container);
  assert.ok(mount.container.querySelector('[role="alert"]'));

  await fill(getInput(mount.container), DEMO_MAIL_PASSWORD);
  const beforeUnlockSubmit = clock.activeTimers();
  await submit(mount.container);
  assert.equal(mount.container.querySelector(".go").classList.contains("busy"), true);
  const pendingUnlockTimers = timersAddedSince(
    clock,
    beforeUnlockSubmit,
    (timer) => timer.type === "timeout" && timer.duration === 750,
  );
  assert.equal(pendingUnlockTimers.size, 1);

  await updateLock(mount, { isLocked: false, onUnlock });
  const unlockedTimerBaseline = clock.activeTimers();
  assertTimersCleared(clock, pendingUnlockTimers);
  await updateLock(mount, { isLocked: true, onUnlock });
  const relockedClockTimers = timersAddedSince(
    clock,
    unlockedTimerBaseline,
    (timer) => timer.type === "interval" && timer.duration === 1000,
  );

  const root = mount.container.querySelector(".lock-screen");
  assert.equal(root.classList.contains("lock-screen--revealed"), false);
  assert.equal(root.classList.contains("lock-screen--unlocked"), false);
  assert.equal(getInput(mount.container).value, "");
  assert.equal(getInput(mount.container).disabled, true);
  assert.equal(mount.container.querySelector('[role="alert"]'), null);
  assert.equal(relockedClockTimers.size, 1);
  await advanceTimers(750);
  assert.equal(unlocks, 0);
});

test("cleans delayed focus and unlock work on unmount", async () => {
  const clock = installClock();
  let unlocks = 0;
  const firstBaseline = clock.activeTimers();
  const mount = await renderLock({ onUnlock: () => { unlocks += 1; } });
  const firstClockTimers = timersAddedSince(
    clock,
    firstBaseline,
    (timer) => timer.type === "interval" && timer.duration === 1000,
  );
  const beforeReveal = clock.activeTimers();
  await revealWithPointer(mount);
  const firstFocusTimers = timersAddedSince(
    clock,
    beforeReveal,
    (timer) => timer.type === "timeout" && timer.duration === 260,
  );
  await unmount(mount);
  assertTimersCleared(clock, new Set([...firstClockTimers, ...firstFocusTimers]));
  await advanceTimers(260);
  assert.equal(unlocks, 0);

  const busyBaseline = clock.activeTimers();
  const busyMount = await renderLock({ onUnlock: () => { unlocks += 1; } });
  const busyClockTimers = timersAddedSince(
    clock,
    busyBaseline,
    (timer) => timer.type === "interval" && timer.duration === 1000,
  );
  const beforeBusyReveal = clock.activeTimers();
  await revealWithPointer(busyMount);
  const busyFocusTimers = timersAddedSince(
    clock,
    beforeBusyReveal,
    (timer) => timer.type === "timeout" && timer.duration === 260,
  );
  await fill(getInput(busyMount.container), DEMO_MAIL_PASSWORD);
  const beforeBusySubmit = clock.activeTimers();
  await submit(busyMount.container);
  const busyUnlockTimers = timersAddedSince(
    clock,
    beforeBusySubmit,
    (timer) => timer.type === "timeout" && timer.duration === 750,
  );
  await unmount(busyMount);
  assertTimersCleared(
    clock,
    new Set([...busyClockTimers, ...busyFocusTimers, ...busyUnlockTimers]),
  );
  await advanceTimers(750);
  assert.equal(unlocks, 0);
});

test("unlocks once under StrictMode", async () => {
  const clock = installClock();
  let unlocks = 0;
  const mount = await renderLock({
    strict: true,
    onUnlock: () => { unlocks += 1; },
  });
  await revealWithPointer(mount);
  await fill(getInput(mount.container), DEMO_MAIL_PASSWORD);
  await submit(mount.container);
  await submit(mount.container);
  await advanceTimers(749);
  assert.equal(unlocks, 0);
  await advanceTimers(1);
  assert.equal(unlocks, 1);
  assert.equal(clock.activeTimerCount(), 1);
});

test("removes locked keydown interception and timers under StrictMode unmount", async () => {
  const clock = installClock();
  const mount = await renderLock({ strict: true });
  assert.equal(clock.activeTimerCount(), 1);
  await unmount(mount);

  let propagated = 0;
  const onKeydown = () => { propagated += 1; };
  document.addEventListener("keydown", onKeydown);
  document.body.dispatchEvent(new browserWindow.KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
  }));
  await advanceTimers(1000);
  assert.equal(propagated, 1);
  assert.equal(clock.activeTimerCount(), 0);
  document.removeEventListener("keydown", onKeydown);
});
