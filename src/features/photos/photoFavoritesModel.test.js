import test from "node:test";
import assert from "node:assert/strict";
import { loadFavoriteIds, toggleFavoriteId } from "./photoFavoritesModel.js";
import { fetchDriveFavoriteIds, parseFavoritesJson } from "./drivePhotos.js";

function memoryStorage(initial) {
  const store = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    store,
  };
}

test("toggleFavoriteId adds then removes the id and persists the set", () => {
  const storage = memoryStorage();
  const realStorage = globalThis.localStorage;
  globalThis.localStorage = storage;
  try {
    let next = toggleFavoriteId(new Set(), "travel/japan.png");
    assert.deepEqual([...next], ["travel/japan.png"]);
    assert.deepEqual(JSON.parse(storage.store.get("photos-favorites")), ["travel/japan.png"]);

    next = toggleFavoriteId(next, "travel/japan.png");
    assert.deepEqual([...next], []);
    assert.deepEqual(loadFavoriteIds(storage), new Set());
  } finally {
    globalThis.localStorage = realStorage;
  }
});

test("loadFavoriteIds ignores corrupt or non-string payloads", () => {
  assert.deepEqual(loadFavoriteIds(memoryStorage({ "photos-favorites": "not-json" })), new Set());
  assert.deepEqual(
    loadFavoriteIds(memoryStorage({ "photos-favorites": JSON.stringify(["a.jpg", 42, null]) })),
    new Set(["a.jpg"]),
  );
});

test("parseFavoritesJson accepts arrays and {favorites} objects, dedupes", () => {
  assert.deepEqual(parseFavoritesJson('["a.jpg","a.jpg",42,null]'), ["a.jpg"]);
  assert.deepEqual(parseFavoritesJson('{"favorites":["b.jpg"]}'), ["b.jpg"]);
  assert.deepEqual(parseFavoritesJson("not-json"), []);
  assert.deepEqual(parseFavoritesJson('{"other":[]}'), []);
});

test("fetchDriveFavoriteIds reads the JSON file listed in the folder", async () => {
  const fetchImpl = async (url) => {
    if (url.includes("alt=media")) return { ok: true, text: async () => '["drive:travel/a.jpg"]' };
    return { ok: true, json: async () => ({ files: [{ id: "JSON_1" }] }) };
  };
  const result = await fetchDriveFavoriteIds(fetchImpl, "ROOT");
  assert.deepEqual(result, { ids: ["drive:travel/a.jpg"], fileId: "JSON_1" });
});

test("fetchDriveFavoriteIds returns empty when the JSON file is missing", async () => {
  const result = await fetchDriveFavoriteIds(async () => ({ ok: true, json: async () => ({ files: [] }) }), "ROOT");
  assert.deepEqual(result, { ids: [], fileId: null });
});
