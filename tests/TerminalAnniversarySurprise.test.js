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
let AnniversaryGiftCanvas;
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
  ({ AnniversaryGiftCanvas } = await vite.ssrLoadModule("/src/features/terminal/AnniversaryGiftCanvas.jsx"));
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

test("Terminal launches anniversary surprise on first mount under React.StrictMode", async () => {
  const clock = installClock(browserWindow);
  try {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push({ container, root });

    await act(async () => {
      root.render(
        React.createElement(
          React.StrictMode,
          null,
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
            React.createElement(TerminalContent, {
              payload: { action: "anniversary-gift", maximize: true, runId: 1 },
            }),
          ),
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

test("AnniversaryGiftCanvas draws the top-right timer without bottom-left status or wish caption overlays", async () => {
  const originalGetContext = browserWindow.HTMLCanvasElement.prototype.getContext;
  const originalPath2D = globalThis.Path2D;
  const mainFillTexts = [];

  class MockPath2D {
    moveTo() {}
    bezierCurveTo() {}
    closePath() {}
  }

  function makeMockContext(targetCanvas) {
    const isMainCanvas = targetCanvas.className === "terminal-ascii-canvas";
    const gradient = { addColorStop() {} };
    return {
      fillStyle: "",
      strokeStyle: "",
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetY: 0,
      lineWidth: 1,
      lineCap: "butt",
      font: "",
      textAlign: "left",
      textBaseline: "alphabetic",
      globalCompositeOperation: "source-over",
      globalAlpha: 1,
      filter: "none",
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      clip() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      bezierCurveTo() {},
      quadraticCurveTo() {},
      arc() {},
      ellipse() {},
      fill() {},
      stroke() {},
      fillRect() {},
      clearRect() {},
      drawImage() {},
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      measureText: (text) => ({ width: String(text).length * 8 }),
      getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      fillText(text, x, y) {
        if (isMainCanvas) {
          mainFillTexts.push({ text: String(text), x, y, textAlign: this.textAlign });
        }
      },
    };
  }

  globalThis.Path2D = MockPath2D;
  browserWindow.HTMLCanvasElement.prototype.getContext = function getContext() {
    return makeMockContext(this);
  };

  try {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push({ container, root });

    await act(async () => {
      root.render(React.createElement(AnniversaryGiftCanvas, { onExit() {} }));
    });

    assert.ok(mainFillTexts.length > 0);
    assert.ok(
      mainFillTexts.some(
        (call) => /t \d{2}\.\d{2}s$/.test(call.text) && call.x === 1080 - 64 && call.y === 31 && call.textAlign === "right",
      ),
      "expected top-right timer text on main canvas",
    );
    assert.equal(
      mainFillTexts.some((call) => /ASCII GIFT BOX|STARGAZER LILIES/.test(call.text)),
      false,
      "bottom-left status line should be removed",
    );
    assert.equal(
      mainFillTexts.some((call) => /✦|Semoga|May you always|Que siempre|Muga kowe|Mugia anjeun|Que tu sois|Che tu stia/.test(call.text)),
      false,
      "bottom-left wish caption should be removed",
    );
  } finally {
    browserWindow.HTMLCanvasElement.prototype.getContext = originalGetContext;
    if (originalPath2D === undefined) {
      delete globalThis.Path2D;
    } else {
      globalThis.Path2D = originalPath2D;
    }
  }
});
