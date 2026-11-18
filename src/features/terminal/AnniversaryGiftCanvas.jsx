import React, { useCallback, useEffect, useRef, useState } from "react";

const W = 1080;
const H = 960;
const CW = 8;
const CH = 12;
const COLS = W / CW;
const ROWS = Math.floor(H / CH);
const COUNT = COLS * ROWS;
const ASPECT = (COLS * CW) / (ROWS * CH);
const TAU = Math.PI * 2;

const M = {
  GREEN: 0,
  DEEP: 1,
  TOP: 2,
  LILAC: 3,
  LILACD: 4,
  PETAL: 5,
  PETAL2: 6,
  YELLOW: 7,
  ORANGE: 8,
  ORANGEHI: 9,
  WHITE: 10,
  INK: 11,
  BODY: 12,
  HALO: 13,
  SPARK: 14,
  TITLE: 15,
  SHADOW: 16,
};

const COL = [
  [47, 148, 68], [25, 115, 50], [48, 154, 68], [236, 155, 231], [178, 100, 180],
  [251, 245, 249], [223, 221, 238], [255, 231, 61], [255, 139, 38], [255, 186, 83],
  [255, 249, 224], [73, 49, 77], [245, 226, 203], [255, 177, 128], [255, 250, 217],
  [255, 178, 219], [73, 66, 76],
  [255, 98, 151], [65, 181, 255], [114, 241, 151], [255, 216, 77], [246, 130, 68], [244, 236, 255],
  [95, 47, 79], [255, 246, 242], [255, 183, 205], [241, 76, 143], [167, 38, 85], [99, 185, 111],
  [38, 104, 73], [209, 236, 112], [255, 178, 71], [229, 213, 233], [255, 90, 157],
  [255, 250, 246], [251, 198, 72], [243, 153, 190], [161, 111, 155], [164, 191, 63], [247, 240, 230],
];

const TEXT_WISHES = [
  "SEMOGA KAMU SEHAT SELALU",
  "SEMOGA HARIMU SELALU MENYENANGKAN",
  "SEMOGA HATIMU SENANG SELALU",
  "SEMOGA TUHAN MENGHILANGKAN SEMUA TRAUMA YANG PERNAH KAMU ALAMI",
  "SEMOGA HATIMU PERLAHAN PULIH LAGI",
  "SEMOGA SEGALANYA YANG KAMU LAKUKAN SELALU DIMUDAHKAN",
  "SEMOGA KAMU LULUS DENGAN BAIK",
  "SEMOGA IMPIANMU TERWUJUD",
  "SEMOGA KAMU SELALU DIBERI KEKUATAN",
  "SEMOGA KAMU SELALU BAHAGIA DAN SENANG",
  "MAY YOU ALWAYS BE HEALTHY",
  "MAY YOUR DAYS ALWAYS BE PLEASANT",
  "MAY YOUR HEART ALWAYS BE JOYFUL",
  "MAY GOD HEAL ALL THE TRAUMA YOU HAVE BEEN THROUGH",
  "MAY YOUR HEART SLOWLY HEAL AGAIN",
  "MAY EVERYTHING YOU DO ALWAYS BE MADE EASIER",
  "MAY YOU GRADUATE WELL",
  "MAY YOUR DREAMS COME TRUE",
  "MAY YOU ALWAYS BE GIVEN STRENGTH",
  "MAY YOU ALWAYS BE HAPPY AND JOYFUL",
  "QUE SIEMPRE TENGAS SALUD",
  "QUE TUS DIAS SIEMPRE SEAN AGRADABLES",
  "QUE TU CORAZON SIEMPRE ESTE ALEGRE",
  "QUE DIOS SANE TODOS LOS TRAUMAS QUE HAS VIVIDO",
  "QUE TU CORAZON SANE POCO A POCO",
  "QUE TODO LO QUE HAGAS SE TE HAGA MAS FACIL",
  "QUE TE GRADUES CON EXITO",
  "QUE TUS SUENOS SE HAGAN REALIDAD",
  "QUE SIEMPRE RECIBAS FUERZA",
  "QUE SIEMPRE SEAS FELIZ Y ALEGRE",
  "MUGA KOWE TANSAH SEHAT",
  "MUGA DINAMU TANSAH NYENENGAKE",
  "MUGA ATIMU TANSAH SENENG",
  "MUGA GUSTI MARASAKE KABEH TRAUMA SING WIS KOWE ALAMI",
  "MUGA ATIMU ALON ALON WARAS MANEH",
  "MUGA KABEH SING KOWE LAKONI TANSAH DILANCARKE",
  "MUGA KOWE LULUS KANTHI APIK",
  "MUGA IMPIANMU KELAKSANAN",
  "MUGA KOWE TANSAH DIWENEHI KUWAT",
  "MUGA KOWE TANSAH BAHAGIA LAN SENENG",
  "MUGIA ANJEUN SALAWASNA SEHAT",
  "MUGIA POE POE ANJEUN SALAWASNA NGABAGJAKE",
  "MUGIA HATE ANJEUN SALAWASNA BAGJA",
  "MUGIA GUSTI NGALENGITKEUN SAKABEH TRAUMA NU KANTOS KAALAMAN KU ANJEUN",
  "MUGIA HATE ANJEUN LAUN LAUN PULIH DEUI",
  "MUGIA SAGALA NU ANJEUN LAKONAN SALAWASNA DILANCARKEUN",
  "MUGIA ANJEUN LULUS KALAWAN SAE",
  "MUGIA IMPIAN ANJEUN KALAKSANA",
  "MUGIA ANJEUN SALAWASNA DIBERE KAKUATAN",
  "MUGIA ANJEUN SALAWASNA BAGJA TUR BUNGAH",
  "QUE TU SOIS TOUJOURS EN BONNE SANTE",
  "QUE TES JOURS SOIENT TOUJOURS AGREABLES",
  "QUE TON COEUR SOIT TOUJOURS JOYEUX",
  "QUE DIEU EFFACE TOUS LES TRAUMATISMES QUE TU AS VECUS",
  "QUE TON COEUR GUERISSE PEU A PEU",
  "QUE TOUT CE QUE TU FAIS SOIT TOUJOURS FACILITE",
  "QUE TU OBTIENNES TON DIPLOME AVEC SUCCES",
  "QUE TES REVES SE REALISENT",
  "QUE TU RECOIVES TOUJOURS DE LA FORCE",
  "QUE TU SOIS TOUJOURS HEUREUSE ET JOYEUSE",
  "CHE TU STIA SEMPRE IN BUONA SALUTE",
  "CHE LE TUE GIORNATE SIANO SEMPRE PIACEVOLI",
  "CHE IL TUO CUORE SIA SEMPRE FELICE",
  "CHE DIO GUARISCA TUTTI I TRAUMI CHE HAI VISSUTO",
  "CHE IL TUO CUORE GUARISCA PIANO PIANO",
  "CHE TUTTO CIO CHE FAI TI SIA SEMPRE FACILITATO",
  "CHE TU POSSA LAUREARTI CON SUCCESSO",
  "CHE I TUOI SOGNI SI AVVERINO",
  "CHE TU RICEVA SEMPRE FORZA",
  "CHE TU SIA SEMPRE FELICE E SERENA",
];

const SHORT_WISHES = [
  "DOA", "HARAP", "SEHAT", "SENANG", "TENANG", "PULIH", "KUAT", "BAHAGIA", "LULUS", "MIMPI", "AMAN",
  "HOPE", "HEALTH", "JOY", "PEACE", "HEAL", "STRENGTH", "DREAM",
  "SALUD", "PAZ", "FUERZA", "SUENO", "ALEGRE",
  "MUGA", "SEHAT", "BAGJA", "WARAS", "KUWAT",
  "SANTE", "PAIX", "JOIE", "FORCE", "REVE",
  "SALUTE", "PACE", "GIOIA", "FORZA", "SOGNO",
];

const FLOWERS = [
  [-1.82, 3.88, 0.98, 0.98, -0.11, -0.05],
  [-0.42, 4.02, 0.70, 0.84, -0.02, -0.03],
  [0.78, 4.05, 0.63, 0.82, 0.11, -0.02],
  [1.82, 3.82, 0.96, 0.98, 0.20, -0.03],
  [-1.56, 4.82, -0.22, 0.76, -0.20, 0.04],
  [-0.58, 5.18, -0.58, 0.78, -0.04, 0.08],
  [0.44, 5.02, -0.62, 0.80, 0.06, 0.09],
  [1.42, 4.88, -0.18, 0.78, 0.14, 0.05],
];

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (v) => {
  const x = clamp(v);
  return x * x * (3 - 2 * x);
};
const fract = (v) => v - Math.floor(v);
const dotText = (s) => s.replaceAll(" ", "·");
const safeMod = (a, n) => ((a % n) + n) % n;

function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

function inPolygon(x, y, p) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i];
    const b = p[j];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

function segDist(x, y, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = dx * dx + dy * dy || 1;
  const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / d);
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
}

function polyDist(x, y, poly) {
  let d = 9;
  for (let j = 0; j < poly.length; j++) {
    d = Math.min(d, segDist(x, y, poly[j], poly[(j + 1) % poly.length]));
  }
  return d;
}

function outline(gx, gy) {
  const ax = Math.abs(gx);
  const ay = Math.abs(gy);
  if (!ax && !ay) return "+";
  if (ax > ay * 2) return "|";
  if (ay > ax * 2) return gy > 0 ? "_" : "-";
  return gx * gy > 0 ? "/" : "\\";
}

function composeWishLine(width, row, group, beat) {
  if (width < 1) return "";
  const pool = TEXT_WISHES.filter((v) => dotText(v).length <= Math.max(0, width));
  const bias = (row * 13 + group * 19 + beat * 17) >>> 0;
  const options = pool.length ? pool : SHORT_WISHES.filter((v) => v.length <= width);
  if (!options.length) return "A".repeat(width);
  let text = "";
  let turn = 0;
  while (text.length < width) {
    const remain = width - text.length;
    const usable = turn === 0 ? options : options.filter((v) => v.length <= remain - 1);
    if (!usable.length) {
      const short = SHORT_WISHES.filter((v) => v.length <= remain - 1);
      if (!short.length) break;
      const fragment = short[safeMod(bias + turn * 7, short.length)];
      text += `·${fragment}`;
      turn++;
      continue;
    }
    const pick = usable[safeMod(bias + turn * 11, usable.length)];
    const rendered = dotText(pick);
    if (text.length && text.length + rendered.length + 1 > width) break;
    text += (text.length ? "·" : "") + rendered;
    turn++;
  }
  const pads = width - text.length;
  if (pads > 0) {
    const lead = Math.floor(pads / 2);
    text = "·".repeat(lead) + text + "·".repeat(pads - lead);
  }
  return text.slice(0, width);
}

let cachedSceneData = null;

function getSceneData() {
  if (cachedSceneData) return cachedSceneData;

  const rr = rand(2408);
  const uni = (a, b) => a + (b - a) * rr();
  const hash = (r, c) => (r * 7919 + c * 104729) % 9973;

  const POS = [];
  const NOR = [];
  const MAT = [];
  const PART = [];
  const APPEAR = [];
  const FLOAT = [];
  const WING = [];
  const LID = [];
  let lidMode = false;
  let partCounter = 1;
  const part = () => partCounter++;

  function add(x, y, z, nx, ny, nz, mat, partId, delay = 0, wing = 0) {
    POS.push(x, y, z);
    NOR.push(nx, ny, nz);
    MAT.push(mat);
    PART.push(partId);
    const time = 0.27 + 3.12 * clamp((y + 0.13) / 2.73) + uni(-0.25, 0.23) + delay;
    APPEAR.push(time);
    WING.push(wing);
    LID.push(lidMode ? 1 : 0);
    if (rr() < 0.035) FLOAT.push(uni(-0.85, 0.85), uni(-0.45, 0.65), uni(-0.85, 0.85));
    else FLOAT.push(0, 0, 0);
  }

  function stroke(from, to, mat, thick = 0.022, space = 0.008, partId = part(), delay = 0.2) {
    const dist = Math.hypot(from[0] - to[0], from[1] - to[1], from[2] - to[2]);
    for (let j = 0; j < Math.ceil(dist / space); j++) {
      const q = j / Math.max(1, Math.ceil(dist / space) - 1);
      for (let k = 0; k < 3; k++) {
        add(
          from[0] + (to[0] - from[0]) * q + uni(-thick, thick),
          from[1] + (to[1] - from[1]) * q + uni(-thick, thick),
          from[2] + (to[2] - from[2]) * q + uni(-thick, thick),
          0,
          1,
          0,
          mat,
          partId,
          delay,
        );
      }
    }
  }

  function splineStroke(points, mat, thick = 0.019, delay = 0.3, partId = part()) {
    for (let i = 0; i < points.length - 1; i++) {
      stroke(points[i], points[i + 1], mat, thick, 0.011, partId, delay);
    }
  }

  function buildBox() {
    const B = 1.24;
    const Y = 1.77;
    const L = 1.40;
    const LY = 2.25;
    const pFront = part();
    const pLeft = part();
    const pBack = part();
    const pRight = part();
    const pTop = part();

    for (const face of [0, 1, 2, 3]) {
      const n = face === 0 ? [0, 0, 1] : face === 1 ? [-1, 0, 0] : face === 2 ? [0, 0, -1] : [1, 0, 0];
      const grp = [pFront, pLeft, pBack, pRight][face];
      const mat = (u, v) => (v < 0.065 || u < 0.055 || u > 0.945 ? M.LILAC : face === 1 ? M.DEEP : M.GREEN);
      const npts = face < 2 ? 12500 : 4700;
      for (let i = 0; i < npts; i++) {
        const u = rr();
        const v = rr();
        const p = -B + 2 * B * u;
        const y = Y * v;
        const x = face === 0 ? p : face === 1 ? -B : face === 2 ? -p : B;
        const z = face === 0 ? B : face === 1 ? p : face === 2 ? -B : -p;
        add(x, y, z, n[0], n[1], n[2], mat(u, v), grp, 0);
      }
    }

    for (const x of [-B, B]) {
      for (const z of [-B, B]) {
        for (let i = 0; i < 700; i++) {
          const y = uni(0, Y);
          const dx = x < 0 ? -1 : 1;
          const dz = z < 0 ? -1 : 1;
          add(x + dx * 0.018 + uni(-0.025, 0.025), y, z + dz * 0.018 + uni(-0.025, 0.025), dx, 0, dz, M.LILAC, partCounter + 22);
        }
      }
    }

    lidMode = true;
    const rim = 0.172;
    for (let i = 0; i < 18800; i++) {
      const x = uni(-L, L);
      const z = uni(-L, L);
      let m = Math.max(Math.abs(x), Math.abs(z)) > L - rim ? M.LILAC : M.TOP;
      if (Math.max(Math.abs(x), Math.abs(z)) > L - 0.055) m = M.LILACD;
      add(x, LY + 0.006, z, 0, 1, 0, m, pTop, 0.15);
    }

    for (let face = 0; face < 4; face++) {
      const g = part();
      const n = face === 0 ? [0, 0, 1] : face === 1 ? [-1, 0, 0] : face === 2 ? [0, 0, -1] : [1, 0, 0];
      for (let i = 0; i < 7500; i++) {
        const a = uni(-L, L);
        const y = uni(Y - 0.025, LY);
        const x = face === 0 ? a : face === 1 ? -L : face === 2 ? -a : L;
        const z = face === 0 ? L : face === 1 ? a : face === 2 ? -L : -a;
        const mat = y > LY - 0.08 || y < Y + 0.06 || Math.abs(a) > L - 0.095 ? M.LILAC : M.GREEN;
        add(x, y, z, n[0], n[1], n[2], mat, g, 0.26);
      }
    }

    for (const s of [-1, 1]) {
      stroke([-L, LY + 0.015, s * L], [L, LY + 0.015, s * L], M.LILAC, 0.016, 0.01, pTop, 0.45);
      stroke([s * L, LY + 0.015, -L], [s * L, LY + 0.015, L], M.LILAC, 0.016, 0.01, pTop, 0.45);
      stroke([s * L, Y - 0.03, -L], [s * L, Y - 0.03, L], M.LILAC, 0.014, 0.014, pTop, 0.45);
    }

    const curve = [];
    for (let i = 0; i <= 140; i++) {
      const u = -1.14 + (2.28 * i) / 140;
      curve.push([u, LY + 0.034, 0.64 + 0.045 * Math.sin(i * 0.34) + 0.07 * Math.sin(i * 0.11)]);
    }
    splineStroke(curve, M.LILAC, 0.013, 0.96);
    lidMode = false;

    const cavity = part();
    for (let k = 0; k < 7800; k++) {
      add(uni(-1.19, 1.19), 1.766, uni(-1.19, 1.19), 0, 1, 0, M.INK, cavity, 0.4);
    }

    for (let i = 0; i < 900; i++) {
      const a = uni(0, TAU);
      const r = 1.75 * Math.sqrt(rr());
      add(r * Math.cos(a), -0.11 + uni(-0.011, 0.011), r * Math.sin(a), 0, 1, 0, M.SHADOW, part(), -0.25);
    }
  }

  function makeDaisy(face, center, scale) {
    const place = (u, v, offset = 0) => (
      face === "front"
        ? [u + center[0], v + center[1], 1.259 + offset]
        : [-1.259 - offset, v + center[1], u + center[0]]
    );
    const faceNormal = face === "front" ? [0, 0, 1] : [-1, 0, 0];
    const dirs = 8;
    for (let j = 0; j < dirs; j++) {
      const a = (j * TAU) / dirs + Math.PI / 8;
      const co = Math.cos(a);
      const si = Math.sin(a);
      const grp = part();
      for (let i = 0; i < 2600; i++) {
        const d = 2 * rr() - 1;
        const e = 2 * rr() - 1;
        if (d * d + e * e > 1) continue;
        const main = 0.355 + 0.29 * d;
        const side = 0.245 * e;
        const u = (co * main - si * side) * scale;
        const v = (si * main + co * side) * scale;
        const outlineCell = d * d + e * e > 0.87;
        const loc = place(u, v, 0.017 + (outlineCell ? 0.010 : 0.015));
        add(...loc, ...faceNormal, outlineCell ? M.LILACD : j % 3 === 0 ? M.PETAL2 : M.PETAL, grp, 0.60);
      }
      for (let k = 0; k < 680; k++) {
        const theta = (TAU * k) / 680;
        const outer = 0.355 + 0.29 * Math.cos(theta);
        const side = 0.245 * Math.sin(theta);
        const u = (co * outer - si * side) * scale;
        const v = (si * outer + co * side) * scale;
        const loc = place(u, v, 0.042);
        add(...loc, ...faceNormal, M.LILACD, grp, 0.68);
      }
    }
    const id = part();
    for (let i = 0; i < 3200; i++) {
      const a = uni(0, TAU);
      const r = Math.sqrt(rr());
      const u = Math.cos(a) * 0.253 * r * scale;
      const v = Math.sin(a) * 0.285 * r * scale;
      const loc = place(u, v, 0.052);
      add(...loc, ...faceNormal, r > 0.84 ? M.ORANGEHI : M.YELLOW, id, 0.68);
    }
    for (let i = 0; i < 170; i++) {
      const loc = place(-0.067 * scale + uni(-0.065, 0.065), 0.065 * scale + uni(-0.065, 0.065), 0.064);
      add(...loc, ...faceNormal, M.WHITE, id, 0.78);
    }
  }

  const wingTransform = (u, v) => {
    const a = -0.24;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    return [ca * u + sa * v, -sa * u + ca * v];
  };

  function butterfly() {
    const outlineFore = [[0, 0.16], [0.13, 0.50], [0.32, 0.92], [0.53, 1.19], [0.75, 1.23], [0.96, 1.07], [1.11, 0.81], [1.07, 0.53], [0.92, 0.34], [0.55, 0.08], [0.09, -0.05]];
    const outlineHind = [[0.02, -0.01], [0.50, 0.08], [0.85, -0.12], [0.95, -0.37], [0.79, -0.59], [0.51, -0.66], [0.37, -0.58], [0.25, -0.76], [0.12, -0.72], [-0.02, -0.37]];
    const veinEndsF = [[0.40, 1.10], [0.60, 1.21], [0.79, 1.16], [0.98, 0.99], [1.10, 0.79], [1.07, 0.58], [0.92, 0.36]];
    const veinEndsH = [[0.78, -0.15], [0.90, -0.36], [0.70, -0.57], [0.50, -0.64], [0.26, -0.68]];

    function wingOne(side, poly, type) {
      const grp = part();
      const ext = type === 0 ? veinEndsF : veinEndsH;
      const main = type === 0 ? [0.10, 0.10] : [0.06, -0.08];
      const box = type === 0 ? [-0.1, 1.17, -0.1, 1.32] : [-0.1, 1.05, -0.82, 0.16];
      const size = type === 0 ? 13500 : 6800;
      let accepted = 0;
      for (let i = 0; i < size * 2.4 && accepted < size; i++) {
        const u = uni(box[0], box[1]);
        const v = uni(box[2], box[3]);
        if (!inPolygon(u, v, poly)) continue;
        accepted++;
        const edge = polyDist(u, v, poly);
        const nearVein = ext.some((q) => segDist(u, v, main, q) < 0.025);
        const nearInner = Math.abs(u) < 0.09;
        const isDots = type === 0 && u > 0.84 && v > 0.65 && Math.sin(v * 43 + u * 27) > 0.85;
        const mat = edge < 0.027
          ? M.LILACD
          : edge < 0.085
            ? M.WHITE
            : nearVein || nearInner || isDots
              ? M.WHITE
              : (u + v) % 0.17 > 0.12
                ? M.ORANGEHI
                : M.ORANGE;
        const U = side * u;
        const V = v;
        const [x, z] = wingTransform(U, V);
        const h = 2.318 + 0.022 * Math.sin((u + v) * 8);
        add(x, h, z, 0, 1, 0, mat, grp, 2.24, U);
      }
    }

    for (const side of [-1, 1]) {
      wingOne(side, outlineFore, 0);
      wingOne(side, outlineHind, 1);
    }

    const body = part();
    for (let i = 0; i < 2800; i++) {
      const a = uni(0, TAU);
      const r = Math.sqrt(rr());
      const v = uni(-0.65, 0.50);
      const w = v < -0.12 ? 0.065 : 0.09;
      const u = w * Math.cos(a) * r;
      const [x, z] = wingTransform(u, v);
      add(x, 2.344 + 0.025 * Math.sin(a), z, 0, 1, 0, v < -0.25 && Math.sin(v * 43) > 0 ? M.ORANGE : M.BODY, body, 2.35);
    }

    for (const side of [-1, 1]) {
      const P = [];
      for (let k = 0; k <= 70; k++) {
        const q = k / 70;
        const loc = wingTransform(side * (0.025 + 0.34 * q + 0.072 * Math.sin(q * Math.PI)), 0.36 + 0.25 * q + 0.052 * Math.sin(q * 3.6));
        P.push([loc[0], 2.357 + 0.12 * q, loc[1]]);
      }
      splineStroke(P, M.BODY, 0.010, 2.37, body);
    }

    for (let k = 0; k < 300; k++) {
      const v = uni(-0.48, 0.38);
      const [x, z] = wingTransform(0, v);
      add(x, 2.391, z, 0, 1, 0, M.INK, body, 2.48);
    }
  }

  buildBox();
  makeDaisy("front", [0.035, 0.86], 1.32);
  makeDaisy("left", [0.10, 0.91], 1.17);
  lidMode = true;
  butterfly();
  lidMode = false;

  const BR = rand(61593);
  const rB = (a, b) => a + (b - a) * BR();
  const plus = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const times = (a, v) => [a[0] * v, a[1] * v, a[2] * v];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nn = (a) => normal(a[0], a[1], a[2]);

  const BPOS = [];
  const BNOR = [];
  const BMAT = [];
  const BPART = [];
  const BFLOWER = [];
  const BGLYPH = [];
  let bPart = 480;
  const bID = () => bPart++;

  function bloomPoint(p, n, m, id, f = -1, g = "") {
    BPOS.push(...p);
    BNOR.push(...n);
    BMAT.push(m);
    BPART.push(id);
    BFLOWER.push(f);
    BGLYPH.push(g);
  }

  function stick(a, b, m, id, nPts = 300, rad = 0.009, flower = -1, ch = "") {
    for (let i = 0; i < nPts; i++) {
      const v = i / (nPts - 1);
      const jitter = (BR() - 0.5) * rad;
      const p = [
        a[0] + (b[0] - a[0]) * v + jitter,
        a[1] + (b[1] - a[1]) * v + (BR() - 0.5) * rad,
        a[2] + (b[2] - a[2]) * v + (BR() - 0.5) * rad,
      ];
      bloomPoint(p, [0, 0.5, 0.7], m, id, flower, ch);
    }
  }

  function curvedStem(a, b, mat, id, n = 380, flower = -1) {
    let prev = a;
    for (let i = 1; i <= 18; i++) {
      const u = i / 18;
      const p = [
        a[0] + (b[0] - a[0]) * u + Math.sin(u * Math.PI) * 0.10 * (a[0] < 0 ? -1 : 1),
        a[1] + (b[1] - a[1]) * u,
        a[2] + (b[2] - a[2]) * u,
      ];
      stick(prev, p, mat, id, (n / 18) | 0, 0.012, flower);
      prev = p;
    }
  }

  function leaf(a, tip, width, id) {
    const long = nn([tip[0] - a[0], tip[1] - a[1], tip[2] - a[2]]);
    const across = nn(cross(long, [0, 0, 1]));
    for (let i = 0; i < 450; i++) {
      const u = BR();
      const v = 2 * BR() - 1;
      const ww = width * Math.pow(Math.sin(Math.PI * u), 0.68);
      const p = plus(plus(a, times([tip[0] - a[0], tip[1] - a[1], tip[2] - a[2]], u)), times(across, ww * v));
      p[2] += 0.16 * Math.sin(Math.PI * u) * (1 - v * v);
      const mat = v > 0.22 ? 28 : v < -0.65 ? 29 : 38;
      bloomPoint(p, nn([v * 0.40, 0.75, 1.0]), mat, id);
    }
    stick(a, tip, 30, id, 150, 0.004);
  }

  function wrapper(baseWrapId) {
    const back = bID();
    const front = bID();
    const pink = bID();
    const edge = bID();

    for (let i = 0; i < 21000; i++) {
      const v = BR();
      const a = rB(-Math.PI, Math.PI);
      const y = 1.49 + 1.85 * v;
      const radius = 0.28 + 1.52 * Math.pow(v, 0.87);
      const xx = radius * Math.cos(a) * (1 + 0.065 * Math.sin(7 * a + v * 14));
      const zz = radius * Math.sin(a) * 0.60 - 0.20;
      const ru = Math.cos(a);
      const rv = Math.sin(a);
      const fold = (Math.sin(a * 7 + v * 2) > 0 ? 0.10 : -0.035) * v;
      const p = [xx, y + v * v * 0.14, zz + fold];
      const n = nn([ru * 0.45, 0.13, rv * 0.8]);
      let mat = a > 0 && a < Math.PI ? (Math.sin(7 * a + v * 4) > 0.5 ? 24 : 32) : 37;
      if (a > 0 && a < Math.PI && Math.cos(a * 11 + v * 9) > 0.65) mat = 34;
      if (a > 0 && a < Math.PI && v > 0.8) mat = 24;
      bloomPoint(p, n, mat, a > 0 ? front : back);
    }

    for (let i = 0; i < 11500; i++) {
      const v = BR();
      const a = rB(0.08, Math.PI - 0.08);
      const y = 1.74 + 1.41 * v;
      const radius = 0.30 + 1.18 * Math.pow(v, 0.78);
      const p = [radius * Math.cos(a), y, radius * Math.sin(a) * 0.58 + 0.03];
      bloomPoint(p, nn([Math.cos(a) * 0.33, 0.12, Math.sin(a)]), Math.sin(a * 8 + v * 4) > 0.20 ? 36 : 25, pink);
    }

    for (const side of [-1, 1]) {
      for (let w = 0; w < 3; w++) {
        const id = bID();
        const phi = side * (0.54 + w * 0.37);
        for (let i = 0; i < 2700; i++) {
          const u = BR();
          const v = BR();
          const rad = 0.6 + 1.60 * u;
          const spread = phi + 0.23 * (v - 0.5);
          const x = rad * Math.sin(spread);
          const y = 2.49 + 1.22 * u + 0.26 * v + 0.08 * Math.sin(v * Math.PI);
          const z = -0.42 - u * 0.25 + 0.20 * Math.sin(v * Math.PI);
          bloomPoint([x, y, z], nn([side * 0.45, 0.45, 0.48]), w === 1 ? 32 : 24, id);
        }
        const a = [0.6 * Math.sin(phi), 2.5, -0.4];
        const b = [2.12 * Math.sin(phi), 3.84, -0.61];
        stick(a, b, 32, id, 400, 0.012);
      }
    }

    for (let k = 0; k < 1250; k++) {
      const a = (Math.PI * k) / 1250;
      const r = 0.90 + 0.33 * Math.sin(a);
      const x = Math.cos(a) * r;
      const y = 2.55 + 0.28 * Math.sin(a * 5);
      const z = 0.50 + 0.15 * Math.sin(a);
      bloomPoint([x, y, z], nn([0, 0.5, 1]), 39, edge, -1, k % 11 < 2 ? "o" : ":");
    }

    for (let i = 0; i < 6500; i++) {
      const v = BR();
      const a = rB(-Math.PI, Math.PI);
      const y = 0.98 + 0.78 * v;
      const r = 0.20 + 0.23 * v;
      const p = [r * Math.cos(a), y, r * 0.55 * Math.sin(a) + 0.03];
      bloomPoint(p, nn([Math.cos(a), 0.2, Math.sin(a)]), a > 0 ? 24 : 37, baseWrapId);
    }

    for (const side of [-1, 1]) {
      const id = bID();
      for (let i = 0; i < 1500; i++) {
        const v = BR();
        const w = rB(-1, 1);
        const x = side * (0.10 + 0.22 * v) + w * (0.082 + 0.04 * v);
        const y = 1.66 - 0.90 * v;
        const z = 0.49 + 0.07 * Math.sin(v * 8 + side);
        bloomPoint([x, y, z], [0, 0.35, 1], v > 0.75 ? 27 : w > 0.2 ? 33 : 36, id);
      }
      const bow = bID();
      for (let i = 0; i < 2250; i++) {
        const a = rB(-Math.PI, Math.PI);
        const v = BR();
        const x = side * (0.29 + 0.22 * Math.cos(a)) * (0.35 + 0.65 * v);
        const y = 1.68 + 0.19 * Math.sin(a) * v;
        const z = 0.51 + 0.14 * Math.sin(Math.PI * v);
        bloomPoint([x, y, z], [0, 0.25, 1], Math.sin(a * 2) > 0.3 ? 33 : 36, bow);
      }
    }

    for (let i = 0; i < 470; i++) {
      const a = rB(0, TAU);
      const r = rB(0, 0.11);
      const p = [r * Math.cos(a), 1.66 + 0.08 * r * Math.sin(a), 0.62 + 0.02 * r];
      bloomPoint(p, [0, 0.4, 1], 33, edge);
    }
  }

  const baseWrapId = bID();
  wrapper(baseWrapId);

  for (const [idx, f] of FLOWERS.entries()) {
    const stem = bID();
    const p = [f[0], f[1] - 0.05, f[2] - 0.12];
    const base = [(idx % 3 - 1) * 0.12, 1.72, -0.05];
    curvedStem(base, p, idx % 2 ? 28 : 29, stem, 460);
    if (idx % 2 === 0 && idx < 5) {
      const mid = plus(base, times([p[0] - base[0], p[1] - base[1], p[2] - base[2]], 0.73));
      const tip = [mid[0] + ((idx % 4) - 1.5) * 0.43, mid[1] + 0.18, mid[2] + 0.08];
      leaf(mid, tip, 0.16, bID());
    }
  }

  for (let j = 0; j < 7; j++) {
    const x = rB(-1.87, 1.84);
    const y = rB(2.8, 4.58);
    const z = rB(-1.05, -0.64);
    leaf([x * 0.42, 2.3, -0.75], [x, y, z], rB(0.11, 0.23), bID());
  }

  function lilyBud(x, y, z, size) {
    const id = bID();
    const C = [x, y, z];
    for (let i = 0; i < 1350; i++) {
      const u = BR();
      const a = rB(0, TAU);
      const r = size * 0.16 * Math.pow(Math.sin(Math.PI * u), 0.58);
      const p = [x + r * Math.cos(a) + u * size * 0.19, y + u * size * 0.85, z + r * Math.sin(a)];
      bloomPoint(p, nn([Math.cos(a), 0.24, Math.sin(a)]), Math.cos(a * 5) > 0.82 ? 30 : u > 0.72 ? 38 : 28, id);
    }
    curvedStem([x * 0.48, 2.4, -0.08], C, 29, bID(), 270);
  }

  lilyBud(-2.0, 4.46, -0.40, 0.85);
  lilyBud(1.92, 4.65, -0.53, 0.86);
  lilyBud(0.14, 5.12, -0.70, 0.69);

  const BGEO = {
    p: Float32Array.from(BPOS),
    n: Float32Array.from(BNOR),
    m: Uint8Array.from(BMAT),
    part: Uint16Array.from(BPART),
    flower: Int8Array.from(BFLOWER),
    glyph: BGLYPH,
    count: BMAT.length,
  };

  const G = {
    p: Float32Array.from(POS),
    n: Float32Array.from(NOR),
    m: Uint8Array.from(MAT),
    part: Uint16Array.from(PART),
    appear: Float32Array.from(APPEAR),
    flight: Float32Array.from(FLOAT),
    wing: Float32Array.from(WING),
    lid: Uint8Array.from(LID),
    len: MAT.length,
  };

  const eye = [-6.25, 8.10, 10.3];
  const target = [0, 2.30, 0];
  const fwd = normal(target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]);
  const right = normal(-fwd[2], 0, fwd[0]);
  const up = [
    right[1] * fwd[2] - right[2] * fwd[1],
    right[2] * fwd[0] - right[0] * fwd[2],
    right[0] * fwd[1] - right[1] * fwd[0],
  ];
  const key = normal(-0.55, 0.95, 0.8);
  const view = normal(-fwd[0], -fwd[1], -fwd[2]);
  const half = normal(key[0] + view[0], key[1] + view[1], key[2] + view[2]);

  const hashes = new Uint16Array(COUNT);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      hashes[y * COLS + x] = hash(y, x);
    }
  }

  const confetti = [];
  const cr = rand(88);
  for (let i = 0; i < 140; i++) {
    confetti.push({
      x: cr() * COLS,
      speed: 3 + cr() * 6,
      delay: cr() * 4.5,
      w: 1 + cr() * 1.5,
      phase: cr() * TAU,
      amp: 1 + cr() * 3,
      color: 17 + Math.floor(cr() * 6),
    });
  }

  const burstConfetti = [];
  const bcr = rand(2027);
  for (let i = 0; i < 245; i++) {
    const fan = bcr() * 2 - 1;
    burstConfetti.push({
      vx: fan * (6.5 + 5.5 * bcr()),
      vy: -(19 + 10 * bcr()),
      gravity: 10.8 + 2.4 * bcr(),
      drift: (bcr() - 0.5) * 2.8,
      spin: 6 + bcr() * 13,
      delay: bcr() * 0.72,
      life: 4.8 + bcr() * 1.15,
      color: 17 + Math.floor(bcr() * 6),
      glyphSet: bcr() > 0.2 ? "|/-\\" : "o+*.",
    });
  }

  cachedSceneData = {
    BGEO,
    G,
    eye,
    fwd,
    right,
    up,
    key,
    half,
    hashes,
    confetti,
    burstConfetti,
  };
  return cachedSceneData;
}

function makeLilyTexture(index) {
  const ca = document.createElement("canvas");
  ca.width = 320;
  ca.height = 320;
  const g = ca.getContext("2d", { willReadFrequently: true });
  if (!g) return new Uint8ClampedArray(320 * 320 * 4);
  const rr = rand(9081 + index * 47);

  g.translate(160, 160);
  const offset = 0.19 + index * 0.12;
  for (let petal = 0; petal < 6; petal++) {
    g.save();
    g.rotate((petal * TAU) / 6 + offset);
    const L = 129 + (petal % 2 ? -4 : 5);
    const w = 30 + (petal % 2 ? -2 : 2);
    const curl = 6 * Math.sin(index * 2 + petal);
    const path = new Path2D();
    path.moveTo(0, 2);
    path.bezierCurveTo(-6, -17, -w * 0.76, -37, -w * 0.91, -69);
    path.bezierCurveTo(-w * 1.12, -90, -w * 0.58, -116, curl, -L);
    path.bezierCurveTo(w * 0.73, -121, w * 1.12, -92, w * 0.94, -67);
    path.bezierCurveTo(w * 0.74, -38, 6, -14, 0, 2);
    path.closePath();

    g.shadowColor = "rgba(38,5,31,.8)";
    g.shadowBlur = 9;
    g.shadowOffsetY = 1;
    const edgeFill = g.createLinearGradient(-w, 0, w, 0);
    edgeFill.addColorStop(0, "#fffdfb");
    edgeFill.addColorStop(0.25, "#fff1f6");
    edgeFill.addColorStop(0.40, "#f26a9f");
    edgeFill.addColorStop(0.52, "#e52e74");
    edgeFill.addColorStop(0.65, "#f77aab");
    edgeFill.addColorStop(0.77, "#fff1f6");
    edgeFill.addColorStop(1, "#fffefa");
    g.fillStyle = edgeFill;
    g.fill(path);
    g.shadowBlur = 0;
    g.shadowOffsetY = 0;

    g.save();
    g.clip(path);
    const pink = g.createLinearGradient(0, 0, 0, -L);
    pink.addColorStop(0, "rgba(255,249,199,.9)");
    pink.addColorStop(0.15, "rgba(242,58,121,.75)");
    pink.addColorStop(0.45, "rgba(183,18,86,.56)");
    pink.addColorStop(0.72, "rgba(255,66,136,.38)");
    pink.addColorStop(1, "rgba(255,230,236,0)");
    g.fillStyle = pink;
    g.fillRect(-w, -L, w * 2, L + 4);

    g.strokeStyle = "rgba(255,208,227,.75)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(1, -9);
    g.bezierCurveTo(-4, -37, -4, -76, curl, -115);
    g.stroke();

    g.strokeStyle = "rgba(139,22,74,.42)";
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(-3, -7);
    g.bezierCurveTo(-9, -42, -9, -79, curl - 2, -110);
    g.stroke();

    for (let i = 0; i < 98; i++) {
      const u = 0.20 + rr() * 0.66;
      const px = (rr() * 2 - 1) * w * 0.79 * Math.pow(Math.sin(Math.PI * u), 0.7);
      const py = -L * u;
      g.fillStyle = rr() > 0.40 ? "rgba(122,9,65,.65)" : "rgba(190,19,91,.6)";
      g.beginPath();
      g.ellipse(px, py, 0.8 + rr() * 1.3, 0.8 + rr() * 1.5, rr() * TAU, 0, TAU);
      g.fill();
    }
    g.restore();

    g.strokeStyle = "#fff9fa";
    g.lineWidth = 6.3;
    g.stroke(path);

    g.strokeStyle = "rgba(255,237,246,.88)";
    g.lineWidth = 2.3;
    g.beginPath();
    g.moveTo(curl - 9, -L + 5);
    g.quadraticCurveTo(curl, -L - 6, curl + 10, -L + 8);
    g.stroke();
    g.restore();
  }

  const throat = g.createRadialGradient(0, 0, 1, 0, 0, 24);
  throat.addColorStop(0, "#ffffdb");
  throat.addColorStop(0.46, "#e7ec9b");
  throat.addColorStop(0.85, "rgba(211,224,106,.78)");
  throat.addColorStop(1, "rgba(230,220,140,0)");
  g.fillStyle = throat;
  g.beginPath();
  g.arc(0, 0, 24, 0, TAU);
  g.fill();

  for (let k = 0; k < 6; k++) {
    const a = ((k - 0.6) * TAU) / 6 + index * 0.1;
    const ex = Math.cos(a) * 62;
    const ey = Math.sin(a) * 62;
    g.strokeStyle = "#f9f4c6";
    g.lineWidth = 3.6;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(1, 2);
    g.quadraticCurveTo(ex * 0.35 - 7, ey * 0.42 - 2, ex, ey);
    g.stroke();

    g.strokeStyle = "#bc601f";
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(ex - 6 * Math.cos(a), ey - 6 * Math.sin(a));
    g.lineTo(ex + 7 * Math.cos(a), ey + 7 * Math.sin(a));
    g.stroke();

    g.strokeStyle = "#fca449";
    g.lineWidth = 2.3;
    g.beginPath();
    g.moveTo(ex - 6 * Math.cos(a), ey - 6 * Math.sin(a) - 2);
    g.lineTo(ex + 5 * Math.cos(a), ey + 5 * Math.sin(a) - 2);
    g.stroke();
  }

  g.strokeStyle = "#f7f7bc";
  g.lineWidth = 3.6;
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(9, -21, 12, -80);
  g.stroke();

  g.fillStyle = "#dfd878";
  g.beginPath();
  g.arc(12, -80, 5, 0, TAU);
  g.fill();

  g.translate(-160, -160);
  return g.getImageData(0, 0, 320, 320).data;
}

export function AnniversaryGiftCanvas({ onExit }) {
  const canvasRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const controlsRef = useRef({
    toggle: () => {},
    restart: () => {},
    save: () => {},
  });
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  const handleTogglePause = useCallback(() => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
  }, []);

  const handleRestart = useCallback(() => {
    controlsRef.current.restart();
  }, []);

  const handleSave = useCallback(() => {
    controlsRef.current.save();
  }, []);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return undefined;

    let ctx = null;
    try {
      ctx = cvs.getContext("2d", { alpha: false });
    } catch {
      ctx = null;
    }

    const makeCanvas = () => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      return c;
    };

    const ink = makeCanvas();
    const trail = makeCanvas();
    const txt = makeCanvas();
    let iCtx = null;
    let tCtx = null;
    let txtCtx = null;
    try {
      iCtx = ink.getContext("2d", { alpha: false });
      tCtx = trail.getContext("2d", { alpha: false });
      txtCtx = txt.getContext("2d", { willReadFrequently: true });
    } catch {
      iCtx = null;
      tCtx = null;
      txtCtx = null;
    }

    let t = 0;
    let last = 0;
    let lastDraw = 0;
    let rafId = null;
    let disposed = false;

    let renderFrame = () => {};

    const restart = () => {
      if (disposed) return;
      t = 0;
      last = 0;
      lastDraw = 0;
      pausedRef.current = false;
      setPaused(false);
      if (tCtx) {
        tCtx.fillStyle = "#030204";
        tCtx.fillRect(0, 0, W, H);
      }
      renderFrame(0);
    };

    const save = () => {
      if (!ctx) return;
      const a = document.createElement("a");
      a.href = cvs.toDataURL("image/png");
      a.download = `ASCII-Gift-Box-Lily-Bouquet-${Math.floor(t)}s.png`;
      a.click();
    };

    controlsRef.current = { restart, save };

    const onKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onExitRef.current?.();
        return;
      }
      const k = e.key.toLowerCase();
      if (e.key === " ") {
        e.preventDefault();
        handleTogglePause();
      } else if (k === "r") {
        e.preventDefault();
        restart();
      } else if (k === "s") {
        e.preventDefault();
        save();
      }
    };

    const onVisibilityChange = () => {
      last = 0;
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (!ctx || !iCtx || !tCtx || !txtCtx) {
      return () => {
        window.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };
    }

    const scene = getSceneData();
    const { BGEO, G, eye, fwd, right, up, key, half, hashes, confetti, burstConfetti } = scene;
    const LILY_TEXTURES = FLOWERS.map((_, i) => makeLilyTexture(i));

    const depth = new Float32Array(COUNT);
    const parts = new Uint16Array(COUNT);
    const brightness = new Float32Array(COUNT);
    const tags = new Uint8Array(COUNT);
    const characters = new Array(COUNT).fill(" ");
    const customChars = new Array(COUNT).fill("");
    const typeCache = new Map();

    const bouquetWorld = (p) => [
      right[0] * p[0] - right[2] * (p[2] + 0.45),
      p[1],
      right[2] * p[0] + right[0] * (p[2] + 0.45),
    ];
    const bouquetNormal = (p) => [
      right[0] * p[0] - right[2] * p[2],
      p[1],
      right[2] * p[0] + right[0] * p[2],
    ];

    function project(px, py, pz) {
      const x = px - eye[0];
      const y = py - eye[1];
      const z = pz - eye[2];
      const xx = x * right[0] + y * right[1] + z * right[2];
      const yy = x * up[0] + y * up[1] + z * up[2];
      const zz = x * fwd[0] + y * fwd[1] + z * fwd[2];
      return [
        (0.5 + (xx / Math.max(0.2, zz)) * 1.45) * COLS,
        (0.5 - (yy / Math.max(0.2, zz)) * 1.45 * ASPECT) * ROWS + 4,
        zz,
      ];
    }

    function put(x, y, z, material, group, light, ch = "") {
      const p = project(x, y, z);
      const cx = p[0] | 0;
      const cy = p[1] | 0;
      const d = p[2];
      if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS || d < 0.15) return;
      const i = cy * COLS + cx;
      if (d < depth[i]) {
        depth[i] = d;
        parts[i] = group;
        tags[i] = material;
        brightness[i] = light;
        customChars[i] = ch;
      }
    }

    function writeWishTextures(now) {
      const beat = Math.floor(now / 4.8);
      for (let y = 0; y < ROWS; y++) {
        let x = 0;
        while (x < COLS) {
          let i = y * COLS + x;
          if (parts[i] === 0 || tags[i] === M.TITLE || tags[i] === M.HALO || tags[i] === M.SPARK || brightness[i] < 0.009) {
            x++;
            continue;
          }
          const begin = x;
          const kind = tags[i] >= 23 ? 1 : 0;
          while (x < COLS) {
            i = y * COLS + x;
            if (
              parts[i] === 0 ||
              tags[i] === M.TITLE ||
              tags[i] === M.HALO ||
              tags[i] === M.SPARK ||
              brightness[i] < 0.009 ||
              (tags[i] >= 23 ? 1 : 0) !== kind
            ) {
              break;
            }
            x++;
          }
          const n = x - begin;
          const line = composeWishLine(n, y, kind + Math.floor(begin / 5), beat);
          for (let k = 0; k < n; k++) characters[y * COLS + begin + k] = line[k];
        }
      }
    }

    function coverage(word, scale, cy) {
      const k = `${word}_${Math.round(scale * 40)}`;
      if (typeCache.has(k)) return typeCache.get(k);
      txtCtx.clearRect(0, 0, W, H);
      txtCtx.fillStyle = "#fff";
      txtCtx.textBaseline = "middle";
      txtCtx.textAlign = "center";
      txtCtx.font = `900 ${Math.round(117 * scale)}px "Arial Black", Arial, sans-serif`;
      txtCtx.fillText(word, W * 0.5, cy * CH);
      const dat = txtCtx.getImageData(0, 0, W, H).data;
      const co = new Float32Array(COUNT);
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          let sum = 0;
          for (let oy = 0; oy < CH; oy += 2) {
            for (let ox = 0; ox < CW; ox++) {
              sum += dat[((y * CH + oy) * W + x * CW + ox) * 4 + 3];
            }
          }
          co[y * COLS + x] = sum / (Math.ceil(CH / 2) * CW * 255);
        }
      }
      if (typeCache.size > 50) typeCache.clear();
      typeCache.set(k, co);
      return co;
    }

    function star(cx, cy, reach) {
      const putStar = (x, y, ch, light) => {
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
        const p = y * COLS + x;
        if (brightness[p] < light) {
          characters[p] = ch;
          brightness[p] = light;
          tags[p] = M.SPARK;
        }
      };
      for (let d = 1; d <= reach; d++) {
        const l = 1 - d / (reach + 1);
        putStar(cx + d * 2, cy, "-", l);
        putStar(cx - d * 2, cy, "-", l);
        putStar(cx, cy + d, "|", l);
        putStar(cx, cy - d, "|", l);
        if (d < reach / 2) {
          putStar(cx + d, cy + d, "\\", l * 0.7);
          putStar(cx - d, cy - d, "\\", l * 0.7);
          putStar(cx + d, cy - d, "/", l * 0.7);
          putStar(cx - d, cy + d, "/", l * 0.7);
        }
      }
      putStar(cx, cy, "*", 1);
    }

    function drawLilyDetail(now) {
      const lift = (1 - smooth((now - 12.10) / 4.15)) * 3.55;
      const rot = 0.055 * Math.sin(now * 0.58) * smooth((now - 15.3) / 1.8);
      const co = Math.cos(rot);
      const si = Math.sin(rot);
      const transform = (x, y, z) => {
        const q = bouquetWorld([x * co - z * si, y, x * si + z * co]);
        const a = project(q[0], q[1], q[2]);
        return [a[0] * CW, a[1] * CH, a[2]];
      };
      iCtx.save();
      iCtx.font = '6px Consolas,Menlo,"DejaVu Sans Mono",monospace';
      iCtx.textAlign = "center";
      iCtx.textBaseline = "middle";
      const gw = 4.4;
      const gh = 6.4;
      const flowerOrder = [...FLOWERS.keys()].sort((a, b) => FLOWERS[a][2] - FLOWERS[b][2]);
      for (const fi of flowerOrder) {
        const f = FLOWERS[fi];
        const age = (now - 16.05 - fi * 0.14) / 2.15;
        if (age < -0.10) continue;
        const bloom = 0.09 + 0.91 * smooth(age);
        const fade = smooth((age + 0.11) / 0.32);
        const cx = f[0];
        const cy = f[1] - lift;
        const cz = f[2];
        const sc = f[3];
        if (cy < 2.1) continue;
        const P = transform(cx, cy, cz);
        const PX = transform(cx + 1, cy, cz);
        const PY = transform(cx, cy + 1, cz);
        const ax = PX[0] - P[0];
        const ay = PX[1] - P[1];
        const bx = PY[0] - P[0];
        const by = PY[1] - P[1];
        const det = ax * by - ay * bx;
        if (Math.abs(det) < 1e-5) continue;
        const extent = sc * bloom * 1.48;
        const ex = extent * (Math.abs(ax) + Math.abs(bx)) + 5;
        const ey = extent * (Math.abs(ay) + Math.abs(by)) + 5;
        const tex = LILY_TEXTURES[fi];
        for (let y = Math.max(0, Math.floor((P[1] - ey) / gh) * gh); y < Math.min(H, P[1] + ey); y += gh) {
          const flowerWish = dotText(TEXT_WISHES[safeMod(fi * 5 + Math.floor(y / (gh * 5)) + Math.floor(now / 4.8), TEXT_WISHES.length)]);
          let glyphOffset = 0;
          let lastX = -1e9;
          for (let x = Math.max(0, Math.floor((P[0] - ex) / gw) * gw); x < Math.min(W, P[0] + ex); x += gw) {
            const dx = x + gw * 0.5 - P[0];
            const dy = y + gh * 0.5 - P[1];
            const ux = (dx * by - dy * bx) / det;
            const uy = (dy * ax - dx * ay) / det;
            const tx = Math.round(160 + (ux * 112) / (sc * bloom));
            const ty = Math.round(160 - (uy * 112) / (sc * bloom));
            if (tx < 0 || ty < 0 || tx >= 320 || ty >= 320) continue;
            const k = (ty * 320 + tx) * 4;
            const a = tex[k + 3];
            if (a < 90) continue;
            const r = tex[k];
            const g = tex[k + 1];
            const b = tex[k + 2];
            const bright = 0.89 + 0.11 * Math.sin(x * 0.13 + y * 0.10 + fi) ** 2;
            const alpha = fade * (a / 255);
            iCtx.fillStyle = `rgba(${Math.min(255, Math.round(r * bright))},${Math.min(255, Math.round(g * bright))},${Math.min(255, Math.round(b * bright))},${alpha.toFixed(3)})`;
            if (x - lastX > gw * 1.7) glyphOffset = 0;
            const char = flowerWish[glyphOffset++ % flowerWish.length];
            lastX = x;
            iCtx.fillText(char, x + gw * 0.5, y + gh * 0.5);
          }
        }
      }
      iCtx.restore();
    }

    function draw(now) {
      iCtx.fillStyle = "#030204";
      iCtx.fillRect(0, 0, W, H);
      iCtx.font = '12px Consolas,Menlo,"DejaVu Sans Mono",monospace';
      iCtx.textAlign = "center";
      iCtx.textBaseline = "middle";
      for (let i = 0; i < COUNT; i++) {
        if (characters[i] === " " || brightness[i] < 0.009) continue;
        const rgb = COL[tags[i]];
        const a = clamp(brightness[i], 0, 1.15);
        iCtx.fillStyle = `rgb(${Math.floor(Math.min(255, rgb[0] * a))},${Math.floor(Math.min(255, rgb[1] * a))},${Math.floor(Math.min(255, rgb[2] * a))})`;
        iCtx.fillText(characters[i], (i % COLS) * CW + CW * 0.5, Math.floor(i / COLS) * CH + CH * 0.5);
      }
      drawLilyDetail(now);
      tCtx.globalCompositeOperation = "source-over";
      tCtx.fillStyle = "rgba(0,0,0,.58)";
      tCtx.fillRect(0, 0, W, H);
      tCtx.globalCompositeOperation = "lighten";
      tCtx.drawImage(ink, 0, 0);
      tCtx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#030204";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(trail, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.54;
      ctx.filter = "blur(5px)";
      ctx.drawImage(trail, 0, 0);
      ctx.globalAlpha = 0.23;
      ctx.filter = "blur(20px)";
      ctx.drawImage(trail, 0, 0);
      ctx.restore();

      ctx.textBaseline = "alphabetic";
      ctx.font = "16px Consolas,Menlo,monospace";
      ctx.textAlign = "right";
      ctx.fillStyle = "#edadd9";
      ctx.fillText(`${Math.floor(now * 2) % 2 === 0 ? "●" : " "} t ${now.toFixed(2).padStart(5, "0")}s`, W - 64, 31);
    }

    function frame(now) {
      depth.fill(1e9);
      parts.fill(0);
      tags.fill(0);
      brightness.fill(0);
      characters.fill(" ");
      customChars.fill("");

      const yaw = 0.045 * Math.sin(now * 0.47);
      const cs = Math.cos(yaw);
      const sn = Math.sin(yaw);
      const lightOn = smooth((now - 5.45) / 1.2);
      const lidOpen = smooth((now - 10.85) / 2.65);
      const lidAngle = -2.96 * lidOpen;
      const co = Math.cos(lidAngle);
      const si = Math.sin(lidAngle);

      for (let i = 0; i < G.len; i++) {
        const rev = smooth((now - G.appear[i]) / 0.50);
        if (rev <= 0.012) continue;
        const a = i * 3;
        const px = G.p[a];
        let py = G.p[a + 1];
        let pz = G.p[a + 2];
        const wing = G.wing[i];
        if (Math.abs(wing) > 0.001) {
          const flap = Math.max(0, Math.sin(now * 3.1)) * 0.24 * smooth((now - 5.1) / 0.85);
          py += Math.abs(wing) ** 1.25 * flap;
        }
        let ny = G.n[a + 1];
        let nz0 = G.n[a + 2];
        if (G.lid[i] && lidOpen > 0) {
          const dy = py - 2.25;
          const dz = pz + 1.40;
          py = 2.25 + dy * co - dz * si;
          pz = -1.40 + dy * si + dz * co - 1.05 * lidOpen;
          const nY = ny * co - nz0 * si;
          const nZ = ny * si + nz0 * co;
          ny = nY;
          nz0 = nZ;
        }
        const x = cs * px + sn * pz + (1 - rev) * G.flight[a];
        const y = py + (1 - rev) * G.flight[a + 1];
        const z = -sn * px + cs * pz + (1 - rev) * G.flight[a + 2];
        const nx = cs * G.n[a] + sn * nz0;
        const nz = -sn * G.n[a] + cs * nz0;
        const diffuse = Math.max(0, nx * key[0] + ny * key[1] + nz * key[2]);
        const spec = Math.max(0, nx * half[0] + ny * half[1] + nz * half[2]) ** 22;
        const mat = G.m[i];
        const pulse = lightOn * (0.12 + 0.15 * Math.sin(now * 5 + px * 2 + pz * 2)) * Math.exp(-((x * x + z * z) / 4));
        let shade = (0.57 + 0.43 * diffuse + 0.10 * spec + pulse) * rev;
        if (mat === M.SHADOW) shade *= 0.18;
        if (mat === M.DEEP) shade *= 0.86;
        if (mat === M.LILAC || mat === M.PETAL || mat === M.WHITE) shade *= 1.05;
        put(x, y, z, mat, G.part[i], shade);
      }

      const rise = smooth((now - 12.10) / 4.15);
      if (rise > 0) {
        const lift = (1 - rise) * 3.55;
        const sway = Math.sin(now * 1.12) * 0.032 * smooth((now - 15.4) / 2.0);
        const orbit = 0.055 * Math.sin(now * 0.58) * smooth((now - 15.3) / 1.8);
        const bo = Math.cos(orbit);
        const bs = Math.sin(orbit);
        for (let i = 0; i < BGEO.count; i++) {
          const k = i * 3;
          const fi = BGEO.flower[i];
          let x = BGEO.p[k];
          let y = BGEO.p[k + 1];
          let z = BGEO.p[k + 2];
          if (fi >= 0) {
            const flower = FLOWERS[fi];
            const elapsed = (now - 16.05 - fi * 0.14) / 2.15;
            const bloomed = 0.065 + 0.935 * smooth(elapsed);
            if (elapsed < -0.35) continue;
            x = flower[0] + (x - flower[0]) * bloomed;
            y = flower[1] + (y - flower[1]) * bloomed;
            z = flower[2] + (z - flower[2]) * bloomed;
          }
          x += sway * Math.max(0, (y - 1.5) / 3.5);
          y -= lift;
          if (y < 1.83) continue;
          const rotP = bouquetWorld([x * bo - z * bs, y, x * bs + z * bo]);
          const rotN = bouquetNormal([
            BGEO.n[k] * bo - BGEO.n[k + 2] * bs,
            BGEO.n[k + 1],
            BGEO.n[k] * bs + BGEO.n[k + 2] * bo,
          ]);
          const blossomShade = fi < 0 ? 1.02 : 0.84 + 0.12 * Math.sin(fi * 1.43);
          const shade =
            blossomShade *
            (0.68 +
              0.35 * Math.max(0, rotN[0] * key[0] + rotN[1] * key[1] + rotN[2] * key[2]) +
              0.10 * Math.max(0, rotN[0] * half[0] + rotN[1] * half[1] + rotN[2] * half[2]) ** 12) *
            rise;
          put(rotP[0], rotP[1], rotP[2], BGEO.m[i], BGEO.part[i], shade, BGEO.glyph[i]);
        }
      }

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const id = y * COLS + x;
          if (!parts[id]) continue;
          let edge = false;
          let gx = 0;
          let gy = 0;
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              if (!ox && !oy) continue;
              const xx = x + ox;
              const yy = y + oy;
              const other = yy * COLS + xx;
              const outside =
                xx < 0 ||
                yy < 0 ||
                xx >= COLS ||
                yy >= ROWS ||
                !parts[other] ||
                (parts[other] !== parts[id] && depth[other] > depth[id] + 0.05);
              if (outside) {
                gx += ox;
                gy += oy;
                if (!ox || !oy) edge = true;
              }
            }
          }
          if (customChars[id]) {
            characters[id] = customChars[id];
            continue;
          }
          if (tags[id] >= 23) {
            const mat = tags[id];
            const h = hashes[id];
            let ch =
              mat === 24 || mat === 34 || mat === 39
                ? "oa08e8"[h % 6]
                : mat === 25 || mat === 32
                  ? "0ao8e0"[h % 6]
                  : mat === 26 || mat === 33
                    ? "8B0aQ8"[h % 6]
                    : mat === 27
                      ? "*.:o"[h % 4]
                      : mat === 28 || mat === 29 || mat === 38
                        ? "n0uae"[h % 5]
                        : mat === 30
                          ? "^oue"[h % 4]
                          : mat === 31 || mat === 35
                            ? "8o0a"[h % 4]
                            : mat === 36 || mat === 37
                              ? "oe0a8"[h % 5]
                              : "o";
            if (edge && (mat === 24 || mat === 32 || mat === 34 || mat === 39) && h % 9 === 0) ch = outline(gx, gy);
            characters[id] = ch;
            continue;
          }
          const mat = tags[id];
          const h = hashes[id];
          let ch;
          if (edge) ch = outline(gx, gy);
          else {
            switch (mat) {
              case M.GREEN:
              case M.DEEP:
              case M.TOP:
                ch = "oa0eun"[h % 6];
                break;
              case M.LILAC:
              case M.LILACD:
                ch = "i1x~;+"[h % 6];
                break;
              case M.PETAL:
              case M.PETAL2:
              case M.WHITE:
                ch = "0a8eou"[h % 6];
                break;
              case M.YELLOW:
                ch = "8O0@%0"[h % 6];
                break;
              case M.ORANGE:
              case M.ORANGEHI:
                ch = "o0a8B%"[h % 6];
                break;
              case M.INK:
                ch = "1|!x"[h % 4];
                break;
              case M.BODY:
                ch = "o0a8"[h % 4];
                break;
              case M.SHADOW:
                ch = ".:`"[h % 3];
                break;
              default:
                ch = ".";
            }
          }
          if (edge) {
            if (mat === M.ORANGE || mat === M.ORANGEHI) {
              tags[id] = M.LILACD;
              brightness[id] = Math.max(0.63, brightness[id]);
            } else if (mat === M.PETAL || mat === M.PETAL2 || mat === M.WHITE) {
              brightness[id] = Math.max(0.92, brightness[id]);
            } else {
              brightness[id] = Math.max(0.42, brightness[id]);
            }
          }
          characters[id] = ch;
        }
      }

      const glow = smooth((now - 5.35) / 0.8);
      const butterflyLight = project(0, 2.55, 0);
      if (glow) {
        const cx = butterflyLight[0] | 0;
        const cy = butterflyLight[1] | 0;
        const rad = 6.2 + 1.4 * Math.sin(now * 8);
        for (let y = Math.max(0, Math.floor(cy - rad)); y < Math.min(ROWS, Math.ceil(cy + rad)); y++) {
          for (let x = Math.max(0, Math.floor(cx - rad * 1.7)); x < Math.min(COLS, Math.ceil(cx + rad * 1.7)); x++) {
            const k = y * COLS + x;
            const fall = 1 - Math.hypot(y - cy, (x - cx) / 1.7) / rad;
            if (characters[k] === " " && fall > 0 && (hashes[k] + Math.floor(now * 9)) % 3 !== 0) {
              characters[k] = fall < 0.4 ? "." : fall < 0.74 ? ":" : "+";
              brightness[k] = fall * 0.43 * glow;
              tags[k] = M.HALO;
            }
          }
        }
      }

      const burstStart = 11.22;
      const burstSource = project(0, 2.34, -0.12);
      const burstSource2 = project(0.12, 2.32, 0.05);
      for (let j = 0; j < burstConfetti.length; j++) {
        const p = burstConfetti[j];
        const age = now - burstStart - p.delay;
        if (age < 0 || age > p.life) continue;
        const fade = 1 - age / p.life;
        const sx = j & 1 ? burstSource[0] : burstSource2[0];
        const sy = j & 1 ? burstSource[1] : burstSource2[1];
        const horizontal = (p.vx * (1 - Math.exp(-age * 0.48))) / 0.48;
        const flutter = p.drift * Math.sin(age * 4.1 + j * 0.79) * Math.min(1, age);
        const x = Math.floor(sx + horizontal + flutter);
        const y = Math.floor(sy + p.vy * age + 0.5 * p.gravity * age * age);
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
        const k = y * COLS + x;
        if (characters[k] === " " || tags[k] === M.HALO) {
          const glyphs = p.glyphSet;
          characters[k] = glyphs[Math.floor(age * p.spin + j) % glyphs.length];
          brightness[k] = 0.58 + 0.42 * fade;
          tags[k] = p.color;
        }
        if (age < 1.45 && j % 5 === 0) {
          const nx = x + (j % 2 ? 1 : -1);
          const ny = y - 1;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
            const k2 = ny * COLS + nx;
            if (characters[k2] === " " || tags[k2] === M.HALO) {
              characters[k2] = ".";
              brightness[k2] = 0.47 * (1 - age / 1.45);
              tags[k2] = p.color;
            }
          }
        }
      }

      for (let j = 0; j < confetti.length; j++) {
        const p = confetti[j];
        const age = now - 6.3 - p.delay;
        if (age < 0) continue;
        const y = Math.floor((age * p.speed) % (ROWS + 4)) - 2;
        const x = Math.floor(p.x + p.amp * Math.sin(now * p.w + p.phase));
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
        const k = y * COLS + x;
        if (characters[k] === " " || tags[k] === M.HALO) {
          characters[k] = j % 8 ? "|/-\\"[Math.floor(now * p.w * 3 + p.phase) % 4] : "o";
          brightness[k] = 0.84;
          tags[k] = p.color;
        }
      }

      for (const [word, ts, row, scale] of [
        ["HAPPY 1ST", 8.2, 0.090, 1.22],
        ["ANNIVERSARY!", 8.8, 0.212, 1.10],
      ]) {
        const p = smooth((now - ts) / 0.65);
        const fade = 1 - smooth((now - 10.35) / 1.30);
        if (p <= 0 || fade <= 0) continue;
        const cov = coverage(word, scale + 0.13 * (1 - p), ROWS * row);
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            const k = y * COLS + x;
            const h = hashes[k];
            if (cov[k] < 0.44 || (h % 997) / 997 > smooth(p * 1.55)) continue;
            const nx = x + 1 < COLS ? cov[k + 1] : 0;
            const px = x > 0 ? cov[k - 1] : 0;
            const ny = y + 1 < ROWS ? cov[k + COLS] : 0;
            const py = y > 0 ? cov[k - COLS] : 0;
            const isEdge = Math.min(nx, px, ny, py) < 0.44;
            const wish = dotText(TEXT_WISHES[(y + Math.floor(now / 4.8)) % TEXT_WISHES.length]);
            characters[k] = isEdge
              ? outline((px - nx) * 10, (py - ny) * 10)
              : wish[(x + y * 3) % wish.length];
            tags[k] = M.TITLE;
            brightness[k] = (0.76 + 0.24 * Math.sin(now * 2.6 - x * 0.12)) * (0.8 + 0.2 * p) * fade;
          }
        }
      }

      if (now > 9.5 && now < 11.7) {
        const q = Math.floor(now * 1.45);
        for (let j = 0; j < 2; j++) {
          const ids = [];
          for (let k = 0; k < COUNT; k++) if (tags[k] === M.TITLE) ids.push(k);
          if (ids.length) {
            const id = ids[(q * 7919 + j * 104729) % ids.length];
            star(id % COLS, Math.floor(id / COLS), 2 + Math.floor(3 * Math.sin(fract(now * 1.45 + j * 0.54) * Math.PI)));
          }
        }
      }

      writeWishTextures(now);
      draw(now);
    }

    renderFrame = frame;

    function tick(ms) {
      if (disposed) {
        rafId = null;
        return;
      }
      if (!last) last = ms;
      const dt = Math.min((ms - last) / 1000, 1 / 15);
      last = ms;
      if (!pausedRef.current) {
        t += dt;
      }
      if (ms - lastDraw > 1000 / 26) {
        lastDraw = ms;
        frame(t);
      }
      rafId = requestAnimationFrame(tick);
    }

    frame(0);
    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [handleTogglePause]);

  return (
    <div className="terminal-ascii-stage" aria-label="1st Anniversary ASCII Gift Box stage">
      <div className="terminal-ascii-viewport">
        <div className="terminal-ascii-scene">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="terminal-ascii-canvas"
            role="img"
            aria-label="Animated 3D ASCII gift box and Stargazer lily bouquet with multilingual wishes"
          />
        </div>
      </div>
      <div className="terminal-ascii-tools" role="toolbar" aria-label="Animation controls">
        <button
          type="button"
          className="terminal-ascii-btn"
          onClick={handleTogglePause}
          title="Space"
          aria-pressed={paused}
        >
          {paused ? "▶ PLAY" : "II PAUSE"}
        </button>
        <button
          type="button"
          className="terminal-ascii-btn"
          onClick={handleRestart}
          title="R"
        >
          ↻ REPLAY
        </button>
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
