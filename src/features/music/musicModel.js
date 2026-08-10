export const PLAYER_STORAGE_KEY = "karenjourney.music.player";

const DEFAULT_PLAYER_STATE = Object.freeze({
  activeId: null,
  currentTime: 0,
  volume: 0.7,
  isMuted: false,
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function validateMusicCatalog(catalog) {
  if (!Array.isArray(catalog)) {
    throw new TypeError("Music catalog must be an array");
  }

  const ids = new Set();
  catalog.forEach((song) => {
    if (!song || typeof song !== "object") {
      throw new TypeError("Music catalog entries must be objects");
    }
    if (typeof song.id !== "string" || !song.id.trim()) {
      throw new TypeError("Music catalog entries require an id");
    }
    if (ids.has(song.id)) {
      throw new Error(`Duplicate song id: ${song.id}`);
    }
    if (typeof song.title !== "string" || !song.title.trim()) {
      throw new TypeError(`Song ${song.id} requires a title`);
    }
    if (typeof song.artist !== "string" || !song.artist.trim()) {
      throw new TypeError(`Song ${song.id} requires an artist`);
    }
    if (typeof song.src !== "string" || !song.src.trim()) {
      throw new TypeError(`Song ${song.id} requires audio`);
    }
    if (typeof song.artwork !== "string" || !song.artwork.trim()) {
      throw new TypeError(`Song ${song.id} requires artwork`);
    }
    ids.add(song.id);
  });

  return catalog;
}

export function filterMusicCatalog(catalog, query) {
  const normalized = String(query ?? "").trim().toLowerCase();
  if (!normalized) return catalog;

  return catalog.filter((song) =>
    [song.title, song.artist, song.album, song.genre]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalized)),
  );
}

export function getNextSong(
  catalog,
  activeId,
  { shuffle = false, repeat = "none", random = 0 } = {},
) {
  if (!catalog.length) return null;

  const activeIndex = catalog.findIndex((song) => song.id === activeId);
  if (shuffle && catalog.length > 1) {
    const candidates = catalog.filter((song) => song.id !== activeId);
    const safeRandom = clamp(Number.isFinite(random) ? random : 0, 0, 0.999999);
    return candidates[Math.floor(safeRandom * candidates.length)];
  }

  const nextIndex = activeIndex + 1;
  if (nextIndex < catalog.length) return catalog[nextIndex];
  return repeat === "all" ? catalog[0] : null;
}

export function getPreviousAction(catalog, activeId, currentTime) {
  if (Number.isFinite(currentTime) && currentTime > 3) {
    return { type: "restart" };
  }
  if (!catalog.length) return { type: "none" };

  const activeIndex = catalog.findIndex((song) => song.id === activeId);
  const previousIndex = activeIndex <= 0 ? catalog.length - 1 : activeIndex - 1;
  return { type: "select", song: catalog[previousIndex] };
}

export function restorePlayerState(rawValue, catalog) {
  const fallback = { ...DEFAULT_PLAYER_STATE };
  if (typeof rawValue !== "string") return fallback;

  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return fallback;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fallback;
  }

  const activeId = typeof parsed.activeId === "string"
    && catalog.some((song) => song.id === parsed.activeId)
    ? parsed.activeId
    : null;
  const currentTime = Number.isFinite(parsed.currentTime)
    ? Math.max(0, parsed.currentTime)
    : 0;
  const volume = Number.isFinite(parsed.volume)
    ? clamp(parsed.volume, 0, 1)
    : DEFAULT_PLAYER_STATE.volume;

  return {
    activeId,
    currentTime,
    volume,
    isMuted: parsed.isMuted === true,
  };
}

export function serializePlayerState(state) {
  return JSON.stringify({
    activeId: state.activeId ?? null,
    currentTime: Number.isFinite(state.currentTime) ? Math.max(0, state.currentTime) : 0,
    volume: Number.isFinite(state.volume) ? clamp(state.volume, 0, 1) : DEFAULT_PLAYER_STATE.volume,
    isMuted: state.isMuted === true,
  });
}
