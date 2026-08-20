import { after, afterEach, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { Window } from "happy-dom";
import {
  DEMO_MAIL_PASSWORD,
  getLockedMailState,
  isMailPasswordValid,
} from "./mailLock.js";

const projectRoot = new URL("../../../", import.meta.url).pathname;
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
let MailContent;
let WindowContext;
let WindowManagerProvider;
let useWindowManager;
const mountedRoots = [];

function queryByRole(container, role, { name } = {}) {
  return [...container.querySelectorAll("*")].find((element) => {
    const hasRole = element.getAttribute("role") === role
      || (role === "button" && element.tagName === "BUTTON");
    if (!hasRole) return false;
    if (name === undefined) return true;
    const accessibleName = element.getAttribute("aria-label") || element.textContent.trim();
    return typeof name === "function" ? name(accessibleName) : name instanceof RegExp
      ? name.test(accessibleName)
      : accessibleName === name;
  }) || null;
}

function getByRole(container, role, options) {
  const element = queryByRole(container, role, options);
  assert.ok(element, `Expected ${role} to be present`);
  return element;
}

function queryByText(container, text) {
  return [...container.querySelectorAll("*")].find((element) => element.textContent === text) || null;
}

function getByText(container, text) {
  const element = queryByText(container, text);
  assert.ok(element, `Expected text ${text} to be present`);
  return element;
}

function getByLabelText(container, text) {
  const label = [...container.querySelectorAll("label")]
    .find((element) => element.textContent.trim() === text);
  assert.ok(label, `Expected label ${text} to be present`);
  const input = container.querySelector(`#${label.htmlFor}`);
  assert.ok(input, `Expected control for ${text} to be present`);
  return input;
}

async function click(element) {
  await act(async () => {
    element.dispatchEvent(new browserWindow.MouseEvent("click", { bubbles: true }));
  });
}

async function fill(input, value) {
  const setInputValue = Object.getOwnPropertyDescriptor(
    browserWindow.HTMLInputElement.prototype,
    "value",
  ).set;
  await act(async () => {
    setInputValue.call(input, value);
    input.dispatchEvent(new browserWindow.Event("input", { bubbles: true }));
    input.dispatchEvent(new browserWindow.Event("change", { bubbles: true }));
  });
}

async function pressEscape() {
  await act(async () => {
    document.dispatchEvent(new browserWindow.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
}

async function renderMail({ onClose, onMinimize, active = false } = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const callbacks = { close: 0, minimize: 0 };
  let manager;
  function ManagerProbe() {
    manager = useWindowManager();
    return null;
  }
  const mount = { container, root, callbacks, getManager: () => manager };
  mountedRoots.push(mount);

  await act(async () => {
    root.render(
      React.createElement(
        WindowManagerProvider,
        null,
        React.createElement(ManagerProbe),
        React.createElement(
          WindowContext.Provider,
          { value: { onTitleMouseDown() {} } },
          React.createElement(MailContent, {
            onClose: () => {
              callbacks.close += 1;
              onClose?.();
            },
            onMinimize: () => {
              callbacks.minimize += 1;
              onMinimize?.();
            },
            onMaximize() {},
          }),
        ),
      ),
    );
  });

  if (active && manager) {
    await act(async () => {
      manager.openApp("mail");
    });
  }

  return mount;
}

async function unlockImportant(mount) {
  await click(getByRole(mount.container, "button", { name: /^Important/ }));
  await fill(getByLabelText(mount.container, "Mail password"), DEMO_MAIL_PASSWORD);
  await click(getByRole(mount.container, "button", { name: "Unlock Important" }));
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
  ({ MailContent } = await vite.ssrLoadModule("/src/features/mail/MailContent.jsx"));
  ({ WindowContext } = await vite.ssrLoadModule("/src/windows/index.js"));
  ({ WindowManagerProvider, useWindowManager } = await vite.ssrLoadModule("/src/core/providers/WindowManagerProvider.jsx"));
});

afterEach(async () => {
  for (const mount of mountedRoots.splice(0)) await unmount(mount);
  document.body.replaceChildren();
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

test("accepts only the exact demo Mail password", () => {
  assert.equal(isMailPasswordValid(DEMO_MAIL_PASSWORD), true);
  assert.equal(isMailPasswordValid("wrong-password"), false);
  assert.equal(isMailPasswordValid(` ${DEMO_MAIL_PASSWORD} `), false);
});

test("returns a clean locked Mail state", () => {
  assert.deepEqual(getLockedMailState(), {
    importantUnlocked: false,
    selectedId: null,
    draft: null,
    view: "message",
    query: "",
    unlockError: "",
  });
});

test("locked Important view hides protected content and exposes a labelled form", async () => {
  const mount = await renderMail();
  await click(getByRole(mount.container, "button", { name: /^Important/ }));

  assert.equal(getByRole(mount.container, "dialog").getAttribute("aria-modal"), "true");
  assert.equal(getByLabelText(mount.container, "Mail password").getAttribute("type"), "password");
  assert.equal(queryByText(mount.container, "There is one question I have been wanting to ask you."), null);
  assert.equal(queryByText(mount.container, "A moment i've long been waiting for"), null);
});

test("masks only the locked Important mailbox count", async () => {
  const mount = await renderMail();
  const getMailboxCountText = (label) => {
    const item = [...mount.container.querySelectorAll(".mail__nav-item")]
      .find((candidate) => candidate.querySelector(".mail__nav-label")?.textContent === label);
    return item?.querySelector(".mail__nav-count")?.textContent ?? null;
  };

  assert.equal(getMailboxCountText("Important"), null);
  assert.equal(getMailboxCountText("Inbox"), "5");
  assert.equal(getMailboxCountText("Flagged"), "1");

  await unlockImportant(mount);
  assert.equal(getMailboxCountText("Important"), "1");
});

test("cancelling the unlock dialog closes it and keeps the user outside Important", async () => {
  const mount = await renderMail();
  await click(getByRole(mount.container, "button", { name: /^Important/ }));
  assert.ok(queryByRole(mount.container, "dialog"));

  await click(getByRole(mount.container, "button", { name: "Cancel" }));
  assert.equal(queryByRole(mount.container, "dialog"), null);
  assert.equal(queryByText(mount.container, "There is one question I have been wanting to ask you."), null);
  assert.equal(queryByText(mount.container, "A moment i've long been waiting for"), null);
});

test("Escape key dismisses the unlock dialog in an unmaximized active Mail window", async () => {
  const mount = await renderMail({ active: true });
  await click(getByRole(mount.container, "button", { name: /^Important/ }));
  assert.ok(queryByRole(mount.container, "dialog"));

  await pressEscape();

  assert.equal(queryByRole(mount.container, "dialog"), null);
  assert.equal(queryByText(mount.container, "There is one question I have been wanting to ask you."), null);
  assert.equal(queryByText(mount.container, "A moment i've long been waiting for"), null);
});

test("Important is locked until the exact password is submitted", async () => {
  const mount = await renderMail();

  await click(getByRole(mount.container, "button", { name: /^Important/ }));
  assert.equal(getByRole(mount.container, "dialog").hidden, false);
  assert.equal(queryByText(mount.container, "A moment i've long been waiting for"), null);

  await fill(getByLabelText(mount.container, "Mail password"), "wrong-password");
  await click(getByRole(mount.container, "button", { name: "Unlock Important" }));
  assert.match(getByRole(mount.container, "alert").textContent, /incorrect password/i);
  assert.equal(queryByText(mount.container, "A moment i've long been waiting for"), null);

  await fill(getByLabelText(mount.container, "Mail password"), DEMO_MAIL_PASSWORD);
  await click(getByRole(mount.container, "button", { name: "Unlock Important" }));
  assert.equal(queryByRole(mount.container, "dialog"), null);
  assert.ok(getByText(mount.container, "A moment i've long been waiting for"));
});

test("leaving Important relocks it before it can be selected again", async () => {
  const mount = await renderMail();
  await unlockImportant(mount);

  await click(getByRole(mount.container, "button", { name: /^Inbox/ }));
  await click(getByRole(mount.container, "button", { name: /^Important/ }));

  assert.ok(queryByRole(mount.container, "dialog"));
  assert.equal(queryByText(mount.container, "A moment i've long been waiting for"), null);
});

test("explicit lock resets Important access and its selected message", async () => {
  const mount = await renderMail();
  await unlockImportant(mount);

  await click(getByRole(mount.container, "option", { name: /A moment i've long been waiting for/i }));
  await click(getByRole(mount.container, "button", { name: "Lock Important mailbox" }));

  assert.equal(queryByText(mount.container, "A moment i've long been waiting for"), null);
  await click(getByRole(mount.container, "button", { name: /^Important/ }));
  assert.ok(queryByRole(mount.container, "dialog"));
});

test("minimizing and closing Mail relock Important", async () => {
  const minimized = await renderMail();
  await unlockImportant(minimized);
  await click(getByRole(minimized.container, "button", { name: "Minimize Mail window" }));
  assert.equal(minimized.callbacks.minimize, 1);
  assert.equal(queryByText(minimized.container, "A moment i've long been waiting for"), null);
  await click(getByRole(minimized.container, "button", { name: /^Important/ }));
  assert.ok(queryByRole(minimized.container, "dialog"));

  const closed = await renderMail();
  await unlockImportant(closed);
  await click(getByRole(closed.container, "button", { name: "Close Mail window" }));
  assert.equal(closed.callbacks.close, 1);
  assert.equal(queryByText(closed.container, "A moment i've long been waiting for"), null);
  await click(getByRole(closed.container, "button", { name: /^Important/ }));
  assert.ok(queryByRole(closed.container, "dialog"));
});

test("minimizing Mail outside Important preserves the current message state", async () => {
  const mount = await renderMail();

  await fill(mount.container.querySelector('[name="search"]'), "lesson");
  await click(getByRole(mount.container, "option", { name: /Learning App: Continue your lesson today/i }));
  await click(getByRole(mount.container, "button", { name: "Compose new message" }));

  assert.equal(mount.container.querySelector(".mail__compose") !== null, true);
  assert.equal(mount.container.querySelector('[name="search"]').value, "lesson");

  await click(getByRole(mount.container, "button", { name: "Minimize Mail window" }));

  assert.equal(mount.callbacks.minimize, 1);
  assert.equal(mount.container.querySelector(".mail__compose") !== null, true);
  assert.equal(mount.container.querySelector('[name="search"]').value, "lesson");

  await click(getByRole(mount.container, "button", { name: "Discard" }));
  assert.ok(getByText(mount.container, "Continue your lesson today"));
});
