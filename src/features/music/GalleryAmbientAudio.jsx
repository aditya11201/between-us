import { useEffect, useRef } from "react";
import { useWindowManager } from "@/core/providers";
import {
  GALLERY_AMBIENT,
  GALLERY_AMBIENT_COMMAND,
  GALLERY_AMBIENT_EVENT,
  GALLERY_AMBIENT_SONG_ID,
  GALLERY_AMBIENT_SONG_IDS,
  MUSIC_LOCAL_EVENT,
  ambientState,
  clampVolume,
  computeFadeVolume,
  decideAmbientAction,
  getNextGalleryTrackIndex,
  isGalleryVisible,
  needsSourceReload,
  setAmbientState,
  shouldRecoverAudio,
} from "./galleryAmbientMusic";
import comingUpRosesAudio from "@/content/music/Harry Styles - Coming Up Roses.mp3?url";
import thoseEyesAudio from "@/content/music/New West - Those Eyes (Lyrics).mp3?url";

const GALLERY_AMBIENT_TRACKS = [
  { id: GALLERY_AMBIENT_SONG_ID, src: comingUpRosesAudio },
  { id: GALLERY_AMBIENT_SONG_IDS[1], src: thoseEyesAudio },
];

export { GALLERY_AMBIENT_SONG_ID };

// Persistent gallery-timed <audio>: hidden session driver; the Music app
// mirrors this session (play/stop/volume) via the ambient event bridge.
export function GalleryAmbientAudio() {
  const { windows, minimizedApps } = useWindowManager();
  const audioRef = useRef(null);
  const visibleRef = useRef(false);
  const playingRef = useRef(false);
  const sequenceStartedRef = useRef(false);
  const trackIndexRef = useRef(0);
  const visibleSinceRef = useRef(null);
  const timerRef = useRef(null);
  const fadeRef = useRef(null);
  const latestVolumeRef = useRef(GALLERY_AMBIENT.TARGET_VOLUME);
  const gestureCleanupRef = useRef(null);
  const watchdogRef = useRef(null);

  const visible = isGalleryVisible(windows, minimizedApps);
  visibleRef.current = visible;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const clearTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    };
    const clearFade = () => {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    };
    const removeGestureListeners = () => {
      if (gestureCleanupRef.current) {
        gestureCleanupRef.current();
        gestureCleanupRef.current = null;
      }
    };
    // Broadcast with the latest snapshot fields so late subscribers
    // (e.g. a Music window opened mid-playback) can sync via ambientState.
    const setPlaying = (playing, extra = {}) => {
      playingRef.current = playing;
      const state = setAmbientState({
        playing,
        songId: playing ? GALLERY_AMBIENT_TRACKS[trackIndexRef.current].id : ambientState.songId,
        volume: latestVolumeRef.current,
        currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
        ...extra,
      });
      window.dispatchEvent(
        new CustomEvent(GALLERY_AMBIENT_EVENT, {
          detail: {
            playing: state.playing,
            songId: state.songId,
            volume: state.volume,
            currentTime: state.currentTime,
          },
        }),
      );
    };
    // One fade driver for every volume move (start/resume/stop/volume).
    // Cancels any in-flight fade so a new one always ramps from the live volume.
    const rampTo = (target, durationMs, onDone) => {
      clearFade();
      const from = latestVolumeRef.current;
      const fadeStart = Date.now();
      fadeRef.current = setInterval(() => {
        const volume = from + (computeFadeVolume(Date.now() - fadeStart, durationMs, 1) * (target - from));
        latestVolumeRef.current = volume;
        audio.volume = volume;
        setAmbientState({ volume });
        if (Date.now() - fadeStart >= durationMs) {
          clearFade();
          latestVolumeRef.current = target;
          audio.volume = target;
          setAmbientState({ volume: target });
          onDone?.();
        }
      }, GALLERY_AMBIENT.TICK_MS);
    };

    const startTrack = async (index, fadeIn = false) => {
      const track = GALLERY_AMBIENT_TRACKS[index];
      trackIndexRef.current = index;
      audio.loop = false;
      if (audio.getAttribute("src") !== track.src) audio.src = track.src;
      if (fadeIn) {
        latestVolumeRef.current = 0;
        audio.volume = 0;
      }
      setAmbientState({
        songId: track.id,
        volume: latestVolumeRef.current,
        currentTime: 0,
      });
      try {
        await audio.play();
      } catch {
        if (!visibleRef.current) return;
        // ponytail: retry autoplay on the next user gesture.
        if (!gestureCleanupRef.current) {
          const retry = () => {
            removeGestureListeners();
            startTrack(index, fadeIn);
          };
          window.addEventListener("pointerdown", retry, { once: true });
          window.addEventListener("keydown", retry, { once: true });
          gestureCleanupRef.current = () => {
            window.removeEventListener("pointerdown", retry);
            window.removeEventListener("keydown", retry);
          };
        }
        return;
      }
      if (!visibleRef.current) {
        audio.pause();
        removeGestureListeners();
        return;
      }
      removeGestureListeners();
      setPlaying(true, {
        songId: track.id,
        currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      });
      if (fadeIn) rampTo(GALLERY_AMBIENT.TARGET_VOLUME, GALLERY_AMBIENT.FADE_IN_MS);
    };

    // Immediate fade-out on gallery close; the session ends at silence.
    const fadeOutAndStop = (durationMs = GALLERY_AMBIENT.FADE_OUT_MS) => {
      if (!playingRef.current) {
        removeGestureListeners();
        return;
      }
      rampTo(0, durationMs, () => {
        audio.pause();
        audio.currentTime = 0;
        setPlaying(false, { currentTime: 0 });
      });
    };

    const onCommand = (event) => {
      const { action, volume } = event.detail ?? {};
      if (playingRef.current && action === "stop") fadeOutAndStop(GALLERY_AMBIENT.RESUME_FADE_MS);
      // ponytail: user-input volume eases over 300ms; ignored when no
      // session is active so stray slider moves never start audio.
      if (action === "set-volume" && playingRef.current) {
        rampTo(clampVolume(volume), 300);
      }
    };
    // A local Music-app track takes over: stop ambient quickly, keep rain
    // off until ambient itself restarts. Ambient never ducks local playback.
    const onLocalPlaying = (event) => {
      if (event.detail?.playing && playingRef.current) {
        fadeOutAndStop(GALLERY_AMBIENT.RESUME_FADE_MS);
      }
    };

    // Stall watchdog: recover unexpected mid-session stalls (network cut =
    // paused audio + rain still on). Polls every 5s; resume restores position
    // and eases back to peak over 3s. Only error/stalled events kick it —
    // suspend/waiting are normal buffering, wiring them caused an infinite
    // play→error→recover loop that thrashed the element to death.
    const recoverStall = () => {
      if (!shouldRecoverAudio({
        playing: playingRef.current,
        visible: visibleRef.current,
        paused: audio.paused,
        ended: audio.ended,
        error: audio.error?.code ?? 0,
      })) return;
      // ponytail: dead stream (HAVE_NOTHING + NO_SOURCE) cannot resume with a
      // bare play() — re-attach src, restore position, then play + ease back.
      if (needsSourceReload({ readyState: audio.readyState, networkState: audio.networkState, error: audio.error?.code ?? 0 })) {
        const resumeAt = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        audio.src = GALLERY_AMBIENT_TRACKS[trackIndexRef.current].src;
        audio.load();
        audio.currentTime = resumeAt;
      }
      latestVolumeRef.current = audio.volume;
      setPlaying(true, { currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0 });
      audio.play().catch(() => {});
      rampTo(GALLERY_AMBIENT.TARGET_VOLUME, GALLERY_AMBIENT.RESUME_FADE_MS);
    };
    const startWatchdog = () => {
      clearInterval(watchdogRef.current);
      watchdogRef.current = setInterval(recoverStall, 5_000);
    };
    const stopWatchdog = () => {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    };
    const onStall = () => recoverStall();

    window.addEventListener(GALLERY_AMBIENT_COMMAND, onCommand);
    window.addEventListener(MUSIC_LOCAL_EVENT, onLocalPlaying);
    const onEnded = () => {
      if (!playingRef.current) return;
      if (!visibleRef.current) {
        fadeOutAndStop();
        return;
      }
      const nextIndex = getNextGalleryTrackIndex(
        trackIndexRef.current,
        GALLERY_AMBIENT_TRACKS.length,
      );
      if (nextIndex !== null) {
        startTrack(nextIndex);
        return;
      }
      clearFade();
      removeGestureListeners();
      audio.pause();
      audio.currentTime = 0;
      latestVolumeRef.current = 0;
      audio.volume = 0;
      setPlaying(false, { currentTime: 0 });
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onStall);
    audio.addEventListener("stalled", onStall);
    startWatchdog();
    if (visible) {
      visibleSinceRef.current = Date.now();
      clearTimer();
      if (playingRef.current) {
        // ponytail: reopened mid-fade-out — cancel the fade and resume to peak.
        rampTo(GALLERY_AMBIENT.TARGET_VOLUME, GALLERY_AMBIENT.RESUME_FADE_MS);
      } else if (!sequenceStartedRef.current) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          const action = decideAmbientAction({
            visible: visibleRef.current,
            playing: playingRef.current,
            started: sequenceStartedRef.current,
            visibleSince: visibleSinceRef.current,
            now: Date.now(),
          });
          if (action === "start") {
            sequenceStartedRef.current = true;
            startTrack(0, true);
          }
        }, GALLERY_AMBIENT.TRIGGER_MS);
      }
    } else {
      clearTimer();
      fadeOutAndStop();
    }

    return () => {
      clearTimeout(timerRef.current);
      removeGestureListeners();
      stopWatchdog();
      window.removeEventListener(GALLERY_AMBIENT_COMMAND, onCommand);
      window.removeEventListener(MUSIC_LOCAL_EVENT, onLocalPlaying);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onStall);
      audio.removeEventListener("stalled", onStall);
    };
  }, [visible]);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(fadeRef.current);
      clearInterval(watchdogRef.current);
      if (gestureCleanupRef.current) gestureCleanupRef.current();
      const audio = audioRef.current;
      if (audio && playingRef.current) {
        audio.pause();
        setAmbientState({ playing: false });
        window.dispatchEvent(
          new CustomEvent(GALLERY_AMBIENT_EVENT, { detail: { ...ambientState } }),
        );
      }
    };
  }, []);

  return <audio ref={audioRef} preload="none" style={{ display: "none" }} />;
}

