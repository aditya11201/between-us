import { BONUS_BASE_START_TIME, BONUS_SONG_ID } from "./bonusSyncModel.js";

export const BONUS_SYNC_EVENT = "between-us:bonus-sync";

const syncState = {
  runId: null,
  songId: BONUS_SONG_ID,
  startTime: BONUS_BASE_START_TIME,
  musicReady: false,
  terminalReady: false,
  started: false,
};

const listeners = new Set();

function snapshot() {
  return { ...syncState };
}

function notify(eventPayload) {
  for (const listener of [...listeners]) {
    listener(eventPayload);
  }
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(BONUS_SYNC_EVENT, { detail: eventPayload }));
  }
}

function maybeStart() {
  if (
    syncState.runId === null
    || !syncState.musicReady
    || !syncState.terminalReady
    || syncState.started
  ) {
    return false;
  }
  syncState.started = true;
  notify({
    type: "start",
    runId: syncState.runId,
    songId: syncState.songId,
    startTime: syncState.startTime,
  });
  return true;
}

export function prepareBonusSyncRun({
  runId,
  songId = BONUS_SONG_ID,
  startTime = BONUS_BASE_START_TIME,
} = {}) {
  if (runId === null || runId === undefined) return snapshot();
  syncState.runId = runId;
  syncState.songId = songId;
  syncState.startTime = Number.isFinite(startTime) ? Math.max(0, startTime) : BONUS_BASE_START_TIME;
  syncState.musicReady = false;
  syncState.terminalReady = false;
  syncState.started = false;
  return snapshot();
}

export function ensureBonusSyncRun({
  runId,
  songId = BONUS_SONG_ID,
  startTime = BONUS_BASE_START_TIME,
} = {}) {
  if (runId === null || runId === undefined) return snapshot();
  if (syncState.runId !== runId) {
    return prepareBonusSyncRun({ runId, songId, startTime });
  }
  return snapshot();
}

export function markBonusMusicReady(runId) {
  if (runId === null || runId === undefined || syncState.runId !== runId) {
    return snapshot();
  }
  syncState.musicReady = true;
  maybeStart();
  return snapshot();
}

export function resetBonusMusicReady(runId) {
  if (runId === null || runId === undefined || syncState.runId !== runId) {
    return snapshot();
  }
  if (!syncState.started) {
    syncState.musicReady = false;
  }
  return snapshot();
}

export function markBonusTerminalReady(runId) {
  if (runId === null || runId === undefined || syncState.runId !== runId) {
    return snapshot();
  }
  syncState.terminalReady = true;
  maybeStart();
  return snapshot();
}

export function getBonusSyncState() {
  return snapshot();
}

export function subscribeBonusSync(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function prewarmBonusCatStory() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    void import("@/features/terminal/Terminal.jsx").catch(() => {});
    void import("@/features/terminal/CatStoryCanvas.jsx")
      .then((mod) => mod?.decodeCatStoryFrames?.())
      .catch(() => {});
  } catch {
    // Fail softly in test or non-DOM environments.
  }
}

export function resetBonusSyncCoordinator() {
  syncState.runId = null;
  syncState.songId = BONUS_SONG_ID;
  syncState.startTime = BONUS_BASE_START_TIME;
  syncState.musicReady = false;
  syncState.terminalReady = false;
  syncState.started = false;
}
