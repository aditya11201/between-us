import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { compile } from "sass";
import { createServer } from "vite";
import { Window } from "happy-dom";
import { waitForCondition } from "./testUtils/waitForCondition.js";

const projectRoot = new URL("../", import.meta.url).pathname;
const browserWindow = new Window({ url: "http://localhost/" });
const { document } = browserWindow;

Object.assign(globalThis, {
  window: browserWindow,
  document,
  localStorage: browserWindow.localStorage,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  Event: browserWindow.Event,
  MouseEvent: browserWindow.MouseEvent,
  getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: browserWindow.navigator,
});

let vite;
let React;
let act;
let createRoot;
let WindowContext;
let PhotoPreviewContent;
let PhotosContent;
let photoCatalog;
let photosStyle;
const mountedRoots = [];

before(async () => {
  vite = await createServer({
    configFile: `${projectRoot}vite.config.js`,
    server: { hmr: false, middlewareMode: true, ws: false },
    appType: "custom",
  });

  ({ default: React, act } = await import("react"));
  ({ createRoot } = await import("react-dom/client"));
  ({ WindowContext } = await vite.ssrLoadModule(
    "/src/windows/AppWindow/AppWindow.jsx",
  ));
  ({ PhotoPreviewContent } = await vite.ssrLoadModule(
    "/src/features/photos/PhotoPreviewContent.jsx",
  ));
  ({ PhotosContent } = await vite.ssrLoadModule(
    "/src/features/photos/PhotosContent.jsx",
  ));
  ({ photoCatalog } = await vite.ssrLoadModule(
    "/src/features/photos/photoCatalog.js",
  ));

  photosStyle = document.createElement("style");
  photosStyle.textContent = compile(
    `${projectRoot}src/styles/components/Photos/Photos.scss`,
  ).css;
  document.head.append(photosStyle);
});

after(async () => {
  photosStyle?.remove();
  await vite.close();
  browserWindow.close();
});

afterEach(async () => {
  for (const { root, container } of mountedRoots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
});

function createWindowControls() {
  return {
    onClose: () => {},
    onMinimize: () => {},
    onZoom: () => {},
    onFocus: () => {},
    onTitleMouseDown: () => {},
  };
}

async function renderPreview(photo, controls = createWindowControls()) {
  const { container, root } = createMountedRoot();

  await act(async () => {
    root.render(
      React.createElement(
        WindowContext.Provider,
        { value: controls },
        React.createElement(PhotoPreviewContent, { photo }),
      ),
    );
  });

  return { container, root };
}

function createMountedRoot() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const mounted = { container, root };
  mountedRoots.push(mounted);
  return mounted;
}

async function waitForPreviewState(container, predicate, description) {
  await waitForCondition(
    async () => {
      let matches = false;
      await act(async () => {
        await Promise.resolve();
        matches = predicate(container);
      });
      return matches;
    },
    {
      description,
      wait: (delay) => act(async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }),
    },
  );
}

async function unmountRendered({ container, root }) {
  const mountedIndex = mountedRoots.findIndex((mounted) =>
    mounted.container === container && mounted.root === root,
  );
  if (mountedIndex >= 0) mountedRoots.splice(mountedIndex, 1);
  await act(async () => root.unmount());
  container.remove();
}

function collectCssRules(rules = photosStyle.sheet.cssRules) {
  return [...rules].flatMap((rule) => [
    rule,
    ...(rule.cssRules ? collectCssRules(rule.cssRules) : []),
  ]);
}

function findStyleRule(selector, rules = photosStyle.sheet.cssRules) {
  return collectCssRules(rules).find((rule) =>
    typeof rule.selectorText === "string" &&
    rule.selectorText.split(",").some((candidate) => candidate.trim() === selector),
  );
}

function findConditionalRule(predicate) {
  return collectCssRules().find((rule) =>
    typeof rule.conditionText === "string" && predicate(rule.conditionText),
  );
}

test("keeps modified-click selection while opening the complete photo on double-click", async () => {
  const photoId = "favorites/28-07-26-0722.png";
  const photo = photoCatalog.find(({ id }) => id === photoId);
  assert.ok(photo, `catalog contains the double-click fixture ${photoId}`);
  const openAppCalls = [];
  const { container, root } = createMountedRoot();

  await act(async () => {
    root.render(
      React.createElement(PhotosContent, {
        onClose: () => {},
        onMinimize: () => {},
        onMaximize: () => {},
        openApp: (...args) => openAppCalls.push(args),
      }),
    );
  });

  const card = [...container.querySelectorAll(".photos-card")].find(
    (candidate) => candidate.querySelector("img")?.getAttribute("src") === photo.url,
  );
  assert.ok(card);

  await act(async () => {
    card.dispatchEvent(new browserWindow.MouseEvent("click", {
      bubbles: true,
      ctrlKey: true,
    }));
  });
  assert.equal(card.getAttribute("aria-pressed"), "true");

  await act(async () => {
    card.dispatchEvent(new browserWindow.MouseEvent("dblclick", {
      bubbles: true,
    }));
  });

  assert.equal(card.getAttribute("aria-pressed"), "true");
  assert.deepEqual(openAppCalls, [[`preview:${photo.id}`, "Preview", photo]]);

  await unmountRendered({ container, root });
});

test("renders a photo payload in a contain-fit preview and delegates window controls", async () => {
  const calls = {
    close: 0,
    minimize: 0,
    zoom: 0,
    drag: 0,
  };
  const controls = {
    onClose: () => { calls.close += 1; },
    onMinimize: () => { calls.minimize += 1; },
    onZoom: () => { calls.zoom += 1; },
    onFocus: () => {},
    onTitleMouseDown: () => { calls.drag += 1; },
  };
  const photo = {
    id: "favorites/sunset.webp",
    name: "sunset.webp",
    url: "/between-us/assets/sunset.webp",
  };
  const { container, root } = await renderPreview(photo, controls);

  const image = container.querySelector(".photos-preview__image");
  assert.ok(container.querySelector(".photos-preview"));
  assert.equal(image.getAttribute("src"), photo.url);
  assert.equal(image.getAttribute("alt"), photo.name);
  assert.equal(image.style.objectFit, "contain");

  const titlebar = container.querySelector(".photos-preview__titlebar");
  await act(async () => {
    titlebar.dispatchEvent(new browserWindow.MouseEvent("mousedown", {
      bubbles: true,
      button: 0,
    }));
  });
  assert.equal(calls.drag, 1);

  await act(async () => {
    container.querySelector(".photos-preview__search").dispatchEvent(
      new browserWindow.MouseEvent("mousedown", {
        bubbles: true,
        button: 0,
      }),
    );
  });
  assert.equal(calls.drag, 1);

  const closeButton = container.querySelector('[aria-label="Close window"]');
  await act(async () => {
    closeButton.dispatchEvent(new browserWindow.MouseEvent("mousedown", {
      bubbles: true,
      button: 0,
    }));
    closeButton.dispatchEvent(new browserWindow.MouseEvent("click", {
      bubbles: true,
    }));
    container.querySelector('[aria-label="Minimize window"]').click();
    container.querySelector('[aria-label="Zoom window"]').click();
  });

  assert.equal(calls.drag, 1);
  assert.equal(calls.close, 1);
  assert.equal(calls.minimize, 1);
  assert.equal(calls.zoom, 1);

  await unmountRendered({ container, root });
});

test("renders a normalized preview image in contain-fit mode", async () => {
  // Arrange: use a preview URL with surrounding whitespace to verify normalization.
  const photo = {
    id: "favorites/panorama.webp",
    name: "panorama.webp",
    url: "  /between-us/assets/panorama.webp  ",
  };
  const rendered = await renderPreview(photo);
  const image = rendered.container.querySelector(".photos-preview__image");
  assert.ok(image);

  // Assert: URL normalization and the rendered image contract are stable.
  assert.equal(image.getAttribute("src"), "/between-us/assets/panorama.webp");
  assert.equal(image.style.objectFit, "contain");
  assert.equal(
    browserWindow.getComputedStyle(image).objectFit,
    "contain",
  );

  await unmountRendered(rendered);
});

test("Photos Sass exposes the contain-fit image contract", () => {
  const imageRule = findStyleRule(".photos-preview__image");
  assert.ok(imageRule);
  assert.equal(imageRule.style.width, "100%");
  assert.equal(imageRule.style.height, "100%");
  assert.equal(imageRule.style.objectFit, "contain");
  assert.equal(imageRule.style.objectPosition, "center");
});

test("renders an explicit fallback when the preview payload is missing", async () => {
  // Arrange: mount Preview without a photo payload.
  const rendered = await renderPreview();

  // Act: read the fallback rendered by the real component.
  const fallback = rendered.container.querySelector('[role="status"]');

  // Assert: missing data never leaves a broken image-only surface.
  assert.ok(fallback);
  assert.match(fallback.textContent, /Preview unavailable/);
  assert.match(fallback.textContent, /No photo is available to preview\./);
  assert.equal(rendered.container.querySelector("img"), null);
  assert.equal(rendered.container.querySelector(".photos-preview__thumbnail"), null);

  await unmountRendered(rendered);
});

test("renders a fallback for a missing or blank photo URL", async () => {
  for (const photo of [
    { id: "favorites/unknown.webp", name: "unknown.webp" },
    { id: "favorites/blank.webp", name: "blank.webp", url: "   " },
  ]) {
    // Arrange: provide a photo payload that cannot identify an image URL.
    const rendered = await renderPreview(photo);

    // Act: inspect the rendered preview state.
    const fallback = rendered.container.querySelector('[role="status"]');

    // Assert: both absent and whitespace-only URLs use the local fallback.
    assert.ok(fallback);
    assert.match(fallback.textContent, /Preview unavailable/);
    assert.match(fallback.textContent, /This photo could not be loaded\./);
    assert.equal(rendered.container.querySelector("img"), null);

    await unmountRendered(rendered);
  }
});

test("replaces an image-error event with the local preview fallback", async () => {
  // Arrange: mount a preview with a URL so an image element is initially present.
  const rendered = await renderPreview({
    id: "favorites/broken.webp",
    name: "broken.webp",
    url: "/between-us/assets/broken.webp",
  });
  const image = rendered.container.querySelector(".photos-preview__image");
  assert.ok(image);

  // Act: simulate the browser reporting a failed image load.
  await act(async () => {
    image.dispatchEvent(new browserWindow.Event("error"));
  });

  // Assert: the failed image is removed and the accessible fallback is shown.
  assert.equal(rendered.container.querySelector(".photos-preview__image"), null);
  const fallback = rendered.container.querySelector('[role="status"]');
  assert.ok(fallback);
  assert.match(fallback.textContent, /Preview unavailable/);
  assert.match(fallback.textContent, /This photo could not be loaded\./);

  await unmountRendered(rendered);
});

test("resets failed preview state on payload changes and removes the root cleanly", async () => {
  // Arrange: keep the surrounding document count so this test can detect leaks.
  const initialPreviewCount = document.body.querySelectorAll(".photos-preview").length;
  const firstPhoto = {
    id: "favorites/broken.webp",
    name: "broken.webp",
    url: "/between-us/assets/broken.webp",
  };
  const nextPhoto = {
    id: "favorites/mountain.webp",
    name: "mountain.webp",
    url: "/between-us/assets/mountain.webp",
  };
  const rendered = await renderPreview(firstPhoto);

  // Act: fail the first image, then update the same mounted root with a new payload.
  await act(async () => {
    rendered.container.querySelector("img").dispatchEvent(
      new browserWindow.Event("error"),
    );
  });
  await act(async () => {
    rendered.root.render(
      React.createElement(
        WindowContext.Provider,
        { value: createWindowControls() },
        React.createElement(PhotoPreviewContent, { photo: nextPhoto }),
      ),
    );
  });
  await waitForPreviewState(
    rendered.container,
    (root) =>
      root.querySelector(".photos-preview__image")?.getAttribute("src") ===
      nextPhoto.url,
    "new preview image after a payload change",
  );

  // Assert: a new URL gets a fresh image and never duplicates the Preview surface.
  const image = rendered.container.querySelector(".photos-preview__image");
  assert.ok(image);
  assert.equal(image.getAttribute("src"), nextPhoto.url);
  assert.equal(rendered.container.querySelectorAll(".photos-preview").length, 1);

  await unmountRendered(rendered);
  assert.equal(
    document.body.querySelectorAll(".photos-preview").length,
    initialPreviewCount,
  );
});

test("preview controls render and receive visible keyboard focus", async () => {
  const { container, root } = await renderPreview({
    id: "favorites/sunset.webp",
    name: "sunset.webp",
    url: "/between-us/assets/sunset.webp",
  });
  const preview = container.querySelector(".photos-preview");
  const buttons = container.querySelectorAll(".photos-preview__traffic-light");

  assert.ok(preview);
  assert.equal(buttons.length, 3);
  buttons[0].focus();
  assert.equal(document.activeElement, buttons[0]);

  await unmountRendered({ container, root });
});

test("Preview exposes the Image Viewer toolbar and a toggleable thumbnail sidebar", async () => {
  const photo = {
    id: "favorites/sunset.webp",
    name: "sunset.webp",
    url: "/between-us/assets/sunset.webp",
  };
  const rendered = await renderPreview(photo);

  for (const label of [
    "Zoom out",
    "Zoom in",
    "Fit to window",
    "Show Adjustments",
    "Show Markup Tools",
    "Show Edit Tools",
    "Add Text",
    "Show Info",
    "Share",
    "Search",
  ]) {
    assert.ok(
      rendered.container.querySelector(`[aria-label="${label}"]`),
      `Preview exposes ${label}`,
    );
  }

  assert.ok(rendered.container.querySelector(".photos-preview__sidebar"));
  const preview = rendered.container.querySelector(".photos-preview");
  assert.ok(preview.classList.contains("photos-preview--sidebar-open"));
  assert.equal(
    rendered.container.querySelector(".photos-preview__sidebar").parentElement,
    preview,
  );
  assert.ok(
    rendered.container.querySelector('[aria-label="Select sunset.webp"]'),
  );
  const titlebar = rendered.container.querySelector(".photos-preview__titlebar");
  const trafficLights = titlebar.querySelector(".photos-preview__traffic-lights");
  const sidebarToggle = titlebar.querySelector('[aria-label="Hide Sidebar"]');
  const title = titlebar.querySelector(".photos-preview__title");
  const titlebarChildren = [...titlebar.children];
  assert.ok(trafficLights);
  assert.equal(titlebar.querySelectorAll(".photos-preview__traffic-lights").length, 1);
  assert.equal(
    rendered.container.querySelector(".photos-preview__sidebar .photos-preview__traffic-lights"),
    null,
  );
  assert.equal(
    rendered.container.querySelector(".photos-preview__sidebar [aria-label=\"Hide Sidebar\"]"),
    null,
  );
  assert.ok(sidebarToggle);
  assert.ok(title);
  assert.ok(titlebarChildren.indexOf(trafficLights) < titlebarChildren.indexOf(sidebarToggle));
  assert.ok(titlebarChildren.indexOf(sidebarToggle) < titlebarChildren.indexOf(title));
  assert.ok(
    title.textContent === "sunset.webp",
  );
  const toolbar = rendered.container.querySelector(".photos-preview__toolbar");
  assert.ok(toolbar);
  assert.equal(toolbar.getAttribute("role"), "toolbar");
  assert.equal(
    rendered.container.querySelector(".photos-preview__titlebar").contains(toolbar),
    true,
  );
  assert.equal(sidebarToggle.getAttribute("aria-expanded"), "true");
  assert.ok(rendered.container.querySelector('input[type="search"]'));
  assert.ok(rendered.container.querySelector('[aria-label="Add images"]'));

  const hideSidebar = rendered.container.querySelector(
    '[aria-label="Hide Sidebar"]',
  );
  await act(async () => hideSidebar.click());
  assert.equal(rendered.container.querySelector(".photos-preview__sidebar"), null);
  assert.equal(preview.classList.contains("photos-preview--sidebar-open"), false);

  const showSidebar = rendered.container.querySelector(
    '[aria-label="Show Sidebar"]',
  );
  await act(async () => showSidebar.click());
  assert.ok(rendered.container.querySelector(".photos-preview__sidebar"));
  assert.ok(preview.classList.contains("photos-preview--sidebar-open"));
  assert.ok(rendered.container.querySelector('[aria-label="Hide Sidebar"]'));

  await unmountRendered(rendered);
});

test("Preview gives each window unique panel ids and matching controls", async () => {
  const photo = {
    id: "favorites/sunset.webp",
    name: "sunset.webp",
    url: "/between-us/assets/sunset.webp",
  };
  const first = await renderPreview(photo);
  const second = await renderPreview(photo);
  const firstSidebar = first.container.querySelector(".photos-preview__sidebar");
  const secondSidebar = second.container.querySelector(".photos-preview__sidebar");
  const firstSidebarToggle = first.container.querySelector('[aria-label="Hide Sidebar"]');
  const secondSidebarToggle = second.container.querySelector('[aria-label="Hide Sidebar"]');

  assert.notEqual(firstSidebar.id, secondSidebar.id);
  assert.equal(firstSidebarToggle.getAttribute("aria-controls"), firstSidebar.id);
  assert.equal(secondSidebarToggle.getAttribute("aria-controls"), secondSidebar.id);

  await act(async () => {
    first.container.querySelector('[aria-label="Show Info"]').click();
    second.container.querySelector('[aria-label="Show Info"]').click();
  });

  const firstInspector = first.container.querySelector(".photos-preview__inspector");
  const secondInspector = second.container.querySelector(".photos-preview__inspector");
  assert.notEqual(firstInspector.id, secondInspector.id);
  assert.equal(
    first.container.querySelector('[aria-label="Show Info"]').getAttribute("aria-controls"),
    firstInspector.id,
  );
  assert.equal(
    second.container.querySelector('[aria-label="Show Info"]').getAttribute("aria-controls"),
    secondInspector.id,
  );

  await unmountRendered(first);
  await unmountRendered(second);
});

test("Preview returns focus to replacement controls when panels toggle", async () => {
  const rendered = await renderPreview({
    id: "favorites/sunset.webp",
    name: "sunset.webp",
    url: "/between-us/assets/sunset.webp",
  });
  const hideSidebar = rendered.container.querySelector('[aria-label="Hide Sidebar"]');
  hideSidebar.focus();

  await act(async () => hideSidebar.click());
  const showSidebar = rendered.container.querySelector('[aria-label="Show Sidebar"]');
  assert.ok(document.activeElement === showSidebar);

  showSidebar.focus();
  await act(async () => showSidebar.click());
  const visibleHideSidebar = rendered.container.querySelector('[aria-label="Hide Sidebar"]');
  assert.ok(document.activeElement === visibleHideSidebar);

  const showInfo = rendered.container.querySelector('[aria-label="Show Info"]');
  showInfo.focus();
  await act(async () => showInfo.click());
  const hideInfo = rendered.container.querySelector('[aria-label="Hide Info"]');
  hideInfo.focus();
  await act(async () => hideInfo.click());
  assert.ok(
    document.activeElement === rendered.container.querySelector('[aria-label="Show Info"]'),
  );

  await unmountRendered(rendered);
});

test("Preview keyboard shortcuts update zoom, rotation, and metadata visibility", async () => {
  const rendered = await renderPreview({
    id: "favorites/sunset.webp",
    name: "sunset.webp",
    url: "/between-us/assets/sunset.webp",
  });
  const preview = rendered.container.querySelector(".photos-preview");

  preview.focus();
  await act(async () => {
    preview.dispatchEvent(new browserWindow.KeyboardEvent("keydown", {
      bubbles: true,
      key: "+",
    }));
  });
  await act(async () => {
    preview.dispatchEvent(new browserWindow.KeyboardEvent("keydown", {
      bubbles: true,
      key: "r",
    }));
    rendered.container.querySelector('[aria-label="Show Info"]').click();
  });

  assert.equal(
    rendered.container.querySelector(".photos-preview__zoom-value").textContent,
    "125%",
  );
  assert.equal(
    rendered.container.querySelector(".photos-preview__image").style.transform,
    "rotate(90deg) scale(1.25)",
  );
  assert.equal(
    rendered.container.querySelector('[aria-label="Fit to window"]').getAttribute(
      "aria-pressed",
    ),
    "false",
  );
  assert.ok(rendered.container.querySelector(".photos-preview__inspector"));

  await unmountRendered(rendered);
});

test("Preview closes transient panels with Escape without intercepting browser shortcuts", async () => {
  const calls = { close: 0 };
  const rendered = await renderPreview(
    {
      id: "favorites/sunset.webp",
      name: "sunset.webp",
      url: "/between-us/assets/sunset.webp",
    },
    { ...createWindowControls(), onClose: () => { calls.close += 1; } },
  );
  const preview = rendered.container.querySelector(".photos-preview");
  const searchInput = rendered.container.querySelector('input[type="search"]');
  const rotateButton = rendered.container.querySelector(
    '[aria-label="Rotate Clockwise"]',
  );

  searchInput.focus();
  await act(async () => {
    searchInput.dispatchEvent(new browserWindow.KeyboardEvent("keydown", {
      bubbles: true,
      key: "Escape",
    }));
  });
  assert.ok(rendered.container.querySelector('input[type="search"]'));

  preview.focus();
  const browserShortcut = new browserWindow.KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
    key: "r",
  });
  await act(async () => preview.dispatchEvent(browserShortcut));
  assert.equal(browserShortcut.defaultPrevented, false);
  assert.equal(rotateButton.getAttribute("aria-pressed"), null);

  await act(async () => {
    preview.dispatchEvent(new browserWindow.KeyboardEvent("keydown", {
      bubbles: true,
      key: "Escape",
    }));
  });
  assert.equal(calls.close, 0);

  await unmountRendered(rendered);
});

test("Dropped images start at a fresh fit state instead of inheriting the previous image transform", async () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: () => "blob://preview-test",
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: () => {},
  });

  try {
    const rendered = await renderPreview({
      id: "favorites/original.webp",
      name: "original.webp",
      url: "/between-us/assets/original.webp",
    });
    const preview = rendered.container.querySelector(".photos-preview");
    const image = rendered.container.querySelector(".photos-preview__image");
    await act(async () => {
      rendered.container.querySelector('[aria-label="Zoom in"]').click();
      rendered.container.querySelector('[aria-label="Rotate Clockwise"]').click();
    });

    const dropEvent = new browserWindow.Event("drop", { bubbles: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        files: [new browserWindow.File(["image"], "dropped.png", { type: "image/png" })],
      },
    });
    await act(async () => preview.dispatchEvent(dropEvent));

    assert.equal(
      rendered.container.querySelector(".photos-preview__title").textContent,
      "dropped.png",
    );
    assert.equal(image.style.transform, "rotate(0deg) scale(1)");
    await unmountRendered(rendered);
  } finally {
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL,
      });
    } else {
      delete URL.createObjectURL;
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    } else {
      delete URL.revokeObjectURL;
    }
  }
});

test("Share resolves bundled image URLs before copying them", async () => {
  const originalClipboard = browserWindow.navigator.clipboard;
  let copiedUrl = "";
  Object.defineProperty(browserWindow.navigator, "clipboard", {
    configurable: true,
    value: { writeText: async (value) => { copiedUrl = value; } },
  });

  try {
    const rendered = await renderPreview({
      id: "favorites/sunset.webp",
      name: "sunset.webp",
      url: "/between-us/assets/sunset.webp",
    });
    await act(async () => {
      rendered.container.querySelector('[aria-label="Share"]').click();
    });

    assert.equal(copiedUrl, "http://localhost/between-us/assets/sunset.webp");
    await unmountRendered(rendered);
  } finally {
    Object.defineProperty(browserWindow.navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
  }
});

test("Filtered thumbnail keyboard navigation selects the visible image", async () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let objectUrlIndex = 0;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: () => `blob://filtered-${objectUrlIndex++}`,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: () => {},
  });

  try {
    const rendered = await renderPreview({
      id: "favorites/original.webp",
      name: "original.webp",
      url: "/between-us/assets/original.webp",
    });
    const preview = rendered.container.querySelector(".photos-preview");
    const dropEvent = new browserWindow.Event("drop", { bubbles: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        files: [
          new browserWindow.File(["one"], "first.png", { type: "image/png" }),
          new browserWindow.File(["two"], "second.png", { type: "image/png" }),
        ],
      },
    });
    await act(async () => preview.dispatchEvent(dropEvent));
    await act(async () => {
      rendered.container.querySelector('[aria-label="Select original.webp"]').click();
    });

    const searchInput = rendered.container.querySelector('input[type="search"]');
    const setInputValue = Object.getOwnPropertyDescriptor(
      browserWindow.HTMLInputElement.prototype,
      "value",
    ).set;
    setInputValue.call(searchInput, "second");
    await act(async () => {
      searchInput.dispatchEvent(new browserWindow.Event("input", { bubbles: true }));
      searchInput.dispatchEvent(new browserWindow.Event("change", { bubbles: true }));
    });
    assert.ok(rendered.container.querySelector('[aria-label="Select second.png"]'));
    preview.focus();
    await act(async () => {
      preview.dispatchEvent(new browserWindow.KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowRight",
      }));
    });

    assert.equal(
      rendered.container.querySelector(".photos-preview__title").textContent,
      "second.png",
    );
    await unmountRendered(rendered);
  } finally {
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL,
      });
    } else {
      delete URL.createObjectURL;
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    } else {
      delete URL.revokeObjectURL;
    }
  }
});

test("Fit to window keeps a rotated image inside the available stage", async () => {
  const rendered = await renderPreview({
    id: "favorites/panorama.webp",
    name: "panorama.webp",
    url: "/between-us/assets/panorama.webp",
  });
  const image = rendered.container.querySelector(".photos-preview__image");
  const stage = rendered.container.querySelector(".photos-preview__stage");
  stage.style.padding = "40px";
  Object.defineProperties(stage, {
    clientWidth: { configurable: true, value: 680 },
    clientHeight: { configurable: true, value: 480 },
  });
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: 1200 },
    naturalHeight: { configurable: true, value: 600 },
  });

  await act(async () => image.dispatchEvent(new browserWindow.Event("load")));
  await act(async () => {
    rendered.container.querySelector('[aria-label="Rotate Clockwise"]').click();
  });
  await act(async () => {
    rendered.container.querySelector('[aria-label="Fit to window"]').click();
  });

  assert.equal(
    image.style.transform,
    "rotate(90deg) scale(0.666)",
  );

  await unmountRendered(rendered);
});

test("Photos Sass exposes preview control sizing and focus styles", () => {
  const previewRule = findStyleRule(".photos-preview");
  const titlebarRule = findStyleRule(".photos-preview__titlebar");
  const controlGroupRule = findStyleRule(".photos-preview__traffic-lights");
  const sidebarRule = findStyleRule(".photos-preview__sidebar");
  const titleRule = findStyleRule(".photos-preview__title");
  const openTitleRule = findStyleRule(
    ".photos-preview--sidebar-open .photos-preview__title",
  );
  const buttonRule = findStyleRule(".photos-preview__traffic-light");
  const focusRule = findStyleRule(
    ".photos-preview__traffic-light:focus-visible",
  );
  const dotRule = findStyleRule(".photos-preview__traffic-light::before");

  assert.ok(previewRule);
  assert.ok(titlebarRule);
  assert.ok(controlGroupRule);
  assert.ok(sidebarRule);
  assert.ok(titleRule);
  assert.equal(openTitleRule, undefined);
  assert.ok(buttonRule);
  assert.equal(previewRule.style.containerType, "inline-size");
  assert.equal(previewRule.style.containerName, "photos-preview");
  assert.equal(titlebarRule.style.display, "flex");
  assert.equal(titlebarRule.style.flexBasis, "60px");
  assert.equal(titlebarRule.style.minHeight, "60px");
  assert.equal(controlGroupRule.style.position, "static");
  assert.equal(controlGroupRule.style.gap, "0");
  assert.equal(controlGroupRule.style.marginRight, "4px");
  assert.equal(sidebarRule.style.top, "68px");
  assert.equal(sidebarRule.style.bottom, "8px");
  assert.equal(sidebarRule.style.left, "8px");
  assert.equal(sidebarRule.style.width, "232px");
  assert.equal(titleRule.style.minWidth, "0");
  assert.equal(titleRule.style.maxWidth, "340px");
  assert.equal(titleRule.style.flexBasis, "auto");
  assert.equal(titleRule.style.marginLeft, "6px");
  assert.equal(titleRule.style.fontSize, "15px");
  assert.equal(titleRule.style.fontWeight, "700");
  assert.equal(buttonRule.style.width, "44px");
  assert.equal(buttonRule.style.height, "44px");
  assert.equal(buttonRule.style.flexBasis, "44px");
  assert.equal(buttonRule.style.marginRight, "-25px");

  assert.ok(focusRule);
  assert.equal(focusRule.style.outlineStyle, "solid");
  assert.equal(focusRule.style.outlineWidth, "2px");
  assert.equal(focusRule.style.outlineOffset, "2px");

  assert.ok(dotRule);
  assert.equal(dotRule.style.position, "absolute");
  assert.equal(dotRule.style.width, "11px");
  assert.equal(dotRule.style.height, "11px");
});

test("Photos Sass exposes preview selectors and responsive styles", () => {
  for (const selector of [
    ".photos-preview",
    ".photos-preview__titlebar",
    ".photos-preview__traffic-lights",
    ".photos-preview__traffic-light",
    ".photos-preview__stage",
    ".photos-preview__image",
    ".photos-preview__fallback",
  ]) {
    assert.ok(findStyleRule(selector), `compiled Sass exposes ${selector}`);
  }

  const narrowLayoutRule = findConditionalRule((condition) =>
    condition.includes("photos-preview") && condition.includes("max-width: 360px"),
  );
  assert.ok(narrowLayoutRule);
  const narrowTitlebarRule = findStyleRule(
    ".photos-preview__titlebar",
    narrowLayoutRule.cssRules,
  );
  const narrowTitleRule = findStyleRule(
    ".photos-preview__title",
    narrowLayoutRule.cssRules,
  );
  const narrowStageRule = findStyleRule(
    ".photos-preview__stage",
    narrowLayoutRule.cssRules,
  );
  assert.ok(narrowTitlebarRule);
  assert.ok(narrowTitleRule);
  assert.ok(narrowStageRule);
  assert.equal(narrowTitlebarRule.style.display, "flex");
  assert.equal(narrowTitlebarRule.style.padding, "0px 10px");
  assert.equal(narrowTitleRule.style.textAlign, "left");
  assert.equal(narrowStageRule.style.padding, "16px");
});

test("Photos Sass disables preview transitions for reduced motion", () => {
  const reducedMotionRule = findConditionalRule((condition) =>
    condition.includes("prefers-reduced-motion") && condition.includes("reduce"),
  );
  assert.ok(reducedMotionRule);
  for (const selector of [
    ".photos-preview",
    ".photos-preview *",
    ".photos-preview::before",
    ".photos-preview::after",
    ".photos-preview *::before",
    ".photos-preview *::after",
  ]) {
    const rule = findStyleRule(selector, reducedMotionRule.cssRules);
    assert.ok(rule, `reduced-motion Sass exposes ${selector}`);
    assert.equal(rule.style.getPropertyValue("transition"), "none");
    assert.equal(rule.style.getPropertyPriority("transition"), "important");
  }
});
