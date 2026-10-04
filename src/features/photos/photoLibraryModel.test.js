import test from "node:test";
import assert from "node:assert/strict";
import { buildFavoritePhotos, mergePhotoLibrary, withVirtualFavorites, withVirtualMediaViews } from "./photoLibraryModel.js";

test("mergePhotoLibrary merges same-id Drive sections without duplicating photos", () => {
  const local = {
    catalog: [{ id: "favorites/sunset.webp", sectionId: "favorites", sectionLabel: "Favorites", name: "sunset.webp", url: "/assets/sunset.webp" }],
    sections: [{ id: "favorites", label: "Favorites", photos: [{ id: "favorites/sunset.webp" }] }],
  };
  const drive = {
    photos: [{ id: "drive:favorites/beach.jpg", sectionId: "favorites", sectionLabel: "Favorites", name: "beach.jpg", url: "https://lh3.googleusercontent.com/d/F1" }],
    sections: [{ id: "favorites", label: "Favorites", photos: [{ id: "drive:favorites/beach.jpg" }] }],
  };

  const merged = mergePhotoLibrary(local, drive);

  assert.deepEqual(merged.sections.map((s) => s.id), ["favorites"]);
  assert.deepEqual(merged.sections[0].photos.map((p) => p.id), ["favorites/sunset.webp", "drive:favorites/beach.jpg"]);
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

test("withVirtualFavorites shows liked album photos in Favorites without copying them", () => {
  const sections = [
    { id: "travel", label: "Travel", photos: [{ id: "travel/japan.png" }, { id: "travel/bali.jpg" }] },
    { id: "favorites", label: "Favorites", photos: [{ id: "favorites/sunset.webp" }] },
  ];

  const next = withVirtualFavorites(sections, new Set(["travel/japan.png"]));

  assert.deepEqual(next.find((s) => s.id === "travel").photos.map((p) => p.id), ["travel/japan.png", "travel/bali.jpg"]);
  assert.deepEqual(next.find((s) => s.id === "favorites").photos.map((p) => p.id), ["travel/japan.png", "favorites/sunset.webp"]);
  assert.deepEqual(buildFavoritePhotos(sections, new Set(["travel/japan.png", "travel/japan.png"])).map((p) => p.id), ["travel/japan.png"]);
});

test("withVirtualFavorites includes favorites.json ids even without a local like", () => {
  const sections = [
    { id: "travel", label: "Travel", photos: [{ id: "drive:travel/bali.jpg" }, { id: "travel/plain.jpg" }] },
  ];

  const next = withVirtualFavorites(sections, new Set(["drive:travel/bali.jpg"]));

  assert.deepEqual(next.find((s) => s.id === "favorites").photos.map((p) => p.id), ["drive:travel/bali.jpg"]);
  assert.deepEqual(next.find((s) => s.id === "travel").photos.map((p) => p.id), ["drive:travel/bali.jpg", "travel/plain.jpg"]);
});

test("withVirtualMediaViews collects videos across albums without moving them", () => {
  const sections = [
    { id: "favorites", label: "Favorites", photos: [{ id: "favorites/a.jpg", mediaType: "image" }] },
    { id: "travel", label: "Travel", photos: [{ id: "drive:travel/clip.mp4", mediaType: "video" }, { id: "travel/b.jpg", mediaType: "image" }] },
  ];

  const next = withVirtualMediaViews(withVirtualFavorites(sections, new Set()));

  assert.deepEqual(next.map((s) => s.id), ["favorites", "videos", "travel"]);
  assert.deepEqual(next.find((s) => s.id === "videos").photos.map((p) => p.id), ["drive:travel/clip.mp4"]);
  assert.deepEqual(next.find((s) => s.id === "travel").photos.map((p) => p.id), ["drive:travel/clip.mp4", "travel/b.jpg"]);
});
