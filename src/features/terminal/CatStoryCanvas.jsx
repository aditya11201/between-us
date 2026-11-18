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

const BASE_COLS = 241;
const MAX_COLS = 440;
const ROWS = 120;
const CW = 4;
const CH = 6;
const BASE_W = BASE_COLS * CW;
const H = ROWS * CH;
const CELLS = BASE_COLS * ROWS;
const DARK_BG = [3, 2, 4];
const DARK_BG_U32 = 0xff040203;
const BORDER_COL_THRESHOLD = 100;
const FEATHER_EDGE_COL_THRESHOLD = 8;
const FEATHER_INNER_COL_THRESHOLD = 15;
const FEATHER_COLS = 6;
const FEATHER_LEFT_BIT = 1;
const FEATHER_RIGHT_BIT = 2;

const FEATHER_GAINS_256 = Array.from({ length: FEATHER_COLS }, (_, d) => {
  const t = (d + 1) / (FEATHER_COLS + 1);
  return Math.round(t * t * (3 - 2 * t) * 256);
});

const STAR_GLYPHS = [".", ":", "+", "*"];
const STAR_COLORS = [
  [253, 129, 166],
  [226, 198, 240],
  [164, 174, 206],
];
const STAR_LEVELS = [0.13, 0.17, 0.21, 0.25];

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
const featherFlagsCache = new WeakMap();

function computeTargetCols(rect) {
  if (!rect || !(rect.width > 0 && rect.height > 0)) return null;
  return Math.max(
    BASE_COLS,
    Math.min(MAX_COLS, Math.round(((rect.width / rect.height) * H) / CW)),
  );
}

function isReducedMotionPreferred() {
  return (
    typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && Boolean(window.matchMedia("(prefers-reduced-motion: reduce)")?.matches)
  );
}

function countColumnCells(raw, frameOffset, col) {
  let count = 0;
  for (let row = 0; row < ROWS; row++) {
    if (raw[frameOffset + row * BASE_COLS + col] !== 0) {
      count += 1;
    }
  }
  return count;
}

function clearColumnCells(raw, frameOffset, col) {
  for (let row = 0; row < ROWS; row++) {
    raw[frameOffset + row * BASE_COLS + col] = 0;
  }
}

// Strip solid full-height border bars on col 0 / col 240 and detect frames where edge artwork touches the margin.
function sanitizeCatStoryFrames(raw) {
  const featherFlags = new Uint8Array(BONUS_FRAME_COUNT);
  for (let f = 0; f < BONUS_FRAME_COUNT; f++) {
    const base = f * CELLS;
    let leftEdgeCount = countColumnCells(raw, base, 0);
    let rightEdgeCount = countColumnCells(raw, base, BASE_COLS - 1);

    if (leftEdgeCount >= BORDER_COL_THRESHOLD) {
      clearColumnCells(raw, base, 0);
      leftEdgeCount = 0;
    }
    if (rightEdgeCount >= BORDER_COL_THRESHOLD) {
      clearColumnCells(raw, base, BASE_COLS - 1);
      rightEdgeCount = 0;
    }

    const leftInnerCount = countColumnCells(raw, base, 1);
    const rightInnerCount = countColumnCells(raw, base, BASE_COLS - 2);
    let flags = 0;
    if (leftEdgeCount >= FEATHER_EDGE_COL_THRESHOLD || leftInnerCount >= FEATHER_INNER_COL_THRESHOLD) {
      flags |= FEATHER_LEFT_BIT;
    }
    if (rightEdgeCount >= FEATHER_EDGE_COL_THRESHOLD || rightInnerCount >= FEATHER_INNER_COL_THRESHOLD) {
      flags |= FEATHER_RIGHT_BIT;
    }
    featherFlags[f] = flags;
  }
  featherFlagsCache.set(raw, featherFlags);
  return featherFlags;
}

function getEdgeFeatherFlags(raw) {
  if (!raw) return null;
  const cached = featherFlagsCache.get(raw);
  if (cached) return cached;
  return sanitizeCatStoryFrames(raw);
}

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
      sanitizeCatStoryFrames(raw);
      cachedRawFrames = raw;
      return raw;
    })().catch((err) => {
      cachedRawFramesPromise = null;
      throw err;
    });
  }
  return cachedRawFramesPromise;
}

function hashCell2D(row, worldCol) {
  let h = Math.imul(row + 131, 374761393) ^ Math.imul(worldCol + 4099, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

// Generate deterministic star coordinates relative to horizontal center so widened margins remain seamless.
function createStarfield(cols, rows = ROWS) {
  const stars = [];
  const centerCol = Math.floor(cols / 2);
  const stride = STAR_COLORS.length * STAR_LEVELS.length;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const h = hashCell2D(row, col - centerCol);
      if (h % 1000 >= 11) continue;
      const glyphPick = (h >>> 10) % 100;
      const glyphIdx = glyphPick < 56 ? 0 : glyphPick < 82 ? 1 : glyphPick < 94 ? 2 : 3;
      const colorIdx = (h >>> 17) % STAR_COLORS.length;
      const baseLevel = (h >>> 20) % STAR_LEVELS.length;
      const phase = (((h >>> 22) & 255) / 255) * Math.PI * 2;
      const speed = 0.7 + (((h >>> 30) & 3) * 0.25);
      stars.push({
        row,
        col,
        tileBase: glyphIdx * stride + colorIdx * STAR_LEVELS.length,
        baseLevel,
        phase,
        speed,
      });
    }
  }
  return stars;
}

function rasterizeGlyphMask(gc, char, w, h, scale) {
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
}

function buildBlendedTile(mask, color) {
  const tile = new Uint32Array(CW * CH);
  for (let p = 0; p < tile.length; p++) {
    const a = clamp((mask[p] / 255) * 1.25, 0, 1);
    const r = Math.round(DARK_BG[0] + (color[0] - DARK_BG[0]) * a);
    const g = Math.round(DARK_BG[1] + (color[1] - DARK_BG[1]) * a);
    const b = Math.round(DARK_BG[2] + (color[2] - DARK_BG[2]) * a);
    tile[p] = pack(r, g, b);
  }
  return tile;
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

  const masks = GLYPHS.map((char) => rasterizeGlyphMask(gc, char, w, h, scale));
  const tiles = new Array(256);
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
    tiles[code] = buildBlendedTile(masks[glyph], c);
  }

  const starMasks = STAR_GLYPHS.map((char) => rasterizeGlyphMask(gc, char, w, h, scale));
  const starTiles = [];
  for (let gIdx = 0; gIdx < starMasks.length; gIdx++) {
    const mask = starMasks[gIdx];
    for (let cIdx = 0; cIdx < STAR_COLORS.length; cIdx++) {
      const baseColor = STAR_COLORS[cIdx];
      for (let lIdx = 0; lIdx < STAR_LEVELS.length; lIdx++) {
        const lum = STAR_LEVELS[lIdx];
        const c = [
          Math.round(DARK_BG[0] + (baseColor[0] - DARK_BG[0]) * lum),
          Math.round(DARK_BG[1] + (baseColor[1] - DARK_BG[1]) * lum),
          Math.round(DARK_BG[2] + (baseColor[2] - DARK_BG[2]) * lum),
        ];
        starTiles.push(buildBlendedTile(mask, c));
      }
    }
  }

  return { tiles, starTiles };
}

function blendPixelTowardBg(pixel, gain256) {
  const r = pixel & 0xff;
  const g = (pixel >> 8) & 0xff;
  const b = (pixel >> 16) & 0xff;
  return pack(
    DARK_BG[0] + (((r - DARK_BG[0]) * gain256) >> 8),
    DARK_BG[1] + (((g - DARK_BG[1]) * gain256) >> 8),
    DARK_BG[2] + (((b - DARK_BG[2]) * gain256) >> 8),
  );
}

function blitTile(buf, row, destCol, widthPx, tile, gain256 = 256) {
  const x = row * CH * widthPx + destCol * CW;
  if (gain256 >= 256) {
    for (let py = 0; py < CH; py++) {
      const dy = x + py * widthPx;
      const sy = py * CW;
      buf[dy] = tile[sy];
      buf[dy + 1] = tile[sy + 1];
      buf[dy + 2] = tile[sy + 2];
      buf[dy + 3] = tile[sy + 3];
    }
    return;
  }
  for (let py = 0; py < CH; py++) {
    const dy = x + py * widthPx;
    const sy = py * CW;
    buf[dy] = blendPixelTowardBg(tile[sy], gain256);
    buf[dy + 1] = blendPixelTowardBg(tile[sy + 1], gain256);
    buf[dy + 2] = blendPixelTowardBg(tile[sy + 2], gain256);
    buf[dy + 3] = blendPixelTowardBg(tile[sy + 3], gain256);
  }
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

  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const surfaceRef = useRef(null);
  const colsRef = useRef(BASE_COLS);
  const starsRef = useRef(null);
  const rawRef = useRef(null);
  const featherFlagsRef = useRef(null);
  const tilesRef = useRef(null);
  const readyRef = useRef(false);
  const lastDrawRef = useRef(-1);
  const lastDrawTimeRef = useRef(0);
  const lastAudioTimeRef = useRef(0);
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

  const ensureSurface = useCallback((targetCols) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (
      surfaceRef.current
      && surfaceRef.current.cols === targetCols
      && canvas.width === targetCols * CW
    ) {
      return surfaceRef.current;
    }
    const ctx = ctxRef.current || canvas.getContext("2d", { alpha: false });
    if (!ctx || typeof ctx.createImageData !== "function") return null;
    ctxRef.current = ctx;
    const width = targetCols * CW;
    if (canvas.width !== width) {
      canvas.width = width;
    }
    const pixels = ctx.createImageData(width, H);
    const buf = new Uint32Array(pixels.data.buffer);
    surfaceRef.current = { ctx, pixels, buf, cols: targetCols, width };
    colsRef.current = targetCols;
    starsRef.current = createStarfield(targetCols, ROWS);
    return surfaceRef.current;
  }, []);

  const drawFrame = useCallback((index, timeSec = lastAudioTimeRef.current) => {
    const raw = rawRef.current;
    const tileSet = tilesRef.current;
    const surface = surfaceRef.current;
    if (!raw || !tileSet || !surface) return;

    const { tiles, starTiles } = tileSet;
    const { ctx, pixels, buf, cols, width } = surface;
    const padLeft = Math.floor((cols - BASE_COLS) / 2);
    const featherFlags = featherFlagsRef.current?.[index] ?? 0;
    const featherLeft = Boolean(featherFlags & FEATHER_LEFT_BIT);
    const featherRight = Boolean(featherFlags & FEATHER_RIGHT_BIT);

    buf.fill(DARK_BG_U32);
    const start = index * CELLS;
    let off = start;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < BASE_COLS; col++) {
        const code = raw[off++];
        if (!code) continue;
        const tile = tiles[code];
        if (!tile) continue;
        let gain256 = 256;
        if (featherLeft && col < FEATHER_COLS) {
          gain256 = FEATHER_GAINS_256[col];
        } else if (featherRight && col >= BASE_COLS - FEATHER_COLS) {
          gain256 = FEATHER_GAINS_256[BASE_COLS - 1 - col];
        }
        blitTile(buf, row, padLeft + col, width, tile, gain256);
      }
    }

    if (starTiles) {
      const reducedMotion = isReducedMotionPreferred();
      const stars = starsRef.current;
      if (stars) {
        for (let i = 0; i < stars.length; i++) {
          const star = stars[i];
          const srcCol = star.col - padLeft;
          if (srcCol >= 0 && srcCol < BASE_COLS && raw[start + star.row * BASE_COLS + srcCol] !== 0) {
            continue;
          }
          const levelIdx = reducedMotion
            ? star.baseLevel
            : Math.round((STAR_LEVELS.length - 1) * (0.5 + 0.5 * Math.sin(timeSec * star.speed + star.phase)));
          blitTile(buf, star.row, star.col, width, starTiles[star.tileBase + levelIdx]);
        }
      }
    }

    ctx.putImageData(pixels, 0, 0);
    lastDrawRef.current = index;
    lastDrawTimeRef.current = timeSec;
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.toDataURL !== "function") return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `ascii-cat-story-${lastHudRef.current.elapsed.toFixed(2).replace(".", "-")}s.png`;
    a.click();
  }, []);

  // Track viewport size dynamically via ResizeObserver + window resize so wide monitors fill smoothly.
  useEffect(() => {
    const viewport = viewportRef.current;
    let disposed = false;

    const syncViewportSize = (rect, shouldRedraw = true) => {
      if (disposed) return;
      const targetCols = computeTargetCols(rect);
      if (targetCols !== null && targetCols !== colsRef.current) {
        ensureSurface(targetCols);
        if (shouldRedraw && readyRef.current) {
          drawFrame(lastDrawRef.current >= 0 ? lastDrawRef.current : 0, lastAudioTimeRef.current);
        }
      }
    };

    ensureSurface(colsRef.current);
    if (viewport) {
      syncViewportSize(viewport.getBoundingClientRect?.(), false);
    }

    const onWindowResize = () => {
      if (!viewport) return;
      syncViewportSize(viewport.getBoundingClientRect?.(), readyRef.current);
    };

    let resizeObserver = null;
    if (viewport && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver((entries) => {
        const entryRect = entries?.[0]?.contentRect;
        const rect =
          entryRect && entryRect.width > 0 && entryRect.height > 0
            ? entryRect
            : viewport.getBoundingClientRect?.();
        syncViewportSize(rect, readyRef.current);
      });
      resizeObserver.observe(viewport);
    }
    window.addEventListener("resize", onWindowResize);

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, [ensureSurface, drawFrame]);

  // Decode gzip ASCII payload once and sync directly to live Music audio (or handshake fallback).
  useEffect(() => {
    let cancelled = false;
    setDecodeError(null);
    readyRef.current = false;
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

    ensureSurface(colsRef.current);

    decodeCatStoryFrames()
      .then((raw) => {
        if (cancelled) return;
        rawRef.current = raw;
        featherFlagsRef.current = getEdgeFeatherFlags(raw);
        if (!tilesRef.current) {
          tilesRef.current = makeTiles();
        }
        readyRef.current = true;
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
  }, [runId, songId, ensureSurface]);

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
      lastAudioTimeRef.current = audioTime;
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

      const shouldTwinkle = !isReducedMotionPreferred()
        && Boolean(audio && !audio.paused)
        && Math.abs(audioTime - lastDrawTimeRef.current) >= 0.08;

      if (forceDraw || next.frameIndex !== lastDrawRef.current || shouldTwinkle) {
        drawFrame(next.frameIndex, audioTime);
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
      <div className="terminal-ascii-viewport" ref={viewportRef}>
        <div className="terminal-ascii-scene">
          <canvas
            ref={canvasRef}
            width={BASE_W}
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
