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
  const photoId = "favorites/ChatGPT Image Jul 28, 2026, 07_22_52 PM.png";
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
    url: "/karenjourney/assets/sunset.webp",
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

test("preview image exposes the contain-fit CSS contract", async () => {
  // Arrange: use a preview URL with surrounding whitespace to verify normalization.
  const photo = {
    id: "favorites/panorama.webp",
    name: "panorama.webp",
    url: "  /karenjourney/assets/panorama.webp  ",
  };
  const rendered = await renderPreview(photo);
  const image = rendered.container.querySelector(".photos-preview__image");
  assert.ok(image);

  // Assert: URL normalization and the explicit CSS contract are stable.
  assert.equal(image.getAttribute("src"), "/karenjourney/assets/panorama.webp");
  assert.equal(image.style.objectFit, "contain");
  const imageRule = findStyleRule(".photos-preview__image");
  assert.ok(imageRule);
  assert.equal(imageRule.style.width, "100%");
  assert.equal(imageRule.style.height, "100%");
  assert.equal(imageRule.style.objectFit, "contain");
  assert.equal(imageRule.style.objectPosition, "center");
  assert.equal(
    browserWindow.getComputedStyle(image).objectFit,
    "contain",
  );

  await unmountRendered(rendered);
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
    url: "/karenjourney/assets/broken.webp",
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
    url: "/karenjourney/assets/broken.webp",
  };
  const nextPhoto = {
    id: "favorites/mountain.webp",
    name: "mountain.webp",
    url: "/karenjourney/assets/mountain.webp",
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

test("preview controls expose 44px targets and visible keyboard focus", async () => {
  const { container, root } = await renderPreview({
    id: "favorites/sunset.webp",
    name: "sunset.webp",
    url: "/karenjourney/assets/sunset.webp",
  });
  const preview = container.querySelector(".photos-preview");
  const buttons = container.querySelectorAll(".photos-preview__traffic-light");
  const titlebarRule = findStyleRule(".photos-preview__titlebar");
  const controlGroupRule = findStyleRule(".photos-preview__traffic-lights");
  const titleRule = findStyleRule(".photos-preview__title");
  const buttonRule = findStyleRule(".photos-preview__traffic-light");
  const focusRule = findStyleRule(
    ".photos-preview__traffic-light:focus-visible",
  );
  const dotRule = findStyleRule(".photos-preview__traffic-light::before");

  assert.ok(preview);
  assert.ok(titlebarRule);
  assert.ok(controlGroupRule);
  assert.ok(titleRule);
  assert.ok(buttonRule);
  const previewStyle = browserWindow.getComputedStyle(preview);
  assert.equal(buttons.length, 3);
  assert.equal(previewStyle.containerType, "inline-size");
  assert.equal(previewStyle.containerName, "photos-preview");
  assert.equal(titlebarRule.style.display, "grid");
  assert.equal(
    titlebarRule.style.gridTemplateColumns,
    "148px minmax(0, 1fr) 148px",
  );
  assert.equal(titlebarRule.style.flexBasis, "44px");
  assert.equal(titlebarRule.style.minHeight, "44px");
  assert.equal(controlGroupRule.style.width, "148px");
  assert.equal(titleRule.style.minWidth, "0");
  assert.equal(titleRule.style.maxWidth, "none");
  assert.equal(buttonRule.style.width, "44px");
  assert.equal(buttonRule.style.height, "44px");

  buttons[0].focus();
  assert.equal(document.activeElement, buttons[0]);
  assert.ok(focusRule);
  assert.equal(focusRule.style.outlineStyle, "solid");
  assert.equal(focusRule.style.outlineWidth, "2px");
  assert.equal(focusRule.style.outlineOffset, "2px");

  assert.ok(dotRule);
  assert.equal(dotRule.style.width, "12px");
  assert.equal(dotRule.style.height, "12px");

  await unmountRendered({ container, root });
});

test("Photos Sass exposes responsive and reduced-motion style selectors", async () => {
  const rendered = await renderPreview({
    id: "favorites/sunset.webp",
    name: "sunset.webp",
    url: "/karenjourney/assets/sunset.webp",
  });

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
  assert.equal(
    narrowTitlebarRule.style.gridTemplateColumns,
    "148px minmax(0, 1fr)",
  );
  assert.equal(narrowTitlebarRule.style.padding, "0px 10px");
  assert.equal(narrowTitleRule.style.textAlign, "left");
  assert.equal(narrowStageRule.style.padding, "16px");

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

  await unmountRendered(rendered);
});
