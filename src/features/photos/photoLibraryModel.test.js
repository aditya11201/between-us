import test from "node:test";
import assert from "node:assert/strict";
import { mergePhotoLibrary } from "./photoLibraryModel.js";

test("mergePhotoLibrary appends drive sections after local sections", () => {
  const local = {
    catalog: [{ id: "favorites/sunset.webp", sectionId: "favorites", sectionLabel: "Favorites", name: "sunset.webp", url: "/assets/sunset.webp" }],
    sections: [{ id: "favorites", label: "Favorites", photos: [{ id: "favorites/sunset.webp" }] }],
  };
  const drive = {
    photos: [{ id: "drive:Favorites/beach.jpg", sectionId: "Favorites", sectionLabel: "Favorites", name: "beach.jpg", url: "https://lh3.googleusercontent.com/d/F1" }],
    sections: [{ id: "drive-photos", label: "Drive Photos", photos: [{ id: "drive:Favorites/beach.jpg" }] }],
  };

  const merged = mergePhotoLibrary(local, drive);

  assert.equal(merged.catalog.length, 2);
  assert.deepEqual(merged.sections.map((s) => s.id), ["favorites", "drive-photos"]);
  assert.equal(merged.catalog[1].id, "drive:Favorites/beach.jpg");
});

test("mergePhotoLibrary handles empty drive result", () => {
  const local = {
    catalog: [{ id: "a.jpg", sectionId: "favorites", sectionLabel: "Favorites", name: "a.jpg", url: "/a.jpg" }],
    sections: [{ id: "favorites", label: "Favorites", photos: [{ id: "a.jpg" }] }],
  };

  const merged = mergePhotoLibrary(local, { photos: [], sections: [] });

  assert.deepEqual(merged.catalog, local.catalog);
  assert.deepEqual(merged.sections, local.sections);
});
