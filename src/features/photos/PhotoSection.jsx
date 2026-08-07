import { PhotoCard } from "./PhotoCard";

export function PhotoSection({ section, selectedPhotoIds, onTogglePhoto }) {
  return (
    <section id={`photos-section-${section.id}`} className="photos-section">
      <h2 className="photos-section__title">{section.label}</h2>
      <div className="photos-grid">
        {section.photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            selected={selectedPhotoIds.has(photo.id)}
            onToggle={onTogglePhoto}
          />
        ))}
      </div>
    </section>
  );
}
