import { useContext, useEffect, useState } from "react";
import { WindowContext } from "@/windows/AppWindow/AppWindow";

function getPhotoName(photo) {
  return typeof photo?.name === "string" && photo.name.trim()
    ? photo.name
    : "Preview";
}

function getPhotoUrl(photo) {
  return typeof photo?.url === "string" ? photo.url.trim() : "";
}

export function PhotoPreviewContent({ photo }) {
  const {
    onClose,
    onMinimize,
    onZoom,
    onTitleMouseDown,
  } = useContext(WindowContext);
  const photoUrl = getPhotoUrl(photo);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  const photoName = getPhotoName(photo);
  const hasImage = Boolean(photoUrl) && !imageFailed;

  return (
    <div className="photos-preview">
      <header
        className="photos-preview__titlebar"
        onMouseDown={(event) => {
          if (!event.target?.closest?.("button")) onTitleMouseDown?.(event);
        }}
      >
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
        <span className="photos-preview__title">{photoName}</span>
      </header>

      <main className="photos-preview__stage">
        {hasImage ? (
          <img
            className="photos-preview__image"
            src={photoUrl}
            alt={photoName === "Preview" ? "Photo preview" : photoName}
            style={{ objectFit: "contain" }}
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
      </main>
    </div>
  );
}
