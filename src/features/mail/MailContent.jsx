import { useContext } from "react";
import { WindowContext } from "@/windows";

export function MailContent({ onClose, onMinimize, onMaximize }) {
  const { onTitleMouseDown, onZoom } = useContext(WindowContext);

  return (
    <div className="mail">
      <aside className="mail__sidebar">
        <header
          className="mail__titlebar"
          onMouseDown={(event) => {
            if (!event.target.closest("button")) onTitleMouseDown(event);
          }}
        >
          <div className="mail__traffic-lights">
            <button
              type="button"
              className="mail__traffic-light mail__traffic-light--close"
              onClick={onClose}
              aria-label="Close Mail window"
            />
            <button
              type="button"
              className="mail__traffic-light mail__traffic-light--minimize"
              onClick={onMinimize}
              aria-label="Minimize Mail window"
            />
            <button
              type="button"
              className="mail__traffic-light mail__traffic-light--maximize"
              onClick={() => {
                onMaximize();
                onZoom();
              }}
              aria-label="Maximize Mail window"
            />
          </div>
        </header>
        <div className="mail__sidebar-scroll" />
      </aside>
      <section className="mail__list-col" aria-label="Mail message list" />
      <section className="mail__detail" aria-label="Mail message detail" />
    </div>
  );
}
