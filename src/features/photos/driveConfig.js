export const DRIVE_FOLDER_ID = ""; // isi dengan Folder ID Google Drive (URL folder setelah /folders/)
export const DRIVE_API_KEY = "";  // isi dengan API key Google Cloud (Drive API enabled)

let DRIVE_FOLDER_ID_OVERRIDE;
let DRIVE_API_KEY_OVERRIDE;

export function getDriveFolderId() {
  return DRIVE_FOLDER_ID_OVERRIDE ?? DRIVE_FOLDER_ID;
}

export function getDriveApiKey() {
  return DRIVE_API_KEY_OVERRIDE ?? DRIVE_API_KEY;
}

export function isDriveConfigured() {
  return Boolean(getDriveFolderId() && getDriveApiKey());
}

export function driveListUrl(path, params) {
  const search = new URLSearchParams({ ...params, key: getDriveApiKey() });
  return `https://www.googleapis.com/drive/v3${path}?${search.toString()}`;
}

// test-only override untuk mengaktifkan config tanpa mengubah konstanta production
export function setDriveConfigForTests({ folderId, apiKey } = null) {
  DRIVE_FOLDER_ID_OVERRIDE = null;
  DRIVE_API_KEY_OVERRIDE = null;
  if (folderId !== undefined && folderId !== null) DRIVE_FOLDER_ID_OVERRIDE = folderId;
  if (apiKey !== undefined && apiKey !== null) DRIVE_API_KEY_OVERRIDE = apiKey;
}
