import test from "node:test";
import assert from "node:assert/strict";
import {
  GALLERY_AMBIENT,
  ambientState,
  clampVolume,
  computeFadeVolume,
  decideAmbientAction,
  isGalleryVisible,
  setAmbientState,
  shouldRecoverAudio,
} from "./galleryAmbientMusic.js";

test("isGalleryVisible counts an open photos window", () => {
  assert.equal(isGalleryVisible([{ id: "photos" }], new Set()), true);
});

test("isGalleryVisible treats minimized photos as closed", () => {
  assert.equal(isGalleryVisible([{ id: "photos" }], new Set(["photos"])), false);
});

test("isGalleryVisible ignores preview windows", () => {
  assert.equal(isGalleryVisible([{ id: "preview:xyz" }], new Set()), false);
});

test("isGalleryVisible is false for empty windows", () => {
  assert.equal(isGalleryVisible([], new Set()), false);
});

test("peak volume is 40%", () => {
  assert.equal(GALLERY_AMBIENT.TARGET_VOLUME, 0.4);
});

test("computeFadeVolume eases gently at both ends toward target", () => {
  assert.equal(computeFadeVolume(0, 12000, 0.4), 0);
  assert.equal(computeFadeVolume(12000, 12000, 0.4), 0.4);
  assert.equal(computeFadeVolume(13000, 12000, 0.4), 0.4);
  const quarter = computeFadeVolume(3000, 12000, 0.4);
  const half = computeFadeVolume(6000, 12000, 0.4);
  // cosine ease-in-out: quarter point below linear, half at midpoint, smooth slope
  assert.ok(quarter < 0.4 * 0.25);
  assert.ok(Math.abs(half - 0.2) < 1e-9);
  assert.ok(computeFadeVolume(100, 12000, 0.4) < computeFadeVolume(200, 12000, 0.4));
  assert.equal(computeFadeVolume(NaN, 12000, 0.4), 0);
  assert.equal(computeFadeVolume(-5, 12000, 0.4), 0);
});

test("decideAmbientAction starts after 30 s visible", () => {
  const { TRIGGER_MS } = GALLERY_AMBIENT;
  const now = 1_000_000;
  assert.equal(
    decideAmbientAction({ visible: true, playing: false, visibleSince: now - TRIGGER_MS + 1000, now }),
    null,
  );
  assert.equal(
    decideAmbientAction({ visible: true, playing: false, visibleSince: now - TRIGGER_MS, now }),
    "start",
  );
});

test("decideAmbientAction never stops by itself (close fades out immediately)", () => {
  const now = 2_000_000;
  assert.equal(
    decideAmbientAction({ visible: false, playing: true, visibleSince: null, hiddenSince: now - 400_000, now }),
    null,
  );
  assert.equal(
    decideAmbientAction({ visible: true, playing: true, visibleSince: now, hiddenSince: null, now }),
    null,
  );
  assert.equal(
    decideAmbientAction({ visible: false, playing: false, visibleSince: null, hiddenSince: now, now }),
    null,
  );
  assert.equal(
    decideAmbientAction({ visible: true, playing: false, visibleSince: null, hiddenSince: null, now }),
    null,
  );
});

test("clampVolume bounds Music-slider input", () => {
  assert.equal(clampVolume(0.5), 0.5);
  assert.equal(clampVolume(2), 1);
  assert.equal(clampVolume(-1), 0);
  assert.equal(clampVolume("bad"), GALLERY_AMBIENT.TARGET_VOLUME);
});

test("ambientState bridge carries the session snapshot", () => {
  setAmbientState({ playing: true, songId: "fourtwnty-mangu-orchestral-cover", volume: 0.4, currentTime: 12 });
  assert.equal(ambientState.playing, true);
  assert.equal(ambientState.songId, "fourtwnty-mangu-orchestral-cover");
  assert.equal(ambientState.volume, 0.4);
  setAmbientState({ playing: false });
  assert.equal(ambientState.playing, false);
  assert.equal(ambientState.songId, "fourtwnty-mangu-orchestral-cover");
});

test("shouldRecoverAudio fires only on unexpected stall mid-session", () => {
  assert.equal(shouldRecoverAudio({ playing: true, visible: true, paused: true, ended: false, error: 0 }), true);
  assert.equal(shouldRecoverAudio({ playing: true, visible: true, paused: false, ended: true, error: 0 }), true);
  assert.equal(shouldRecoverAudio({ playing: true, visible: true, paused: false, ended: false, error: 4 }), true);
  assert.equal(shouldRecoverAudio({ playing: true, visible: true, paused: false, ended: false, error: 0 }), false);
  assert.equal(shouldRecoverAudio({ playing: false, visible: true, paused: true, ended: false, error: 0 }), false);
  assert.equal(shouldRecoverAudio({ playing: true, visible: false, paused: true, ended: false, error: 0 }), false);
});
