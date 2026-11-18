export const BONUS_SONG_ID = "ravyn-lenae-love-me-not";
export const BONUS_BASE_START_TIME = 56.90;
export const BONUS_DEFAULT_VOLUME = 0.4;
export const BONUS_FPS = 30;
export const BONUS_FRAME_COUNT = 338;
export const BONUS_DURATION = BONUS_FRAME_COUNT / BONUS_FPS;
export const BONUS_END_TIME = BONUS_BASE_START_TIME + BONUS_DURATION;
export const DEFAULT_BONUS_START_OFFSET_SEC = 0;
export const BONUS_OFFSET_STORAGE_KEY = "between-us.bonus.offset";

// Scene-to-LRC alignment table for Chorus 1 of "Love Me Not" (00:56.90 → 01:08.17).
export const BONUS_SYNC_SCENES = Object.freeze([
  { text: "I MISS YOU", animStart: 0.00, animEnd: 1.10, lrcTime: 56.90, lrcLyric: "I miss you," },
  { text: "COME HERE", animStart: 1.10, animEnd: 2.17, lrcTime: 57.75, lrcLyric: "come here" },
  { text: "AND", animStart: 2.17, animEnd: 2.50, lrcTime: 58.70, lrcLyric: "And," },
  { text: "OH", animStart: 2.50, animEnd: 3.13, lrcTime: 59.03, lrcLyric: "oh," },
  { text: "IT'S HARD", animStart: 3.13, animEnd: 3.70, lrcTime: 59.57, lrcLyric: "it's hard" },
  { text: "TO SEE YOU", animStart: 3.70, animEnd: 4.23, lrcTime: 60.10, lrcLyric: "to see you," },
  { text: "BUT I WISH YOU", animStart: 4.23, animEnd: 4.97, lrcTime: 60.87, lrcLyric: "but I wish you" },
  { text: "WERE RIGHT", animStart: 5.43, animEnd: 6.43, lrcTime: 61.90, lrcLyric: "were right" },
  { text: "HERE", animStart: 6.43, animEnd: 8.57, lrcTime: 62.38, lrcLyric: "here" },
  { text: "WHEN", animStart: 8.57, animEnd: 8.93, lrcTime: 65.08, lrcLyric: "when" },
  { text: "I", animStart: 8.93, animEnd: 9.33, lrcTime: 65.33, lrcLyric: "I" },
  { text: "GET", animStart: 9.33, animEnd: 9.63, lrcTime: 65.62, lrcLyric: "get" },
  { text: "YOU", animStart: 9.63, animEnd: 9.87, lrcTime: 65.85, lrcLyric: "you" },
  { text: "EVERYWHERE", animStart: 9.87, animEnd: 11.27, lrcTime: 66.12, lrcLyric: "everywhere" },
]);

function parseFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function getBonusStartTime(
  offsetOverride,
  {
    search = typeof window !== "undefined" ? window.location?.search : undefined,
    storage = typeof window !== "undefined" ? window.localStorage : undefined,
  } = {},
) {
  let offset = parseFiniteNumber(offsetOverride);

  if (offset === null && typeof search === "string" && search) {
    try {
      const paramValue = new URLSearchParams(search).get("bonusOffset");
      offset = parseFiniteNumber(paramValue);
    } catch {
      offset = null;
    }
  }

  if (offset === null && storage && typeof storage.getItem === "function") {
    try {
      offset = parseFiniteNumber(storage.getItem(BONUS_OFFSET_STORAGE_KEY));
    } catch {
      offset = null;
    }
  }

  if (offset === null) {
    offset = DEFAULT_BONUS_START_OFFSET_SEC;
  }

  return Math.max(0, BONUS_BASE_START_TIME + offset);
}

export function resolveCatStoryFrame(
  audioTime,
  {
    startTime = BONUS_BASE_START_TIME,
    fps = BONUS_FPS,
    frameCount = BONUS_FRAME_COUNT,
  } = {},
) {
  const safeStartTime = Number.isFinite(startTime) ? Math.max(0, startTime) : BONUS_BASE_START_TIME;
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : BONUS_FPS;
  const safeFrameCount = Number.isInteger(frameCount) && frameCount > 0 ? frameCount : BONUS_FRAME_COUNT;
  const duration = safeFrameCount / safeFps;

  if (!Number.isFinite(audioTime) || audioTime < safeStartTime) {
    return { frameIndex: 0, elapsed: 0, status: "before" };
  }

  if (audioTime >= safeStartTime + duration) {
    return { frameIndex: safeFrameCount - 1, elapsed: duration, status: "completed" };
  }

  const elapsed = audioTime - safeStartTime;
  const frameIndex = Math.min(safeFrameCount - 1, Math.floor(elapsed * safeFps));
  return { frameIndex, elapsed, status: "playing" };
}
