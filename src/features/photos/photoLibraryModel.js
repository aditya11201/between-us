// ponytail: satu identitas favorit ("favorites"); foto tampil di album + virtual Favorites, tidak dicopy.
export const FAVORITES_SECTION_ID = "favorites";

// ponytail: hanya filter, tidak mengubah struktur section album/Library.
export function buildFavoritePhotos(sections, favoriteIds) {
  if (!favoriteIds || favoriteIds.size === 0) return [];
  const seen = new Set();
  const favorites = [];
  for (const section of sections) {
    for (const photo of section.photos) {
      if (favoriteIds.has(photo.id) && !seen.has(photo.id)) {
        seen.add(photo.id);
        favorites.push(photo);
      }
    }
  }
  return favorites;
}

export function withVirtualFavorites(sections, favoriteIds) {
  // ponytail: folder favorites + favorites.json + like lokal digabung jadi satu Favorit virtual.
  const seeded = new Set(favoriteIds ?? []);
  const existing = sections.find((section) => section.id === FAVORITES_SECTION_ID);
  if (existing) for (const photo of existing.photos) seeded.add(photo.id);
  const favorites = buildFavoritePhotos(sections, seeded);
  if (!existing) {
    return [{ id: FAVORITES_SECTION_ID, label: "Favorites", photos: favorites }, ...sections];
  }
  return sections.map((section) =>
    (section.id === FAVORITES_SECTION_ID ? { ...section, photos: favorites } : section),
  );
}

// ponytail: section id sama (lokal "favorites" + Drive "Favorites") digabung, bukan double section.
export function mergePhotoLibrary(local, drive) {
  const sections = local.sections.map((section) => ({ ...section, photos: [...section.photos] }));
  for (const section of drive.sections) {
    const existing = sections.find((item) => item.id === section.id);
    if (existing) {
      const knownIds = new Set(existing.photos.map((photo) => photo.id));
      existing.photos = [...existing.photos, ...section.photos.filter((photo) => !knownIds.has(photo.id))];
    } else sections.push({ ...section, photos: [...section.photos] });
  }
  return {
    catalog: [...local.catalog, ...drive.photos],
    sections,
  };
}

// ponytail: favorit permanen = favorites.json, tidak ada flag per foto.
