import test from "node:test";
import assert from "node:assert/strict";
import { getVisiblePhotoSections } from "./photosViewModel.js";

const sections = [
  {
    id: "favorites",
    label: "Favorites",
    photos: [{ id: "favorites/sunset.jpg", name: "sunset.jpg" }],
  },
  {
    id: "travel",
    label: "Travel",
    photos: [{ id: "travel/japan.jpg", name: "japan.jpg" }],
  },
];

test("library view keeps all matching photo sections", () => {
  const visible = getVisiblePhotoSections("library", sections, "sunset");

  assert.deepEqual(visible.map((section) => section.id), ["favorites"]);
});

test("album view isolates its matching folder", () => {
  const visible = getVisiblePhotoSections("section:travel", sections, "");

  assert.deepEqual(visible.map((section) => section.id), ["travel"]);
});

test("pinned Favorites view shows the favorites folder", () => {
  const visible = getVisiblePhotoSections("favorites", sections, "");

  assert.deepEqual(visible.map((section) => section.id), ["favorites"]);
});

test("non-library utility views do not invent photo data", () => {
  assert.deepEqual(getVisiblePhotoSections("people", sections, ""), []);
});
