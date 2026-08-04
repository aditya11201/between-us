import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

const projectRoot = new URL("../", import.meta.url).pathname;
let vite;
let getNextWindowZIndexState;
let APP_WINDOW_Z_INDEX_MAX;

before(async () => {
  vite = await createServer({
    configFile: `${projectRoot}vite.config.js`,
    server: { hmr: false, middlewareMode: true, ws: false },
    appType: "custom",
  });

  ({ getNextWindowZIndexState, APP_WINDOW_Z_INDEX_MAX } = await vite.ssrLoadModule(
    "/src/core/providers/WindowManagerProvider.jsx"
  ));
});

after(async () => {
  await vite.close();
});

test("normalizes app window layers below the brightness overlay at the reservation boundary", () => {
  assert.equal(typeof getNextWindowZIndexState, "function");
  assert.ok(APP_WINDOW_Z_INDEX_MAX < 9500);

  const windows = [
    { id: "front", zIndex: APP_WINDOW_Z_INDEX_MAX },
    { id: "back", zIndex: APP_WINDOW_Z_INDEX_MAX - 20 },
    { id: "middle", zIndex: APP_WINDOW_Z_INDEX_MAX - 10 },
  ];
  const next = getNextWindowZIndexState(windows, APP_WINDOW_Z_INDEX_MAX);

  assert.equal(next.zIndex, 103);
  assert.equal(next.windows.find(window => window.id === "back").zIndex, 100);
  assert.equal(next.windows.find(window => window.id === "middle").zIndex, 101);
  assert.equal(next.windows.find(window => window.id === "front").zIndex, 102);
  assert.ok(next.windows.every(window => window.zIndex <= APP_WINDOW_Z_INDEX_MAX));
  assert.ok(next.zIndex <= APP_WINDOW_Z_INDEX_MAX);

  const ordinary = [{ id: "window", zIndex: 101 }];
  const ordinaryNext = getNextWindowZIndexState(ordinary, 101);
  assert.equal(ordinaryNext.zIndex, 102);
  assert.strictEqual(ordinaryNext.windows, ordinary);
});
