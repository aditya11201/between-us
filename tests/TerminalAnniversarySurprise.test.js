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

  assert.match(terminalCss, /\.terminal-ascii-slot/);
  assert.match(terminalCss, /\.terminal-ascii-scene/);
  assert.match(terminalCss, /aspect-ratio:\s*1080\s*\/\s*960/);
  assert.match(mailCss, /\.mail__surprise-card/);
});

async function withMockCanvas(run) {
  const originalGetContext = browserWindow.HTMLCanvasElement.prototype.getContext;
  const originalPath2D = globalThis.Path2D;
  const mainFillTexts = [];
  const trailClearRects = [];
  let offscreen1080Count = 0;

  class MockPath2D {
    moveTo() {}
    bezierCurveTo() {}
    closePath() {}
  }

  function makeMockContext(targetCanvas) {
    const isMainCanvas = targetCanvas.className === "terminal-ascii-canvas";
    let isTrailCanvas = false;
    if (!isMainCanvas && targetCanvas.width === 1080 && targetCanvas.height === 960) {
      offscreen1080Count += 1;
      isTrailCanvas = offscreen1080Count === 2;
    }
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
      fillRect(x, y, w, h) {
        if (isTrailCanvas && this.fillStyle === "#030204") {
          trailClearRects.push({ x, y, w, h });
        }
      },
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
    await run({ mainFillTexts, trailClearRects });
  } finally {
    browserWindow.HTMLCanvasElement.prototype.getContext = originalGetContext;
    if (originalPath2D === undefined) {
      delete globalThis.Path2D;
    } else {
      globalThis.Path2D = originalPath2D;
    }
  }
}

test("AnniversaryGiftCanvas draws the top-right timer without bottom-left status or wish caption overlays", async () => {
  await withMockCanvas(async ({ mainFillTexts }) => {
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
  });
});

test("AnniversaryGiftCanvas continues advancing past 29.00s without looping or freezing, keeps pause enabled, and restarts on REPLAY", async () => {
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancelRaf = globalThis.cancelAnimationFrame;
  let nextRafId = 1;
  const rafQueue = new Map();

  globalThis.requestAnimationFrame = (cb) => {
    const id = nextRafId++;
    rafQueue.set(id, cb);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    rafQueue.delete(id);
  };

  try {
    await withMockCanvas(async ({ mainFillTexts, trailClearRects }) => {
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      mountedRoots.push({ container, root });

      await act(async () => {
        root.render(React.createElement(AnniversaryGiftCanvas, { onExit() {} }));
      });

      const timerCalls = () => mainFillTexts.filter((call) => /t \d{2,}\.\d{2}s$/.test(call.text));
      const parseTimerSeconds = (text) => {
        const match = /t (\d+\.\d{2})s$/.exec(text || "");
        return match ? Number(match[1]) : NaN;
      };

      assert.equal(timerCalls().at(-1)?.text, "● t 00.00s");
      assert.equal(rafQueue.size, 1);

      let ms = 100;
      const stepTicks = async (count) => {
        await act(async () => {
          for (let i = 0; i < count; i += 1) {
            const entries = [...rafQueue.entries()];
            rafQueue.clear();
            for (const [, cb] of entries) {
              cb(ms);
            }
            ms += 100;
          }
        });
      };

      // Advance past 29s (dt is capped at 1/15s per tick, so 500 ticks reaches ~33.27s).
      await stepTicks(500);

      assert.equal(rafQueue.size, 1, "requestAnimationFrame loop should keep running past 29s");
      assert.equal(trailClearRects.length, 0, "trail canvas must not be cleared when passing 29s");

      const timePast29 = parseTimerSeconds(timerCalls().at(-1)?.text);
      assert.ok(timePast29 > 29, `expected time to advance past 29.00s, got ${timePast29}`);

      // Advancing further keeps increasing t instead of freezing or wrapping.
      await stepTicks(30);
      const timeFurther = parseTimerSeconds(timerCalls().at(-1)?.text);
      assert.ok(timeFurther > timePast29, `expected time to keep advancing (${timeFurther} > ${timePast29})`);

      const pauseButton = [...container.querySelectorAll("button")].find(
        (btn) => btn.textContent.trim() === "II PAUSE",
      );
      const replayButton = [...container.querySelectorAll("button")].find(
        (btn) => btn.textContent.trim() === "↻ REPLAY",
      );
      assert.ok(pauseButton);
      assert.ok(replayButton);
      assert.equal(pauseButton.disabled, false);
      assert.equal(replayButton.disabled, false);

      // II PAUSE remains interactive past 29s and freezes t while paused.
      await act(async () => {
        pauseButton.dispatchEvent(new browserWindow.MouseEvent("click", { bubbles: true }));
      });
      assert.equal(pauseButton.textContent.trim(), "▶ PLAY");
      const pausedText = timerCalls().at(-1)?.text;
      await stepTicks(5);
      assert.equal(parseTimerSeconds(timerCalls().at(-1)?.text), parseTimerSeconds(pausedText));

      // Space toggles back to II PAUSE.
      await act(async () => {
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent("keydown", { key: " ", bubbles: true }));
      });
      assert.equal(pauseButton.textContent.trim(), "II PAUSE");

      // Clicking REPLAY resets to 00.00s, clears trail canvas once, and keeps rAF loop running.
      await act(async () => {
        replayButton.dispatchEvent(new browserWindow.MouseEvent("click", { bubbles: true }));
      });

      assert.equal(timerCalls().at(-1)?.text, "● t 00.00s");
      assert.equal(trailClearRects.length, 1, "REPLAY should clear the trail canvas once");
      assert.equal(pauseButton.disabled, false);
      assert.equal(pauseButton.textContent.trim(), "II PAUSE");
      assert.equal(rafQueue.size, 1, "REPLAY should keep the requestAnimationFrame loop running");

      // Advancing two ticks after REPLAY progresses time forward from 00.00s.
      await stepTicks(2);

      assert.match(timerCalls().at(-1)?.text, /t 00\.0[1-9]s$/);
      assert.equal(rafQueue.size, 1);
    });
    } finally {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancelRaf;
  }
});

test("AnniversaryGiftCanvas pauses rAF and ignores shortcuts when active=false and resumes from preserved t without jumping", async () => {
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancelRaf = globalThis.cancelAnimationFrame;
  let nextRafId = 1;
  const rafQueue = new Map();

  globalThis.requestAnimationFrame = (cb) => {
    const id = nextRafId++;
    rafQueue.set(id, cb);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    rafQueue.delete(id);
  };

  try {
    await withMockCanvas(async ({ mainFillTexts, trailClearRects }) => {
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      mountedRoots.push({ container, root });

      let exitCount = 0;
      const renderCanvas = async (active) => {
        await act(async () => {
          root.render(
            React.createElement(AnniversaryGiftCanvas, {
              onExit: () => { exitCount += 1; },
              active,
            }),
          );
        });
      };

      await renderCanvas(true);

      const timerCalls = () => mainFillTexts.filter((call) => /t \d{2,}\.\d{2}s$/.test(call.text));
      const parseTimerSeconds = (text) => {
        const match = /t (\d+\.\d{2})s$/.exec(text || "");
        return match ? Number(match[1]) : NaN;
      };

      let ms = 100;
      const stepTicks = async (count, stepMs = 100) => {
        await act(async () => {
          for (let i = 0; i < count; i += 1) {
            const entries = [...rafQueue.entries()];
            rafQueue.clear();
            for (const [, cb] of entries) {
              cb(ms);
            }
            ms += stepMs;
          }
        });
      };

      // Advance several seconds so the gift box is actively animating.
      await stepTicks(45);
      const tBeforePause = parseTimerSeconds(timerCalls().at(-1)?.text);
      assert.ok(tBeforePause >= 2.5);

      // Deactivate (e.g. while Cat Story is playing).
      await renderCanvas(false);
      assert.equal(rafQueue.size, 0, "rAF loop should stop while active=false");

      const pauseButton = [...container.querySelectorAll("button")].find(
        (btn) => btn.textContent.trim() === "II PAUSE",
      );
      assert.ok(pauseButton);

      // Shortcuts Space, R, Escape must be ignored while inactive.
      await act(async () => {
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent("keydown", { key: " ", bubbles: true }));
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent("keydown", { key: "r", bubbles: true }));
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
      assert.equal(pauseButton.textContent.trim(), "II PAUSE");
      assert.equal(exitCount, 0);
      assert.equal(trailClearRects.length, 0);

      // Simulate 12 seconds passing while Cat Story plays, then re-activate.
      ms += 12000;
      await renderCanvas(true);
      assert.equal(rafQueue.size, 1, "rAF loop should resume when active=true");
      assert.equal(trailClearRects.length, 0, "trail canvas must not clear on resume");

      const tAtResume = parseTimerSeconds(timerCalls().at(-1)?.text);
      assert.equal(tAtResume, tBeforePause, "t must stay preserved on resume");

      // First tick after resume should have dt=0 (last was reset), second tick advances by ~0.05s.
      await stepTicks(2, 50);
      const tAfterResume = parseTimerSeconds(timerCalls().at(-1)?.text);
      assert.ok(tAfterResume >= tBeforePause && tAfterResume <= tBeforePause + 0.1,
        `expected smooth resume without dt jump: before=${tBeforePause}, after=${tAfterResume}`);
    });
  } finally {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancelRaf;
  }
});
