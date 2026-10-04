import test from "node:test";
import assert from "node:assert/strict";
import {
  PLAYLISTS_STORAGE_KEY,
  PLAYER_STORAGE_KEY,
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  filterMusicCatalog,
  getNextSong,
  getPlaylistSongs,
  getPreviousAction,
  getRecentlyAdded,
  groupAlbums,
  groupArtists,
  isPlayable,
  removeSongFromPlaylist,
  renamePlaylist,
  resolveSongQuery,
  restorePlaylists,
  restorePlayerState,
  serializePlaylists,
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

test("groups same-named albums by artist instead of merging singles", () => {
  assert.equal(PLAYLISTS_STORAGE_KEY, "between-us.music.playlists");
  const catalog = [
    { id: "a", title: "Divide Song", artist: "Ed Sheeran", album: "Divide", src: "/a", artwork: "/a.webp" },
    { id: "b", title: "Ordinary", artist: "Alex Warren", album: "Single", src: "/b", artwork: "/b.webp" },
    { id: "c", title: "Risk It All", artist: "Bruno Mars", album: "Single", src: "/c", artwork: "/c.webp" },
    { id: "d", title: "Until I Found You", artist: "Stephen Sanchez", album: "Single", src: "/d", artwork: "/d.webp" },
  ];
  const albums = groupAlbums(catalog);
  assert.equal(albums.length, 4);
  assert.deepEqual(albums.map((album) => album.key), [
    "Divide|||Ed Sheeran",
    "Single|||Alex Warren",
    "Single|||Bruno Mars",
    "Single|||Stephen Sanchez",
  ]);
  assert.deepEqual(groupAlbums([]), []);
});

test("groups artists and orders recent songs by addedAt", () => {
  const catalog = [
    { id: "a", title: "Perfect", artist: "Ed Sheeran", src: "/a", artwork: "/a.webp", addedAt: "2026-08-02" },
    { id: "b", title: "Ordinary", artist: "Alex Warren", src: "/b", artwork: "/b.webp", addedAt: "2026-09-12" },
    { id: "c", title: "Risk It All", artist: "Bruno Mars", src: "/c", artwork: "/c.webp", addedAt: "2026-09-20" },
    { id: "d", title: "Until I Found You", artist: "Stephen Sanchez", src: "/d", artwork: "/d.webp", addedAt: "2026-09-28" },
  ];
  assert.deepEqual(groupArtists(catalog).map((artist) => artist.name), ["Alex Warren", "Bruno Mars", "Ed Sheeran", "Stephen Sanchez"]);
  assert.deepEqual(getRecentlyAdded(catalog).map((song) => song.id), ["d", "c", "b", "a"]);
  assert.deepEqual(groupArtists([]), []);
  assert.deepEqual(getRecentlyAdded([]), []);
});

test("supports the local playlist round-trip", () => {
  const catalog = [
    { id: "a", title: "A", artist: "Alpha", src: "/a", artwork: "/a.webp" },
    { id: "b", title: "B", artist: "Beta", src: "/b", artwork: "/b.webp" },
  ];
  const created = createPlaylist([], "Chill");
  assert.match(created.playlist.id, /^pl-/);
  assert.throws(() => createPlaylist(created.playlists, "  "), /required/);
  assert.throws(() => createPlaylist(created.playlists, "chill"), /already exists/);
  let playlists = addSongToPlaylist(created.playlists, created.playlist.id, "a", catalog);
  playlists = addSongToPlaylist(playlists, created.playlist.id, "a", catalog);
  playlists = addSongToPlaylist(playlists, created.playlist.id, "stale", catalog);
  assert.deepEqual(getPlaylistSongs(playlists[0], catalog).map((song) => song.id), ["a"]);
  playlists = removeSongFromPlaylist(playlists, created.playlist.id, "a");
  assert.deepEqual(playlists[0].songIds, []);
  playlists = renamePlaylist(playlists, created.playlist.id, "Focus");
  assert.equal(playlists[0].name, "Focus");
  playlists = deletePlaylist(playlists, created.playlist.id);
  assert.deepEqual(playlists, []);
  const restored = restorePlaylists(serializePlaylists([{ id: "pl-1", name: "Mix", songIds: ["a", "stale"], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }]), catalog);
  assert.deepEqual(restored[0].songIds, ["a"]);
  assert.deepEqual(restorePlaylists("broken", catalog), []);
});

test("resolves song queries by id, title, and substring", () => {
  assert.equal(resolveSongQuery(songs, "first-song"), songs[0]);
  assert.equal(resolveSongQuery(songs, "Second Song"), songs[1]);
  assert.equal(resolveSongQuery(songs, "third"), songs[2]);
  assert.equal(resolveSongQuery(songs, "BETA"), songs[1]);
  assert.equal(resolveSongQuery(songs, "the cure"), null);
  assert.equal(resolveSongQuery(songs, ""), null);
});

test("accepts optional lyrics in catalog records", () => {
  assert.equal(validateMusicCatalog([...songs, { ...songs[0], id: "with-lyrics", lyrics: "[00:01.00] hi" }]).length, 4);
  assert.equal(validateMusicCatalog([{ ...songs[0], lyrics: "" }]).length, 1);
  assert.throws(
    () => validateMusicCatalog([{ ...songs[0], id: "bad-lyrics", lyrics: 42 }]),
    /lyrics/i,
  );
});

test("flags empty-src templates as unplayable", () => {
  assert.equal(isPlayable({ src: "/a.mp3" }), true);
  assert.equal(isPlayable({ src: "" }), false);
  assert.equal(isPlayable({ src: "  " }), false);
  assert.equal(isPlayable(null), false);
  assert.throws(() => validateMusicCatalog([{ ...songs[0], id: "empty-src", src: "" }]), /audio/i);
});
