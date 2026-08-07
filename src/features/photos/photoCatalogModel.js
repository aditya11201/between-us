export const PHOTO_ROOT = "/src/content/photos/";

const SUPPORTED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

function humanizeSectionId(sectionId) {
  return sectionId
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function createPhotoCatalog(modules, root = PHOTO_ROOT) {
  return Object.entries(modules)
    .flatMap(([sourcePath, url]) => {
      if (!sourcePath.startsWith(root)) return [];
      const relativePath = sourcePath.slice(root.length);
      const segments = relativePath.split("/");
      if (segments.length !== 2) return [];

      const [sectionId, name] = segments;
      const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(extension)) return [];

      return [{
        id: relativePath,
        sectionId,
        sectionLabel: humanizeSectionId(sectionId),
        name,
        url,
      }];
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function groupPhotoCatalog(catalog) {
  const sections = new Map();

  for (const photo of catalog) {
    if (!sections.has(photo.sectionId)) {
      sections.set(photo.sectionId, {
        id: photo.sectionId,
        label: photo.sectionLabel,
        photos: [],
      });
    }
    sections.get(photo.sectionId).photos.push(photo);
  }

  return [...sections.values()];
}
