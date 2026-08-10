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
import { fetchAudioBlobUrl } from "./musicPlayback.js";
import {
  PLAYER_STORAGE_KEY,
  filterMusicCatalog,
  getNextSong,
  getPreviousAction,
  restorePlayerState,
  serializePlayerState,
} from "./musicModel.js";

function formatTime(sec) {
  if (!sec || Number.isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const getInitialPlayerState = () => {
  if (typeof window === "undefined") return restorePlayerState(null, MUSIC_CATALOG);
  try {
    return restorePlayerState(
      window.localStorage.getItem(PLAYER_STORAGE_KEY),
      MUSIC_CATALOG,
    );
  } catch {
    return restorePlayerState(null, MUSIC_CATALOG);
  }
};

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
  const [gridMode, setGridMode] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);
  const [sourceLoadRequest, setSourceLoadRequest] = useState(0);
  const [nowPlayingArtworkFailed, setNowPlayingArtworkFailed] = useState(false);

  const audioRef = useRef(null);
  const pendingSeekRef = useRef(initialPlayerState.currentTime);
  const pendingAutoplayRef = useRef(false);
  const audioSourceRef = useRef({ id: null, generation: 0 });
  const sourceGenerationRef = useRef(0);
  const metadataLoadedRef = useRef(false);
  const playerStateRef = useRef(initialPlayerState);
  const handleEndedRef = useRef(null);
  const mediaRequestRef = useRef(null);
  const mediaObjectUrlRef = useRef(null);

  const filteredSongs = useMemo(
    () => filterMusicCatalog(songs, searchQuery),
    [songs, searchQuery],
  );
  const activeSong = useMemo(
    () => songs.find((song) => song.id === activeId) || null,
    [songs, activeId],
  );

  useEffect(() => {
    playerStateRef.current = { activeId, currentTime, volume, isMuted };
  }, [activeId, currentTime, volume, isMuted]);

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
      playerStateRef.current = nextState;
      window.localStorage.setItem(
        PLAYER_STORAGE_KEY,
        serializePlayerState(nextState),
      );
    } catch {
      // Storage can be unavailable in private or restricted browsing contexts.
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      audio.muted = isMuted;
    }
  }, [volume, isMuted]);

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

    const source = {
      id: activeSong?.id ?? null,
      generation: sourceGenerationRef.current + 1,
      ready: false,
    };
    sourceGenerationRef.current = source.generation;
    audioSourceRef.current = source;
    metadataLoadedRef.current = false;

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
      persistAudioTime(source);
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
      if (metadataLoadedRef.current) persistAudioTime(source);
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

      const controller = new AbortController();
      mediaRequestRef.current = { controller, generation: source.generation };
      fetchAudioBlobUrl(activeSong.src, {
        signal: controller.signal,
        mimeType: activeSong.mimeType,
      })
        .then(({ url, revoke }) => {
          const requestIsCurrent = mediaRequestRef.current?.generation === source.generation
            && !controller.signal.aborted
            && isCurrent();
          if (!requestIsCurrent) {
            revoke();
            return;
          }

          mediaObjectUrlRef.current = { url, revoke, generation: source.generation };
          audioSourceRef.current = { ...source, ready: true };
          audio.src = url;
          audio.load();
          setDuration(0);
          setCurrentTime(pendingSeekRef.current);
        })
        .catch(() => {
          if (
            controller.signal.aborted
            || mediaRequestRef.current?.generation !== source.generation
            || !isCurrent()
          ) {
            return;
          }
          pendingAutoplayRef.current = false;
          setIsPlaying(false);
          setPlaybackError("This audio file could not be loaded");
        });
    } else {
      pendingAutoplayRef.current = false;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setDuration(0);
      setCurrentTime(0);
    }

    return () => {
      if (source.id && metadataLoadedRef.current) persistAudioTime(source);
      if (mediaRequestRef.current?.generation === source.generation) {
        mediaRequestRef.current.controller.abort();
        mediaRequestRef.current = null;
      }
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", onEnded);
      audio.removeAttribute("src");
      audio.load();
      if (mediaObjectUrlRef.current?.generation === source.generation) {
        mediaObjectUrlRef.current.revoke();
        mediaObjectUrlRef.current = null;
      }
      metadataLoadedRef.current = false;
      audioSourceRef.current = { id: null, generation: source.generation, ready: false };
    };
  }, [activeSong?.id, persistAudioTime, sourceLoadRequest, tryPlay]);

  useEffect(() => {
    persistPlayerState();
  }, [activeId, volume, isMuted, persistPlayerState]);

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

  const selectSongForPlayback = useCallback((song) => {
    if (!song) return;
    persistAudioTime();
    const isSameSong = song.id === activeId;
    if (isSameSong) {
      const audio = audioRef.current;
      if (audio) audio.currentTime = 0;
      pendingSeekRef.current = 0;
      pendingAutoplayRef.current = false;
      playerStateRef.current = {
        ...playerStateRef.current,
        activeId: song.id,
        currentTime: 0,
      };
      persistPlayerState();
      setCurrentTime(0);
      setPlaybackError(null);
      requestSourcePlayback();
      return;
    }

    pendingSeekRef.current = 0;
    pendingAutoplayRef.current = true;
    setPlaybackError(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveId(song.id);
  }, [activeId, persistAudioTime, persistPlayerState, requestSourcePlayback]);

  const handleCardSelect = useCallback((id) => {
    const song = songs.find((item) => item.id === id);
    if (!song) return;
    if (song.id === activeId) {
      if (isPlaying) audioRef.current?.pause();
      else requestSourcePlayback();
      return;
    }
    selectSongForPlayback(song);
  }, [activeId, isPlaying, requestSourcePlayback, selectSongForPlayback, songs]);

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

    const next = getNextSong(songs, activeId, {
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
  }, [activeId, activeSong, repeat, selectSongForPlayback, shuffle, songs, tryPlay]);

  useEffect(() => {
    handleEndedRef.current = handleEnded;
  }, [handleEnded]);

  const handleNext = useCallback(() => {
    const next = getNextSong(songs, activeId, {
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
  }, [activeId, repeat, selectSongForPlayback, shuffle, songs]);

  const handlePrevious = useCallback(() => {
    const previous = getPreviousAction(
      songs,
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
  }, [activeId, selectSongForPlayback, songs]);

  const handlePlayPause = useCallback(() => {
    if (!activeSong) {
      if (songs[0]) selectSongForPlayback(songs[0]);
      return;
    }
    if (isPlaying) audioRef.current?.pause();
    else requestSourcePlayback();
  }, [activeSong, isPlaying, requestSourcePlayback, selectSongForPlayback, songs]);

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
                isPlaying={isPlaying}
                onSelect={handleCardSelect}
                onToggle={handleCardSelect}
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
      case "albums":
      case "artists":
      case "recent":
      case "playlists":
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
            aria-label={isPlaying ? "Pause" : "Play"}
            aria-pressed={isPlaying}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
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
            onClick={() => setIsMuted((value) => !value)}
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
              setVolume(Number(event.target.value));
              setIsMuted(false);
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
                onClick={() => setActiveSection(id)}
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
              onClick={() => setActiveSection("radio")}
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
                className={`music-now-playing-disc${isPlaying ? " music-now-playing-disc--spin" : ""}`}
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
