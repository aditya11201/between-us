import test from "node:test";
import assert from "node:assert/strict";
import { LYRIC_FX_MAX_ITEMS, LYRIC_FX_TTL_MS, pickLyricSpot } from "./lyricFx.js";

test("exposes fx tuning constants", () => {
  assert.equal(LYRIC_FX_TTL_MS, 6000);
  assert.equal(LYRIC_FX_MAX_ITEMS, 4);
});

test("maps deterministic stubs to box corners", () => {
  assert.deepEqual(pickLyricSpot(() => 0), { x: 6, y: 10 });
  const far = pickLyricSpot(() => 0.999);
  assert.ok(far.x > 6 && far.x < 88);
  assert.ok(far.y > 10 && far.y < 78);
});

test("keeps random spots inside the box", () => {
  for (let i = 0; i < 50; i++) {
    const spot = pickLyricSpot();
    assert.ok(spot.x >= 6 && spot.x <= 88);
    assert.ok(spot.y >= 10 && spot.y <= 78);
  }
});
