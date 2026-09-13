import { isDriveConfigured, driveListUrl, getDriveFolderId } from "./driveConfig.js";

const DRIVE_IMAGE_URL = "https://lh3.googleusercontent.com/d/";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_ROOT_SECTION = { id: "drive-photos", label: "Drive Photos" };

export function mapDriveFiles(files, sectionId, sectionLabel) {
  return files
    .filter((file) => typeof file.mimeType === "string" && file.mimeType.startsWith("image/"))
    .map((file) => ({
      id: `drive:${sectionId}/${file.name}`,
      sectionId,
      sectionLabel,
      name: file.name,
      url: `${DRIVE_IMAGE_URL}${file.id}`,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
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
    fields: "files(id, name, mimeType)",
  });
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Drive list failed: ${response.status}`);
  const payload = await response.json();
  return payload.files ?? [];
}

export async function fetchDrivePhotos(fetchImpl = fetch) {
  if (!isDriveConfigured()) return { photos: [], sections: [] };

  const children = await listChildren(fetchImpl, getDriveFolderId());
  const folders = children.filter((file) => file.mimeType === DRIVE_FOLDER_MIME);
  const rootPhotos = mapDriveFiles(children, DRIVE_ROOT_SECTION.id, DRIVE_ROOT_SECTION.label);

  const sections = [
    { ...DRIVE_ROOT_SECTION, photos: rootPhotos },
    ...folders.map((folder) => ({
      id: folder.name,
      label: humanizeName(folder.name),
      photos: [],
    })),
  ];
  let photos = [...rootPhotos];

  for (const folder of folders) {
    const files = await listChildren(fetchImpl, folder.id);
    const mapped = mapDriveFiles(files, folder.name, humanizeName(folder.name));
    photos = [...photos, ...mapped];
    sections.find((s) => s.id === folder.name).photos = mapped;
  }

  const visibleSections = sections.filter(
    (section) => section.photos.length > 0 || section.id === DRIVE_ROOT_SECTION.id,
  );

  return { photos, sections: visibleSections };
}
