import test from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import {
  getExternalFrameSnapshot,
  inspectExternalDocument,
  readExternalFrameSnapshot,
  subscribeExternalFrameNavigation,
} from "./externalSiteBridge.js";

const TARGET_URL = "https://aditya11201.github.io/birthday-wishes/";

test("marks the birthday document ready when its root exists", () => {
  const window = new Window();
  window.document.title = "Stasyaa — Birthday Wishes";
  window.document.body.innerHTML = '<main id="app-canvas"><button id="action-btn"></button></main>';

  assert.deepEqual(
    inspectExternalDocument(window.document, TARGET_URL),
    {
      status: "ready",
      url: TARGET_URL,
      title: "Stasyaa — Birthday Wishes",
      hasTargetRoot: true,
    },
  );
});

test("marks an unexpected document unsupported", () => {
  const window = new Window();
  window.document.title = "Not the birthday app";

  assert.deepEqual(
    inspectExternalDocument(window.document, TARGET_URL),
    {
      status: "unsupported",
      url: TARGET_URL,
      title: "Not the birthday app",
      hasTargetRoot: false,
    },
  );
});

test("uses the frame URL when the document has no title", () => {
  const window = new Window();

  assert.deepEqual(
    inspectExternalDocument(window.document, TARGET_URL),
    {
      status: "unsupported",
      url: TARGET_URL,
      title: TARGET_URL,
      hasTargetRoot: false,
    },
  );
});

test("reads a same-origin frame snapshot", () => {
  const window = new Window();
  window.document.title = "Stasyaa — Birthday Wishes";
  window.document.body.innerHTML = '<main id="app-canvas"></main>';

  assert.deepEqual(readExternalFrameSnapshot(window), {
    status: "ready",
    url: window.location.href,
    title: "Stasyaa — Birthday Wishes",
    hasTargetRoot: true,
  });
});

test("returns an inaccessible snapshot when frame access throws", () => {
  const inaccessibleFrame = {
    get location() {
      throw new Error("cross-origin access denied");
    },
  };

  assert.deepEqual(readExternalFrameSnapshot(inaccessibleFrame), {
    status: "inaccessible",
  });
});

test("treats a loaded cross-origin frame as an opaque ready page", () => {
  const inaccessibleFrame = {
    get location() {
      throw new Error("cross-origin access denied");
    },
  };

  assert.deepEqual(getExternalFrameSnapshot(inaccessibleFrame, TARGET_URL), {
    status: "ready",
    url: TARGET_URL,
    title: TARGET_URL,
    hasTargetRoot: false,
    isOpaque: true,
  });
});

test("reports hashchange and popstate snapshots", () => {
  const window = new Window();
  window.document.title = "Stasyaa — Birthday Wishes";
  window.document.body.innerHTML = '<main id="app-canvas"></main>';
  const snapshots = [];

  const cleanup = subscribeExternalFrameNavigation(window, (snapshot) => {
    snapshots.push(snapshot);
  });

  window.dispatchEvent(new window.Event("hashchange"));
  window.dispatchEvent(new window.Event("popstate"));
  cleanup();

  assert.deepEqual(snapshots, [
    {
      status: "ready",
      url: window.location.href,
      title: "Stasyaa — Birthday Wishes",
      hasTargetRoot: true,
    },
    {
      status: "ready",
      url: window.location.href,
      title: "Stasyaa — Birthday Wishes",
      hasTargetRoot: true,
    },
  ]);
});

test("stops reporting navigation after cleanup", () => {
  const window = new Window();
  const snapshots = [];
  const cleanup = subscribeExternalFrameNavigation(window, (snapshot) => {
    snapshots.push(snapshot);
  });

  cleanup();
  window.dispatchEvent(new window.Event("hashchange"));
  window.dispatchEvent(new window.Event("popstate"));

  assert.deepEqual(snapshots, []);
});
