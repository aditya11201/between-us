import assert from "node:assert/strict";
import { test } from "node:test";
import * as sass from "sass";

const stylePath = new URL(
  "../src/styles/features/IntroScreen.scss",
  import.meta.url,
);

test("keeps the profile popover narrow, tall, and viewport-clamped", () => {
  const css = sass.compile(stylePath.pathname).css;

  assert.match(
    css,
    /\.intro-screen \.intro-chat__profilePopover\s*\{[^}]*width: min\(204px, 100% - 16px\);[^}]*height: min\(360px, 100dvh - 180px\);[^}]*overflow-y: auto;/,
  );
});

test("shows a profile trigger when the DM sidebar is hidden", () => {
  const css = sass.compile(stylePath.pathname).css;

  assert.match(
    css,
    /@media \(max-width: 860px\)[\s\S]*?\.intro-screen \.intro-chat__headerProfileTrigger\s*\{[^}]*display: flex;/,
  );
});

test("disables the chat entrance animation for reduced motion", () => {
  const css = sass.compile(stylePath.pathname).css;

  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.intro-screen \.intro-chat\s*\{[^}]*animation: none;/,
  );
});
