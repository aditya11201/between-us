export const PHOTO_PREVIEW_PREFIX = "preview:";

export function getPhotoPreviewWindowId(photoId) {
  return `${PHOTO_PREVIEW_PREFIX}${photoId}`;
}

export function isPhotoPreviewWindow(windowId) {
  return typeof windowId === "string" && windowId.startsWith(PHOTO_PREVIEW_PREFIX);
}
