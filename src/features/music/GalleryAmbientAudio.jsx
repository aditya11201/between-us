import { useEffect, useRef } from "react";
import { useWindowManager } from "@/core/providers";
import {
  GALLERY_AMBIENT,
  GALLERY_AMBIENT_COMMAND,
  GALLERY_AMBIENT_EVENT,
  GALLERY_AMBIENT_SONG_ID,
  MUSIC_LOCAL_EVENT,
  ambientState,
  clampVolume,
  computeFadeVolume,
  decideAmbientAction,
  isGalleryVisible,
  setAmbientState,
  shouldRecoverAudio,
} from "./galleryAmbientMusic";
import manguAudio from "@/content/music/Fourtwnty - Mangu (Orchestral Cover).wasm?url";

export { GALLERY_AMBIENT_SONG_ID };

// Persistent gallery-timed <audio>: hidden session driver; the Music app
// mirrors this session (play/stop/volume) via the ambient event bridge.
export function GalleryAmbientAudio() {
  const { windows, minimizedApps } = useWindowManager();
  const audioRef = useRef(null);
  const visibleRef = useRef(false);
  const playingRef = useRef(false);
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
        songId: playing ? GALLERY_AMBIENT_SONG_ID : ambientState.songId,
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

    const startPlayback = async () => {
      if (!audio.src) audio.src = manguAudio;
      audio.loop = true;
      latestVolumeRef.current = 0;
      audio.volume = 0;
      setAmbientState({ songId: GALLERY_AMBIENT_SONG_ID, volume: 0, currentTime: 0 });
      try {
        await audio.play();
      } catch {
        // ponytail: autoplay blocked until first user gesture; retry on next pointer/key
        if (!gestureCleanupRef.current) {
          const retry = () => {
            removeGestureListeners();
            startPlayback();
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
      removeGestureListeners();
      setPlaying(true, { currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0 });
      rampTo(GALLERY_AMBIENT.TARGET_VOLUME, GALLERY_AMBIENT.FADE_IN_MS);
    };

    // Immediate fade-out on gallery close; the session ends at silence.
    const fadeOutAndStop = (durationMs = GALLERY_AMBIENT.FADE_OUT_MS) => {
      if (!playingRef.current) return;
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

    // Stall watchdog: recover unexpected mid-session stalls (browser/IDM
    // cutting the stream = paused audio + rain still on). Polls every 5s;
    // resume keeps position and eases back to peak over 3s.
    const recoverStall = () => {
      if (!shouldRecoverAudio({
        playing: playingRef.current,
        visible: visibleRef.current,
        paused: audio.paused,
        ended: audio.ended,
        error: audio.error?.code ?? 0,
      })) return;
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
    // Immediate kick on media stall signals; the poll covers silent stalls.
    const onStall = () => recoverStall();

    window.addEventListener(GALLERY_AMBIENT_COMMAND, onCommand);
    window.addEventListener(MUSIC_LOCAL_EVENT, onLocalPlaying);
    // ponytail: loop attr already repeats, but some browsers fire ended on
    // long/streamed files — restart here so playback never dies mid-session.
    const onEnded = () => {
      if (playingRef.current && visibleRef.current) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (playingRef.current) {
        fadeOutAndStop();
      }
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onStall);
    audio.addEventListener("stalled", onStall);
    audio.addEventListener("suspend", onStall);
    audio.addEventListener("waiting", onStall);
    startWatchdog();
    if (visible) {
      visibleSinceRef.current = Date.now();
      clearTimer();
      if (playingRef.current) {
        // ponytail: reopened mid-fade-out — cancel the fade and resume to peak.
        rampTo(GALLERY_AMBIENT.TARGET_VOLUME, GALLERY_AMBIENT.RESUME_FADE_MS);
      } else {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          const action = decideAmbientAction({
            visible: visibleRef.current,
            playing: playingRef.current,
            visibleSince: visibleSinceRef.current,
            now: Date.now(),
          });
          if (action === "start") startPlayback();
        }, GALLERY_AMBIENT.TRIGGER_MS);
      }
    } else {
      clearTimer();
      fadeOutAndStop();
    }

    return () => {
      clearTimeout(timerRef.current);
      stopWatchdog();
      window.removeEventListener(GALLERY_AMBIENT_COMMAND, onCommand);
      window.removeEventListener(MUSIC_LOCAL_EVENT, onLocalPlaying);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onStall);
      audio.removeEventListener("stalled", onStall);
      audio.removeEventListener("suspend", onStall);
      audio.removeEventListener("waiting", onStall);
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

  return <audio ref={audioRef} loop preload="none" style={{ display: "none" }} />;
}

