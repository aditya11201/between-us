import { Window } from "happy-dom";

export function setupHarness(extra = {}) {
  const browserWindow = new Window({ url: "http://localhost/" });
  const { document } = browserWindow;

  Object.assign(globalThis, {
    window: browserWindow,
    document,
    localStorage: browserWindow.localStorage,
    Image: browserWindow.Image,
    Element: browserWindow.Element,
    HTMLElement: browserWindow.HTMLElement,
    HTMLAudioElement: browserWindow.HTMLAudioElement,
    HTMLMediaElement: browserWindow.HTMLMediaElement,
    Event: browserWindow.Event,
    KeyboardEvent: browserWindow.KeyboardEvent,
    MouseEvent: browserWindow.MouseEvent,
    SVGElement: browserWindow.SVGElement,
    requestAnimationFrame: (callback) => setTimeout(callback, 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
    IS_REACT_ACT_ENVIRONMENT: true,
    ...extra,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: browserWindow.navigator,
  });
  if (!browserWindow.matchMedia) {
    browserWindow.matchMedia = () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    });
  }

  return {
    browserWindow,
    document,
    projectRoot: new URL("../../", import.meta.url).pathname,
  };
}

export async function unmountMount(act, mount) {
  await act(async () => mount.root.unmount());
  mount.container.remove();
}
