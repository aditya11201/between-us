export function MailIcon({ size = 58 }) {
  return (
    <span
      className="mail-icon"
      style={{ "--mail-icon-size": `${size}px` }}
      aria-hidden="true"
    >
      <span className="mail-icon__envelope">
        <span className="mail-icon__side mail-icon__side--left" />
        <span className="mail-icon__side mail-icon__side--right" />
        <span className="mail-icon__front" />
        <span className="mail-icon__shadow" />
        <span className="mail-icon__flap" />
      </span>
    </span>
  );
}
