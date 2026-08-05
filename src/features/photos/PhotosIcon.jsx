const PETALS = [
  { angle: 0, from: "#ff9f0a", to: "#ffd60a" },
  { angle: 45, from: "#ffd60a", to: "#a7f3d0" },
  { angle: 90, from: "#a7f3d0", to: "#34c759" },
  { angle: 135, from: "#34c759", to: "#0a84ff" },
  { angle: 180, from: "#0a84ff", to: "#bf5af2" },
  { angle: 225, from: "#bf5af2", to: "#ff2d55" },
  { angle: 270, from: "#ff2d55", to: "#ff453a" },
  { angle: 315, from: "#ff453a", to: "#ff9f0a" },
];

export function PhotosIcon({ size = 58 }) {
  return (
    <span
      className="photos-icon"
      style={{ "--photos-icon-size": `${size}px` }}
      aria-hidden="true"
    >
      <span className="photos-icon__surface">
        {PETALS.map(({ angle, from, to }) => (
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
        <span className="photos-icon__center" />
      </span>
    </span>
  );
}
