import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
  useMemo,
  memo,
} from "react";
import { WindowContext } from "@/windows";
import {
  FaPlay,
  FaPause,
  FaStepForward,
  FaStepBackward,
  FaRandom,
  FaSearch,
  FaVolumeUp,
  FaVolumeMute,
  FaPodcast,
  FaClock,
  FaUserFriends,
  FaCompactDisc,
  FaMusic,
  FaList,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { MdOutlineRepeat, MdOutlineRepeatOne } from "react-icons/md";
import { MUSIC_CATALOG } from "./musicCatalog.js";
import {
  GALLERY_AMBIENT,
  GALLERY_AMBIENT_COMMAND,
  GALLERY_AMBIENT_EVENT,
  GALLERY_AMBIENT_SONG_ID,
  MUSIC_LOCAL_EVENT,
  ambientState,
} from "./galleryAmbientMusic";
import { MY_SWEETENERS_ALBUM, MY_SWEETENERS_TRACKS } from "./mySweeteners.js";
import { VIT_U_ALBUM, VIT_U_TRACKS } from "./vitU.js";
import {
  PLAYER_STORAGE_KEY,
  PLAYLISTS_STORAGE_KEY,
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
  removeSongFromPlaylist,
  renamePlaylist,
  restorePlaylists,
  restorePlayerState,
  serializePlaylists,
  serializePlayerState,
} from "./musicModel.js";
import { getActiveLyricIndex, parseLRC } from "./lyricsParser.js";

function formatTime(sec) {
  if (!sec || Number.isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const getInitialPlayerState = () => {
  if (typeof window === "undefined") return restorePlayerState(null, MUSIC_CATALOG);
  try {
    const restored = restorePlayerState(
      window.localStorage.getItem(PLAYER_STORAGE_KEY),
      MUSIC_CATALOG,
    );
    // ponytail: the ambient track is gallery-timed, never restored — IDM
    // grabs the audio when a persisted activeId auto-loads it on next boot.
    if (restored.activeId === GALLERY_AMBIENT_SONG_ID) {
      return { ...restored, activeId: null, currentTime: 0 };
    }
    return restored;
  } catch {
    return restorePlayerState(null, MUSIC_CATALOG);
  }
};
// ponytail: the ambient track is gallery-timed, never restored — IDM grabs
// the MP3 when a persisted activeId auto-loads it on next boot. Scrubbed at
// module import (runs on first chunk load, before any component mounts), so
// a pre-fix stored id never survives to trigger a fetch.
try {
  const stored = window.localStorage.getItem(PLAYER_STORAGE_KEY);
  if (stored && stored.includes(GALLERY_AMBIENT_SONG_ID)) {
    const parsed = JSON.parse(stored);
    if (parsed?.activeId === GALLERY_AMBIENT_SONG_ID) {
      window.localStorage.setItem(
        PLAYER_STORAGE_KEY,
        serializePlayerState({ ...parsed, activeId: null, currentTime: 0 }),
      );
    }
  }
} catch {
  // Storage can be unavailable in private or restricted browsing contexts.
}

function isCurrentAudioSource(audio, expectedSource, audioRef, audioSourceRef) {
  const currentSource = audioSourceRef.current;
  return audio === audioRef.current
    && currentSource.id === expectedSource.id
    && currentSource.generation === expectedSource.generation;
}

const SongCard = memo(function SongCard({ song, isActive, isPlaying, onSelect, onToggle }) {
  const [artworkFailed, setArtworkFailed] = useState(false);

  return (
    <article
      className={`music-card${isActive ? " music-card--active" : ""}${isPlaying ? " music-card--playing" : ""}`}
    >
      <button
        type="button"
        className="music-card-main"
        aria-label={`${isPlaying ? "Pause" : "Play"} ${song.title} by ${song.artist}`}
        aria-pressed={isPlaying}
        onClick={() => onSelect(song.id)}
      >
        <div className="music-card-art">
          {artworkFailed ? (
            <div className="music-card-art-fallback" aria-hidden="true">
              <FaCompactDisc />
            </div>
          ) : (
            <img
              src={song.artwork}
              alt={`${song.title} artwork`}
              onError={() => setArtworkFailed(true)}
              loading="lazy"
              draggable={false}
            />
          )}
          {isPlaying && (
            <span className="music-card-equalizer" aria-hidden="true">
              <i /><i /><i />
            </span>
          )}
        </div>
        <div className="music-card-meta">
          <strong>{song.title}</strong>
          {song.explicit && <span className="music-card-explicit">E</span>}
          <span>{song.artist}</span>
        </div>
      </button>
      <button
        type="button"
        className="music-card-play"
        aria-label={`${isPlaying ? "Pause" : "Play"} ${song.title}`}
        aria-pressed={isPlaying}
        onClick={() => onToggle(song.id)}
      >
        {isPlaying ? <FaPause /> : <FaPlay />}
      </button>
    </article>
  );
});

function MusicShelf({ songs, gridMode, activeId, isPlaying, onSelect, onToggle }) {
  const shelfRef = useRef(null);
  const [navigation, setNavigation] = useState({ previous: false, next: false });

  const updateNavigation = useCallback(() => {
    const shelf = shelfRef.current;
    if (!shelf || gridMode) {
      setNavigation({ previous: false, next: false });
      return;
    }
    setNavigation({
      previous: shelf.scrollLeft > 4,
      next: shelf.scrollLeft < shelf.scrollWidth - shelf.clientWidth - 4,
    });
  }, [gridMode]);

  useEffect(() => {
    const shelf = shelfRef.current;
    if (!shelf) return undefined;
    updateNavigation();
    shelf.addEventListener("scroll", updateNavigation, { passive: true });
    window.addEventListener("resize", updateNavigation);
    const resizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(updateNavigation)
      : null;
    resizeObserver?.observe(shelf);
    return () => {
      shelf.removeEventListener("scroll", updateNavigation);
      window.removeEventListener("resize", updateNavigation);
      resizeObserver?.disconnect();
    };
  }, [songs.length, gridMode, updateNavigation]);

  const scrollShelf = (direction) => {
    const shelf = shelfRef.current;
    shelf?.scrollBy({
      left: direction * (shelf?.clientWidth || 0) * 0.85,
      behavior: typeof window !== "undefined"
        && typeof window.matchMedia === "function"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <div className="music-shelf-wrap">
      {!gridMode && navigation.previous && (
        <button
          type="button"
          className="music-shelf-arrow music-shelf-arrow--previous"
          onClick={() => scrollShelf(-1)}
          aria-label="Scroll songs left"
        >
          <FaChevronLeft />
        </button>
      )}
      <div
        ref={shelfRef}
        className={`music-shelf${gridMode ? " music-shelf--grid" : ""}`}
        aria-label="Song list"
      >
        {songs.map((song) => (
          <SongCard
            key={song.id}
            song={song}
            isActive={song.id === activeId}
            isPlaying={song.id === activeId && isPlaying}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
      </div>
      {!gridMode && navigation.next && (
        <button
          type="button"
          className="music-shelf-arrow music-shelf-arrow--next"
          onClick={() => scrollShelf(1)}
          aria-label="Scroll songs right"
        >
          <FaChevronRight />
        </button>
      )}
    </div>
  );
}

const CollectionCard = memo(function CollectionCard({ artwork, title, subtitle, label, onOpen }) {
  const [artworkFailed, setArtworkFailed] = useState(false);

  return (
    <article className="music-card">
      <button
        type="button"
        className="music-card-main"
        aria-label={`${label}: ${title}`}
        onClick={onOpen}
      >
        <div className="music-card-art">
          {artworkFailed || !artwork ? (
            <div className="music-card-art-fallback" aria-hidden="true">
              <FaCompactDisc />
            </div>
          ) : (
            <img
              src={artwork}
              alt={`${title} artwork`}
              onError={() => setArtworkFailed(true)}
              loading="lazy"
              draggable={false}
            />
          )}
        </div>
        <div className="music-card-meta">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
      </button>
    </article>
  );
});

function TrackRow({ index, song, isActive, isPlaying, badge, onPlay, action }) {
  return (
    <div className={`music-track-row${isActive ? " music-track-row--active" : ""}`}>
      <span className="music-track-num" aria-hidden="true">{index + 1}</span>
      <button
        type="button"
        className="music-track-main"
        onClick={onPlay}
        aria-label={`${isPlaying ? "Pause" : "Play"} ${song.title} by ${song.artist}`}
      >
        <span className="music-track-title">
          {song.title}
          {song.explicit && <span className="music-track-explicit">E</span>}
        </span>
        <span className="music-track-artist">{song.artist}</span>
      </button>
      {badge && <span className="music-track-badge">{badge}</span>}
      <button
        type="button"
        className="music-track-play"
        onClick={onPlay}
        aria-label={`${isPlaying ? "Pause" : "Play"} ${song.title}`}
        aria-pressed={isPlaying}
      >
        {isPlaying ? <FaPause /> : <FaPlay />}
      </button>
      {action}
    </div>
  );
}

export function MusicContent() {
  const { onClose, onMinimize, onZoom, onTitleMouseDown } = useContext(WindowContext);
  const songs = MUSIC_CATALOG;
  const [initialPlayerState] = useState(getInitialPlayerState);
  const [activeId, setActiveId] = useState(initialPlayerState.activeId);
  const [currentTime, setCurrentTime] = useState(initialPlayerState.currentTime);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(initialPlayerState.volume);
  const [isMuted, setIsMuted] = useState(initialPlayerState.isMuted);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("songs");
  const [openAlbumId, setOpenAlbumId] = useState(null);
  const [gridMode, setGridMode] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);
  const [lyricFx, setLyricFx] = useState({ armed: false, songId: null });
  const [sourceLoadRequest, setSourceLoadRequest] = useState(0);
  const [nowPlayingArtworkFailed, setNowPlayingArtworkFailed] = useState(false);
  const [queue, setQueue] = useState(songs);
  const [selectedAlbumKey, setSelectedAlbumKey] = useState(null);
  const [selectedArtistKey, setSelectedArtistKey] = useState(null);
  const [playlists, setPlaylists] = useState(() => {
    if (typeof window === "undefined") return restorePlaylists(null, MUSIC_CATALOG);
    try {
      return restorePlaylists(window.localStorage.getItem(PLAYLISTS_STORAGE_KEY), MUSIC_CATALOG);
    } catch {
      return restorePlaylists(null, MUSIC_CATALOG);
    }
  });
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [playlistError, setPlaylistError] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState(null);
  const [addSongId, setAddSongId] = useState("");
  useEffect(() => {
    try {
      window.localStorage.setItem(PLAYLISTS_STORAGE_KEY, serializePlaylists(playlists));
    } catch {
      // Storage can be unavailable in private or restricted browsing contexts.
    }
  }, [playlists]);

  const audioRef = useRef(null);
  const pendingSeekRef = useRef(initialPlayerState.currentTime);
  const pendingAutoplayRef = useRef(false);
  const audioSourceRef = useRef({ id: null, generation: 0 });
  const sourceGenerationRef = useRef(0);
  const metadataLoadedRef = useRef(false);
  const playerStateRef = useRef(initialPlayerState);
  const handleEndedRef = useRef(null);

  const filteredSongs = useMemo(
    () => filterMusicCatalog(songs, searchQuery),
    [songs, searchQuery],
  );
  const activeSong = useMemo(
    () => songs.find((song) => song.id === activeId) || null,
    [songs, activeId],
  );

  const persistPlayerState = useCallback(() => {
    try {
      window.localStorage.setItem(
        PLAYER_STORAGE_KEY,
        serializePlayerState(playerStateRef.current),
      );
    } catch {
      // Storage can be unavailable in private or restricted browsing contexts.
    }
  }, []);

  useEffect(() => {
    playerStateRef.current = { activeId, currentTime, volume, isMuted };
    // ponytail: the ambient track is gallery-timed, never restored — IDM
    // grabs the MP3 when a persisted activeId auto-loads it on next boot.
    // Import-time scrub already removed pre-fix ids; this guards new writes.
    if (activeId === GALLERY_AMBIENT_SONG_ID) return;
    persistPlayerState();
  }, [activeId, volume, isMuted, persistPlayerState]);

  const persistAudioTime = useCallback((expectedSource = null) => {
    try {
      const audio = audioRef.current;
      const state = playerStateRef.current;
      const currentSource = audioSourceRef.current;
      if (
        expectedSource
        && (
          !isCurrentAudioSource(audio, expectedSource, audioRef, audioSourceRef)
          || state.activeId !== expectedSource.id
        )
      ) {
        return;
      }
      const currentAudioTime = metadataLoadedRef.current
        && pendingSeekRef.current === 0
        && currentSource.id === state.activeId
        && audio
        && Number.isFinite(audio.currentTime)
        ? audio.currentTime
        : state.currentTime;
      const nextState = { ...state, currentTime: currentAudioTime };
      // ponytail: the ambient track is gallery-timed, never restored — IDM
      // grabs the audio when a persisted activeId auto-loads it on boot.
      if (nextState.activeId === GALLERY_AMBIENT_SONG_ID) return;
      playerStateRef.current = nextState;
      window.localStorage.setItem(
        PLAYER_STORAGE_KEY,
        serializePlayerState(nextState),
      );
    } catch {
      // Storage can be unavailable in private or restricted browsing contexts.
    }
  }, []);

  // ponytail: mirror of the gallery ambient session. While mirrored, Music
  // shows the ambient track as playing (Pause/equalizer/spin) without
  // producing local audio; transport + slider drive the bridge instead.
  const ambientMirrorRef = useRef(null);
  const [mirrorId, setMirrorId] = useState(null);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const isAmbientTrack = activeId === ambientState.songId && ambientState.songId !== null;
  const effectivePlaying = isPlaying || (mirrorId !== null && mirrorId === activeId && ambientPlaying);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      audio.muted = isMuted;
    }
  }, [volume, isMuted]);

  const lyricLines = useMemo(
    () => parseLRC(activeSong?.lyrics ?? ""),
    [activeSong],
  );
  const activeLyricIndex = getActiveLyricIndex(lyricLines, currentTime);

  useEffect(() => {
    const adoptMirror = (songId, ambientVolume, ambientTime) => {
      pendingAutoplayRef.current = false;
      pendingSeekRef.current = ambientTime ?? 0;
      setIsMuted(false);
      setIsPlaying(false);
      setActiveId(songId);
      ambientMirrorRef.current = { id: songId, generation: -1 };
      setMirrorId(songId);
      // ponytail: adopt reads the start-event volume only and leaves the
      // slider user-controlled afterwards; the volume effect never bridges,
      // so only explicit slider/mute gestures reach the ambient gain.
      // Adopt from silence keeps 0 so the slider can follow the fade up.
      if (ambientVolume !== undefined && ambientVolume > 0) setVolume(ambientVolume);
      else if (ambientVolume === 0) setVolume(0);
      setAmbientPlaying(true);
      // ponytail: adopt would trigger a blob fetch + autoplay; force silence —
      // the ambient session owns audible output, Music only mirrors state.
      queueMicrotask(() => {
        pendingAutoplayRef.current = false;
        audioRef.current?.pause();
      });
    };
    // Late-open Music window joins a running ambient session — even when a
    // restored activeId already points at the song (no mirror flag yet).
    if (
      ambientState.playing
      && ambientState.songId
      && ambientMirrorRef.current?.id !== ambientState.songId
    ) {
      adoptMirror(ambientState.songId, ambientState.volume, ambientState.currentTime);
      return undefined;
    }
    const onAmbient = (event) => {
      const { playing, songId, volume: ambientVolume, currentTime: ambientTime } = event.detail ?? {};
      if (!songId) return;
      // ponytail: bridge events fire on (re)start and stop only — no
      // per-tick gain follow, so the fade ramp runs without echo churn.
      if (playing) {
        if (ambientMirrorRef.current?.id === songId) return;
        adoptMirror(songId, ambientVolume, ambientTime);
      } else if (ambientMirrorRef.current?.id === songId) {
        ambientMirrorRef.current = null;
        setMirrorId(null);
        setAmbientPlaying(false);
        audioRef.current?.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener(GALLERY_AMBIENT_EVENT, onAmbient);
    return () => window.removeEventListener(GALLERY_AMBIENT_EVENT, onAmbient);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ambientState.songId) return undefined;
    // ponytail: only audible local playback takes over the ambient session.
    // The silent mirror only displays the bridge (never loads audio), so its
    // pause/volume programmatic events must not dispatch stop/set-volume —
    // that is what killed the song at random moments mid-session.
    if (ambientMirrorRef.current || !isAmbientTrack) return undefined;
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onPlay = () => {
      if (ambientMirrorRef.current || audio.paused) return;
      ambientMirrorRef.current = null;
      window.dispatchEvent(new CustomEvent(MUSIC_LOCAL_EVENT, { detail: { playing: true } }));
      window.dispatchEvent(
        new CustomEvent(GALLERY_AMBIENT_COMMAND, { detail: { action: "stop" } }),
      );
    };
    const onVolume = () => {
      if (ambientMirrorRef.current || audio.paused) return;
      window.dispatchEvent(
        new CustomEvent(GALLERY_AMBIENT_COMMAND, {
          detail: { action: "set-volume", volume: audio.muted ? 0 : audio.volume },
        }),
      );
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("volumechange", onVolume);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("volumechange", onVolume);
    };
  }, [isAmbientTrack]);

  useEffect(() => {
    setNowPlayingArtworkFailed(false);
  }, [activeSong?.id]);

  const tryPlay = useCallback(() => {
    const audio = audioRef.current;
    const source = audioSourceRef.current;
    if (!audio || !source.id || !source.ready) return;

    const handleRejectedPlay = () => {
      if (
        !isCurrentAudioSource(audio, source, audioRef, audioSourceRef)
        || playerStateRef.current.activeId !== source.id
      ) {
        return;
      }
      pendingAutoplayRef.current = false;
      setIsPlaying(false);
      setPlaybackError("Press Play to retry");
    };

    try {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(handleRejectedPlay);
      }
    } catch {
      handleRejectedPlay();
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    // ponytail: the ambient track is gallery-timed, never restored — skip
    // loading it here entirely so no audio fetch ever fires for it on boot
    // (this is what IDM was grabbing). Mirror adopt below shows metadata only.
    if (activeSong?.id === GALLERY_AMBIENT_SONG_ID && !ambientMirrorRef.current) {
      pendingAutoplayRef.current = false;
      setDuration(0);
      setCurrentTime(0);
      return undefined;
    }

    // ponytail: mirror adopt shows metadata only; the ambient session owns
    // audible output, so skip the load/autoplay entirely.
    if (ambientMirrorRef.current?.id === activeSong?.id) {
      pendingAutoplayRef.current = false;
      audio.pause();
      setDuration(0);
      setCurrentTime(pendingSeekRef.current ?? 0);
      return undefined;
    }

    const source = {
      id: activeSong?.id ?? null,
      generation: sourceGenerationRef.current + 1,
      ready: false,
    };
    const isCurrent = () => isCurrentAudioSource(audio, source, audioRef, audioSourceRef);
    const onLoadedMetadata = () => {
      if (!isCurrent() || playerStateRef.current.activeId !== source.id) return;
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const savedTime = pendingSeekRef.current;
      const nextTime = savedTime > 0 && savedTime < nextDuration ? savedTime : 0;
      metadataLoadedRef.current = true;
      if (nextTime > 0) audio.currentTime = nextTime;
      pendingSeekRef.current = 0;
      setDuration(nextDuration);
      setCurrentTime(nextTime);
      playerStateRef.current = { ...playerStateRef.current, currentTime: nextTime };
      // ponytail: never persist the gallery-timed track (see IDM note above).
      if (source.id !== ambientState.songId) persistAudioTime(source);
      if (pendingAutoplayRef.current) {
        pendingAutoplayRef.current = false;
        tryPlay();
      }
    };
    const onTimeUpdate = () => {
      if (!isCurrent() || playerStateRef.current.activeId !== source.id) return;
      const nextTime = audio.currentTime;
      playerStateRef.current = { ...playerStateRef.current, currentTime: nextTime };
      setCurrentTime(nextTime);
    };
    const onPlay = () => {
      if (!isCurrent() || playerStateRef.current.activeId !== source.id) return;
      setIsPlaying(true);
      setPlaybackError(null);
    };
    const onPause = () => {
      if (!isCurrent() || playerStateRef.current.activeId !== source.id) return;
      if (
        metadataLoadedRef.current
        && pendingSeekRef.current === 0
        && Number.isFinite(audio.currentTime)
      ) {
        playerStateRef.current = {
          ...playerStateRef.current,
          currentTime: audio.currentTime,
        };
        setCurrentTime(audio.currentTime);
      }
      setIsPlaying(false);
      // ponytail: never persist the gallery-timed track (see IDM note above).
      if (metadataLoadedRef.current && source.id !== ambientState.songId) persistAudioTime(source);
    };
    const onError = () => {
      if (!isCurrent() || playerStateRef.current.activeId !== source.id) return;
      pendingAutoplayRef.current = false;
      setIsPlaying(false);
      setPlaybackError("This audio file could not be played");
    };
    const onEnded = () => {
      if (!isCurrent() || playerStateRef.current.activeId !== source.id) return;
      handleEndedRef.current?.();
    };

    if (activeSong) {
      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      audio.addEventListener("error", onError);
      audio.addEventListener("ended", onEnded);

      // ponytail: stream the catalog URL directly — no fetch+blob copy, so
      // IDM never sees a downloadable audio response to grab.
      audioSourceRef.current = { ...source, ready: true };
      audio.preload = "metadata";
      if (audio.getAttribute("src") !== activeSong.src) audio.src = activeSong.src;
      audio.load();
      setDuration(0);
      setCurrentTime(pendingSeekRef.current);
    } else {
      pendingAutoplayRef.current = false;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setDuration(0);
      setCurrentTime(0);
    }

    return () => {
      // ponytail: never persist the gallery-timed track (see IDM note above).
      if (source.id && source.id !== ambientState.songId && metadataLoadedRef.current) persistAudioTime(source);
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", onEnded);
      audio.removeAttribute("src");
      audio.load();
      metadataLoadedRef.current = false;
      audioSourceRef.current = { id: null, generation: source.generation, ready: false };
    };
  }, [activeSong?.id, persistAudioTime, sourceLoadRequest, tryPlay]);


  const requestSourcePlayback = useCallback(() => {
    const source = audioSourceRef.current;
    const needsReload = !source.ready
      || playbackError === "This audio file could not be loaded"
      || playbackError === "This audio file could not be played";

    if (needsReload) {
      pendingAutoplayRef.current = true;
      setPlaybackError(null);
      setSourceLoadRequest((value) => value + 1);
      return;
    }

    tryPlay();
  }, [playbackError, tryPlay]);

  const handleBeforeUnload = useCallback(() => {
    persistAudioTime();
  }, [persistAudioTime]);

  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      persistAudioTime();
    };
  }, [handleBeforeUnload, persistAudioTime]);

  const selectSongForPlayback = useCallback((song, contextList = null) => {
    if (!song) return;
    if (Array.isArray(contextList)) setQueue(contextList);
    // ponytail: manual pick leaves the mirror; the bridge no longer owns output.
    ambientMirrorRef.current = null;
    setMirrorId(null);
    setAmbientPlaying(false);
    // ponytail: never persist the gallery-timed track — IDM grabs the MP3
    // when a persisted activeId auto-loads it on next boot.
    if (song.id !== ambientState.songId) persistAudioTime();
    const isSameSong = song.id === activeId;
    if (isSameSong) {
      // ponytail: same-song restart after a mirror session has no loaded
      // source — bump the load generation so it restreams, then play.
      pendingSeekRef.current = 0;
      setCurrentTime(0);
      setPlaybackError(null);
      setSourceLoadRequest((value) => value + 1);
      pendingAutoplayRef.current = true;
      return;
    }

    pendingSeekRef.current = 0;
    pendingAutoplayRef.current = true;
    setPlaybackError(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveId(song.id);
  }, [activeId, persistAudioTime, requestSourcePlayback]);

  const stopAmbientBridge = useCallback(() => {
    ambientMirrorRef.current = null;
    setMirrorId(null);
    setAmbientPlaying(false);
    window.dispatchEvent(
      new CustomEvent(GALLERY_AMBIENT_COMMAND, { detail: { action: "stop" } }),
    );
  }, []);

  const playSongById = useCallback((id) => {
    const song = songs.find((item) => item.id === id);
    if (!song) return null;
    selectSongForPlayback(song);
    return song;
  }, [selectSongForPlayback, songs]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const armLyricFx = useCallback((songId) => {
    setLyricFx({ armed: true, songId });
  }, []);

  const disarmLyricFx = useCallback(() => {
    setLyricFx({ armed: false, songId: null });
  }, []);

  musicBridgeRef.current = {
    songs,
    activeSong,
    activeId,
    currentTime,
    duration,
    isPlaying: effectivePlaying,
    lyricLines,
    activeLyricIndex,
    lyricFxArmed: lyricFx.armed,
    lyricFxSongId: lyricFx.songId,
    playSongById,
    pause,
    armLyricFx,
    disarmLyricFx,
  };

  useEffect(() => {
    emitMusicBridge();
  });
  const handleCardSelect = useCallback((id, contextList = null) => {
    const source = Array.isArray(contextList) ? contextList : songs;
    const song = source.find((item) => item.id === id) ?? songs.find((item) => item.id === id);
    if (!song) return;
    if (song.id === activeId) {
      // Mirror row drives the ambient session when it shows the ambient track.
      if (mirrorId === song.id) {
        if (ambientState.playing) stopAmbientBridge();
        else selectSongForPlayback(song);
        return;
      }
      if (isPlaying) audioRef.current?.pause();
      else requestSourcePlayback();
      return;
    }
    selectSongForPlayback(song, Array.isArray(contextList) ? contextList : undefined);
  }, [activeId, isPlaying, mirrorId, requestSourcePlayback, selectSongForPlayback, songs, stopAmbientBridge]);

  const handleEnded = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !activeSong) return;

    if (repeat === "one") {
      audio.currentTime = 0;
      playerStateRef.current = { ...playerStateRef.current, currentTime: 0 };
      setCurrentTime(0);
      pendingAutoplayRef.current = false;
      setIsPlaying(false);
      tryPlay();
      return;
    }

    const context = queue.length ? queue : songs;
    const next = getNextSong(context, activeId, {
      shuffle,
      repeat: repeat === "all" ? "all" : "none",
      random: Math.random(),
    });
    if (!next) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    selectSongForPlayback(next);
  }, [activeId, activeSong, queue, repeat, selectSongForPlayback, shuffle, songs, tryPlay]);

  useEffect(() => {
    handleEndedRef.current = handleEnded;
  }, [handleEnded]);

  const handleNext = useCallback(() => {
    const context = queue.length ? queue : songs;
    const next = getNextSong(context, activeId, {
      shuffle,
      repeat: repeat === "all" ? "all" : "none",
      random: Math.random(),
    });
    if (!next) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    selectSongForPlayback(next);
  }, [activeId, queue, repeat, selectSongForPlayback, shuffle, songs]);

  const handlePrevious = useCallback(() => {
    const context = queue.length ? queue : songs;
    const previous = getPreviousAction(
      context,
      activeId,
      audioRef.current?.currentTime ?? 0,
    );
    if (previous.type === "restart") {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      playerStateRef.current = { ...playerStateRef.current, currentTime: 0 };
      setCurrentTime(0);
    } else if (previous.type === "select") {
      selectSongForPlayback(previous.song);
    }
  }, [activeId, queue, selectSongForPlayback, songs]);

  const handlePlayPause = useCallback(() => {
    // Mirror session: transport pauses the ambient bridge, never local audio.
    if (mirrorId !== null && activeSong && mirrorId === activeSong.id) {
      if (ambientState.playing) stopAmbientBridge();
      else selectSongForPlayback(activeSong);
      return;
    }
    if (!activeSong) {
      const context = queue.length ? queue : songs;
      if (context[0]) selectSongForPlayback(context[0], context);
      return;
    }
    if (isPlaying) audioRef.current?.pause();
    else requestSourcePlayback();
  }, [activeSong, isPlaying, mirrorId, queue, requestSourcePlayback, selectSongForPlayback, songs, stopAmbientBridge]);

  const cycleRepeat = () => {
    setRepeat((value) => (
      value === "none" ? "all" : value === "all" ? "one" : "none"
    ));
  };

  const handleClose = useCallback(() => {
    persistAudioTime();
    audioRef.current?.pause();
    onClose();
  }, [onClose, persistAudioTime]);

  const RepeatIcon = repeat === "one" ? MdOutlineRepeatOne : MdOutlineRepeat;

  const renderMainContent = () => {
    switch (activeSection) {
      case "songs":
        return (
          <section className="music-library" aria-label="It's About You">
            <header className="music-library-header">
              <h1>It's About You</h1>
              <button
                type="button"
                className="music-see-all"
                onClick={() => setGridMode((value) => !value)}
                aria-pressed={gridMode}
              >
                {gridMode ? "See Less" : "See All"}
                {gridMode ? <FaChevronLeft /> : <FaChevronRight />}
              </button>
            </header>
            {filteredSongs.length ? (
              <MusicShelf
                songs={filteredSongs}
                gridMode={gridMode}
                activeId={activeId}
                isPlaying={effectivePlaying}
                onSelect={(id) => handleCardSelect(id, filteredSongs)}
                onToggle={(id) => handleCardSelect(id, filteredSongs)}
              />
            ) : (
              <div className="music-empty" role="status">
                <FaMusic className="music-empty-icon" />
                <p>{searchQuery ? "No songs match your search" : "Your library is empty"}</p>
                <p className="music-empty-sub">Add bundled audio and artwork under src/content/music.</p>
              </div>
            )}
          </section>
        );
      case "albums": {
        const visible = searchQuery ? filterMusicCatalog(songs, searchQuery) : songs;
        const albums = groupAlbums(visible);
        const curatedEntries = [
          { album: MY_SWEETENERS_ALBUM, tracks: MY_SWEETENERS_TRACKS },
          { album: VIT_U_ALBUM, tracks: VIT_U_TRACKS },
        ];
        const albumQuery = searchQuery.trim().toLowerCase();
        const visibleCurated = curatedEntries.filter(({ album, tracks }) => !albumQuery
          || album.title.toLowerCase().includes(albumQuery)
          || filterMusicCatalog(tracks, searchQuery).length > 0);
        const openCurated = curatedEntries.find(({ album }) => album.id === openAlbumId) ?? null;
        const selected = albums.find((album) => album.key === selectedAlbumKey);
        if (selected) {
          return (
            <section className="music-library" aria-label={selected.name}>
              <button type="button" className="music-detail-back" onClick={() => setSelectedAlbumKey(null)}>‹ Albums</button>
              <header className="music-detail-header">
                <h1>{selected.name}</h1>
                <p>{selected.artist} • {selected.count} songs</p>
                <button type="button" className="music-play-all-btn" onClick={() => selected.songs[0] && selectSongForPlayback(selected.songs[0], selected.songs)}>Play All</button>
              </header>
              <div className="music-track-list">
                {selected.songs.map((song, index) => (
                  <TrackRow key={song.id} index={index} song={song} isActive={song.id === activeId} isPlaying={song.id === activeId && effectivePlaying} onPlay={() => handleCardSelect(song.id, selected.songs)} />
                ))}
              </div>
            </section>
          );
        }
        const renderCuratedAlbum = (album, tracks) => {
          const albumTracks = filterMusicCatalog(tracks, searchQuery);
          return (
            <div key={album.id}>
              <button type="button" className="music-album-back" onClick={() => setOpenAlbumId(null)}>
                <FaChevronLeft /> Albums
              </button>
              <div className="music-album">
                <div className="music-album-cover" aria-hidden="true">
                  <FaCompactDisc />
                </div>
                <div className="music-album-info">
                  <h2>{album.title}</h2>
                  <p>{album.description}</p>
                  <span>{`${tracks.length} songs`}</span>
                </div>
              </div>
              {albumTracks.length ? (
                <ol className="music-album-tracks">
                  {albumTracks.map((track) => (
                    <li key={track.id} className="music-album-row">
                      <span className="music-album-num">{tracks.indexOf(track) + 1}</span>
                      <span className="music-album-thumb" aria-hidden="true">
                        <FaCompactDisc />
                      </span>
                      <span className="music-album-meta">
                        <span className="music-album-title">
                          {track.title}
                          {track.explicit ? <span className="music-album-explicit">E</span> : null}
                        </span>
                        <span className="music-album-sub">{`${track.artist} • ${track.album}`}</span>
                      </span>
                      <span className="music-album-duration">{track.duration}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="music-empty" role="status">
                  <FaMusic className="music-empty-icon" />
                  <p>No songs match your search</p>
                </div>
              )}
            </div>
          );
        };
        return (
          <section className="music-library" aria-label="Albums">
            <header className="music-library-header">
              <h1>Albums</h1>
            </header>
            {openCurated ? (
              renderCuratedAlbum(openCurated.album, openCurated.tracks)
            ) : albums.length || visibleCurated.length ? (
              <>
                {albums.length ? (
                  <div className="music-shelf music-shelf--grid" aria-label="Album list">
                    {albums.map((album) => (
                      <CollectionCard key={album.key} artwork={album.artwork} title={album.name} subtitle={`${album.artist} • ${album.count} songs`} label="Album" onOpen={() => setSelectedAlbumKey(album.key)} />
                    ))}
                  </div>
                ) : null}
                {visibleCurated.length ? (
                  <div className="music-album-grid">
                    {visibleCurated.map(({ album, tracks }) => (
                      <button
                        type="button"
                        key={album.id}
                        className="music-album-tile"
                        onClick={() => setOpenAlbumId(album.id)}
                        aria-label={`Open ${album.title}`}
                      >
                        <span className="music-album-tile-cover" aria-hidden="true">
                          <FaCompactDisc />
                        </span>
                        <span className="music-album-tile-title">{album.title}</span>
                        <span className="music-album-tile-count">{`${tracks.length} songs`}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="music-empty" role="status">
                <FaCompactDisc className="music-empty-icon" />
                <p>No albums match your search</p>
              </div>
            )}
          </section>
        );
      }
      case "artists": {
        const visible = searchQuery ? filterMusicCatalog(songs, searchQuery) : songs;
        const artists = groupArtists(visible);
        const selected = artists.find((artist) => artist.key === selectedArtistKey);
        if (selected) {
          return (
            <section className="music-library" aria-label={selected.name}>
              <button type="button" className="music-detail-back" onClick={() => setSelectedArtistKey(null)}>‹ Artists</button>
              <header className="music-detail-header">
                <h1>{selected.name}</h1>
                <p>{selected.count} songs</p>
                <button type="button" className="music-play-all-btn" onClick={() => selected.songs[0] && selectSongForPlayback(selected.songs[0], selected.songs)}>Play All</button>
              </header>
              <div className="music-track-list">
                {selected.songs.map((song, index) => (
                  <TrackRow key={song.id} index={index} song={song} isActive={song.id === activeId} isPlaying={song.id === activeId && effectivePlaying} onPlay={() => handleCardSelect(song.id, selected.songs)} />
                ))}
              </div>
            </section>
          );
        }
        return (
          <section className="music-library" aria-label="Artists">
            <header className="music-library-header">
              <h1>Artists</h1>
            </header>
            {artists.length ? (
              <div className="music-shelf music-shelf--grid" aria-label="Artist list">
                {artists.map((artist) => (
                  <CollectionCard key={artist.key} artwork={artist.artwork} title={artist.name} subtitle={`${artist.count} songs`} label="Artist" onOpen={() => setSelectedArtistKey(artist.key)} />
                ))}
              </div>
            ) : (
              <div className="music-empty" role="status">
                <FaUserFriends className="music-empty-icon" />
                <p>No artists match your search</p>
              </div>
            )}
          </section>
        );
      }
      case "recent": {
        const visible = getRecentlyAdded(filterMusicCatalog(songs, searchQuery));
        return (
          <section className="music-library" aria-label="Recently Added">
            <header className="music-library-header">
              <h1>Recently Added</h1>
            </header>
            {visible.length ? (
              <div className="music-track-list">
                {visible.map((song, index) => (
                  <TrackRow key={song.id} index={index} song={song} isActive={song.id === activeId} isPlaying={song.id === activeId && effectivePlaying} badge={song.addedAt} onPlay={() => handleCardSelect(song.id, visible)} />
                ))}
              </div>
            ) : (
              <div className="music-empty" role="status">
                <FaClock className="music-empty-icon" />
                <p>{searchQuery ? "No songs match your search" : "No recently added songs"}</p>
              </div>
            )}
          </section>
        );
      }
      case "playlists": {
        const selected = playlists.find((playlist) => playlist.id === selectedPlaylistId);
        if (selected) {
          const detailSongs = getPlaylistSongs(selected, songs);
          const candidates = songs.filter((song) => !selected.songIds.includes(song.id));
          return (
            <section className="music-library" aria-label={selected.name}>
              <button type="button" className="music-detail-back" onClick={() => { setSelectedPlaylistId(null); setRenameError(null); }}>‹ Playlists</button>
              <header className="music-detail-header">
                <h1>{selected.name}</h1>
                <p>{detailSongs.length} songs</p>
                <div className="music-playlist-form">
                  <input value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} aria-label="Playlist name" />
                  <button type="button" onClick={() => {
                    try {
                      setPlaylists(renamePlaylist(playlists, selected.id, renameDraft));
                      setRenameError(null);
                    } catch (error) {
                      setRenameError(error.message);
                    }
                  }}>Save</button>
                  <button type="button" onClick={() => {
                    if (window.confirm("Delete this playlist?")) {
                      setPlaylists(deletePlaylist(playlists, selected.id));
                      setSelectedPlaylistId(null);
                    }
                  }}>Delete</button>
                </div>
                {renameError && <p className="music-inline-error" role="alert">{renameError}</p>}
                {detailSongs[0] && <button type="button" className="music-play-all-btn" onClick={() => selectSongForPlayback(detailSongs[0], detailSongs)}>Play All</button>}
              </header>
              {detailSongs.length ? (
                <div className="music-track-list">
                  {detailSongs.map((song, index) => (
                    <TrackRow key={song.id} index={index} song={song} isActive={song.id === activeId} isPlaying={song.id === activeId && effectivePlaying} onPlay={() => handleCardSelect(song.id, detailSongs)} action={(<button type="button" className="music-track-remove" aria-label={`Remove ${song.title}`} onClick={() => setPlaylists(removeSongFromPlaylist(playlists, selected.id, song.id))}>✕</button>)} />
                  ))}
                </div>
              ) : (
                <div className="music-empty" role="status">
                  <FaList className="music-empty-icon" />
                  <p>No songs in this playlist yet</p>
                </div>
              )}
              {candidates.length > 0 && (
                <div className="music-playlist-form">
                  <select value={addSongId} onChange={(event) => setAddSongId(event.target.value)} aria-label="Add songs">
                    <option value="">Add songs…</option>
                    {candidates.map((song) => (
                      <option key={song.id} value={song.id}>{song.title} — {song.artist}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => {
                    if (!addSongId) return;
                    setPlaylists((current) => addSongToPlaylist(current, selected.id, addSongId, songs));
                    setAddSongId("");
                  }}>Add</button>
                </div>
              )}
            </section>
          );
        }
        const query = searchQuery.trim().toLowerCase();
        const visiblePlaylists = playlists.flatMap((playlist) => {
          const all = getPlaylistSongs(playlist, songs);
          if (!query) return [{ playlist, songs: all }];
          if (playlist.name.toLowerCase().includes(query)) return [{ playlist, songs: all }];
          const matched = filterMusicCatalog(all, searchQuery);
          return matched.length ? [{ playlist, songs: matched }] : [];
        });
        return (
          <section className="music-library" aria-label="Playlists">
            <header className="music-library-header">
              <h1>Playlists</h1>
            </header>
            <div className="music-playlist-form">
              <input value={newPlaylistName} onChange={(event) => setNewPlaylistName(event.target.value)} placeholder="New playlist name" aria-label="New playlist name" />
              <button type="button" onClick={() => {
                try {
                  const { playlists: next } = createPlaylist(playlists, newPlaylistName);
                  setPlaylists(next);
                  setNewPlaylistName("");
                  setPlaylistError(null);
                } catch (error) {
                  setPlaylistError(error.message);
                }
              }}>New Playlist</button>
            </div>
            {playlistError && <p className="music-inline-error" role="alert">{playlistError}</p>}
            {visiblePlaylists.length ? (
              <div className="music-shelf music-shelf--grid" aria-label="Playlist list">
                {visiblePlaylists.map(({ playlist, songs: playlistSongs }) => (
                  <div key={playlist.id} className="music-playlist-card">
                    <CollectionCard artwork={playlistSongs[0]?.artwork} title={playlist.name} subtitle={`${playlistSongs.length} songs`} label="Playlist" onOpen={() => { setSelectedPlaylistId(playlist.id); setRenameDraft(playlist.name); setRenameError(null); setAddSongId(""); }} />
                    <button type="button" className="music-playlist-delete" aria-label={`Delete ${playlist.name}`} onClick={() => { if (window.confirm("Delete this playlist?")) setPlaylists((current) => deletePlaylist(current, playlist.id)); }}>✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="music-empty" role="status">
                <FaList className="music-empty-icon" />
                <p>{searchQuery ? "No playlists match your search" : "No playlists yet"}</p>
              </div>
            )}
          </section>
        );
      }

      case "radio":
        return (
          <div className="music-empty">
            <FaCompactDisc className="music-empty-icon" />
            <p style={{ textTransform: "capitalize" }}>{activeSection}</p>
            <p className="music-empty-sub">This section will be available in future updates.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="music">
      <audio ref={audioRef} style={{ display: "none" }} preload="metadata" />

      <div
        className="music-header"
        onMouseDown={(event) => (
          !event.target.closest(".music-tl, .music-ctrl-btn, .music-volume-slider")
          && onTitleMouseDown(event)
        )}
      >
        <div className="music-traffic-lights">
          <button
            type="button"
            className="music-tl music-tl--close"
            onClick={handleClose}
            aria-label="Close Music"
          />
          <button
            type="button"
            className="music-tl music-tl--minimize"
            onClick={onMinimize}
            aria-label="Minimize Music"
          />
          <button
            type="button"
            className="music-tl music-tl--zoom"
            onClick={onZoom}
            aria-label="Zoom Music"
          />
        </div>

        <div className="music-toolbar-center">
          <button
            type="button"
            className={`music-ctrl-btn ${shuffle ? "music-ctrl-btn--active" : ""}`}
            onClick={() => setShuffle((value) => !value)}
            title="Shuffle"
            aria-label="Shuffle"
            aria-pressed={shuffle}
          >
            <FaRandom />
          </button>
          <button
            type="button"
            className="music-ctrl-btn"
            onClick={handlePrevious}
            title="Previous"
            aria-label="Previous song"
          >
            <FaStepBackward />
          </button>
          <button
            type="button"
            className="music-ctrl-btn music-ctrl-btn--play"
            onClick={handlePlayPause}
            aria-label={effectivePlaying ? "Pause" : "Play"}
            aria-pressed={effectivePlaying}
          >
            {effectivePlaying ? <FaPause /> : <FaPlay />}
          </button>
          <button
            type="button"
            className="music-ctrl-btn"
            onClick={handleNext}
            title="Next"
            aria-label="Next song"
          >
            <FaStepForward />
          </button>
          <button
            type="button"
            className={`music-ctrl-btn ${repeat !== "none" ? "music-ctrl-btn--active" : ""}`}
            onClick={cycleRepeat}
            title="Repeat"
            aria-label={`Repeat ${repeat}`}
            aria-pressed={repeat !== "none"}
          >
            <RepeatIcon />
          </button>
        </div>

        <div className="music-toolbar-right">
          <button
            type="button"
            className="music-ctrl-btn"
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              // ponytail: explicit mute gesture drives the ambient gain.
              if (mirrorId !== null && mirrorId === activeId) {
                window.dispatchEvent(
                  new CustomEvent(GALLERY_AMBIENT_COMMAND, {
                    detail: { action: "set-volume", volume: next ? 0 : volume },
                  }),
                );
              }
            }}
            title={isMuted ? "Unmute" : "Mute"}
            aria-label={isMuted ? "Unmute" : "Mute"}
            aria-pressed={isMuted}
          >
            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(event) => {
              const next = Number(event.target.value);
              setVolume(next);
              setIsMuted(false);
              // ponytail: explicit slider gesture drives the ambient gain.
              if (mirrorId !== null && mirrorId === activeId) {
                window.dispatchEvent(
                  new CustomEvent(GALLERY_AMBIENT_COMMAND, {
                    detail: { action: "set-volume", volume: next },
                  }),
                );
              }
            }}
            className="music-volume-slider"
            aria-label="Volume"
          />
        </div>
      </div>

      <div className="music-layout">
        <aside className="music-sidebar">
          <div className="music-sidebar-search">
            <FaSearch className="music-sidebar-search-icon" />
            <input
              type="search"
              placeholder="Search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Search music"
            />
          </div>

          <div className="music-sidebar-section">
            <div className="music-sidebar-section-title">Library</div>
            {[
              { id: "songs", icon: <FaMusic />, label: "Songs" },
              { id: "albums", icon: <FaCompactDisc />, label: "Albums" },
              { id: "artists", icon: <FaUserFriends />, label: "Artists" },
              { id: "recent", icon: <FaClock />, label: "Recently Added" },
              { id: "playlists", icon: <FaList />, label: "Playlists" },
            ].map(({ id, icon, label }) => (
              <button
                type="button"
                key={id}
                className={`music-sidebar-item${activeSection === id ? " active" : ""}`}
                onClick={() => { setActiveSection(id); setSelectedAlbumKey(null); setSelectedArtistKey(null); setSelectedPlaylistId(null); setOpenAlbumId(null); }}
              >
                <span className="music-sidebar-icon">{icon}</span>
                <span className="music-sidebar-label">{label}</span>
              </button>
            ))}
          </div>

          <div className="music-sidebar-section">
            <div className="music-sidebar-section-title">Radio</div>
            <button
              type="button"
              className={`music-sidebar-item${activeSection === "radio" ? " active" : ""}`}
              onClick={() => { setActiveSection("radio"); setSelectedAlbumKey(null); setSelectedArtistKey(null); setSelectedPlaylistId(null); setOpenAlbumId(null); }}
            >
              <span className="music-sidebar-icon"><FaPodcast /></span>
              <span className="music-sidebar-label">Radio</span>
            </button>
          </div>
        </aside>

        <main className="music-main">
          {renderMainContent()}
        </main>
      </div>

      {activeSong && (
        <div className="music-now-playing">
          <div className="music-now-playing-art">
            {nowPlayingArtworkFailed || !activeSong.artwork ? (
              <FaCompactDisc
                aria-hidden="true"
                className={`music-now-playing-disc${effectivePlaying ? " music-now-playing-disc--spin" : ""}`}
              />
            ) : (
              <img
                src={activeSong.artwork}
                alt={`${activeSong.title} artwork`}
                onError={() => setNowPlayingArtworkFailed(true)}
                draggable={false}
              />
            )}
          </div>
          <div className="music-now-playing-info">
            <span className="music-now-playing-title">{activeSong.title}</span>
            <span className="music-now-playing-artist">{activeSong.artist}</span>
            {lyricLines.length > 0 && (
              <div className="music-lyric-live" aria-live="polite">
                <span className="music-lyric-current">{lyricLines[activeLyricIndex]?.text ?? "♪"}</span>
                {lyricLines[activeLyricIndex + 1] && (
                  <span className="music-lyric-next">{lyricLines[activeLyricIndex + 1].text}</span>
                )}
              </div>
            )}
            {playbackError && (
              <span className="music-playback-error" role="status">{playbackError}</span>
            )}
          </div>
          <label className="music-progress">
            <span className="music-progress-time">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => {
                const nextTime = Number(event.target.value);
                if (audioRef.current) audioRef.current.currentTime = nextTime;
                playerStateRef.current = { ...playerStateRef.current, currentTime: nextTime };
                setCurrentTime(nextTime);
              }}
              aria-label="Song progress"
              disabled={!duration}
            />
            <span className="music-progress-time">{formatTime(duration)}</span>
          </label>
        </div>
      )}
    </div>
  );
}

const MUSIC_BRIDGE_EVENT = "between-us:music-player";

const musicBridgeRef = { current: null };

function emitMusicBridge() {
  window.dispatchEvent(new CustomEvent(MUSIC_BRIDGE_EVENT));
}

export function useMusicPlayer() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const rerender = () => forceUpdate((value) => value + 1);
    window.addEventListener(MUSIC_BRIDGE_EVENT, rerender);
    return () => window.removeEventListener(MUSIC_BRIDGE_EVENT, rerender);
  }, []);

  return musicBridgeRef.current ?? {
    songs: MUSIC_CATALOG,
    activeSong: null,
    activeId: null,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    lyricLines: [],
    activeLyricIndex: -1,
    lyricFxArmed: false,
    lyricFxSongId: null,
    playSongById: () => null,
    pause: () => {},
    armLyricFx: () => {},
    disarmLyricFx: () => {},
  };
}
