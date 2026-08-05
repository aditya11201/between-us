import test from "node:test";
import assert from "node:assert/strict";
import {
  clearSafariHistory,
  createSafariTab,
  moveSafariTabHistory,
  normalizeSafariTarget,
  reopenLastClosedSafariTab,
  visitSafariTab,
} from "./safariModel.js";

test("Safari turns plain text into a blocked Google search URL", () => {
  assert.deepEqual(normalizeSafariTarget("macOS clone"), {
    kind: "blocked",
    url: "https://www.google.com/search?q=macOS%20clone",
    title: "https://www.google.com/search?q=macOS%20clone",
  });
});

test("Safari recognizes local commands", () => {
  assert.deepEqual(normalizeSafariTarget("  GAMES "), {
    kind: "local",
    command: "games",
    title: "Games",
  });
});

test("Safari normalizes empty input without creating a URL", () => {
  assert.deepEqual(normalizeSafariTarget("  "), { kind: "empty" });
});

test("Safari keeps explicit HTTP(S) URLs blocked", () => {
  for (const url of ["http://example.com/docs", "https://example.com/docs"]) {
    assert.deepEqual(normalizeSafariTarget(url), {
      kind: "blocked",
      url,
      title: url,
    });
  }
});

test("Safari treats hostname-looking input as a blocked HTTPS URL", () => {
  assert.deepEqual(normalizeSafariTarget("example.com"), {
    kind: "blocked",
    url: "https://example.com",
    title: "https://example.com",
  });
});

test("Safari records per-tab history and removes forward entries after a new visit", () => {
  let tab = createSafariTab(1, "Start Page", "", true);
  tab = visitSafariTab(tab, { url: "about", title: "About", isStart: false });
  tab = visitSafariTab(tab, { url: "https://google.com", title: "https://google.com", isStart: false });
  tab = moveSafariTabHistory(tab, "back");
  tab = visitSafariTab(tab, { url: "surprise", title: "Surprise", isStart: false });

  assert.deepEqual(tab.history.map((entry) => entry.url), ["", "about", "surprise"]);
  assert.equal(tab.historyIndex, 2);
});

test("Safari moves history without changing the tab at navigation boundaries", () => {
  let tab = createSafariTab(1, "Start Page", "", true);
  tab = visitSafariTab(tab, { url: "about", title: "About", isStart: false });

  const atEnd = moveSafariTabHistory(tab, "forward");
  const atStart = moveSafariTabHistory(moveSafariTabHistory(tab, "back"), "back");

  assert.strictEqual(atEnd, tab);
  assert.equal(atStart.historyIndex, 0);
  assert.equal(atStart.url, "");
});

test("Safari clears session history without changing a tab history stack", () => {
  let tab = createSafariTab(1, "Start Page", "", true);
  tab = visitSafariTab(tab, { url: "about", title: "About", isStart: false });
  const historyEntries = [{ url: "about", title: "About" }];

  const clearedHistory = clearSafariHistory();

  assert.deepEqual(clearedHistory, []);
  assert.notStrictEqual(clearedHistory, historyEntries);
  assert.deepEqual(tab.history.map((entry) => entry.url), ["", "about"]);
});

test("Safari records and reopens the most recently closed tab as a new tab", () => {
  let tab = createSafariTab(1, "Start Page", "", true);
  tab = visitSafariTab(tab, { url: "about", title: "About", isStart: false });

  const recentlyClosedTabs = [tab];
  const { tab: reopened, remaining } = reopenLastClosedSafariTab(recentlyClosedTabs, 2);

  assert.deepEqual(remaining, []);
  assert.notStrictEqual(reopened, tab);
  assert.notStrictEqual(reopened.history, tab.history);
  assert.equal(reopened.id, 2);
  assert.equal(reopened.url, "about");

  assert.deepEqual(reopenLastClosedSafariTab([], 3), { tab: null, remaining: [] });
});
