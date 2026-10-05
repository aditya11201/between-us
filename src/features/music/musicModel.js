import { matchesQuery } from "../../utils/search.js";
import { clampSliderValue } from "../menubar/MenuBar/sliderMath.js";

export const PLAYER_STORAGE_KEY = "between-us.music.player";
export const PLAYLISTS_STORAGE_KEY = "between-us.music.playlists";
const DEFAULT_PLAYER_STATE = Object.freeze({
  activeId: null,
  currentTime: 0,
  volume: 0.7,
  isMuted: false,
});

function clamp(value, min, max) {
  return clampSliderValue(value, min, max);
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
    if (song.addedAt !== undefined && (typeof song.addedAt !== "string" || Number.isNaN(Date.parse(song.addedAt)))) {
      throw new TypeError(`Song ${song.id} requires a valid addedAt`);
    }
    if (song.lyrics !== undefined && typeof song.lyrics !== "string") {
      throw new TypeError(`Song ${song.id} lyrics must be a string`);
    }
    ids.add(song.id);
  });

  return catalog;
}

export function isPlayable(song) {
  return !!song && typeof song.src === "string" && !!song.src.trim();
}
export function filterMusicCatalog(catalog, query) {
  if (!String(query ?? "").trim()) return catalog;

  return catalog.filter((song) =>
    [song.title, song.artist, song.album, song.genre]
      .filter(Boolean)
      .some((value) => matchesQuery(value, query)),
  );
}

export function resolveSongQuery(catalog, query) {
  const normalized = String(query ?? "").trim().toLowerCase();
  if (!normalized || !Array.isArray(catalog)) return null;

  const byId = catalog.find((song) => song.id === normalized);
  if (byId) return byId;

  const byTitle = catalog.find(
    (song) => typeof song.title === "string" && song.title.toLowerCase() === normalized,
  );
  if (byTitle) return byTitle;

  return filterMusicCatalog(catalog, query)[0] ?? null;
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

export function groupAlbums(catalog) {
  const groups = new Map();
  for (const song of catalog) {
    const albumName = song.album || "Unknown Album";
    const artistName = song.artist || "Unknown Artist";
    const key = `${albumName}|||${artistName}`;
    const existing = groups.get(key);
    if (existing) {
      existing.songs.push(song);
      existing.count = existing.songs.length;
    } else {
      groups.set(key, { key, name: albumName, artist: artistName, artwork: song.artwork, count: 1, songs: [song] });
    }
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name) || a.artist.localeCompare(b.artist));
}

export function groupArtists(catalog) {
  const groups = new Map();
  for (const song of catalog) {
    const name = typeof song.artist === "string" && song.artist.trim() ? song.artist.trim() : "Unknown Artist";
    const existing = groups.get(name);
    if (existing) {
      existing.songs.push(song);
      existing.count = existing.songs.length;
    } else {
      groups.set(name, { key: name, name, artwork: song.artwork, count: 1, songs: [song] });
    }
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getRecentlyAdded(catalog, limit = catalog.length) {
  const ranked = [...catalog].sort((a, b) => {
    const aTime = typeof a.addedAt === "string" ? Date.parse(a.addedAt) : NaN;
    const bTime = typeof b.addedAt === "string" ? Date.parse(b.addedAt) : NaN;
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
  return ranked.slice(0, Math.max(0, limit));
}

function makePlaylistId() {
  return `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizePlaylistName(name, playlists, excludeId = null) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) throw new Error("Playlist name is required");
  const duplicate = playlists.some(
    (playlist) => playlist.id !== excludeId && playlist.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (duplicate) throw new Error("Playlist name already exists");
  return trimmed;
}

export function createPlaylist(playlists, name) {
  const trimmed = normalizePlaylistName(name, playlists);
  const now = new Date().toISOString();
  const playlist = { id: makePlaylistId(), name: trimmed, songIds: [], createdAt: now, updatedAt: now };
  return { playlists: [...playlists, playlist], playlist };
}

export function renamePlaylist(playlists, id, name) {
  const trimmed = normalizePlaylistName(name, playlists, id);
  let found = false;
  const next = playlists.map((playlist) => {
    if (playlist.id !== id) return playlist;
    found = true;
    return { ...playlist, name: trimmed, updatedAt: new Date().toISOString() };
  });
  return found ? next : playlists;
}

export function deletePlaylist(playlists, id) {
  const next = playlists.filter((playlist) => playlist.id !== id);
  return next.length === playlists.length ? playlists : next;
}

export function addSongToPlaylist(playlists, playlistId, songId, catalog) {
  if (!catalog.some((song) => song.id === songId)) return playlists;
  let changed = false;
  const next = playlists.map((playlist) => {
    if (playlist.id !== playlistId || playlist.songIds.includes(songId)) return playlist;
    changed = true;
    return { ...playlist, songIds: [...playlist.songIds, songId], updatedAt: new Date().toISOString() };
  });
  return changed ? next : playlists;
}

export function removeSongFromPlaylist(playlists, playlistId, songId) {
  let changed = false;
  const next = playlists.map((playlist) => {
    if (playlist.id !== playlistId || !playlist.songIds.includes(songId)) return playlist;
    changed = true;
    return { ...playlist, songIds: playlist.songIds.filter((id) => id !== songId), updatedAt: new Date().toISOString() };
  });
  return changed ? next : playlists;
}

export function restorePlaylists(rawValue, catalog) {
  if (typeof rawValue !== "string" || !rawValue) return [];
  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const validIds = new Set(catalog.map((song) => song.id));
  return parsed
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .filter((entry) => typeof entry.name === "string" && entry.name.trim() && Array.isArray(entry.songIds))
    .map((entry, index) => ({
      id: typeof entry.id === "string" && entry.id ? entry.id : `pl-${index}`,
      name: entry.name.trim(),
      songIds: entry.songIds.filter((id) => validIds.has(id)),
      createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date(0).toISOString(),
      updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date(0).toISOString(),
    }));
}

export function serializePlaylists(playlists) {
  return JSON.stringify(playlists.map(({ id, name, songIds, createdAt, updatedAt }) => ({ id, name, songIds, createdAt, updatedAt })));
}

export function getPlaylistSongs(playlist, catalog) {
  if (!playlist || !Array.isArray(playlist.songIds)) return [];
  return playlist.songIds.map((id) => catalog.find((song) => song.id === id)).filter(Boolean);
}
