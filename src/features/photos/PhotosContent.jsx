import { useEffect, useRef, useState } from "react";
import {
  FiActivity,
  FiCamera,
  FiChevronRight,
  FiClock,
  FiCloud,
  FiFileText,
  FiFolder,
  FiHeart,
  FiImage,
  FiLayers,
  FiLock,
  FiMap,
  FiSearch,
  FiShare2,
  FiSidebar,
  FiTrash2,
  FiUpload,
  FiUsers,
  FiVideo,
} from "react-icons/fi";
import { photoCatalog, photoSections } from "./photoCatalog.js";
import {
  clearPhotoSelection,
  updatePhotoSelection,
} from "./photoSelectionModel.js";
import { getPhotoPreviewWindowId } from "./photoPreviewModel.js";
import {
  getPhotoSectionId,
  getVisiblePhotoSections,
} from "./photosViewModel.js";
import { PhotoSection } from "./PhotoSection";
import { PhotosStatusBar } from "./PhotosStatusBar";
import { PhotosIcon } from "./PhotosIcon";

const VIEW_LABELS = {
  library: "Library",
  collections: "Collections",
  favorites: "Favorites",
  "recently-saved": "Recently Saved",
  map: "Map",
  videos: "Videos",
  screenshots: "Screenshots",
  people: "People & Pets",
  "recently-deleted": "Recently Deleted",
  "shared-albums": "Shared Albums",
  activity: "Activity",
  "shared:family": "Family",
  "shared:trip-bali": "Trip to Bali",
};

const PINNED_ITEMS = [
  { id: "favorites", label: "Favorites", Icon: FiHeart },
  { id: "recently-saved", label: "Recently Saved", Icon: FiClock },
  { id: "map", label: "Map", Icon: FiMap },
  { id: "videos", label: "Videos", Icon: FiVideo },
  { id: "screenshots", label: "Screenshots", Icon: FiImage },
  { id: "people", label: "People & Pets", Icon: FiUsers },
  {
    id: "recently-deleted",
    label: "Recently Deleted",
    Icon: FiTrash2,
    TrailingIcon: FiLock,
  },
];

const SHARED_ALBUM_ITEMS = [
  { id: "shared:family", label: "Family", Icon: FiFolder },
  { id: "shared:trip-bali", label: "Trip to Bali", Icon: FiFolder },
];

const HINTS = [
  { text: "Connect a camera or memory card.", Icon: FiCamera },
  { text: "Drag pictures directly into Photos.", Icon: FiUpload },
  { text: "Choose Import from the File menu.", Icon: FiFileText },
  { text: "Turn on iCloud Photos in Settings.", Icon: FiCloud },
];

function PhotosNavItem({
  item,
  activeView,
  expanded,
  child = false,
  onSelect,
  onToggleDisclosure,
}) {
  const Icon = item.Icon;
  const TrailingIcon = item.TrailingIcon;
  const selected = activeView === item.id;

  return (
    <button
      type="button"
      className={`photos-sidebar__item${selected ? " photos-sidebar__item--selected" : ""}${child ? " photos-sidebar__item--child" : ""}`}
      aria-current={selected ? "page" : undefined}
      aria-expanded={item.children ? expanded : undefined}
      aria-controls={item.children && expanded ? `photos-subnav-${item.id}` : undefined}
      onClick={() => {
        if (item.children) onToggleDisclosure();
        onSelect(item.id);
      }}
    >
      <span className="photos-sidebar__disclosure" aria-hidden="true">
        {item.children && <FiChevronRight />}
      </span>
      <span className="photos-sidebar__nav-icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="photos-sidebar__label">{item.label}</span>
      <span className="photos-sidebar__trailing" aria-hidden="true">
        {TrailingIcon && <TrailingIcon />}
      </span>
    </button>
  );
}

export function PhotosContent({ onClose, onMinimize, onMaximize, openApp }) {
  const photosAppRef = useRef(null);
  const showSidebarButtonRef = useRef(null);
  const wasCompact = useRef(false);
  const [query, setQuery] = useState("");
  const [activeView, setActiveView] = useState("library");
  const [timelineView, setTimelineView] = useState("all");
  const [sharedAlbumsOpen, setSharedAlbumsOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState(() => new Set());

  const visibleSections = getVisiblePhotoSections(activeView, photoSections, query);
  const totalCount = photoCatalog.length;
  const activeSectionId = getPhotoSectionId(activeView);
  const activeSection = activeSectionId === null
    ? null
    : photoSections.find((section) => section.id === activeSectionId);
  const activeLabel = activeSection?.label ?? VIEW_LABELS[activeView] ?? "Photos";
  const isLibrary = activeView === "library";
  const hasVisiblePhotos = visibleSections.length > 0;
  const hasQuery = query.trim().length > 0;
  const showHints = isLibrary && !hasQuery;

  useEffect(() => {
    if (sidebarCollapsed) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setSidebarCollapsed(true);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (sidebarCollapsed && isCompact) showSidebarButtonRef.current?.focus();
  }, [isCompact, sidebarCollapsed]);

  useEffect(() => {
    const element = photosAppRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;

    const updateCompactState = (width) => {
      const compact = width <= 480;
      setIsCompact(compact);
      if (compact && !wasCompact.current) setSidebarCollapsed(true);
      wasCompact.current = compact;
    };

    updateCompactState(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      updateCompactState(entry.contentRect.width);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const handleViewChange = (view) => {
    setActiveView(view);
    setSelectedPhotoIds(clearPhotoSelection());
    if (isCompact) setSidebarCollapsed(true);
  };

  const handleTogglePhoto = (photoId, additive) => {
    setSelectedPhotoIds((current) =>
      updatePhotoSelection(current, photoId, additive),
    );
  };

  const handlePhotoDoubleClick = (photo) => {
    if (typeof openApp !== "function" || !photo?.id) return;
    openApp(getPhotoPreviewWindowId(photo.id), "Preview", photo);
  };

  const emptyTitle = showHints
    ? "Welcome to Photos"
    : hasQuery
      ? "No Photos Found"
      : `No Photos in ${activeLabel}`;
  const emptySubtitle = showHints
    ? "To get started with Photos, do any of the following:"
    : hasQuery
      ? "Try a different search."
      : `Items you add to ${activeLabel} will appear here.`;

  return (
    <div
      ref={photosAppRef}
      className={`photos-app${sidebarCollapsed ? " photos-app--sidebar-collapsed" : ""}`}
    >
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

      <div className="photos-layout">
        <aside className="photos-sidebar" aria-label="Photos sidebar">
          <div className="photos-sidebar__top">
            <button
              type="button"
              className="photos-icon-button"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Hide Sidebar"
              title="Hide Sidebar"
            >
              <FiSidebar />
            </button>
          </div>

          <nav className="photos-sidebar__scroll">
            <PhotosNavItem
              item={{ id: "library", label: "Library", Icon: FiImage }}
              activeView={activeView}
              onSelect={handleViewChange}
            />
            <PhotosNavItem
              item={{ id: "collections", label: "Collections", Icon: FiLayers }}
              activeView={activeView}
              onSelect={handleViewChange}
            />

            <div className="photos-sidebar__group-title">Pinned</div>
            {PINNED_ITEMS.map((item) => (
              <PhotosNavItem
                key={item.id}
                item={item}
                activeView={activeView}
                onSelect={handleViewChange}
              />
            ))}

            <div className="photos-sidebar__group-title">Albums</div>
            {photoSections.map((section) => (
              <PhotosNavItem
                key={section.id}
                item={{
                  id: `section:${section.id}`,
                  label: section.label,
                  Icon: FiFolder,
                }}
                activeView={activeView}
                onSelect={handleViewChange}
              />
            ))}

            <div className="photos-sidebar__group-title">Sharing</div>
            <PhotosNavItem
              item={{
                id: "shared-albums",
                label: "Shared Albums",
                Icon: FiShare2,
                children: SHARED_ALBUM_ITEMS,
              }}
              activeView={activeView}
              expanded={sharedAlbumsOpen}
              onSelect={handleViewChange}
              onToggleDisclosure={() => setSharedAlbumsOpen((open) => !open)}
            />
            {sharedAlbumsOpen && (
              <div className="photos-sidebar__subnav" id="photos-subnav-shared-albums">
                {SHARED_ALBUM_ITEMS.map((item) => (
                  <PhotosNavItem
                    key={item.id}
                    item={item}
                    activeView={activeView}
                    child
                    onSelect={handleViewChange}
                  />
                ))}
              </div>
            )}
            <PhotosNavItem
              item={{ id: "activity", label: "Activity", Icon: FiActivity }}
              activeView={activeView}
              onSelect={handleViewChange}
            />

            <div className="photos-sidebar__group-title">Utilities</div>
            <div className="photos-sidebar__group-title">Projects</div>
          </nav>
        </aside>

        {!sidebarCollapsed && (
          <button
            type="button"
            className="photos-sidebar__scrim"
            onClick={() => setSidebarCollapsed(true)}
            aria-label="Close Sidebar"
          />
        )}

        <main
          className="photos-main"
          inert={isCompact && !sidebarCollapsed}
        >
          {isLibrary && <h1 className="photos-visually-hidden">Library</h1>}
          <div className="photos-toolbar">
            <div className="photos-toolbar__left">
              {sidebarCollapsed && (
                <button
                  type="button"
                  className="photos-icon-button"
                  ref={showSidebarButtonRef}
                  onClick={() => setSidebarCollapsed(false)}
                  aria-label="Show Sidebar"
                  title="Show Sidebar"
                >
                  <FiSidebar />
                </button>
              )}
            </div>

            {isLibrary ? (
              <div className="photos-segmented" role="group" aria-label="Photo timeline">
                {[
                  ["years", "Years"],
                  ["months", "Months"],
                  ["all", "All Photos"],
                ].map(([id, label]) => (
                  <button
                    type="button"
                    className="photos-segment"
                    key={id}
                    aria-pressed={timelineView === id}
                    onClick={() => setTimelineView(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <h1 className="photos-toolbar__title">{activeLabel}</h1>
            )}

            <label className="photos-search">
              <span className="photos-toolbar__search-label">Search photos</span>
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                name="photo-search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                aria-label="Search photos"
              />
            </label>
          </div>

          <div className={`photos-stage${hasVisiblePhotos ? " photos-stage--has-grid" : ""}`}>
            {hasVisiblePhotos ? (
              <div className="photos-library-grid">
                {visibleSections.map((section) => (
                  <PhotoSection
                    key={section.id}
                    section={section}
                    selectedPhotoIds={selectedPhotoIds}
                    onTogglePhoto={handleTogglePhoto}
                    onDoubleClickPhoto={handlePhotoDoubleClick}
                  />
                ))}
              </div>
            ) : (
              <section className="photos-empty-state" role="status">
                <h2>{emptyTitle}</h2>
                <p className="photos-empty-state__subtitle">{emptySubtitle}</p>
                {showHints && (
                  <div className="photos-hints">
                    {HINTS.map(({ text, Icon }) => (
                      <div className="photos-hint" key={text}>
                        <span className="photos-hint__icon" aria-hidden="true">
                          <Icon />
                        </span>
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      </div>

      <PhotosStatusBar
        selectedCount={selectedPhotoIds.size}
        totalCount={totalCount}
        onClear={() => setSelectedPhotoIds(clearPhotoSelection())}
      />
    </div>
  );
}
