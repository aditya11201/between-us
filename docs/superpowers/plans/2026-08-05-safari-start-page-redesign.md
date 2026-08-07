# Safari Start Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign only the Safari clone content to match the supplied Safari Start Page, while preserving the existing macOS window chrome and keeping every external URL on `BlockedPage`.

**Architecture:** Keep Safari state local to `SafariContent`. Add small pure helpers for URL normalization and per-tab session history so the new behavior is testable without rendering the whole desktop. Extend the existing Safari JSX and Sass rather than changing `WindowManagerProvider`, `AppWindow`, `Dock`, or other applications.

**Tech Stack:** React 19, Vite 5, Sass, existing `react-icons`, Node built-in `node:test`.

## Global Constraints

- Scope is limited to Safari feature code and Safari styles.
- Preserve the active Safari window size, traffic-light size, border, radius, and macOS window callbacks.
- External URLs and Google search URLs must render `BlockedPage`; never call `window.open` for Safari navigation.
- Use 12 reference Favorites: Apple, iCloud, Yahoo, Bing, Google, Wikipedia, Facebook, Twitter, LinkedIn, The Weather Channel, Yelp, TripAdvisor.
- Session history is kept in React state only; it is not persisted.
- History is per tab; clearing the visible History list must not clear tab stacks or Recently Closed Tabs.
- Do not add dependencies.
- Do not modify non-Safari services or application code.

---

### Task 1: Add Tested Safari Navigation and Session Model

**Files:**
- Create: `src/features/safari/safariModel.js`
- Create: `src/features/safari/safariModel.test.js`
- Modify: `package.json:6-11`

**Interfaces:**
- `normalizeSafariTarget(rawValue)` returns `{ kind: "empty" | "local" | "blocked", command?, url?, title? }`.
- `createSafariTab(id, title, url, isStart)` returns a tab with a `history` array and `historyIndex`.
- `visitSafariTab(tab, page)` records a new page and truncates forward entries.
- `moveSafariTabHistory(tab, direction)` returns the tab moved one step backward or forward, or the original tab at a boundary.

- [ ] **Step 1: Add the failing tests**

Cover these behaviors with `node:test`:

```js
test("turns plain text into a blocked Google search URL", () => {
  assert.deepEqual(normalizeSafariTarget("macOS clone"), {
    kind: "blocked",
    url: "https://www.google.com/search?q=macOS%20clone",
    title: "https://www.google.com/search?q=macOS%20clone",
  });
});

test("recognizes local commands", () => {
  assert.deepEqual(normalizeSafariTarget("  GAMES "), {
    kind: "local",
    command: "games",
    title: "Games",
  });
});

test("records per-tab history and removes forward entries after a new visit", () => {
  let tab = createSafariTab(1, "Start Page", "", true);
  tab = visitSafariTab(tab, { url: "about", title: "About", isStart: false });
  tab = visitSafariTab(tab, { url: "https://google.com", title: "https://google.com", isStart: false });
  tab = moveSafariTabHistory(tab, "back");
  tab = visitSafariTab(tab, { url: "surprise", title: "Surprise", isStart: false });

  assert.deepEqual(tab.history.map((entry) => entry.url), ["", "about", "surprise"]);
  assert.equal(tab.historyIndex, 2);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run `npm test -- --test-name-pattern="Safari"` after adding the test script. Expected failure: `ERR_MODULE_NOT_FOUND` for `safariModel.js`.

- [ ] **Step 3: Implement the minimal pure helpers**

Keep the model local and dependency-free. Recognize `about`, `hackintosh`, `cats`, `surprise`, and `games` as local commands. Treat explicit HTTP(S) URLs and hostname-looking input as blocked URLs. Treat all other non-empty input as a Google search URL. Do not create external links or network requests.

- [ ] **Step 4: Run the focused test and the full test command**

Run `npm test -- --test-name-pattern="Safari"`, then `npm test`. Expected: all Safari model tests pass.

### Task 2: Integrate Tabs, History, and Navigation

**Files:**
- Modify: `src/features/safari/SafariContent.jsx`

**Interfaces:**
- Consume the pure model helpers from `./safariModel.js`.
- Keep the existing `SafariContent({ onClose, onMinimize, onZoom })` interface unchanged.

- [ ] **Step 1: Add integration tests for model consumers before changing component behavior**

Extend `safariModel.test.js` for history list clearing, Recently Closed records, and reopening the last closed tab. Tests must assert data transitions, not React implementation details.

- [ ] **Step 2: Run the tests and verify the new cases fail**

Run `npm test -- --test-name-pattern="history|closed"`. Confirm each failure is caused by missing helper behavior.

- [ ] **Step 3: Replace direct URL mutation with draft navigation**

Keep address-bar typing in a draft value. On Enter, call `normalizeSafariTarget`, record the result in the active tab's history, update the tab title, and append a session History entry. Local commands render existing local pages; every blocked result renders `BlockedPage`.

- [ ] **Step 4: Implement per-tab Back and Forward**

Use each tab's `history` and `historyIndex`. Disable each toolbar button at its boundary. Preserve tab-local history when switching tabs.

- [ ] **Step 5: Track session History and Recently Closed Tabs**

Append each successful Safari navigation to a session-only `historyEntries` list. Closing a tab adds it to `recentlyClosedTabs`; the last tab remains unclosable. Reopen Last Closed Tab creates a new tab from the most recent closed tab.

- [ ] **Step 6: Render the History popup actions**

Add the supplied macOS-style menu. `Show All History` and `Home` are inert, `Recently Closed` is a visual submenu, `Clear History` clears only `historyEntries`, and a history entry navigates the active tab to its URL. Close the popup on outside click or Escape.

- [ ] **Step 7: Run all tests and build**

Run `npm test` and `npm run build`. Fix implementation issues without changing the requested behavior.

### Task 3: Implement the Safari Start Page and Customization UI

**Files:**
- Modify: `src/features/safari/SafariContent.jsx`
- Modify: `src/styles/components/Safari/SafariPages.scss`

**Interfaces:**
- Keep external Favorites as internal calls to `onNavigate`; they must resolve to `BlockedPage`.
- Keep `Reading List` as an empty state.
- Keep `Suggestions` as the empty state from `safari-start/index.html` and `style.css`.
- Keep `Recently Closed Tabs` visible with an empty state until a tab is closed.

- [ ] **Step 1: Add the Start Page section structure**

Render the welcome card, 12 Favorites, Suggestions, Privacy Report, Reading List, Recently Closed Tabs, existing Bookmarks when present, and the floating Edit button. The welcome card close button hides the card; Customize Start Page hides the card and opens the same popover.

- [ ] **Step 2: Add the customize popover behavior**

Render the supplied `Drag to Reorder` rows and Background Image row. The toggles change only their visual checked state. Defaults are Suggestions off and all other toggles on. Dragging is visual only. The background row is visual only. Outside click and Escape close the popover.

- [ ] **Step 3: Add Privacy Report behavior**

The Show More control changes only its label to Show Less. It does not open a modal or add detail content.

- [ ] **Step 4: Add responsive Start Page styles**

Use the provided dark Safari palette, 12-item responsive Favorites grid, empty-state cards, privacy card, welcome card, and popover styles. Do not alter the outer AppWindow styles or the existing traffic-light dimensions.

- [ ] **Step 5: Run build and inspect Safari-specific output**

Run `npm run build`. Confirm Sass compiles and the Safari chunk is emitted.

### Task 4: Extend Safari Chrome Without Changing Window Chrome

**Files:**
- Modify: `src/features/safari/SafariContent.jsx`
- Modify: `src/styles/components/Safari/SafariBrowser.scss`

**Interfaces:**
- Preserve all existing toolbar controls and add New Tab and Tab Overview controls.
- Share, Bookmark, View Settings, and Tab Overview remain inert.
- Refresh retains the existing short spinner.

- [ ] **Step 1: Add sidebar markup and state**

The sidebar contains Favorites, Bookmarks, and History. Favorites and Bookmarks only become active. History opens the History popup. Sidebar open/close must not resize the outer macOS window.

- [ ] **Step 2: Add toolbar controls**

Keep close, minimize, zoom, existing navigation, address bar, refresh, share, bookmark, and settings controls. Add New Tab, which creates and activates a Start Page tab, and Tab Overview, which remains inert.

- [ ] **Step 3: Add sidebar, popup, focus, hover, and responsive styles**

Reuse existing Safari chrome tokens and preserve the existing `12px` traffic lights, toolbar height, tab bar height, address bar dimensions, and border language.

- [ ] **Step 4: Run all verification**

Run `npm test` and `npm run build`. Manually smoke test Dock launch, window controls, tabs, blocked Favorites, search normalization, per-tab Back/Forward, sidebar, History popup, popover, and local pages.

## Self-Review

- The unresolved Favorites count is resolved: use 12 reference items and route every item to `BlockedPage`.
- The standalone `safari-start` files are reference-only; no direct HTML mounting or iframe is needed.
- All external navigation remains local simulation behavior.
- Existing window chrome and non-Safari application code are outside the file map.
- Tests cover the non-trivial navigation and session-history logic before integration.
