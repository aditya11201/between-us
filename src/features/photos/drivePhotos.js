const DRIVE_IMAGE_URL = "https://lh3.googleusercontent.com/d/";

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
