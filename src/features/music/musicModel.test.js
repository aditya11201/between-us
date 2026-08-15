import test from "node:test";
import assert from "node:assert/strict";
import {
  PLAYER_STORAGE_KEY,
  filterMusicCatalog,
  getNextSong,
  getPreviousAction,
  restorePlayerState,
  serializePlayerState,
  validateMusicCatalog,
} from "./musicModel.js";

const songs = [
  {
    id: "first-song",
    title: "First Song",
    artist: "Alpha",
    album: "One",
    genre: "Pop",
    src: "/assets/first.mp3",
    artwork: "/assets/first.webp",
  },
  {
    id: "second-song",
    title: "Second Song",
    artist: "Beta",
    album: "Two",
    genre: "Rock",
    src: "/assets/second.mp3",
    artwork: "/assets/second.webp",
  },
  {
    id: "third-song",
    title: "Third Song",
    artist: "Gamma",
    album: "Three",
    genre: "Jazz",
    src: "/assets/third.mp3",
    artwork: "/assets/third.webp",
  },
];

test("uses the Between Us music storage namespace", () => {
  assert.equal(PLAYER_STORAGE_KEY, "between-us.music.player");
});

test("validates complete unique catalog records", () => {
  assert.equal(validateMusicCatalog(songs), songs);
  assert.throws(
    () => validateMusicCatalog([...songs, { ...songs[0] }]),
    /duplicate song id/i,
  );
  assert.throws(
    () => validateMusicCatalog([{ ...songs[0], artwork: "" }]),
    /artwork/i,
  );
});

test("filters title, artist, album, and genre case-insensitively", () => {
  assert.deepEqual(filterMusicCatalog(songs, "third"), [songs[2]]);
  assert.deepEqual(filterMusicCatalog(songs, "BETA"), [songs[1]]);
  assert.deepEqual(filterMusicCatalog(songs, "two"), [songs[1]]);
  assert.deepEqual(filterMusicCatalog(songs, "jazz"), [songs[2]]);
  assert.deepEqual(filterMusicCatalog(songs, ""), songs);
});

test("selects sequential and repeat-all next songs", () => {
  assert.equal(getNextSong(songs, "first-song").id, "second-song");
  assert.equal(getNextSong(songs, "third-song", { repeat: "all" }).id, "first-song");
  assert.equal(getNextSong(songs, "third-song"), null);
});

test("selects a deterministic different song when shuffle is enabled", () => {
  assert.equal(
    getNextSong(songs, "first-song", { shuffle: true, random: 0 }).id,
    "second-song",
  );
});

test("previous restarts after three seconds and otherwise selects the previous song", () => {
  assert.deepEqual(getPreviousAction(songs, "second-song", 4), { type: "restart" });
  assert.deepEqual(getPreviousAction(songs, "second-song", 2), {
    type: "select",
    song: songs[0],
  });
  assert.deepEqual(getPreviousAction([], null, 0), { type: "none" });
});

test("restores only valid bounded state and ignores stale ids", () => {
  const restored = restorePlayerState(
    JSON.stringify({
      activeId: "missing-song",
      currentTime: 14,
      volume: 2,
      isMuted: true,
    }),
    songs,
  );

  assert.deepEqual(restored, {
    activeId: null,
    currentTime: 14,
    volume: 1,
    isMuted: true,
  });
  assert.deepEqual(restorePlayerState("not-json", songs), {
    activeId: null,
    currentTime: 0,
    volume: 0.7,
    isMuted: false,
  });
});

test("serializes the persisted player fields", () => {
  assert.equal(
    serializePlayerState({
      activeId: "first-song",
      currentTime: 12.5,
      volume: 0.4,
      isMuted: false,
    }),
    JSON.stringify({
      activeId: "first-song",
      currentTime: 12.5,
      volume: 0.4,
      isMuted: false,
    }),
  );
});
