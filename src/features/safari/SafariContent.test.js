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
