export function inspectExternalDocument(frameDocument, frameHref) {
  const hasTargetRoot = Boolean(frameDocument.querySelector("#app-canvas"));
  const title = frameDocument.title || frameHref;

  return {
    status: hasTargetRoot ? "ready" : "unsupported",
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

export function subscribeExternalFrameNavigation(frameWindow, onChange) {
  const handleNavigation = () => onChange(readExternalFrameSnapshot(frameWindow));

  frameWindow.addEventListener("hashchange", handleNavigation);
  frameWindow.addEventListener("popstate", handleNavigation);

  return () => {
    frameWindow.removeEventListener("hashchange", handleNavigation);
    frameWindow.removeEventListener("popstate", handleNavigation);
  };
}
