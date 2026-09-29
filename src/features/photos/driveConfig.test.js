import test from "node:test";
import assert from "node:assert/strict";
import {
  DRIVE_FOLDER_ID,
  DRIVE_API_KEY,
  isDriveConfigured,
  driveListUrl,
} from "./driveConfig.js";

test("isDriveConfigured is false when either config value is empty", () => {
  assert.equal(typeof DRIVE_FOLDER_ID, "string");
  assert.equal(typeof DRIVE_API_KEY, "string");
  assert.equal(typeof isDriveConfigured(), "boolean");
});

test("driveListUrl appends path, params, and API key", () => {
  const url = driveListUrl("/files", { q: "abc", pageSize: "100" });
  assert.ok(url.startsWith("https://www.googleapis.com/drive/v3/files?"));
  assert.ok(url.includes("q=abc"));
  assert.ok(url.includes("pageSize=100"));
  assert.ok(url.includes("key="));
});
