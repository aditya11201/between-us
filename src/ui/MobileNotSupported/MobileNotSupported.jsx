import React, { useState } from "react";

const FEATURES = [
  {
    icon: "🌄",
    title: "Landscape orientation",
    desc: "Rotate your device to landscape to continue.",
  },
  {
    icon: "✨",
    title: "A lively atmosphere",
    desc: "Frosted glass, soft shadows, and smooth animations",
  },
  {
    icon: "🖥️",
    title: "Real apps",
    desc: "Finder, Terminal, Notes, and the Dock, just like on a Mac",
  },
];

export default function MobileNotSupported() {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mns-backdrop">
      <div className="mns-desktop-bg" />

      <div className="mns-window" role="dialog" aria-modal="true">
        {/* ── Заголовок окна ── */}
        <div className="mns-titlebar">
          <div className="mns-traffic">
            <div className="tl tl-close" title="Desktop only" />
            <div className="tl tl-min" />
            <div className="tl tl-max" />
          </div>
          <span className="mns-titlebar-label">Between Us</span>
          <div className="mns-titlebar-spacer" />
        </div>

        {/* ── Контент ── */}
        <div className="mns-body">
          <div className="mns-hero">
            <div className="mns-app-icon" aria-hidden="true">
              <span className="mns-app-icon-inner">🏔️</span>
            </div>
            <div className="mns-hero-text">
              <h1 className="mns-title">Rotate your device</h1>
              <p className="mns-subtitle">A personal macOS-inspired experience</p>
              <p className="mns-description">
                Between Us works on smaller screens in landscape orientation.
              </p>
            </div>
          </div>

          <div className="mns-features-box">
            <div className="mns-features" role="list">
              {FEATURES.map((f) => (
                <div className="mns-feature-row" role="listitem" key={f.title}>
                  <div className="mns-feature-icon" aria-hidden="true">
                    {f.icon}
                  </div>
                  <div className="mns-feature-text">
                    <span className="mns-feature-title">{f.title}</span>
                    <span className="mns-feature-desc">{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mns-actions">
            <button
              className={`mns-btn ${copied ? "mns-btn--success" : "mns-btn--primary"}`}
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <span className="mns-btn-icon">✅</span>
                  <span>Link copied</span>
                </>
              ) : (
                <>
                  <span className="mns-btn-icon">📋</span>
                  <span>Copy link</span>
                </>
              )}
            </button>
          </div>

          <p className="mns-footer">© 2026 Between Us</p>
        </div>
      </div>
    </div>
  );
}
