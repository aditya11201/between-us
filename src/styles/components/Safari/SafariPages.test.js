import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./SafariPages.scss", import.meta.url), "utf8");
const favoritesBlock = source.match(/\.sf__favs\s*\{([\s\S]*?)\n\}/)?.[1];
const favoriteIconBlock = source.match(/\.sf__fav-icon\s*\{([\s\S]*?)\n\}/)?.[1];
const favoriteLabelBlock = source.match(/\.sf__fav-label\s*\{([\s\S]*?)\n\}/)?.[1];

test("centers Favorites in fixed 76px tiles with 16px icon spacing", () => {
  assert.ok(favoritesBlock, "Favorites grid styles should be present");
  assert.match(favoritesBlock, /grid-template-columns:\s*repeat\(auto-fit,\s*76px\);/);
  assert.match(favoritesBlock, /justify-content:\s*center;/);
  assert.match(favoritesBlock, /gap:\s*10px\s+0;/);
  assert.doesNotMatch(
    source,
    /@media \(max-width: 640px\)[\s\S]*?\.sf__favs\s*\{\s*grid-template-columns:/,
  );
});

test("enlarges Favorite logos without changing label size", () => {
  assert.ok(favoriteIconBlock, "Favorite logo styles should be present");
  assert.ok(favoriteLabelBlock, "Favorite label styles should be present");
  assert.match(favoritesBlock, /grid-template-columns:\s*repeat\(auto-fit,\s*76px\);/);
  assert.match(favoriteIconBlock, /width:\s*60px;/);
  assert.match(favoriteIconBlock, /height:\s*60px;/);
  assert.match(favoriteIconBlock, /svg\s*\{\s*width:\s*60px;\s*height:\s*60px;/);
  assert.match(favoriteLabelBlock, /font-size:\s*10px;/);
});

test("styles the Apple Favorite as a light rounded card", () => {
  assert.match(source, /\.sf__fav-icon--apple\s*\{/);
  assert.match(source, /\.sf__fav-icon--apple[\s\S]*?background:\s*linear-gradient\(180deg,\s*#ffffff 0%,\s*#e8e8ea 100%\);/);
  assert.match(source, /\.sf__fav-icon--apple[\s\S]*?border-radius:\s*14px;/);
});

test("styles the Google Favorite as a light rounded card", () => {
  assert.match(source, /\.sf__fav-icon--google\s*\{/);
  assert.match(source, /\.sf__fav-icon--google[\s\S]*?background:\s*#ffffff;/);
  assert.match(source, /\.sf__fav-icon--google[\s\S]*?border-radius:\s*14px;/);
  assert.match(source, /\.sf__fav-icon--google[\s\S]*?svg\s*\{\s*width:\s*44px;\s*height:\s*44px;/);
});
