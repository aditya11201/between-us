export function PhotoCard({ photo, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`photos-card${selected ? " photos-card--selected" : ""}`}
      aria-pressed={selected}
      aria-label={photo.name}
      onClick={(event) => onToggle(photo.id, event.metaKey || event.ctrlKey)}
    >
      <img
        src={photo.url}
        alt={photo.name}
        width="140"
        height="140"
        loading="lazy"
        decoding="async"
      />
      <span className="photos-card__caption">{photo.name}</span>
    </button>
  );
}
