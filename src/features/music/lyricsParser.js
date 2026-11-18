const LRC_LINE_PATTERN = /^\[(\d{1,3}):(\d{2})(?:[.:](\d{2,3}))?\]\s*(.*)$/;
const LRC_OFFSET_PATTERN = /^\[offset:\s*([+-]?\d+)\s*\]$/i;
const INLINE_WORD_TAG_PATTERN = /<\d{1,3}:\d{2}(?:[.:]\d{2,3})?>/g;

export function parseLRC(text) {
  if (typeof text !== "string" || !text) return [];

  let offsetMs = 0;
  const rawEntries = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const offsetMatch = LRC_OFFSET_PATTERN.exec(line);
    if (offsetMatch) {
      const parsedOffset = Number(offsetMatch[1]);
      if (Number.isFinite(parsedOffset)) offsetMs = parsedOffset;
      continue;
    }

    const match = LRC_LINE_PATTERN.exec(line);
    if (!match) continue;
    // Strip inline enhanced-LRC word-level timestamps (<mm:ss.xx>) while
    // keeping single-timestamp-per-line structure and skipping metadata tags.
    const lyricText = match[4].replace(INLINE_WORD_TAG_PATTERN, "").trim();
    if (!lyricText || lyricText.startsWith("[")) continue;
    const fraction = match[3] ?? "00";
    const rawTime =
      Number(match[1]) * 60
      + Number(match[2])
      + Number(fraction) / (fraction.length === 3 ? 1000 : 100);
    rawEntries.push({ rawTime, text: lyricText });
  }

  const offsetSec = offsetMs / 1000;
  const lines = rawEntries.map(({ rawTime, text: lyricText }) => ({
    time: offsetSec === 0
      ? rawTime
      : Math.max(0, Math.round((rawTime + offsetSec) * 1000) / 1000),
    text: lyricText,
  }));

  lines.sort((a, b) => a.time - b.time);
  return lines;
}

export function getActiveLyricIndex(lines, currentTime) {
  if (!Array.isArray(lines) || lines.length === 0) return -1;
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime) active = i;
    else break;
  }
  return active;
}
