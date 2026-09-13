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
  assert.equal(photos[0].mediaType, "image");
});

test("maps video files to Drive API media URLs", async () => {
  const { setDriveConfigForTests } = await import("./driveConfig.js");
  setDriveConfigForTests({ folderId: "TEST_FOLDER", apiKey: "test-api-key" });

  const photos = mapDriveFiles(
    [{
      id: "VIDEO_1",
      name: "clip.mp4",
      mimeType: "video/mp4",
      webContentLink: "https://drive.google.com/uc?id=VIDEO_1",
    }],
    "root",
    "Drive Photos",
  );

  assert.equal(
    photos[0].url,
    "https://www.googleapis.com/drive/v3/files/VIDEO_1?alt=media&key=test-api-key",
  );
  assert.equal(photos[0].mediaType, "video");

  setDriveConfigForTests(null);
});

test("filters unsupported non-media files", () => {
  const photos = mapDriveFiles(
    [
      { id: "F1", name: "photo.png", mimeType: "image/png" },
      { id: "F2", name: "notes.txt", mimeType: "text/plain" },
      { id: "F3", name: "video.mp4", mimeType: "video/mp4" },
      { id: "F4", name: "document.pdf", mimeType: "application/pdf" },
    ],
    "root",
    "Drive Photos",
  );

  assert.deepEqual(photos.map((photo) => photo.name), ["photo.png", "video.mp4"]);
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

  setDriveConfigForTests({ folderId: "ROOT", apiKey: "test-api-key" });

  const responses = [
    [
      (url) => url.includes("q=%27ROOT%27+in+parents"),
      { files: [
        { id: "SUB1", name: "Favorites", mimeType: "application/vnd.google-apps.folder" },
        { id: "SUB2", name: "my-trips", mimeType: "application/vnd.google-apps.folder" },
        { id: "FILE_ROOT", name: "cat.png", mimeType: "image/png" },
        {
          id: "VIDEO_ROOT",
          name: "clip.mp4",
          mimeType: "video/mp4",
          webContentLink: "https://drive.google.com/uc?id=VIDEO_ROOT",
        },
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

  // total media: cat.png + clip.mp4 (root) + sunset.webp (Favorites) = 3; my-trips kosong
  assert.equal(result.photos.length, 3);
  assert.deepEqual(result.sections.map((s) => s.id), ["drive-photos", "Favorites"]);
  assert.equal(result.sections[0].photos.length, 2);
  assert.equal(result.sections[0].label, "Drive Photos");
  assert.equal(result.sections[0].photos[0].mediaType, "image");
  assert.equal(result.sections[0].photos[1].mediaType, "video");
  assert.equal(
    result.sections[0].photos[1].url,
    "https://www.googleapis.com/drive/v3/files/VIDEO_ROOT?alt=media&key=test-api-key",
  );
  assert.equal(result.sections[1].photos[0].id, "drive:Favorites/sunset.webp");

  setDriveConfigForTests(null);
});
