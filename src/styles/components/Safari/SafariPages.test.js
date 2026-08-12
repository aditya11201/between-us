import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./SafariPages.scss", import.meta.url), "utf8");
const favoritesBlock = source.match(/\.sf__favs\s*\{([\s\S]*?)\n\}/)?.[1];
const favoriteIconBlock = source.match(/\.sf__fav-icon\s*\{([\s\S]*?)\n\}/)?.[1];
const favoriteLabelBlock = source.match(/\.sf__fav-label\s*\{([\s\S]*?)\n\}/)?.[1];

test("centers Favorites in fixed 60px tiles with 16px icon spacing", () => {
  assert.ok(favoritesBlock, "Favorites grid styles should be present");
  assert.match(favoritesBlock, /grid-template-columns:\s*repeat\(auto-fit,\s*60px\);/);
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
  assert.match(favoritesBlock, /grid-template-columns:\s*repeat\(auto-fit,\s*68px\);/);
  assert.match(favoriteIconBlock, /width:\s*52px;/);
  assert.match(favoriteIconBlock, /height:\s*52px;/);
  assert.match(favoriteIconBlock, /svg\s*\{\s*width:\s*52px;\s*height:\s*52px;/);
  assert.match(favoriteLabelBlock, /font-size:\s*10px;/);
});
