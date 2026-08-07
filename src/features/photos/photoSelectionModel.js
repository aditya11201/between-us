export function updatePhotoSelection(selectedIds, photoId, additive) {
  const next = additive ? new Set(selectedIds) : new Set();

  if (additive && next.has(photoId)) {
    next.delete(photoId);
  } else {
    next.add(photoId);
  }

  return next;
}

export function clearPhotoSelection() {
  return new Set();
}

export function filterPhotoSections(sections, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return sections;

  return sections
    .map((section) => ({
      ...section,
      photos: section.photos.filter((photo) =>
        photo.name.toLowerCase().includes(normalizedQuery),
      ),
    }))
    .filter((section) => section.photos.length > 0);
}

export function formatSelectionStatus(selectedCount, totalCount) {
  return selectedCount > 0
    ? `${selectedCount} photos selected`
    : `${totalCount} photos`;
}
