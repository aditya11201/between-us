export const DRIVE_FOLDER_ID = "1TcWzUsbIliRc2Ed51wnFGi72K96kmISi"; // isi dengan Folder ID Google Drive (URL folder setelah /folders/)
export const DRIVE_API_KEY = import.meta.env?.VITE_DRIVE_API_KEY ?? "";

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
// ponytail: argumen null/undefined sama-sama berarti "reset", tidak perlu membedakan keduanya
export function setDriveConfigForTests(overrides) {
  const { folderId, apiKey } = overrides ?? {};
  DRIVE_FOLDER_ID_OVERRIDE = null;
  DRIVE_API_KEY_OVERRIDE = null;
  if (folderId !== undefined && folderId !== null) DRIVE_FOLDER_ID_OVERRIDE = folderId;
  if (apiKey !== undefined && apiKey !== null) DRIVE_API_KEY_OVERRIDE = apiKey;
}
