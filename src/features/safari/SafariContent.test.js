import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { APOLOGY_TARGET_URL } from "./safariNavigation.js";

const source = readFileSync(new URL("./SafariContent.jsx", import.meta.url), "utf8");
const favoritesBlock = source.match(/const FAVORITES = \[(?<items>[\s\S]*?)\n\];/)?.groups?.items;

test("keeps the default Favorites order and apology tile wiring", () => {
  assert.ok(favoritesBlock, "Safari Favorites data should be present");

  const titles = [...favoritesBlock.matchAll(/title: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(titles, ["Apple", "iCloud", "Google", "Birthday ❤️", "Apologies ❤️"]);

  const apologyFavorite = favoritesBlock.match(
    /\{\s*title: "Apologies ❤️",[\s\S]*?\n\s*\},/,
  )?.[0];
  assert.ok(apologyFavorite, "Apologies Favorite should be present");
  assert.match(apologyFavorite, /icon: TextFavicon/);
  assert.match(apologyFavorite, /url: APOLOGY_TARGET_URL/);
  assert.equal(APOLOGY_TARGET_URL, "https://aditya11201.github.io/apology-web-app/");
  assert.match(
    source,
    /<IconComponent \{\.\.\.favorite\.iconProps\}>\{favorite\.title\.charAt\(0\)\}<\/IconComponent>/,
  );
});

test("uses the provided Apple logo treatment without changing the label size", () => {
  assert.match(source, /const AppleFavicon = memo\(\(\) => \(\s*<svg viewBox="0 0 384 512"/);
  assert.match(source, /<linearGradient id="apple-favorite-gradient"/);
  assert.match(source, /<stop offset="0" stopColor="#8e8e93" \/>/);
  assert.match(source, /<stop offset="1" stopColor="#48484a" \/>/);
  assert.match(source, /title: "Apple",\s*variant: "apple",/);
  assert.match(source, /className=\{favorite\.variant === "apple" \? "sf__fav-icon sf__fav-icon--apple" : "sf__fav-icon"\}/);
  assert.match(source, /style=\{favorite\.variant === "apple" \? undefined :/);
});

test("uses the provided Google logo treatment without changing the label size", () => {
  assert.match(source, /const GoogleFavicon = memo\(\(\) => \(\s*<svg viewBox="0 0 48 48"/);
  assert.match(source, /fill="#4285F4"/);
  assert.match(source, /fill="#34A853"/);
  assert.match(source, /fill="#FBBC05"/);
  assert.match(source, /fill="#EA4335"/);
  assert.match(source, /title: "Google",\s*variant: "google",\s*icon: GoogleFavicon,/);
  assert.match(source, /className=\{favorite\.variant === "google" \? "sf__fav-icon sf__fav-icon--google"/);
});
