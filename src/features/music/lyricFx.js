export const LYRIC_FX_TTL_MS = 6000;

export const LYRIC_FX_MAX_ITEMS = 4;

export function pickLyricSpot(random = Math.random) {
  return {
    x: 6 + random() * 82,
    y: 10 + random() * 68,
  };
}
