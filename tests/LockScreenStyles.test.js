import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as sass from "sass";

const stylePath = new URL(
  "../src/styles/features/LockScreen.scss",
  import.meta.url,
);

function compileStyles() {
  const source = readFileSync(stylePath, "utf8");
  return sass.compileString(source, { style: "expanded" }).css;
}

test("scopes the lock screen as a fixed top-level overlay with the reference wall", () => {
  const css = compileStyles();

  assert.match(css, /\.lock-screen \{/);
  assert.match(css, /position: fixed;/);
  assert.match(css, /z-index: 110000;/);
  assert.match(css, /--time-size: clamp\(110px, 20vw, 190px\);/);
  assert.match(css, /radial-gradient\(75% 26% at 28% 64%/);
  assert.match(css, /linear-gradient\(180deg, #f9dda5 0%, #f3ca8e 13%/);
  assert.doesNotMatch(css, /(^|\n)(html|body)(\s|,|\{)/);
});

test("preserves the glass clock, pill, and reference motion values", () => {
  const css = compileStyles();

  assert.match(css, /background-attachment: fixed;/);
  assert.match(css, /-webkit-background-clip: text;/);
  assert.match(css, /background-clip: text;/);
  assert.match(css, /-webkit-backdrop-filter: blur\(18px\) saturate\(170%\);/);
  assert.match(css, /backdrop-filter: blur\(18px\) saturate\(170%\);/);
  assert.match(css, /border-radius: 999px;/);
  assert.match(css, /margin-top: 13vh;/);
  assert.match(css, /margin-top: 5vh;/);
  assert.match(css, /bottom: 9vh;/);
  assert.match(css, /width: 66px;/);
  assert.match(css, /min-width: 232px;/);
  assert.match(css, /transition: opacity 600ms ease, transform 600ms ease;/);
  assert.match(css, /animation: lock-screen-spin 700ms linear infinite;/);
  assert.match(css, /animation: lock-screen-hint-breathe 2\.6s ease-in-out infinite;/);
  assert.match(css, /animation: lock-screen-shake 420ms ease;/);
});

test("uses scoped reveal and persistent unlocked state modifiers", () => {
  const css = compileStyles();

  assert.match(css, /\.lock-screen--revealed \.clock-block/);
  assert.match(css, /\.lock-screen--revealed \.login/);
  assert.match(css, /\.lock-screen--unlocked \.lock-ui/);
  assert.match(css, /\.lock-screen--unlocked \.wallpaper/);
  assert.match(css, /\.lock-screen--unlocked \{[\s\S]*?pointer-events: none;/);
  assert.match(css, /\.login[\s\S]*?pointer-events: none;/);
});

test("disables every lock-screen animation and transition under reduced motion", () => {
  const css = compileStyles();

  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(
    css,
    /\.lock-screen,\s*\.lock-screen \*,\s*\.lock-screen \*::before,\s*\.lock-screen \*::after\s*\{[\s\S]*?animation: none !important;[\s\S]*?transition: none !important;/,
  );
});
