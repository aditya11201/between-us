import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compile } from "sass";
import {
  MY_SWEETENERS_ALBUM,
  MY_SWEETENERS_TRACKS,
} from "./mySweeteners.js";

const contentSource = readFileSync(new URL("./MusicContent.jsx", import.meta.url), "utf8");
const styleSource = compile(
  fileURLToPath(new URL("../../styles/components/Musics/Music.scss", import.meta.url)),
).css;

test("keeps the My Sweeteners album identity", () => {
  assert.equal(MY_SWEETENERS_ALBUM.id, "my-sweeteners");
  assert.equal(MY_SWEETENERS_ALBUM.title, "My Sweeteners");
  assert.equal(
    MY_SWEETENERS_ALBUM.description,
    "This playlist is a timeline of my heart. Every song marks exactly what I felt for you in that moment. If you ever wonder how I felt, just look at the date, press play, and listen.",
  );
});

test("keeps 34 ordered tracks with explicit flags on 24, 26, and 27", () => {
  assert.equal(MY_SWEETENERS_TRACKS.length, 34);
  const ids = MY_SWEETENERS_TRACKS.map((track) => track.id);
  assert.equal(new Set(ids).size, 34);
  ids.forEach((id, index) => {
    assert.match(id, new RegExp(`^my-sweeteners-${String(index + 1).padStart(2, "0")}-`));
  });
  for (const track of MY_SWEETENERS_TRACKS) {
    for (const field of ["title", "artist", "album", "duration"]) {
      assert.equal(typeof track[field], "string");
      assert.notEqual(track[field].trim(), "");
    }
    assert.equal(typeof track.explicit, "boolean");
  }
  const explicitIds = MY_SWEETENERS_TRACKS.filter((track) => track.explicit).map((track) => track.id);
  assert.deepEqual(explicitIds, [
    "my-sweeteners-24-i-hate-u-i-love-u",
    "my-sweeteners-26-casual",
    "my-sweeteners-27-the-less-i-know-the-better",
  ]);
  assert.equal(MY_SWEETENERS_TRACKS[0].title, "Dadi Siji");
  assert.equal(MY_SWEETENERS_TRACKS[33].title, "Take A Chance With Me");
});

test("pins the Albums template wiring", () => {
  assert.match(contentSource, /case "albums"/);
  assert.match(contentSource, /MY_SWEETENERS_TRACKS/);
  assert.match(styleSource, /\.music-album-tracks/);
});
