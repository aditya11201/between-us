import { filterPhotoSections } from "./photoSelectionModel.js";

const SECTION_VIEW_ALIASES = {
  favorites: "favorites",
};

export function getPhotoSectionId(activeView) {
  if (activeView.startsWith("section:")) {
    return activeView.slice("section:".length);
  }

  return SECTION_VIEW_ALIASES[activeView] ?? null;
}

export function getVisiblePhotoSections(activeView, sections, query) {
  const matchingSections = filterPhotoSections(sections, query);

  if (activeView === "library") return matchingSections;

  const sectionId = getPhotoSectionId(activeView);
  if (sectionId === null) return [];

  return matchingSections.filter((section) => section.id === sectionId);
}
