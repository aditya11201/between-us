import { FiHeart } from "react-icons/fi";

export function PhotoCard({ photo, selected, favorite, onToggle, onToggleFavorite, onDoubleClick }) {
  const isVideo = photo.mediaType === "video";
  return (
    <div className={`photos-card-wrap${favorite ? " photos-card-wrap--favorite" : ""}`}>
      <button
        type="button"
        className={`photos-card${selected ? " photos-card--selected" : ""}`}
        aria-pressed={selected}
        aria-label={photo.name}
        onClick={(event) => {
          if (event.target.closest?.(".photos-card__favorite") !== null) return;
          onToggle(photo.id, event.metaKey || event.ctrlKey);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onDoubleClick(photo);
        }}
      >
        {isVideo ? (
          <video
            src={photo.url}
            width="140"
            height="140"
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
        ) : (
          <img
            src={photo.url}
            alt={photo.name}
            width="140"
            height="140"
            loading="lazy"
            decoding="async"
          />
        )}
        <span className="photos-card__caption">{photo.name}</span>
        {typeof onToggleFavorite === "function" && (
          <span
            role="button"
            tabIndex={0}
            className={`photos-card__favorite${favorite ? " photos-card__favorite--active" : ""}`}
            aria-pressed={favorite === true}
            aria-label={favorite ? `Unlike ${photo.name}` : `Like ${photo.name}`}
            title={favorite ? "Unlike" : "Like"}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(photo.id);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              onToggleFavorite(photo.id);
            }}
          >
            <FiHeart aria-hidden="true" />
          </span>
        )}
      </button>
    </div>
  );
}
