import { PHOTOS_ICON_PETALS } from "./photosIconModel";

export function PhotosIcon({ size = 58 }) {
  return (
    <span
      className="photos-icon"
      style={{ "--photos-icon-size": `${size}px` }}
      aria-hidden="true"
    >
      <span className="photos-icon__surface">
        <span className="photos-icon__pinwheel">
          {PHOTOS_ICON_PETALS.map(({ angle, from, to }) => (
            <span
              className="photos-icon__petal"
              key={angle}
              style={{
                "--photos-icon-angle": `${angle}deg`,
                "--photos-icon-from": from,
                "--photos-icon-to": to,
              }}
            />
          ))}
        </span>
      </span>
    </span>
  );
}
