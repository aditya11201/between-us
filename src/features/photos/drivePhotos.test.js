import test from "node:test";
import assert from "node:assert/strict";
import { mapDriveFiles } from "./drivePhotos.js";

test("maps image files to photo objects with drive-prefixed ids", () => {
  const photos = mapDriveFiles(
    [
      { id: "FILE_B", name: "sunset.webp", mimeType: "image/webp" },
      { id: "FILE_A", name: "beach.jpg", mimeType: "image/jpeg" },
    ],
    "favorites",
    "Favorites",
  );

  assert.deepEqual(photos.map((photo) => photo.id), [
    "drive:favorites/beach.jpg",
    "drive:favorites/sunset.webp",
  ]);
  assert.equal(photos[0].sectionId, "favorites");
  assert.equal(photos[0].sectionLabel, "Favorites");
  assert.equal(photos[0].name, "beach.jpg");
  assert.equal(photos[0].url, "https://lh3.googleusercontent.com/d/FILE_A");
});

test("filters non-image files", () => {
  const photos = mapDriveFiles(
    [
      { id: "F1", name: "photo.png", mimeType: "image/png" },
      { id: "F2", name: "notes.txt", mimeType: "text/plain" },
      { id: "F3", name: "video.mp4", mimeType: "video/mp4" },
    ],
    "root",
    "Drive Photos",
  );

  assert.equal(photos.length, 1);
  assert.equal(photos[0].name, "photo.png");
});
