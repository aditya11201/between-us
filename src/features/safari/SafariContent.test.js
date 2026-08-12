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
  assert.match(favoritesBlock, /title: "Apologies ❤️", variant: "apologies", icon: ApologiesFavicon/);
  assert.match(favoritesBlock, /title: "Apologies ❤️",[^\n]*url: APOLOGY_TARGET_URL/);
  assert.equal(APOLOGY_TARGET_URL, "https://aditya11201.github.io/apology-web-app/");
});

test("uses the provided Apple logo treatment without changing the label size", () => {
  assert.match(source, /const AppleFavicon = memo\(\(\) => \(\s*<svg viewBox="0 0 384 512"/);
  assert.match(source, /<linearGradient id="apple-favorite-gradient"/);
  assert.match(source, /<stop offset="0" stopColor="#8e8e93" \/>/);
  assert.match(source, /<stop offset="1" stopColor="#48484a" \/>/);
  assert.match(source, /title: "Apple",\s*variant: "apple",/);
  assert.match(source, /className=\{`sf__fav-icon sf__fav-icon--\$\{favorite\.variant\}`\}/);
});

test("uses the provided Google logo treatment without changing the label size", () => {
  assert.match(source, /const GoogleFavicon = memo\(\(\) => \(\s*<svg viewBox="0 0 48 48"/);
  assert.match(source, /fill="#4285F4"/);
  assert.match(source, /fill="#34A853"/);
  assert.match(source, /fill="#FBBC05"/);
  assert.match(source, /fill="#EA4335"/);
  assert.match(source, /title: "Google",\s*variant: "google",\s*icon: GoogleFavicon,/);
  assert.match(source, /className=\{`sf__fav-icon sf__fav-icon--\$\{favorite\.variant\}`\}/);
});

test("uses the supplied SVG iCloud logo without changing the Favorite label", () => {
  assert.doesNotMatch(source, /icloudFavoriteLogo|icloud-logo-49270\.webp/);
  assert.match(source, /const ICloudFavicon = memo\(\(\) => \(/);
  assert.match(source, /viewBox="0 0 704 456"/);
  assert.match(source, /id="icloud-favorite-big"/);
  assert.match(source, /id="icloud-favorite-right"/);
  assert.match(source, /id="icloud-favorite-left"/);
  assert.match(source, /title: "iCloud", variant: "icloud", icon: ICloudFavicon,/);
  assert.match(source, /title: "iCloud",[^\n]*url: "https:\/\/www\.icloud\.com"/);
});

test("uses the supplied static Birthday cake logo without changing the Favorite label", () => {
  assert.match(source, /const BirthdayFavicon = memo\(\(\) => \(/);
  assert.match(source, /viewBox="0 0 500 500"/);
  assert.match(source, /id="birthday-hearts-a"/);
  assert.match(source, /id="birthday-hearts-b"/);
  assert.match(source, /id="birthday-topper"/);
  assert.match(source, /title: "Birthday ❤️", variant: "birthday", icon: BirthdayFavicon,/);
  assert.match(source, /title: "Birthday ❤️",[^\n]*url: TARGET_URL/);
});

test("uses the supplied static Apologies scene without changing the Favorite label", () => {
  assert.match(source, /const ApologiesFavicon = memo\(\(\) => \(/);
  assert.match(source, /viewBox="0 0 500 520"/);
  assert.match(source, /I'M SORRY/);
  assert.match(source, /id="apologies-bunny"/);
  assert.match(source, /id="apologies-chick"/);
  assert.match(source, /title: "Apologies ❤️", variant: "apologies", icon: ApologiesFavicon,/);
  assert.match(source, /title: "Apologies ❤️",[\s\S]*?url: APOLOGY_TARGET_URL/);
});
