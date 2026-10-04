import { useEffect, useMemo, useState } from "react";
import { photoCatalog, photoSections } from "./photoCatalog.js";
import { fetchDrivePhotos } from "./drivePhotos.js";
import { isDriveConfigured } from "./driveConfig.js";
import { FAVORITES_SECTION_ID, mergePhotoLibrary, withVirtualFavorites, withVirtualMediaViews } from "./photoLibraryModel.js";
import { loadFavoriteIds, toggleFavoriteId } from "./photoFavoritesModel.js";
export function usePhotoLibrary() {
  const [driveResult, setDriveResult] = useState(null);
  const [status, setStatus] = useState(isDriveConfigured() ? "loading" : "local");
  // ponytail: ♥ = lokal sementara; permanen = folder favorites + favorites.json (edit via Drive UI).
  const [likedIds, setLikedIds] = useState(() => loadFavoriteIds());

  useEffect(() => {
    if (!isDriveConfigured()) return undefined;

    let cancelled = false;
    fetchDrivePhotos()
      .then((result) => {
        if (!cancelled) {
          setDriveResult(result);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const driveData = status === "ready" && driveResult
    ? driveResult
    : { photos: [], sections: [], favoriteIds: [], favoritesFileId: null };

  const merged = useMemo(
    () => mergePhotoLibrary({ catalog: photoCatalog, sections: photoSections }, driveData),
    // ponytail: katalog statis; yang berubah hanya hasil Drive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [driveResult, status],
  );
  // ponytail: permanen (folder + favorites.json) menang atas lokal; unlike lokal tak bisa hapus permanen.
  const effectiveFavorites = useMemo(() => {
    const seeded = new Set(likedIds);
    for (const section of merged.sections) {
      if (section.id !== FAVORITES_SECTION_ID) continue;
      for (const photo of section.photos) seeded.add(photo.id);
    }
    for (const id of driveData.favoriteIds ?? []) seeded.add(id);
    return seeded;
  }, [merged.sections, likedIds, driveData.favoriteIds]);
  const sections = useMemo(
    () => withVirtualMediaViews(withVirtualFavorites(merged.sections, effectiveFavorites)),
    [merged.sections, effectiveFavorites],
  );
  return {
    catalog: merged.catalog,
    sections,
    status,
    favoriteIds: effectiveFavorites,
    // ponytail: tanpa login — ♥ cuma lokal sementara; permanen via folder/JSON di Drive UI.
    toggleFavorite: (photoId) => setLikedIds((current) => toggleFavoriteId(current, photoId)),
  };
}
