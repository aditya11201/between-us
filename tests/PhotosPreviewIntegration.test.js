import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { compile } from "sass";
import { createServer } from "vite";
import { Window } from "happy-dom";

const projectRoot = new URL("../", import.meta.url).pathname;
const browserWindow = new Window({ url: "http://localhost/" });
const { document } = browserWindow;

Object.assign(globalThis, {
  window: browserWindow,
  document,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  Event: browserWindow.Event,
  MouseEvent: browserWindow.MouseEvent,
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
let photosStyle;

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
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

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

  await act(async () => root.unmount());
  container.remove();
});

test("renders a local fallback when the photo payload is missing or cannot load", async () => {
  const missingPayload = await renderPreview();
  assert.ok(missingPayload.container.querySelector(".photos-preview__fallback"));
  assert.equal(missingPayload.container.querySelector("img"), null);
  await act(async () => missingPayload.root.unmount());
  missingPayload.container.remove();

  const missingUrl = await renderPreview({
    id: "favorites/unknown.webp",
    name: "unknown.webp",
  });
  assert.ok(missingUrl.container.querySelector(".photos-preview__fallback"));
  assert.equal(missingUrl.container.querySelector("img"), null);
  await act(async () => missingUrl.root.unmount());
  missingUrl.container.remove();

  const failedImage = await renderPreview({
    id: "favorites/broken.webp",
    name: "broken.webp",
    url: "/karenjourney/assets/broken.webp",
  });
  await act(async () => {
    failedImage.container.querySelector("img").dispatchEvent(
      new browserWindow.Event("error"),
    );
  });

  assert.ok(failedImage.container.querySelector(".photos-preview__fallback"));
  assert.equal(failedImage.container.querySelector("img"), null);
  await act(async () => failedImage.root.unmount());
  failedImage.container.remove();
});

test("keeps preview controls accessible and image sizing stable", async () => {
  const { container, root } = await renderPreview({
    id: "favorites/sunset.webp",
    name: "sunset.webp",
    url: "/karenjourney/assets/sunset.webp",
  });
  const buttons = container.querySelectorAll(".photos-preview__traffic-light");
  const image = container.querySelector(".photos-preview__image");
  const imageStyle = browserWindow.getComputedStyle(image);
  const buttonStyles = [...buttons].map((button) =>
    browserWindow.getComputedStyle(button),
  );

  assert.equal(buttons.length, 3);
  assert.ok(buttonStyles.every((style) => style.width === "44px"));
  assert.ok(buttonStyles.every((style) => style.height === "44px"));
  assert.equal(imageStyle.width, "100%");
  assert.equal(imageStyle.height, "100%");
  assert.equal(imageStyle.objectFit, "contain");

  const compiledCss = photosStyle.textContent;
  assert.match(
    compiledCss,
    /\.photos-preview__traffic-light::before\s*\{[\s\S]*?width:\s*12px;[\s\S]*?height:\s*12px;/,
  );

  await act(async () => root.unmount());
  container.remove();
});
