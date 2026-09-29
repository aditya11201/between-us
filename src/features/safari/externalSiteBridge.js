export function inspectExternalDocument(frameDocument, frameHref) {
  const hasTargetRoot = Boolean(frameDocument.querySelector("#app-canvas"));
  const title = frameDocument.title || frameHref;

  return {
    status: "ready",
    url: frameHref,
    title,
    hasTargetRoot,
  };
}

export function readExternalFrameSnapshot(frameWindow) {
  try {
    const frameHref = frameWindow.location.href;
    return inspectExternalDocument(frameWindow.document, frameHref);
  } catch {
    return { status: "inaccessible" };
  }
}

export function getExternalFrameSnapshot(frameWindow, frameHref) {
  const snapshot = readExternalFrameSnapshot(frameWindow);
  if (snapshot.status !== "inaccessible") return snapshot;

  return {
    status: "ready",
    url: frameHref,
    title: frameHref,
    hasTargetRoot: false,
    isOpaque: true,
  };
}

export function subscribeExternalFrameNavigation(frameWindow, onChange) {
  const handleNavigation = () => onChange(readExternalFrameSnapshot(frameWindow));

  frameWindow.addEventListener("hashchange", handleNavigation);
  frameWindow.addEventListener("popstate", handleNavigation);

  return () => {
    frameWindow.removeEventListener("hashchange", handleNavigation);
    frameWindow.removeEventListener("popstate", handleNavigation);
  };
}
