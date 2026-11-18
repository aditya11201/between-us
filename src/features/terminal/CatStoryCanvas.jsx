import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMusicPlayer } from "@/features/music/MusicContent.jsx";
import {
  BONUS_BASE_START_TIME,
  BONUS_FRAME_COUNT,
  BONUS_SONG_ID,
  resolveCatStoryFrame,
} from "@/features/music/bonusSyncModel.js";
import {
  ensureBonusSyncRun,
  getBonusSyncState,
  markBonusTerminalReady,
  subscribeBonusSync,
} from "@/features/music/bonusSyncCoordinator.js";
import { CAT_STORY_B64 } from "./catStoryData.js";

const W = 964;
const H = 720;
const CW = 4;
const CH = 6;
const COLS = 241;
const ROWS = 120;
const CELLS = COLS * ROWS;
const DARK_BG_U32 = 0xff040203;

const GLYPHS = [" ", ".", ":", "-", "|", "/", "\\", "+", "x", "o", "0", "8", "B", "#", "@", "%"];
const PALETTE = [
  [8, 6, 14],
  [27, 24, 32],
  [67, 65, 70],
  [104, 105, 113],
  [155, 154, 159],
  [194, 192, 196],
  [226, 217, 223],
  [237, 105, 129],
  [255, 58, 151],
  [253, 146, 136],
  [255, 200, 198],
  [253, 221, 25],
  [247, 175, 40],
  [21, 112, 239],
  [244, 163, 215],
];

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const pack = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;

let cachedRawFrames = null;
let cachedRawFramesPromise = null;

export async function decodeCatStoryFrames() {
  if (cachedRawFrames) return cachedRawFrames;
  if (!cachedRawFramesPromise) {
    cachedRawFramesPromise = (async () => {
      if (typeof DecompressionStream === "undefined") {
        throw new Error("Browser does not support DecompressionStream (gzip).");
      }
      const gz = Uint8Array.from(atob(CAT_STORY_B64), (s) => s.charCodeAt(0));
      const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"));
      const raw = new Uint8Array(await new Response(stream).arrayBuffer());
      if (raw.length !== BONUS_FRAME_COUNT * CELLS) {
        throw new Error("Incomplete ASCII frame payload.");
      }
      cachedRawFrames = raw;
      return raw;
    })().catch((err) => {
      cachedRawFramesPromise = null;
      throw err;
    });
  }
  return cachedRawFramesPromise;
}

function makeTiles() {
  const scale = 4;
  const w = CW * scale;
  const h = CH * scale;
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const gc = maskCanvas.getContext("2d", { willReadFrequently: true });
  if (!gc) return null;

  const masks = GLYPHS.map((char) => {
    gc.clearRect(0, 0, w, h);
    gc.fillStyle = "white";
    gc.font = `bold ${6.8 * scale}px 'DejaVu Sans Mono','Liberation Mono',monospace`;
    gc.textAlign = "center";
    gc.textBaseline = "middle";
    gc.fillText(char, w / 2, h / 2 + 0.6 * scale);
    const dat = gc.getImageData(0, 0, w, h).data;
    const opacity = new Uint8Array(CW * CH);
    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CW; x++) {
        let sum = 0;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            sum += dat[((y * scale + dy) * w + (x * scale + dx)) * 4 + 3];
          }
        }
        opacity[y * CW + x] = Math.round(sum / (scale * scale));
      }
    }
    return opacity;
  });

  const bg = [3, 2, 4];
  const output = new Array(256);
  for (let code = 1; code < 256; code++) {
    const glyph = code & 15;
    if (!glyph) continue;
    const colorId = code >> 4;
    const base = PALETTE[colorId] || PALETTE[0];
    let c;
    if (colorId <= 6) {
      const brightness = [250, 239, 219, 193, 162, 125, 94][colorId];
      c = [brightness, Math.round(brightness * 0.87), Math.min(255, brightness + 6)];
    } else if (colorId === 7) {
      c = [253, 129, 166];
    } else if (colorId === 8) {
      c = [255, 86, 174];
    } else {
      c = base;
    }
    const tile = new Uint32Array(CW * CH);
    const mask = masks[glyph];
    for (let p = 0; p < tile.length; p++) {
      const a = clamp((mask[p] / 255) * 1.25, 0, 1);
      const r = Math.round(bg[0] + (c[0] - bg[0]) * a);
      const g = Math.round(bg[1] + (c[1] - bg[1]) * a);
      const b = Math.round(bg[2] + (c[2] - bg[2]) * a);
      tile[p] = pack(r, g, b);
    }
    output[code] = tile;
  }
  return output;
}

export function CatStoryCanvas({
  onExit,
  runId,
  songId = BONUS_SONG_ID,
  startTime = BONUS_BASE_START_TIME,
}) {
  const {
    getAudioElement,
    resumePlayback,
    playbackError,
    activeId,
    isPlaying,
  } = useMusicPlayer();

  const canvasRef = useRef(null);
  const surfaceRef = useRef(null);
  const rawRef = useRef(null);
  const tilesRef = useRef(null);
  const lastDrawRef = useRef(-1);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  const [ready, setReady] = useState(false);
  const [decodeError, setDecodeError] = useState(null);
  const [expectedToPlay, setExpectedToPlay] = useState(false);
  const [hasPlayedSinceStart, setHasPlayedSinceStart] = useState(false);
  const [hud, setHud] = useState({
    frameIndex: 0,
    elapsed: 0,
    status: "before",
  });
  const lastHudRef = useRef(hud);

  const drawFrame = useCallback((index) => {
    const raw = rawRef.current;
    const tiles = tilesRef.current;
    const surface = surfaceRef.current;
    if (!raw || !tiles || !surface) return;

    const { ctx, pixels, buf } = surface;
    buf.fill(DARK_BG_U32);
    const start = index * CELLS;
    let off = start;
    for (let row = 0; row < ROWS; row++) {
      const top = row * CH * W;
      for (let col = 0; col < COLS; col++) {
        const code = raw[off++];
        if (!code) continue;
        const t = tiles[code];
        if (!t) continue;
        const x = top + col * CW;
        for (let py = 0; py < CH; py++) {
          const dy = x + py * W;
          const sy = py * CW;
          buf[dy] = t[sy];
          buf[dy + 1] = t[sy + 1];
          buf[dy + 2] = t[sy + 2];
          buf[dy + 3] = t[sy + 3];
        }
      }
    }
    ctx.putImageData(pixels, 0, 0);
    lastDrawRef.current = index;
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.toDataURL !== "function") return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `ascii-cat-story-${lastHudRef.current.elapsed.toFixed(2).replace(".", "-")}s.png`;
    a.click();
  }, []);

  // Decode gzip ASCII payload once and sync directly to live Music audio (or handshake fallback).
  useEffect(() => {
    let cancelled = false;
    setDecodeError(null);
    setReady(false);
    setHasPlayedSinceStart(false);

    const audio = getAudioElement?.() ?? null;
    const isAlreadyPlaying = Boolean(audio && !audio.paused);

    if (runId !== null && runId !== undefined) {
      ensureBonusSyncRun({ runId, songId, startTime });
      const syncSnap = getBonusSyncState();
      setExpectedToPlay(isAlreadyPlaying || (syncSnap.runId === runId && syncSnap.started));
    } else {
      setExpectedToPlay(isAlreadyPlaying);
    }

    const unsubscribe = subscribeBonusSync((event) => {
      if (cancelled) return;
      if (event?.type === "start" && runId !== null && runId !== undefined && event.runId === runId) {
        setExpectedToPlay(true);
        setHasPlayedSinceStart(false);
      }
    });

    const canvas = canvasRef.current;
    if (canvas && !surfaceRef.current) {
      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx && typeof ctx.createImageData === "function") {
        const pixels = ctx.createImageData(W, H);
        const buf = new Uint32Array(pixels.data.buffer);
        surfaceRef.current = { ctx, pixels, buf };
      }
    }

    decodeCatStoryFrames()
      .then((raw) => {
        if (cancelled) return;
        rawRef.current = raw;
        if (!tilesRef.current) {
          tilesRef.current = makeTiles();
        }
        setReady(true);
        if (runId !== null && runId !== undefined) {
          markBonusTerminalReady(runId);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setDecodeError(err?.message || "Failed to decode ASCII animation.");
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [runId, songId]);

  // Keyboard shortcuts: S (PNG), Escape (Back to Terminal).
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onExitRef.current?.();
        return;
      }
      const tagName = document.activeElement?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  // Audio-driven single source of truth frame synchronization.
  useEffect(() => {
    if (!ready) return undefined;

    const audio = getAudioElement?.() ?? null;
    let rafId = null;
    let disposed = false;

    const syncFrame = (forceDraw = false) => {
      const audioTime = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const next = resolveCatStoryFrame(audioTime, { startTime });
      const prev = lastHudRef.current;

      if (
        prev.frameIndex !== next.frameIndex
        || prev.status !== next.status
        || Math.abs(prev.elapsed - next.elapsed) >= 0.005
      ) {
        lastHudRef.current = next;
        setHud(next);
      }

      if (forceDraw || next.frameIndex !== lastDrawRef.current) {
        drawFrame(next.frameIndex);
      }
    };

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const startLoop = () => {
      if (disposed || rafId !== null) return;
      if (!audio || audio.paused || audio.ended || document.hidden) return;
      const tick = () => {
        rafId = null;
        if (disposed) return;
        syncFrame(false);
        if (audio && !audio.paused && !audio.ended && !document.hidden) {
          rafId = requestAnimationFrame(tick);
        }
      };
      rafId = requestAnimationFrame(tick);
    };

    const onPlay = () => {
      setHasPlayedSinceStart(true);
      syncFrame(false);
      startLoop();
    };
    const onPause = () => {
      stopLoop();
      syncFrame(false);
    };
    const onSeeked = () => syncFrame(true);
    const onRateChange = () => syncFrame(false);
    const onTimeUpdate = () => syncFrame(false);
    const onEnded = () => {
      stopLoop();
      syncFrame(false);
    };
    const onLoadedMetadata = () => syncFrame(true);
    const onVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else {
        syncFrame(true);
        startLoop();
      }
    };

    syncFrame(true);
    if (audio && !audio.paused) {
      setHasPlayedSinceStart(true);
      startLoop();
    }

    if (audio) {
      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      audio.addEventListener("seeked", onSeeked);
      audio.addEventListener("ratechange", onRateChange);
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("loadedmetadata", onLoadedMetadata);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      stopLoop();
      if (audio) {
        audio.removeEventListener("play", onPlay);
        audio.removeEventListener("pause", onPause);
        audio.removeEventListener("seeked", onSeeked);
        audio.removeEventListener("ratechange", onRateChange);
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [ready, getAudioElement, startTime, activeId, isPlaying, drawFrame]);

  const audio = getAudioElement?.() ?? null;
  const showPlayFallback = Boolean(
    ready
      && (playbackError || (expectedToPlay && !hasPlayedSinceStart && (!audio || audio.paused))),
  );

  return (
    <div
      className="terminal-ascii-stage terminal-cat-stage"
      aria-label="Cat Story ASCII synced stage"
      data-frame={hud.frameIndex + 1}
      data-status={hud.status}
    >
      <div className="terminal-ascii-viewport">
        <div className="terminal-ascii-scene">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="terminal-ascii-canvas"
            role="img"
            aria-label="Animated ASCII Cat Story synchronized with Love Me Not"
          />
        </div>
        {!ready && (
          <div className="terminal-cat-loading" role="status">
            {decodeError
              ? `Failed to load animation: ${decodeError}`
              : "[ INIT ] DECODING ASCII FRAMES ..."}
          </div>
        )}
      </div>
      <div className="terminal-ascii-tools" role="toolbar" aria-label="Cat Story visual controls">
        {showPlayFallback && (
          <button
            type="button"
            className="terminal-ascii-btn terminal-cat-btn--primary"
            onClick={() => resumePlayback?.()}
          >
            ▶ Play Audio
          </button>
        )}
        <button
          type="button"
          className="terminal-ascii-btn"
          onClick={handleSave}
          title="S"
        >
          ↓ PNG
        </button>
        <button
          type="button"
          className="terminal-ascii-btn terminal-ascii-btn--exit"
          onClick={() => onExit?.()}
          title="Escape"
        >
          Back to Terminal
        </button>
      </div>
    </div>
  );
}
