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

const SRC_COLS = 239;
const RAW_COLS = 241;
const BASE_ROWS = 120;
const BASE_CW = 4;
const BASE_CH = 6;
const BASE_W = SRC_COLS * BASE_CW;
const BASE_H = BASE_ROWS * BASE_CH;
const BASE_ASPECT = BASE_W / BASE_H;
const MAX_WIDE_W = 2400;
const MAX_WIDE_H = 1200;
const MAX_PORTRAIT_H = 2400;
const RAW_CELLS = RAW_COLS * BASE_ROWS;
const DEFAULT_GEOMETRY = { width: BASE_W, height: BASE_H, totalRows: BASE_ROWS, padTop: 0 };
const DARK_BG = [3, 2, 4];
const DARK_BG_U32 = 0xff040203;
const BORDER_COL_THRESHOLD = 100;
const SAFE_MARGIN_X = 6;
const SAFE_MARGIN_Y = 5;
const MIN_OPP_Y = 3;
const MIN_SAFE_SRC_COL = 1 + SAFE_MARGIN_X;
const MAX_SAFE_SRC_COL = SRC_COLS - SAFE_MARGIN_X;
const MAX_SAFE_SRC_ROW = BASE_ROWS - 1 - SAFE_MARGIN_Y;
const FEATHER_EDGE_ROW_THRESHOLD = 8;
const FEATHER_INNER_ROW_THRESHOLD = 15;
const V_FEATHER_ROWS = 4;
const FEATHER_TOP_BIT = 1;
const FEATHER_BOTTOM_BIT = 2;

const V_FEATHER_GAINS_256 = Array.from({ length: V_FEATHER_ROWS }, (_, d) => {
  const t = (d + 1) / (V_FEATHER_ROWS + 1);
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
const frameMetadataCache = new WeakMap();

function computeTargetGeometry(rect) {
  if (!rect || !(rect.width > 0 && rect.height > 0)) return null;
  const aspect = rect.width / rect.height;

  if (aspect >= BASE_ASPECT) {
    let height = Math.max(BASE_H, Math.min(MAX_WIDE_H, Math.round(rect.height)));
    let width = Math.round(height * aspect);
    if (width > MAX_WIDE_W) {
      width = MAX_WIDE_W;
      height = Math.max(BASE_H, Math.round(width * (rect.height / rect.width)));
    }
    width = Math.max(BASE_W, width);
    return { width, height, totalRows: BASE_ROWS, padTop: 0 };
  }

  const width = BASE_W;
  const height = Math.min(MAX_PORTRAIT_H, Math.max(BASE_H, Math.round(width * (rect.height / rect.width))));
  const totalRows = Math.max(BASE_ROWS, Math.round(height / BASE_CH));
  const padTop = Math.floor((totalRows - BASE_ROWS) / 2);
  return { width, height, totalRows, padTop };
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
  for (let row = 0; row < BASE_ROWS; row++) {
    if (raw[frameOffset + row * RAW_COLS + col] !== 0) {
      count += 1;
    }
  }
  return count;
}

function clearColumnCells(raw, frameOffset, col) {
  for (let row = 0; row < BASE_ROWS; row++) {
    raw[frameOffset + row * RAW_COLS + col] = 0;
  }
}

function computeFrameLayout(raw, frameOffset) {
  let minCol = RAW_COLS;
  let maxCol = -1;
  let minRow = BASE_ROWS;
  let maxRow = -1;

  for (let row = 0; row < BASE_ROWS; row++) {
    const rowBase = frameOffset + row * RAW_COLS;
    for (let col = 0; col < RAW_COLS; col++) {
      if (raw[rowBase + col] === 0) continue;
      if (col < minCol) minCol = col;
      if (col > maxCol) maxCol = col;
      if (row < minRow) minRow = row;
      if (row > maxRow) maxRow = row;
    }
  }

  if (maxCol < minCol) {
    return { shiftX: 0, shiftY: 0, isFullBleed: false };
  }

  // Full-bleed artwork touches opposing horizontal boundaries and stays edge-to-edge without margin shifting.
  const isFullBleed = minCol <= 1 && maxCol >= RAW_COLS - 2;
  if (isFullBleed) {
    return { shiftX: 0, shiftY: 0, isFullBleed: true };
  }

  let shiftX = 0;
  if (maxCol > MAX_SAFE_SRC_COL) {
    const leftSlack = Math.max(0, minCol - MIN_SAFE_SRC_COL);
    shiftX = -Math.min(maxCol - MAX_SAFE_SRC_COL, leftSlack);
  } else if (minCol < MIN_SAFE_SRC_COL) {
    const rightSlack = Math.max(0, MAX_SAFE_SRC_COL - maxCol);
    shiftX = Math.min(MIN_SAFE_SRC_COL - minCol, rightSlack);
  }

  let shiftY = 0;
  if (maxRow > MAX_SAFE_SRC_ROW) {
    const topSlack = Math.max(0, minRow - MIN_OPP_Y);
    shiftY = -Math.min(maxRow - MAX_SAFE_SRC_ROW, topSlack);
  } else if (minRow < MIN_OPP_Y) {
    const bottomSlack = Math.max(0, MAX_SAFE_SRC_ROW - maxRow);
    shiftY = Math.min(MIN_OPP_Y - minRow, bottomSlack);
  }

  return { shiftX, shiftY, isFullBleed: false };
}

function countShiftedRowCells(raw, frameOffset, destRow, shiftX, shiftY) {
  const srcRow = destRow - shiftY;
  if (srcRow < 0 || srcRow >= BASE_ROWS) return 0;
  const rowBase = frameOffset + srcRow * RAW_COLS;
  let count = 0;
  for (let srcCol = 0; srcCol < RAW_COLS; srcCol++) {
    const destCol = srcCol + shiftX - 1;
    if (destCol < 0 || destCol >= SRC_COLS) continue;
    if (raw[rowBase + srcCol] !== 0) {
      count += 1;
    }
  }
  return count;
}

// Strip solid full-height border bars on col 0 / col 240, compute per-frame safe shifts, and flag shifted boundary rows.
function sanitizeCatStoryFrames(raw) {
  const verticalFeatherFlags = new Uint8Array(BONUS_FRAME_COUNT);
  const frameLayouts = new Array(BONUS_FRAME_COUNT);
  for (let f = 0; f < BONUS_FRAME_COUNT; f++) {
    const base = f * RAW_CELLS;
    if (countColumnCells(raw, base, 0) >= BORDER_COL_THRESHOLD) {
      clearColumnCells(raw, base, 0);
    }
    if (countColumnCells(raw, base, RAW_COLS - 1) >= BORDER_COL_THRESHOLD) {
      clearColumnCells(raw, base, RAW_COLS - 1);
    }

    const layout = computeFrameLayout(raw, base);
    frameLayouts[f] = layout;
    const { shiftX, shiftY } = layout;

    const topEdgeCount = countShiftedRowCells(raw, base, 0, shiftX, shiftY);
    const topInnerCount = countShiftedRowCells(raw, base, 1, shiftX, shiftY);
    const bottomEdgeCount = countShiftedRowCells(raw, base, BASE_ROWS - 1, shiftX, shiftY);
    const bottomInnerCount = countShiftedRowCells(raw, base, BASE_ROWS - 2, shiftX, shiftY);
    let flags = 0;
    if (topEdgeCount >= FEATHER_EDGE_ROW_THRESHOLD || topInnerCount >= FEATHER_INNER_ROW_THRESHOLD) {
      flags |= FEATHER_TOP_BIT;
    }
    if (bottomEdgeCount >= FEATHER_EDGE_ROW_THRESHOLD || bottomInnerCount >= FEATHER_INNER_ROW_THRESHOLD) {
      flags |= FEATHER_BOTTOM_BIT;
    }
    verticalFeatherFlags[f] = flags;
  }
  const metadata = { verticalFeatherFlags, frameLayouts };
  frameMetadataCache.set(raw, metadata);
  return metadata;
}

function getFrameMetadata(raw) {
  if (!raw) return null;
  const cached = frameMetadataCache.get(raw);
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
      if (raw.length !== BONUS_FRAME_COUNT * RAW_CELLS) {
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

// Generate deterministic star coordinates centered on the 120-row story so portrait extensions stay seamless.
function createStarfield(cols, totalRows = BASE_ROWS, padTop = 0) {
  const stars = [];
  const centerCol = Math.floor(cols / 2);
  const stride = STAR_COLORS.length * STAR_LEVELS.length;
  for (let row = 0; row < totalRows; row++) {
    const worldRow = row - padTop;
    for (let col = 0; col < cols; col++) {
      const h = hashCell2D(worldRow, col - centerCol);
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

function rasterizeGlyphMask(gc, char, cellW, cellH, scale, fontPx) {
  const w = cellW * scale;
  const h = cellH * scale;
  gc.clearRect(0, 0, w, h);
  gc.fillStyle = "white";
  gc.font = `bold ${(fontPx * scale).toFixed(2)}px 'DejaVu Sans Mono','Liberation Mono',monospace`;
  gc.textAlign = "center";
  gc.textBaseline = "middle";
  gc.fillText(char, w / 2, h / 2 + fontPx * 0.09 * scale);
  const dat = gc.getImageData(0, 0, w, h).data;
  const opacity = new Uint8Array(cellW * cellH);
  const invArea = scale * scale;
  for (let y = 0; y < cellH; y++) {
    for (let x = 0; x < cellW; x++) {
      let sum = 0;
      for (let dy = 0; dy < scale; dy++) {
        const rowOff = (y * scale + dy) * w + x * scale;
        for (let dx = 0; dx < scale; dx++) {
          sum += dat[(rowOff + dx) * 4 + 3];
        }
      }
      opacity[y * cellW + x] = Math.round(sum / invArea);
    }
  }
  return opacity;
}

function buildBlendedTile(mask, color) {
  const tile = new Uint32Array(mask.length);
  for (let p = 0; p < tile.length; p++) {
    const a = clamp((mask[p] / 255) * 1.25, 0, 1);
    const r = Math.round(DARK_BG[0] + (color[0] - DARK_BG[0]) * a);
    const g = Math.round(DARK_BG[1] + (color[1] - DARK_BG[1]) * a);
    const b = Math.round(DARK_BG[2] + (color[2] - DARK_BG[2]) * a);
    tile[p] = pack(r, g, b);
  }
  return tile;
}

function makeTileSet(cellW, cellH) {
  const scale = cellW * cellH <= 64 ? 4 : 2;
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = cellW * scale;
  maskCanvas.height = cellH * scale;
  const gc = maskCanvas.getContext("2d", { willReadFrequently: true });
  if (!gc) return null;

  const fontPx = Math.min(cellH * 1.13, cellW * 1.65);
  const masks = GLYPHS.map((char) => rasterizeGlyphMask(gc, char, cellW, cellH, scale, fontPx));
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

  const starMasks = STAR_GLYPHS.map((char) => rasterizeGlyphMask(gc, char, cellW, cellH, scale, fontPx));
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

function blitTile(buf, x0, y0, cellW, cellH, widthPx, tile, gain256 = 256) {
  let dstRowOff = y0 * widthPx + x0;
  let srcRowOff = 0;
  if (gain256 >= 256) {
    for (let py = 0; py < cellH; py++) {
      for (let px = 0; px < cellW; px++) {
        buf[dstRowOff + px] = tile[srcRowOff + px];
      }
      dstRowOff += widthPx;
      srcRowOff += cellW;
    }
    return;
  }
  for (let py = 0; py < cellH; py++) {
    for (let px = 0; px < cellW; px++) {
      buf[dstRowOff + px] = blendPixelTowardBg(tile[srcRowOff + px], gain256);
    }
    dstRowOff += widthPx;
    srcRowOff += cellW;
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
  const geomRef = useRef(DEFAULT_GEOMETRY);
  const starsRef = useRef(null);
  const rawRef = useRef(null);
  const frameMetadataRef = useRef(null);
  const tileSetCacheRef = useRef(new Map());
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

  const getTileSet = useCallback((cellW, cellH) => {
    const key = (cellW << 8) | cellH;
    const cache = tileSetCacheRef.current;
    if (cache.has(key)) return cache.get(key);
    const built = makeTileSet(cellW, cellH);
    if (built) {
      cache.set(key, built);
    }
    return built;
  }, []);

  const ensureSurface = useCallback((geom) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const cur = surfaceRef.current;
    if (
      cur
      && cur.width === geom.width
      && cur.height === geom.height
      && cur.totalRows === geom.totalRows
      && cur.padTop === geom.padTop
      && canvas.width === geom.width
      && canvas.height === geom.height
    ) {
      return cur;
    }
    const ctx = ctxRef.current || canvas.getContext("2d", { alpha: false });
    if (!ctx || typeof ctx.createImageData !== "function") return null;
    ctxRef.current = ctx;
    if (canvas.width !== geom.width) {
      canvas.width = geom.width;
    }
    if (canvas.height !== geom.height) {
      canvas.height = geom.height;
    }
    const pixels = ctx.createImageData(geom.width, geom.height);
    const buf = new Uint32Array(pixels.data.buffer);
    const colX = new Int32Array(SRC_COLS + 1);
    for (let c = 0; c <= SRC_COLS; c++) {
      colX[c] = Math.round((c * geom.width) / SRC_COLS);
    }
    const rowY = new Int32Array(geom.totalRows + 1);
    for (let r = 0; r <= geom.totalRows; r++) {
      rowY[r] = Math.round((r * geom.height) / geom.totalRows);
    }
    surfaceRef.current = {
      ctx,
      pixels,
      buf,
      width: geom.width,
      height: geom.height,
      totalRows: geom.totalRows,
      padTop: geom.padTop,
      colX,
      rowY,
    };
    geomRef.current = geom;
    starsRef.current = createStarfield(SRC_COLS, geom.totalRows, geom.padTop);
    return surfaceRef.current;
  }, []);

  const drawFrame = useCallback((index, timeSec = lastAudioTimeRef.current) => {
    const raw = rawRef.current;
    const surface = surfaceRef.current;
    if (!raw || !surface) return;

    const { ctx, pixels, buf, width, padTop, colX, rowY } = surface;
    const meta = frameMetadataRef.current || getFrameMetadata(raw);
    const { shiftX = 0, shiftY = 0 } = meta?.frameLayouts?.[index] ?? {};
    const vFlags = padTop > 0 ? (meta?.verticalFeatherFlags?.[index] ?? 0) : 0;
    const featherTop = Boolean(vFlags & FEATHER_TOP_BIT);
    const featherBottom = Boolean(vFlags & FEATHER_BOTTOM_BIT);

    const localTiles = new Map();
    const resolveTileSet = (cellW, cellH) => {
      const key = (cellW << 8) | cellH;
      let ts = localTiles.get(key);
      if (ts === undefined) {
        ts = getTileSet(cellW, cellH);
        localTiles.set(key, ts);
      }
      return ts;
    };

    buf.fill(DARK_BG_U32);
    const start = index * RAW_CELLS;

    for (let srcRow = 0; srcRow < BASE_ROWS; srcRow++) {
      const srcRowShifted = srcRow + shiftY;
      if (srcRowShifted < 0 || srcRowShifted >= BASE_ROWS) continue;

      const destRow = padTop + srcRowShifted;
      const y0 = rowY[destRow];
      const cellH = rowY[destRow + 1] - y0;
      if (cellH <= 0) continue;

      let gain256 = 256;
      if (featherTop && srcRowShifted < V_FEATHER_ROWS) {
        gain256 = V_FEATHER_GAINS_256[srcRowShifted];
      } else if (featherBottom && srcRowShifted >= BASE_ROWS - V_FEATHER_ROWS) {
        gain256 = V_FEATHER_GAINS_256[BASE_ROWS - 1 - srcRowShifted];
      }

      const rowBase = start + srcRow * RAW_COLS;
      for (let srcCol = 0; srcCol < RAW_COLS; srcCol++) {
        const destCol = srcCol + shiftX - 1;
        if (destCol < 0 || destCol >= SRC_COLS) continue;

        const code = raw[rowBase + srcCol];
        if (!code) continue;
        const x0 = colX[destCol];
        const cellW = colX[destCol + 1] - x0;
        if (cellW <= 0) continue;
        const tileSet = resolveTileSet(cellW, cellH);
        const tile = tileSet?.tiles[code];
        if (!tile) continue;
        blitTile(buf, x0, y0, cellW, cellH, width, tile, gain256);
      }
    }

    const reducedMotion = isReducedMotionPreferred();
    const stars = starsRef.current;
    if (stars) {
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const origRow = star.row - padTop - shiftY;
        const origCol = star.col + 1 - shiftX;
        if (
          origRow >= 0
          && origRow < BASE_ROWS
          && origCol >= 0
          && origCol < RAW_COLS
          && raw[start + origRow * RAW_COLS + origCol] !== 0
        ) {
          continue;
        }
        const x0 = colX[star.col];
        const cellW = colX[star.col + 1] - x0;
        const y0 = rowY[star.row];
        const cellH = rowY[star.row + 1] - y0;
        if (cellW <= 0 || cellH <= 0) continue;
        const tileSet = resolveTileSet(cellW, cellH);
        if (!tileSet?.starTiles) continue;
        const levelIdx = reducedMotion
          ? star.baseLevel
          : Math.round((STAR_LEVELS.length - 1) * (0.5 + 0.5 * Math.sin(timeSec * star.speed + star.phase)));
        blitTile(buf, x0, y0, cellW, cellH, width, tileSet.starTiles[star.tileBase + levelIdx]);
      }
    }

    ctx.putImageData(pixels, 0, 0);
    lastDrawRef.current = index;
    lastDrawTimeRef.current = timeSec;
  }, [getTileSet]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.toDataURL !== "function") return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `ascii-cat-story-${lastHudRef.current.elapsed.toFixed(2).replace(".", "-")}s.png`;
    a.click();
  }, []);

  // Track viewport size dynamically via ResizeObserver + window resize so wide & portrait screens fill seamlessly.
  useEffect(() => {
    const viewport = viewportRef.current;
    let disposed = false;

    const syncViewportSize = (rect, shouldRedraw = true) => {
      if (disposed) return;
      const nextGeom = computeTargetGeometry(rect);
      if (!nextGeom) return;
      const curGeom = geomRef.current;
      if (
        nextGeom.width !== curGeom.width
        || nextGeom.height !== curGeom.height
        || nextGeom.totalRows !== curGeom.totalRows
        || nextGeom.padTop !== curGeom.padTop
      ) {
        ensureSurface(nextGeom);
        if (shouldRedraw && readyRef.current) {
          drawFrame(lastDrawRef.current >= 0 ? lastDrawRef.current : 0, lastAudioTimeRef.current);
        }
      }
    };

    const initialRect = viewport?.getBoundingClientRect?.();
    const initialGeom = computeTargetGeometry(initialRect) || geomRef.current;
    ensureSurface(initialGeom);

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

    ensureSurface(geomRef.current);

    decodeCatStoryFrames()
      .then((raw) => {
        if (cancelled) return;
        rawRef.current = raw;
        frameMetadataRef.current = getFrameMetadata(raw);
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
            height={BASE_H}
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
