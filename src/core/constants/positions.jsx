export const MENU_BAR_HEIGHT = 28;
export const DOCK_HEIGHT = 80;
export const MIN_WINDOW_WIDTH = 250;
export const MIN_WINDOW_HEIGHT = 200;

const HORIZONTAL_WINDOW_MARGIN = 24;
const VERTICAL_WINDOW_MARGIN = 16;

const INITIAL_WINDOW_SIZES = {
  finder: { w: 740, h: 500 },
  notes: { w: 620, h: 440 },
  terminal: { w: 660, h: 420 },
  settings: { w: 520, h: 400 },
  music: { w: 960, h: 620 },
  safari: { w: 780, h: 520 },
  photos: { w: 980, h: 650 },
  mail: { w: 1120, h: 700 },
  preview: { w: 720, h: 560 },
  calculator: { w: 250, h: 420 },
};

export function getInitialWindowBounds(appId, viewportWidth = 1280, viewportHeight = 800) {
  const baseAppId = appId.split(":")[0];
  const size = INITIAL_WINDOW_SIZES[appId] || INITIAL_WINDOW_SIZES[baseAppId] || { w: 600, h: 420 };
  const workspaceHeight = viewportHeight - MENU_BAR_HEIGHT - DOCK_HEIGHT;
  const w = Math.min(
    size.w,
    Math.max(MIN_WINDOW_WIDTH, viewportWidth - HORIZONTAL_WINDOW_MARGIN * 2),
  );
  const h = Math.min(
    size.h,
    Math.max(MIN_WINDOW_HEIGHT, workspaceHeight - VERTICAL_WINDOW_MARGIN * 2),
  );

  return {
    x: Math.round((viewportWidth - w) / 2),
    y: Math.round(MENU_BAR_HEIGHT + (workspaceHeight - h) / 2),
    w,
    h,
  };
}
