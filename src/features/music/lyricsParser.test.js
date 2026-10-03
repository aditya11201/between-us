import test from "node:test";
import assert from "node:assert/strict";
import { getActiveLyricIndex, parseLRC } from "./lyricsParser.js";

test("sorts unsorted input by time ascending", () => {
  const lines = parseLRC("[00:10.00] second\n[00:02.00] first\n[00:20.00] third");
  assert.deepEqual(
    lines.map((line) => line.text),
    ["first", "second", "third"],
  );
  assert.deepEqual(
    lines.map((line) => line.time),
    [2, 10, 20],
  );
});

test("skips metadata and malformed lines", () => {
  const lines = parseLRC(
    [
      "[ar:Some Artist]",
      "[ti:Some Title]",
      "[offset:+500]",
      "no timestamp here",
      "[00:bad] broken",
      "[00:01.00]   ",
      "[00:05.00] real line",
    ].join("\n"),
  );
  assert.deepEqual(lines, [{ time: 5, text: "real line" }]);
});

test("handles empty and non-string input", () => {
  assert.deepEqual(parseLRC(""), []);
  assert.deepEqual(parseLRC(undefined), []);
});

test("resolves the active lyric index", () => {
  const lines = parseLRC("[00:05.00] first\n[00:10.00] second\n[00:15.00] third");
  assert.equal(getActiveLyricIndex([], 12), -1);
  assert.equal(getActiveLyricIndex(lines, 0), -1);
  assert.equal(getActiveLyricIndex(lines, 5), 0);
  assert.equal(getActiveLyricIndex(lines, 12), 1);
  assert.equal(getActiveLyricIndex(lines, 99), 2);
});
