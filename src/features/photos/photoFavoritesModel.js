// ponytail: ♥ lokal = sementara (bisa hilang); permanen = favorites.json di Drive, ditulis hook.
export const FAVORITES_STORAGE_KEY = "photos-favorites";

export function loadFavoriteIds(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function toggleFavoriteId(current, photoId) {
  const next = new Set(current);
  if (next.has(photoId)) next.delete(photoId);
  else next.add(photoId);
  try {
    globalThis.localStorage?.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // ponytail: gagal simpan = sesi ini tetap jalan, reload kembali kosong.
  }
  return next;
}
