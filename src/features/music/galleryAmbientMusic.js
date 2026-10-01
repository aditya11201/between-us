export const GALLERY_AMBIENT = Object.freeze({
  TRIGGER_MS: 60_000,
  FADE_IN_MS: 12_000,
  FADE_OUT_MS: 30_000,
  RESUME_FADE_MS: 3_000,
  TARGET_VOLUME: 0.3,
  TICK_MS: 50,
});

export const GALLERY_AMBIENT_EVENT = "between-us:gallery-ambient";
export const GALLERY_AMBIENT_COMMAND = "between-us:gallery-ambient-command";
export const MUSIC_LOCAL_EVENT = "between-us:music-local-playing";
// ponytail: stable id, no import (GalleryAmbientAudio re-exports it).
export const GALLERY_AMBIENT_SONG_ID = "fourtwnty-mangu-orchestral-cover";

// Bridge snapshot so late subscribers (e.g. a freshly opened Music window)
// see the current ambient session without waiting for the next event.
// Mutated only by GalleryAmbientAudio via setAmbientState.
export const ambientState = {
  playing: false,
  songId: GALLERY_AMBIENT_SONG_ID,
  volume: GALLERY_AMBIENT.TARGET_VOLUME,
};

export function setAmbientState(patch) {
  Object.assign(ambientState, patch);
  return ambientState;
}

export function isGalleryVisible(windows, minimizedApps) {
  if (!Array.isArray(windows)) return false;
  const minimized = minimizedApps instanceof Set && minimizedApps.has("photos");
  return windows.some((w) => w && w.id === "photos" && !minimized);
}

// Cosine ease-in-out 0→target. Gentle at both ends so fades have no audible step.
export function computeFadeVolume(elapsedMs, durationMs, target) {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(durationMs) || !Number.isFinite(target)) return 0;
  if (elapsedMs <= 0 || durationMs <= 0 || target <= 0) return 0;
  if (elapsedMs >= durationMs) return target;
  const progress = elapsedMs / durationMs;
  return target * (0.5 - 0.5 * Math.cos(Math.PI * progress));
}

export function clampVolume(value, fallback = GALLERY_AMBIENT.TARGET_VOLUME) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(1, Math.max(0, numeric));
}
// Stall watchdog decision (pure): recover only when the session should still
// be audible — browser/media stall with the gallery still open. Never fires
// after an intentional stop (playing false) or when the gallery is gone.
export function shouldRecoverAudio({ playing, visible, paused, ended, error }) {
  if (!playing || !visible) return false;
  return Boolean(paused || ended || error);
}

// Dead-stream detector (pure): HAVE_NOTHING + NO_SOURCE means the element
// lost its resource (decode/network kill); a bare play() cannot revive it,
// the src must be re-attached. HAVE_METADATA+ is a live element.
export function needsSourceReload({ readyState, networkState, error }) {
  if (error) return true;
  return readyState === 0 && networkState === 3;
}

// Start-only decision. Stopping needs no decision: closing the gallery begins
// the fade-out immediately and the session ends when volume reaches 0.
export function decideAmbientAction({ visible, playing, visibleSince, now }) {
  if (visible && !playing) {
    if (visibleSince == null) return null;
    return now - visibleSince >= GALLERY_AMBIENT.TRIGGER_MS ? "start" : null;
  }
  return null;
}
