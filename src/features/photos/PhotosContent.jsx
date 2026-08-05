import { useState } from "react";
import { photoCatalog, photoSections } from "./photoCatalog.js";
import {
  clearPhotoSelection,
  filterPhotoSections,
  updatePhotoSelection,
} from "./photoSelectionModel.js";
import { PhotoSection } from "./PhotoSection";
import { PhotosStatusBar } from "./PhotosStatusBar";
import { PhotosIcon } from "./PhotosIcon";

export function PhotosContent({ onClose, onMinimize, onMaximize }) {
  const [query, setQuery] = useState("");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState(() => new Set());

  const visibleSections = filterPhotoSections(photoSections, query);
  const totalCount = photoCatalog.length;

  const handleTogglePhoto = (photoId, additive) => {
    setSelectedPhotoIds((current) =>
      updatePhotoSelection(current, photoId, additive),
    );
  };

  const handleClearSelection = () => {
    setSelectedPhotoIds(clearPhotoSelection());
  };

  const handleSectionClick = (sectionId) => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth";
    document
      .getElementById(`photos-section-${sectionId}`)
      ?.scrollIntoView({ behavior });
  };

  return (
    <div className="photos-app">
      <header className="photos-window-header">
        <div className="photos-window-header__lights">
          <button
            type="button"
            className="photos-window-header__traffic-light photos-window-header__traffic-light--close"
            onClick={onClose}
            aria-label="Close window"
            title="Close"
          />
          <button
            type="button"
            className="photos-window-header__traffic-light photos-window-header__traffic-light--minimize"
            onClick={onMinimize}
            aria-label="Minimize window"
            title="Minimize"
          />
          <button
            type="button"
            className="photos-window-header__traffic-light photos-window-header__traffic-light--maximize"
            onClick={onMaximize}
            aria-label="Maximize window"
            title="Maximize"
          />
        </div>
        <span className="photos-window-header__title">
          <PhotosIcon size={20} />
          Photos
        </span>
      </header>

      <div className="photos-toolbar">
        <label className="photos-toolbar__search">
          <span className="photos-toolbar__search-label">Search photos</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search photos"
            aria-label="Search photos"
          />
        </label>
      </div>

      <div className="photos-layout">
        <aside className="photos-sidebar" aria-label="Photo sections">
          <h2 className="photos-sidebar__title">Sections</h2>
          <nav className="photos-sidebar__nav">
            {visibleSections.map((section) => (
              <button
                type="button"
                className="photos-sidebar__item"
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="photos-content">
          {visibleSections.length > 0 ? (
            visibleSections.map((section) => (
              <PhotoSection
                key={section.id}
                section={section}
                selectedPhotoIds={selectedPhotoIds}
                onTogglePhoto={handleTogglePhoto}
              />
            ))
          ) : (
            <div className="photos-empty-state" role="status">
              {totalCount === 0
                ? "No photos found in src/content/photos/."
                : "No photos match your search."}
            </div>
          )}
        </main>
      </div>

      <PhotosStatusBar
        selectedCount={selectedPhotoIds.size}
        totalCount={totalCount}
        onClear={handleClearSelection}
      />
    </div>
  );
}
