import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiEdit3,
  FiImage,
  FiInfo,
  FiMaximize,
  FiMinus,
  FiPlus,
  FiRotateCw,
  FiSearch,
  FiShare2,
  FiSidebar,
  FiSliders,
  FiType,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { WindowContext } from "@/windows/AppWindow/AppWindow";

function getPhotoName(photo) {
  return typeof photo?.name === "string" && photo.name.trim()
    ? photo.name
    : "Preview";
}

function getPhotoUrl(photo) {
  return typeof photo?.url === "string" ? photo.url.trim() : "";
}

function getPhotoId(photo) {
  return typeof photo?.id === "string" && photo.id.trim()
    ? photo.id
    : "preview";
}

function clampZoom(value) {
  return Math.min(4, Math.max(0.25, Number(value.toFixed(2))));
}

function getImageFiles(fileList) {
  return Array.from(fileList ?? []).filter((file) =>
    file.type?.startsWith("image/") || /\.(avif|gif|jpe?g|png|webp)$/i.test(file.name ?? ""),
  );
}

function getFitZoom(dimensions, stage, rotation) {
  const computedStyle =
    stage && typeof getComputedStyle === "function" ? getComputedStyle(stage) : null;
  const horizontalPadding =
    (Number.parseFloat(computedStyle?.paddingLeft) || 0) +
    (Number.parseFloat(computedStyle?.paddingRight) || 0);
  const verticalPadding =
    (Number.parseFloat(computedStyle?.paddingTop) || 0) +
    (Number.parseFloat(computedStyle?.paddingBottom) || 0);
  const stageWidth = Math.max(0, (stage?.clientWidth ?? 0) - horizontalPadding);
  const stageHeight = Math.max(0, (stage?.clientHeight ?? 0) - verticalPadding);
  if (!dimensions?.width || !dimensions?.height || !stageWidth || !stageHeight) {
    return 1;
  }

  const ratio = dimensions.width / dimensions.height;
  const baseWidth = Math.min(stageWidth, stageHeight * ratio);
  const baseHeight = Math.min(stageHeight, stageWidth / ratio);
  const rotatedWidth = rotation % 180 ? baseHeight : baseWidth;
  const rotatedHeight = rotation % 180 ? baseWidth : baseHeight;
  return Math.floor(
    Math.min(1, stageWidth / rotatedWidth, stageHeight / rotatedHeight) * 1000,
  ) / 1000;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PreviewIconButton({
  Icon,
  label,
  onClick,
  active = false,
  disabled = false,
  pressed = false,
  expanded,
  controls,
  buttonRef,
}) {
  return (
    <button
      type="button"
      ref={buttonRef}
      className={`photos-preview__tool${active ? " photos-preview__tool--active" : ""}`}
      aria-label={label}
      aria-pressed={pressed ? active : active || undefined}
      aria-expanded={expanded}
      aria-controls={controls}
      disabled={disabled}
      title={disabled ? `${label} unavailable` : label}
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}

function PreviewTrafficLights({ onClose, onMinimize, onZoom }) {
  return (
    <div className="photos-preview__traffic-lights">
      <button
        type="button"
        className="photos-preview__traffic-light photos-preview__traffic-light--close"
        onClick={onClose}
        aria-label="Close window"
        title="Close"
      />
      <button
        type="button"
        className="photos-preview__traffic-light photos-preview__traffic-light--minimize"
        onClick={onMinimize}
        aria-label="Minimize window"
        title="Minimize"
      />
      <button
        type="button"
        className="photos-preview__traffic-light photos-preview__traffic-light--zoom"
        onClick={onZoom}
        aria-label="Zoom window"
        title="Zoom"
      />
    </div>
  );
}

function PreviewSidebar({
  items,
  activeId,
  onSelect,
  onAddImages,
  hasQuery,
  sidebarId,
}) {
  return (
    <aside
      id={sidebarId}
      className="photos-preview__sidebar"
      aria-label="Preview thumbnails"
    >
      <div className="photos-preview__sidebar-summary">
        <strong>Thumbnails</strong>
        <span>{items.length}</span>
      </div>
      <div
        className="photos-preview__thumbnail-list"
        aria-label="Preview thumbnails"
      >
        {items.length > 0 ? (
          items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`photos-preview__thumbnail${activeId === item.id ? " photos-preview__thumbnail--selected" : ""}`}
              aria-pressed={activeId === item.id}
              aria-label={`Select ${item.name}`}
              onClick={() => onSelect(item.id)}
            >
              {item.url ? (
                <img src={item.url} alt="" draggable="false" />
              ) : (
                <span className="photos-preview__thumbnail-placeholder">
                  <FiImage aria-hidden="true" />
                </span>
              )}
              <span>{item.name}</span>
            </button>
          ))
        ) : (
          <p className="photos-preview__thumbnail-empty">
            {hasQuery ? "No matching images." : "Drop an image here."}
          </p>
        )}
      </div>
      <button
        type="button"
        className="photos-preview__add-images"
        aria-label="Add images"
        onClick={onAddImages}
      >
        <FiUpload aria-hidden="true" />
        <span>Add Images</span>
      </button>
    </aside>
  );
}

function PreviewInspector({ photo, onClose, inspectorId, closeButtonRef }) {
  return (
    <aside
      id={inspectorId}
      className="photos-preview__inspector"
      aria-label="Photo information"
    >
      <div className="photos-preview__inspector-header">
        <strong>Info</strong>
        <button
          type="button"
          ref={closeButtonRef}
          className="photos-preview__tool"
          aria-label="Hide Info"
          title="Hide Info"
          onClick={onClose}
        >
          <FiX aria-hidden="true" />
        </button>
      </div>
      <dl className="photos-preview__metadata">
        <div>
          <dt>Name</dt>
          <dd>{photo.name}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{photo.id}</dd>
        </div>
        <div>
          <dt>Dimensions</dt>
          <dd>
            {photo.dimensions
              ? `${photo.dimensions.width} × ${photo.dimensions.height}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>File size</dt>
          <dd>{formatFileSize(photo.file?.size)}</dd>
        </div>
        <div>
          <dt>Zoom</dt>
          <dd>{photo.zoom}%</dd>
        </div>
      </dl>
    </aside>
  );
}

export function PhotoPreviewContent({ photo }) {
  const {
    onClose,
    onMinimize,
    onZoom,
    onTitleMouseDown,
  } = useContext(WindowContext);
  const previewInstanceId = useId().replace(/:/g, "");
  const sidebarId = `${previewInstanceId}-photos-preview-sidebar`;
  const inspectorId = `${previewInstanceId}-photos-preview-inspector`;
  const searchId = `${previewInstanceId}-photos-preview-search`;
  const photoUrl = getPhotoUrl(photo);
  const photoName = getPhotoName(photo);
  const photoId = getPhotoId(photo);
  const [imageFailed, setImageFailed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [activePhotoId, setActivePhotoId] = useState(photoId);
  const [droppedPhotos, setDroppedPhotos] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const fileInputRef = useRef(null);
  const sidebarShowButtonRef = useRef(null);
  const sidebarHideButtonRef = useRef(null);
  const infoShowButtonRef = useRef(null);
  const infoHideButtonRef = useRef(null);
  const previousSidebarOpen = useRef(sidebarOpen);
  const previousShowInfo = useRef(showInfo);
  const searchInputRef = useRef(null);
  const stageRef = useRef(null);
  const objectUrlsRef = useRef(new Set());
  const [imageDimensions, setImageDimensions] = useState(null);

  useEffect(() => {
    if (previousSidebarOpen.current === sidebarOpen) return;
    previousSidebarOpen.current = sidebarOpen;
    (sidebarOpen ? sidebarHideButtonRef : sidebarShowButtonRef).current?.focus();
  }, [sidebarOpen]);

  useEffect(() => {
    if (previousShowInfo.current === showInfo) return;
    previousShowInfo.current = showInfo;
    (showInfo ? infoHideButtonRef : infoShowButtonRef).current?.focus();
  }, [showInfo]);

  const sourcePhoto = useMemo(
    () => ({ id: photoId, name: photoName, url: photoUrl }),
    [photoId, photoName, photoUrl],
  );

  const previewItems = useMemo(
    () => [
      ...(photo ? [sourcePhoto] : []),
      ...droppedPhotos.filter((item) => item.id !== sourcePhoto.id),
    ],
    [droppedPhotos, photo, sourcePhoto],
  );

  const activePhoto =
    previewItems.find((item) => item.id === activePhotoId) ?? sourcePhoto;
  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return previewItems;
    return previewItems.filter((item) => item.name.toLowerCase().includes(query));
  }, [previewItems, searchQuery]);
  const hasImage = Boolean(activePhoto.url) && !imageFailed;

  useEffect(() => {
    setActivePhotoId(photoId);
    setImageFailed(false);
    setZoom(1);
    setFitMode(true);
    setRotation(0);
    setImageDimensions(null);
  }, [photoId, photoUrl]);

  useEffect(() => {
    setImageFailed(false);
  }, [activePhoto.url]);

  useEffect(() => () => {
    if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    }
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return undefined;

    const updateFit = () => {
      if (fitMode) setZoom(getFitZoom(imageDimensions, stage, rotation));
    };
    const observer = new ResizeObserver(updateFit);
    observer.observe(stage);
    updateFit();
    return () => observer.disconnect();
  }, [fitMode, imageDimensions, rotation]);

  const handleSelectPhoto = useCallback((id) => {
    setActivePhotoId(id);
    setImageFailed(false);
    setZoom(1);
    setFitMode(true);
    setRotation(0);
    setImageDimensions(null);
  }, []);

  const handleFiles = useCallback((fileList) => {
    const imageFiles = getImageFiles(fileList);
    if (!imageFiles.length) {
      if (fileList?.length) setActionNotice("Only image files can be added.");
      return;
    }

    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      setActionNotice("Local image preview is unavailable in this browser.");
      return;
    }

    const nextPhotos = imageFiles.map((file, index) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      return {
        id: `local:${Date.now()}:${index}:${file.name}`,
        name: file.name,
        url,
        file,
      };
    });

    setDroppedPhotos((current) => [...current, ...nextPhotos]);
    handleSelectPhoto(nextPhotos[0].id);
    setSidebarOpen(true);
    setActionNotice(`${nextPhotos.length} image${nextPhotos.length === 1 ? "" : "s"} added to Preview.`);
  }, [handleSelectPhoto]);

  const handleRotate = useCallback(() => {
    const nextRotation = (rotation + 90) % 360;
    setRotation(nextRotation);
    if (fitMode) setZoom(getFitZoom(imageDimensions, stageRef.current, nextRotation));
  }, [fitMode, imageDimensions, rotation]);

  const handleFit = useCallback(() => {
    setFitMode(true);
    setZoom(getFitZoom(imageDimensions, stageRef.current, rotation));
  }, [imageDimensions, rotation]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (document.activeElement === searchInputRef.current) {
        searchInputRef.current.blur();
      } else if (showInfo) {
        setShowInfo(false);
      }
      return;
    }

    if (
      event.target !== event.currentTarget &&
      event.target.closest?.("button, input")
    ) return;

    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setFitMode(false);
      setZoom((value) => clampZoom(value + 0.25));
    } else if (event.key === "-") {
      event.preventDefault();
      setFitMode(false);
      setZoom((value) => clampZoom(value - 0.25));
    } else if (event.key === "0" || event.key.toLowerCase() === "f") {
      event.preventDefault();
      handleFit();
    } else if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      handleRotate();
    } else if (["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (visibleItems.length === 0) return;
      const currentIndex = visibleItems.findIndex((item) => item.id === activePhotoId);
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? visibleItems.length - 1
          : currentIndex < 0
            ? 0
            : ["ArrowLeft", "ArrowUp"].includes(event.key)
              ? (currentIndex - 1 + visibleItems.length) % visibleItems.length
              : (currentIndex + 1) % visibleItems.length;
      handleSelectPhoto(visibleItems[nextIndex].id);
    }
  }, [activePhotoId, handleFit, handleRotate, handleSelectPhoto, showInfo, visibleItems]);

  const handleShare = useCallback(async () => {
    if (!activePhoto.url) {
      setActionNotice("There is no image URL to share.");
      return;
    }

    try {
      const shareUrl =
        typeof window !== "undefined" && window.location?.href
          ? new URL(activePhoto.url, window.location.href).href
          : activePhoto.url;
      if (activePhoto.file) {
        const canShareFile =
          typeof navigator !== "undefined" &&
          typeof navigator.share === "function" &&
          (typeof navigator.canShare !== "function" ||
            navigator.canShare({ files: [activePhoto.file] }));
        if (canShareFile) {
          await navigator.share({ title: activePhoto.name, files: [activePhoto.file] });
          setActionNotice("Image shared.");
        } else {
          setActionNotice("Local previews cannot be shared without uploading them.");
        }
      } else if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: activePhoto.name, url: shareUrl });
        setActionNotice("Image shared.");
      } else if (
        typeof navigator !== "undefined" &&
        typeof navigator.clipboard?.writeText === "function"
      ) {
        await navigator.clipboard.writeText(shareUrl);
        setActionNotice("Image URL copied.");
      } else {
        setActionNotice("Sharing is unavailable in this browser.");
      }
    } catch (error) {
      if (error?.name !== "AbortError") setActionNotice("Image could not be shared.");
    }
  }, [activePhoto.name, activePhoto.url]);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    handleFiles(event.dataTransfer?.files);
  };

  return (
    <div
      className={`photos-preview${sidebarOpen ? " photos-preview--sidebar-open" : ""}`}
      tabIndex={0}
      aria-label="Preview"
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <header
        className="photos-preview__titlebar"
        onMouseDown={(event) => {
          if (!event.target?.closest?.("button, input, .photos-preview__search")) {
            onTitleMouseDown?.(event);
          }
        }}
      >
        <PreviewTrafficLights
          onClose={onClose}
          onMinimize={onMinimize}
          onZoom={onZoom}
        />
        <PreviewIconButton
          Icon={FiSidebar}
          label={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          active={sidebarOpen}
          pressed
          expanded={sidebarOpen}
          controls={sidebarId}
          buttonRef={sidebarOpen ? sidebarHideButtonRef : sidebarShowButtonRef}
          onClick={() => setSidebarOpen((value) => !value)}
        />
        <span className="photos-preview__title">{activePhoto.name}</span>

      <div className="photos-preview__toolbar" role="toolbar" aria-label="Preview toolbar">
        <div className="photos-preview__toolbar-group photos-preview__toolbar-group--zoom">
          <PreviewIconButton
            Icon={FiMinus}
            label="Zoom out"
            onClick={() => {
              setFitMode(false);
              setZoom((value) => clampZoom(value - 0.25));
            }}
          />
          <span className="photos-preview__zoom-value" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <PreviewIconButton
            Icon={FiPlus}
            label="Zoom in"
            onClick={() => {
              setFitMode(false);
              setZoom((value) => clampZoom(value + 0.25));
            }}
          />
          <PreviewIconButton
            Icon={FiMaximize}
            label="Fit to window"
            active={fitMode}
            pressed
            onClick={handleFit}
          />
          <PreviewIconButton
            Icon={FiRotateCw}
            label="Rotate Clockwise"
            onClick={handleRotate}
          />
        </div>

        <div className="photos-preview__toolbar-group photos-preview__toolbar-group--tools">
          <PreviewIconButton Icon={FiSliders} label="Show Adjustments" disabled />
          <PreviewIconButton Icon={FiEdit3} label="Show Markup Tools" disabled />
          <PreviewIconButton Icon={FiEdit3} label="Show Edit Tools" disabled />
          <PreviewIconButton Icon={FiType} label="Add Text" disabled />
          <PreviewIconButton
            Icon={FiInfo}
            label="Show Info"
            active={showInfo}
            pressed
            expanded={showInfo}
            controls={inspectorId}
            buttonRef={infoShowButtonRef}
            onClick={() => setShowInfo((value) => !value)}
          />
          <PreviewIconButton Icon={FiShare2} label="Share" onClick={handleShare} />
          <PreviewIconButton
            Icon={FiSearch}
            label="Search"
            controls={searchId}
            onClick={() => searchInputRef.current?.focus()}
          />
        </div>
      </div>

      <label className="photos-preview__search" id={searchId}>
        <FiSearch aria-hidden="true" />
        <span className="photos-preview__visually-hidden">Search preview thumbnails</span>
        <input
          ref={searchInputRef}
          type="search"
          name="preview-search"
          autoComplete="off"
          value={searchQuery}
          placeholder="Search thumbnails"
          aria-label="Search images"
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </label>
      </header>

      {sidebarOpen && (
        <PreviewSidebar
          items={visibleItems}
          activeId={activePhotoId}
          onSelect={handleSelectPhoto}
          onAddImages={() => fileInputRef.current?.click()}
          hasQuery={Boolean(searchQuery.trim())}
          sidebarId={sidebarId}
        />
      )}

      <div
        className={`photos-preview__body${sidebarOpen ? " photos-preview__body--with-sidebar" : ""}${showInfo ? " photos-preview__body--with-inspector" : ""}`}
      >
        <main
          ref={stageRef}
          className={`photos-preview__stage${dragActive ? " photos-preview__stage--drag-active" : ""}`}
          aria-label="Preview stage"
        >
          {hasImage ? (
            <img
              className="photos-preview__image"
              src={activePhoto.url}
              alt={activePhoto.name === "Preview" ? "Photo preview" : activePhoto.name}
              style={{
                objectFit: "contain",
                transform: `rotate(${rotation}deg) scale(${zoom})`,
              }}
              onLoad={(event) => {
                const dimensions = {
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                };
                setImageDimensions(dimensions);
                if (fitMode) setZoom(getFitZoom(dimensions, stageRef.current, rotation));
              }}
              onError={() => setImageFailed(true)}
              draggable="false"
            />
          ) : (
            <div className="photos-preview__fallback" role="status" aria-live="polite">
              <strong>Preview unavailable</strong>
              <p>
                {photo
                  ? "This photo could not be loaded."
                  : "No photo is available to preview."}
              </p>
            </div>
          )}
          {dragActive && (
            <div className="photos-preview__drop-hint" role="status">
              Drop images to preview them
            </div>
          )}
        </main>

        {showInfo && (
          <PreviewInspector
             photo={{
               ...activePhoto,
               dimensions: imageDimensions,
               zoom: Math.round(zoom * 100),
             }}
             inspectorId={inspectorId}
             closeButtonRef={infoHideButtonRef}
             onClose={() => setShowInfo(false)}
          />
        )}
      </div>

      {actionNotice && (
        <div className="photos-preview__notice" role="status" aria-live="polite">
          {actionNotice}
        </div>
      )}

      <input
        ref={fileInputRef}
        className="photos-preview__file-input"
        type="file"
        accept="image/*"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
