import test from "node:test";
import assert from "node:assert/strict";
import { fetchDrivePhotos, mapDriveFiles } from "./drivePhotos.js";

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

// mock fetch: folder root berisi 2 subfolder + 1 file root
function makeFetchStub(responses) {
  return async (url) => {
    const match = responses.find(([test]) => test(url));
    if (!match) throw new Error(`unexpected fetch: ${url}`);
    return {
      ok: true,
      json: async () => match[1],
    };
  };
}

test("fetchDrivePhotos returns empty result when config is empty", async () => {
  // paksa config kosong — production config sudah terisi, jadi harus di-override eksplisit
  const { setDriveConfigForTests } = await import("./driveConfig.js");
  setDriveConfigForTests({ folderId: "", apiKey: "" });

  let called = false;
  const result = await fetchDrivePhotos(async () => {
    called = true;
    throw new Error("should not fetch");
  });

  assert.equal(called, false);
  assert.deepEqual(result, { photos: [], sections: [] });

  setDriveConfigForTests(null);
});

test("fetchDrivePhotos walks one level of subfolders", async () => {
  // aktifkan config untuk test
  const { setDriveConfigForTests } = await import("./driveConfig.js");

  setDriveConfigForTests({ folderId: "ROOT", apiKey: "KEY" });

  const responses = [
    [
      (url) => url.includes("q=%27ROOT%27+in+parents"),
      { files: [
        { id: "SUB1", name: "Favorites", mimeType: "application/vnd.google-apps.folder" },
        { id: "SUB2", name: "my-trips", mimeType: "application/vnd.google-apps.folder" },
        { id: "FILE_ROOT", name: "cat.png", mimeType: "image/png" },
      ] },
    ],
    [
      (url) => url.includes("q=%27SUB1%27+in+parents"),
      { files: [{ id: "FILE_A", name: "sunset.webp", mimeType: "image/webp" }] },
    ],
    [
      (url) => url.includes("q=%27SUB2%27+in+parents"),
      { files: [] },
    ],
  ];

  const result = await fetchDrivePhotos(makeFetchStub(responses));

  // total foto: cat.png (root) + sunset.webp (Favorites) = 2; my-trips kosong
  assert.equal(result.photos.length, 2);
  assert.deepEqual(result.sections.map((s) => s.id), ["drive-photos", "Favorites"]);
  assert.equal(result.sections[0].photos.length, 1);
  assert.equal(result.sections[0].label, "Drive Photos");
  assert.equal(result.sections[1].photos[0].id, "drive:Favorites/sunset.webp");

  setDriveConfigForTests(null);
});
