import test from "node:test";
import assert from "node:assert/strict";
import {
  PHOTO_PREVIEW_PREFIX,
  getPhotoPreviewWindowId,
  isPhotoPreviewWindow,
} from "./photoPreviewModel.js";

test("photo preview IDs use the required prefix", () => {
  const photoId = "travel/japan.png";

  assert.equal(PHOTO_PREVIEW_PREFIX, "preview:");
  assert.equal(getPhotoPreviewWindowId(photoId), "preview:travel/japan.png");
  assert.equal(photoId, "travel/japan.png");
});

test("distinct photo IDs produce distinct preview window IDs", () => {
  const firstPhotoId = "favorites/sunset.webp";
  const secondPhotoId = "travel/japan.png";

  assert.notEqual(
    getPhotoPreviewWindowId(firstPhotoId),
    getPhotoPreviewWindowId(secondPhotoId),
  );
});

test("preview detection accepts dynamic IDs and rejects ordinary app IDs", () => {
  assert.equal(isPhotoPreviewWindow("preview:travel/japan.png"), true);
  assert.equal(isPhotoPreviewWindow("photos"), false);
  assert.equal(isPhotoPreviewWindow("finder"), false);
});

test("preview identity functions preserve their input values", () => {
  const photoId = "favorites/portrait.JPG";
  const ordinaryWindowId = "photos";

  getPhotoPreviewWindowId(photoId);
  isPhotoPreviewWindow(ordinaryWindowId);

  assert.equal(photoId, "favorites/portrait.JPG");
  assert.equal(ordinaryWindowId, "photos");
});
