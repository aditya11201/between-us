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
      "[al:Some Album]",
      "no timestamp here",
      "[00:bad] broken",
      "[00:01.00]   ",
      "[00:05.00] real line",
    ].join("\n"),
  );
  assert.deepEqual(lines, [{ time: 5, text: "real line" }]);
});

test("applies [offset:+/-ms] metadata and clamps adjusted times to >= 0", () => {
  const delayed = parseLRC("[offset:+500]\n[00:05.00] delayed");
  assert.deepEqual(delayed, [{ time: 5.5, text: "delayed" }]);

  const earlierClamped = parseLRC("[offset:-6000]\n[00:05.00] clamped\n[00:10.00] shifted");
  assert.deepEqual(earlierClamped, [
    { time: 0, text: "clamped" },
    { time: 4, text: "shifted" },
  ]);
});

test("strips inline enhanced-LRC word tags cleanly", () => {
  const lines = parseLRC(
    "[00:54.72]Oh, <00:55.32>no, <00:55.59>I <00:55.86>don't <00:56.14>need <00:56.40>you, <00:56.65>but <00:56.90>I <00:57.16>miss <00:57.40>you, <00:57.75>come <00:57.98>here",
  );
  assert.deepEqual(lines, [
    { time: 54.72, text: "Oh, no, I don't need you, but I miss you, come here" },
  ]);
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
