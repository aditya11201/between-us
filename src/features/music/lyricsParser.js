const LRC_LINE_PATTERN = /^\[(\d{1,3}):(\d{2})(?:[.:](\d{2,3}))?\]\s*(.*)$/;

export function parseLRC(text) {
  if (typeof text !== "string" || !text) return [];

  const lines = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = LRC_LINE_PATTERN.exec(line);
    if (!match) continue;
    // Single timestamp per line only; metadata ([ar:], [ti:], [offset:]) and
    // malformed lines never match the pattern above.
    const lyricText = match[4].trim();
    if (!lyricText || lyricText.startsWith("[")) continue;
    const fraction = match[3] ?? "00";
    lines.push({
      time:
        Number(match[1]) * 60
        + Number(match[2])
        + Number(fraction) / (fraction.length === 3 ? 1000 : 100),
      text: lyricText,
    });
  }

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
