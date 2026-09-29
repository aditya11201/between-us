import test from "node:test";
import assert from "node:assert/strict";
import {
  createPhotoCatalog,
  groupPhotoCatalog,
} from "./photoCatalogModel.js";

const modules = {
  "/src/content/photos/favorites/sunset.webp": "/assets/sunset.webp",
  "/src/content/photos/travel/japan.png": "/assets/japan.png",
  "/src/content/photos/travel/raw/ignored.jpg": "/assets/ignored.jpg",
  "/src/content/photos/travel/readme.txt": "/assets/readme.txt",
};

test("catalog keeps supported direct section files", () => {
  const catalog = createPhotoCatalog(modules);
  assert.deepEqual(catalog.map((photo) => photo.id), [
    "favorites/sunset.webp",
    "travel/japan.png",
  ]);
});

test("catalog accepts uppercase supported extensions", () => {
  const catalog = createPhotoCatalog({
    "/src/content/photos/favorites/portrait.JPG": "/portrait.JPG",
  });

  assert.equal(catalog[0].id, "favorites/portrait.JPG");
});

test("catalog groups sections and humanizes names", () => {
  const catalog = createPhotoCatalog({
    "/src/content/photos/my-trips/photo.jpg": "/photo.jpg",
  });
  const [section] = groupPhotoCatalog(catalog);

  assert.equal(section.id, "my-trips");
  assert.equal(section.label, "My Trips");
  assert.equal(section.photos[0].name, "photo.jpg");
});
