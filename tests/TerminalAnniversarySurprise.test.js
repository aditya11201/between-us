import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import * as sass from "sass";
import { createServer } from "vite";
import { advanceTimers, installClock } from "./testUtils/clock.js";
import { setupHarness, unmountMount } from "./testUtils/harness.js";

const { browserWindow, document, projectRoot } = setupHarness();

let vite;
let React;
let act;
let createRoot;
let TerminalContent;
let WindowContext;
let renderAppContent;
let originalFetch;
const mountedRoots = [];

before(async () => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => [] });

  vite = await createServer({
    configFile: `${projectRoot}vite.config.js`,
    server: { hmr: false, middlewareMode: true, ws: false },
    appType: "custom",
  });

  ({ default: React } = await import("react"));
  ({ act } = React);
  ({ createRoot } = await import("react-dom/client"));
  ({ TerminalContent } = await vite.ssrLoadModule("/src/features/terminal/Terminal.jsx"));
  ({ WindowContext } = await vite.ssrLoadModule("/src/windows/index.js"));
  ({ renderAppContent } = await vite.ssrLoadModule("/src/utils/renderAppContent.jsx"));
});

after(async () => {
  globalThis.fetch = originalFetch;
  await vite.close();
  browserWindow.close();
});

afterEach(async () => {
  for (const mount of mountedRoots.splice(0)) {
    await unmountMount(act, mount);
  }
  document.body.replaceChildren();
});

async function renderTerminal(props = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const mount = { container, root };
  mountedRoots.push(mount);

  const renderWithProps = async (nextProps) => {
    await act(async () => {
      root.render(
        React.createElement(
          WindowContext.Provider,
          {
            value: {
              onClose() {},
              onMinimize() {},
              onZoom() {},
              onTitlePointerDown() {},
            },
          },
          React.createElement(TerminalContent, nextProps),
        ),
      );
    });
  };

  await renderWithProps(props);
  return { ...mount, rerender: renderWithProps };
}

test("Terminal help does not expose any manual anniversary surprise command", async () => {
  const { container } = await renderTerminal();
  const input = container.querySelector(".terminal-interactive-input");
  assert.ok(input);

  const setInputValue = Object.getOwnPropertyDescriptor(
    browserWindow.HTMLInputElement.prototype,
    "value",
  ).set;

  await act(async () => {
    setInputValue.call(input, "help");
    input.dispatchEvent(new browserWindow.Event("input", { bubbles: true }));
    input.dispatchEvent(new browserWindow.Event("change", { bubbles: true }));
  });
  await act(async () => {
    input.dispatchEvent(new browserWindow.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });

  const text = container.textContent;
  assert.match(text, /Available commands:/);
  assert.doesNotMatch(text, /anniversary/i);
  assert.doesNotMatch(text, /gift/i);

  await act(async () => {
    setInputValue.call(input, "anniversary-gift");
    input.dispatchEvent(new browserWindow.Event("input", { bubbles: true }));
    input.dispatchEvent(new browserWindow.Event("change", { bubbles: true }));
  });
  await act(async () => {
    input.dispatchEvent(new browserWindow.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });

  assert.match(container.textContent, /anniversary-gift: command not found/);
});

test("Terminal enters launch sequence, transitions to ASCII gift stage, toggles controls, and exits cleanly", async () => {
  const clock = installClock(browserWindow);
  try {
    const { container, rerender } = await renderTerminal({
      payload: { action: "anniversary-gift", maximize: true, runId: 1001 },
    });

    const input = container.querySelector(".terminal-interactive-input");
    assert.ok(input);
    assert.equal(input.readOnly, true);

    // Mid-typing simulated command
    await advanceTimers(act, clock, 350);
    assert.ok(container.querySelector(".terminal-interactive-input").value.length > 0);

    // Finish launch sequence and enter ASCII stage
    await advanceTimers(act, clock, 600);

    assert.ok(container.querySelector(".terminal-ascii-stage"));
    assert.ok(container.querySelector(".terminal-window-header"));
    assert.ok(container.querySelector("canvas.terminal-ascii-canvas"));
    assert.equal(container.querySelector(".terminal-ascii-btn")?.textContent.trim(), "II PAUSE");
    assert.match(container.textContent, /↻ REPLAY/);
    assert.match(container.textContent, /↓ PNG/);
    assert.match(container.textContent, /Back to Terminal/);

    const pauseButton = [...container.querySelectorAll("button")].find(
      (btn) => btn.textContent.trim() === "II PAUSE",
    );
    assert.ok(pauseButton);
    await act(async () => {
      pauseButton.dispatchEvent(new browserWindow.MouseEvent("click", { bubbles: true }));
    });
    assert.equal(pauseButton.textContent.trim(), "▶ PLAY");

    await act(async () => {
      browserWindow.dispatchEvent(new browserWindow.KeyboardEvent("keydown", { key: " ", bubbles: true }));
    });
    assert.equal(pauseButton.textContent.trim(), "II PAUSE");

    // Re-triggering with a new runId returns through the launch sequence into the stage again.
    await rerender({
      payload: { action: "anniversary-gift", maximize: true, runId: 1002 },
    });
    assert.ok(container.querySelector(".terminal-interactive-input"));
    await advanceTimers(act, clock, 950);
    assert.ok(container.querySelector(".terminal-ascii-stage"));

    // Escape returns to the normal Terminal prompt with command log intact.
    await act(async () => {
      browserWindow.dispatchEvent(new browserWindow.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    assert.equal(container.querySelector(".terminal-ascii-stage"), null);
    assert.ok(container.querySelector(".terminal-interactive-input"));
    assert.match(container.textContent, /\.\/anniversary-gift\.sh/);
    assert.match(container.textContent, /Launching 1st Anniversary ASCII Gift Box/);
  } finally {
    clock.restore();
  }
});

test("renderAppContent forwards terminal payload to TerminalContent", async () => {
  const clock = installClock(browserWindow);
  try {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push({ container, root });

    await act(async () => {
      root.render(
        React.createElement(
          WindowContext.Provider,
          {
            value: {
              onClose() {},
              onMinimize() {},
              onZoom() {},
              onTitlePointerDown() {},
            },
          },
          renderAppContent("terminal", {
            closeWindow() {},
            minimizeWindow() {},
            maximizeWindow() {},
            openApp() {},
            payload: { action: "anniversary-gift", maximize: true, runId: 2001 },
          }),
        ),
      );
    });

    await advanceTimers(act, clock, 950);
    assert.ok(container.querySelector(".terminal-ascii-stage"));
    assert.ok(container.querySelector("canvas.terminal-ascii-canvas"));
  } finally {
    clock.restore();
  }
});

test("Terminal and Mail SCSS compile cleanly with anniversary surprise styles", () => {
  const terminalCss = sass.compile(`${projectRoot}src/styles/components/Terminal/Terminal.scss`).css;
  const mailCss = sass.compile(`${projectRoot}src/styles/components/Mail/Mail.scss`).css;

  assert.match(terminalCss, /\.terminal-ascii-scene/);
  assert.match(terminalCss, /aspect-ratio:\s*1080\s*\/\s*960/);
  assert.match(mailCss, /\.mail__surprise-card/);
});
