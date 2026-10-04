import {
  isDriveConfigured,
  driveListUrl,
  getDriveFolderId,
  getDriveApiKey,
} from "./driveConfig.js";

const DRIVE_IMAGE_URL = "https://lh3.googleusercontent.com/d/";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_ROOT_SECTION = { id: "drive-photos", label: "Drive Photos" };

function resolveTakenAt(file) {
  const raw = file?.imageMediaMetadata?.time ?? file?.createdTime ?? null;
  if (typeof raw !== "string" || !raw.trim() || Number.isNaN(Date.parse(raw))) return null;
  return raw;
}

function driveMediaUrl(fileId) {
  const params = new URLSearchParams({ alt: "media", key: getDriveApiKey() });
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`;
}

export function mapDriveFiles(files, sectionId, sectionLabel) {
  return files
    .filter(
      (file) =>
        typeof file.mimeType === "string" &&
        (file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/")),
    )
    .map((file) => {
      const mediaType = file.mimeType.startsWith("video/") ? "video" : "image";
      return {
        id: `drive:${sectionId}/${file.name}`,
        // ponytail: favorit permanen = favorites.json, bukan copy file.
        driveFileId: file.id,
        sectionId,
        sectionLabel,
        name: file.name,
        url: mediaType === "video" ? driveMediaUrl(file.id) : `${DRIVE_IMAGE_URL}${file.id}`,
        mediaType,
        takenAt: resolveTakenAt(file),
      };
    })
    .sort((left, right) => {
      if (left.takenAt && right.takenAt) {
        const dateDifference = Date.parse(right.takenAt) - Date.parse(left.takenAt);
        return dateDifference || left.name.localeCompare(right.name);
      }
      if (left.takenAt) return -1;
      if (right.takenAt) return 1;
      return left.name.localeCompare(right.name);
    });
}

// ponytail: Drive folder "Favorites" dan lokal "favorites" satu identitas; lowercase saja cukup.
function normalizeDriveSectionId(name) {
  return typeof name === "string" ? name.toLowerCase() : name;
}

 function humanizeName(name) {
   return name
     .replace(/[-_]+/g, " ")
     .replace(/\b\w/g, (letter) => letter.toUpperCase());
 }

async function listChildren(fetchImpl, folderId) {
  const url = driveListUrl("/files", {
    q: `'${folderId}' in parents and trashed = false`,
    pageSize: "200",
    fields: "files(id, name, mimeType, createdTime, imageMediaMetadata(time))",
  });
  // ponytail: tanpa login — baca publik via API key saja.
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Drive list failed: ${response.status}`);
  const payload = await response.json();
  return payload.files ?? [];
}

// ponytail: favorit permanen = satu file favorites.json di root Drive; baca anonim, tulis butuh login.
export const FAVORITES_JSON_NAME = "favorites.json";

function favoritesJsonUrl(fileId, extra = {}) {
  const params = new URLSearchParams({ ...extra, key: getDriveApiKey() });
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`;
}

export function parseFavoritesJson(text) {
  try {
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : parsed?.favorites;
    if (!Array.isArray(list)) return [];
    return [...new Set(list.filter((id) => typeof id === "string" && id))];
  } catch {
    return [];
  }
}

export async function fetchDriveFavoriteIds(fetchImpl, folderId) {
  const listUrl = driveListUrl("/files", {
    q: `'${folderId}' in parents and trashed = false and name = '${FAVORITES_JSON_NAME}'`,
    pageSize: "1",
    fields: "files(id)",
  });
  const listResponse = await fetchImpl(listUrl);
  if (!listResponse.ok) return { ids: [], fileId: null };
  const [entry] = (await listResponse.json()).files ?? [];
  if (!entry?.id) return { ids: [], fileId: null };
  const fileResponse = await fetchImpl(favoritesJsonUrl(entry.id, { alt: "media" }));
  if (!fileResponse.ok) return { ids: [], fileId: entry.id };
  return { ids: parseFavoritesJson(await fileResponse.text()), fileId: entry.id };
}
export async function fetchDrivePhotos(fetchImpl = fetch) {
  if (!isDriveConfigured()) return { photos: [], sections: [], favoriteIds: [], favoritesFileId: null };
  const folderId = getDriveFolderId();
  const [children, favorites] = await Promise.all([
    listChildren(fetchImpl, folderId),
    fetchDriveFavoriteIds(fetchImpl, folderId),
  ]);
  const folders = children.filter((file) => file.mimeType === DRIVE_FOLDER_MIME);
  const rootPhotos = mapDriveFiles(children, DRIVE_ROOT_SECTION.id, DRIVE_ROOT_SECTION.label);

  const sections = [
    { ...DRIVE_ROOT_SECTION, photos: rootPhotos },
    ...folders.map((folder) => ({
      id: normalizeDriveSectionId(folder.name),
      label: humanizeName(folder.name),
      photos: [],
    })),
  ];
  let photos = [...rootPhotos];

  for (const folder of folders) {
    const sectionId = normalizeDriveSectionId(folder.name);
    const files = await listChildren(fetchImpl, folder.id);
    const mapped = mapDriveFiles(files, sectionId, humanizeName(folder.name));
    photos = [...photos, ...mapped];
    sections.find((s) => s.id === sectionId).photos = mapped;
  }

  const visibleSections = sections.filter(
    (section) => section.photos.length > 0 || section.id === DRIVE_ROOT_SECTION.id,
  );

  return { photos, sections: visibleSections, favoriteIds: favorites.ids, favoritesFileId: favorites.fileId };
}
