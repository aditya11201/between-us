import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compile } from "sass";
import { VIT_U_ALBUM, VIT_U_TRACKS } from "./vitU.js";

const contentSource = readFileSync(new URL("./MusicContent.jsx", import.meta.url), "utf8");
const styleSource = compile(
  fileURLToPath(new URL("../../styles/components/Musics/Music.scss", import.meta.url)),
).css;

test("keeps the vit u album identity", () => {
  assert.equal(VIT_U_ALBUM.id, "vit-u");
  assert.equal(VIT_U_ALBUM.title, "vit u");
  assert.equal(VIT_U_ALBUM.spotifyUrl, "https://open.spotify.com/playlist/0o45Hi4AIm48q2Y66aCxYJ");
  assert.notEqual(VIT_U_ALBUM.description.trim(), "");
});

test("keeps 50 ordered tracks with explicit flags on nine rows", () => {
  assert.equal(VIT_U_TRACKS.length, 50);
  const ids = VIT_U_TRACKS.map((track) => track.id);
  assert.equal(new Set(ids).size, 50);
  ids.forEach((id, index) => {
    assert.match(id, new RegExp(`^vit-u-${String(index + 1).padStart(2, "0")}-`));
  });
  for (const track of VIT_U_TRACKS) {
    for (const field of ["title", "artist", "album", "duration"]) {
      assert.equal(typeof track[field], "string");
      assert.notEqual(track[field].trim(), "");
    }
    assert.equal(typeof track.explicit, "boolean");
    assert.match(track.duration, /^\d+:\d{2}$/);
  }
  const explicitIds = VIT_U_TRACKS.filter((track) => track.explicit).map((track) => track.id);
  assert.deepEqual(explicitIds, [
    "vit-u-06-creepin",
    "vit-u-13-best-friend",
    "vit-u-16-wicked-games",
    "vit-u-30-somebody-else",
    "vit-u-36-lose",
    "vit-u-42-the-cure",
    "vit-u-47-all-too-well-sad-girl-autumn-version",
    "vit-u-48-the-1",
    "vit-u-49-always",
  ]);
  assert.equal(VIT_U_TRACKS[0].title, "drop dead");
  assert.equal(VIT_U_TRACKS[49].title, "Sick Feeling");
});

test("pins the vit u Albums template wiring", () => {
  assert.match(contentSource, /VIT_U_TRACKS/);
  assert.match(contentSource, /VIT_U_ALBUM/);
  assert.match(contentSource, /openAlbumId/);
  assert.match(contentSource, /music-album-tile/);
  assert.match(styleSource, /\.music-album-tracks/);
  assert.match(styleSource, /\.music-album-tile/);
});
