import test from "node:test";
import assert from "node:assert/strict";
import {
  updatePhotoSelection,
  clearPhotoSelection,
  filterPhotoSections,
  formatSelectionStatus,
} from "./photoSelectionModel.js";

test("single click replaces the current selection", () => {
  const next = updatePhotoSelection(
    new Set(["favorites/old.jpg"]),
    "travel/new.jpg",
    false,
  );

  assert.deepEqual([...next], ["travel/new.jpg"]);
});

test("additive click toggles one photo without mutating the input", () => {
  const current = new Set(["favorites/old.jpg"]);
  const next = updatePhotoSelection(current, "travel/new.jpg", true);

  assert.deepEqual([...current], ["favorites/old.jpg"]);
  assert.deepEqual([...next], ["favorites/old.jpg", "travel/new.jpg"]);
});

test("additive click removes an already selected photo", () => {
  const next = updatePhotoSelection(
    new Set(["favorites/old.jpg"]),
    "favorites/old.jpg",
    true,
  );

  assert.deepEqual([...next], []);
});

test("clear selection returns a fresh empty set", () => {
  const cleared = clearPhotoSelection();
  assert.equal(cleared.size, 0);
});

test("filter keeps only matching photos and non-empty sections", () => {
  const sections = [{
    id: "travel",
    label: "Travel",
    photos: [
      { id: "travel/japan.png", name: "japan.png" },
      { id: "travel/bali.jpg", name: "bali.jpg" },
    ],
  }];

  const result = filterPhotoSections(sections, "japan");
  assert.deepEqual(result[0].photos.map((photo) => photo.id), [
    "travel/japan.png",
  ]);
});

test("selection status reports total photos until selection exists", () => {
  assert.equal(formatSelectionStatus(0, 12), "12 photos");
  assert.equal(formatSelectionStatus(3, 12), "3 photos selected");
});
