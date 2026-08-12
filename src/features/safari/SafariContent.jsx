import React, { useContext, useState, useCallback, useMemo, useEffect, useRef, memo } from "react";
import { WindowContext } from "@/windows";
import {
  FiArrowLeft, FiArrowRight, FiRefreshCw,
  FiShare2, FiPlus, FiSearch, FiClock, FiGlobe, FiBookOpen,
  FiMenu, FiX, FiStar, FiBookmark, FiGrid,
} from "react-icons/fi";
import { HiOutlineLockClosed, HiOutlineShieldCheck } from "react-icons/hi";
import { TbLayoutSidebarLeftExpand } from "react-icons/tb";
import { BsSliders2 } from "react-icons/bs";

import safariBg from "@/assets/images/Safari_Wallpapers/Safari_Background.webp";
import { AboutPage, HackintoshPage, CatsPage, SurprisePage } from "./Local_Pages/LocalPages";
import { MemoryGame } from "./Local_Pages/MemoryGame";
import { ExternalSiteFrame } from "./ExternalSiteFrame.jsx";
import {
  resolveSafariNavigation,
  TARGET_URL,
  APOLOGY_TARGET_URL,
} from "./safariNavigation.js";
import {
  clearSafariHistory,
  createSafariTab,
  moveSafariTabHistory,
  reopenLastClosedSafariTab,
  visitSafariTab,
} from "./safariModel.js";

// ── Optimized favicons ───────────────────────────────
const AppleFavicon = memo(() => (
  <svg viewBox="0 0 384 512" aria-hidden="true">
    <defs>
      <linearGradient id="apple-favorite-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8e8e93" />
        <stop offset="1" stopColor="#48484a" />
      </linearGradient>
    </defs>
    <path fill="url(#apple-favorite-gradient)" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
));

const GoogleFavicon = memo(() => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.46 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.07 2 20.44 2 24c0 3.56.85 6.93 2.34 9.88l7.35-5.7z" />
    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
  </svg>
));

const ICloudFavicon = memo(() => (
  <svg viewBox="0 0 704 456" aria-hidden="true">
    <defs>
      <linearGradient id="icloud-favorite-big" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#4cb9f5" />
        <stop offset="1" stopColor="#2e86e8" />
      </linearGradient>
      <linearGradient id="icloud-favorite-right" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#48a8f2" />
        <stop offset="1" stopColor="#2c66e2" />
      </linearGradient>
      <linearGradient id="icloud-favorite-left" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#a8dcf5" />
        <stop offset="1" stopColor="#4ab5f3" />
      </linearGradient>
      <linearGradient id="icloud-favorite-small" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#86ccf1" />
        <stop offset="1" stopColor="#4fbaf3" />
      </linearGradient>
      <linearGradient id="icloud-favorite-base" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#7cc9f6" />
        <stop offset="1" stopColor="#3793ec" />
      </linearGradient>
    </defs>
    <circle cx="401" cy="190" r="190" fill="url(#icloud-favorite-big)" />
    <circle cx="568" cy="319" r="135" fill="url(#icloud-favorite-right)" opacity=".95" />
    <rect x="145" y="300" width="423" height="154" fill="url(#icloud-favorite-base)" />
    <circle cx="145" cy="309" r="145" fill="url(#icloud-favorite-left)" />
    <circle cx="193" cy="197" r="108" fill="url(#icloud-favorite-small)" opacity=".8" />
  </svg>
));

const BirthdayFavicon = memo(() => (
  <svg viewBox="0 0 500 500" aria-hidden="true">
    <g stroke="#3f0e5c" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
      <path d="M250 96 L255 134" fill="none" />
      <g transform="rotate(-4 250 160)">
        <rect x="158" y="168" width="196" height="62" rx="16" fill="#efc189" />
        <path fill="#f9f8fd" d="M146 188 C132 172 136 140 164 130 C190 120 260 108 306 108 C336 108 356 122 356 146 C356 166 348 180 334 178 C322 176 318 164 308 156 C298 148 286 152 278 162 C270 172 260 180 246 176 C234 172 230 160 218 156 C206 152 196 160 190 170 C182 182 160 200 146 188 Z" />
      </g>
      <g id="birthday-hearts-a" fill="#e8615c">
        <path d="M150 216 C150 213 145 211 143 214 C141 217 146 221 150 225 C154 221 159 217 157 214 C155 211 150 213 150 216 Z" />
        <path d="M240 212 C240 209 235 207 233 210 C231 213 236 217 240 221 C244 217 249 213 247 210 C245 207 240 209 240 212 Z" />
        <path d="M318 220 C318 217 313 215 311 218 C309 221 314 225 318 229 C322 225 327 221 325 218 C323 215 318 217 318 220 Z" />
      </g>
      <g transform="rotate(2 250 260)">
        <rect x="120" y="268" width="260" height="72" rx="18" fill="#efc189" />
        <path fill="#f9f8fd" d="M106 292 C94 276 94 240 118 228 C140 218 200 212 258 210 C316 208 366 212 386 220 C406 230 408 256 398 272 C390 286 376 290 366 282 C358 275 352 266 340 268 C326 270 322 286 310 294 C296 303 278 298 270 286 C262 274 256 262 242 260 C226 258 216 270 208 282 C198 296 180 298 170 286 C162 276 158 266 146 266 C134 266 120 280 106 292 Z" />
      </g>
      <g id="birthday-hearts-b" fill="#e8615c">
        <path d="M128 330 C128 326 122 324 120 328 C118 332 124 337 128 342 C132 337 138 332 136 328 C134 324 128 326 128 330 Z" />
        <path d="M246 324 C246 320 240 318 238 322 C236 326 242 331 246 336 C250 331 256 326 254 322 C252 318 246 320 246 324 Z" />
        <path d="M352 318 C352 314 346 312 344 316 C342 320 348 325 352 330 C356 325 362 320 360 316 C358 312 352 314 352 318 Z" />
      </g>
      <g transform="rotate(-2 250 400)">
        <rect x="92" y="372" width="316" height="80" rx="20" fill="#efc189" />
        <path fill="#f9f8fd" d="M76 418 C60 400 58 360 86 344 C110 330 170 324 250 320 C330 316 390 314 412 322 C438 332 442 362 434 384 C428 400 414 406 404 398 C394 390 390 380 378 380 C364 380 360 396 350 408 C338 422 316 424 304 410 C294 398 290 382 276 376 C260 370 246 378 238 390 C228 404 212 412 196 406 C182 401 176 388 162 384 C148 380 136 390 128 402 C120 414 92 434 76 418 Z" />
      </g>
      <path fill="#cdc8f2" d="M60 450 L440 446 L402 476 C340 486 160 486 98 476 Z" />
      <g id="birthday-topper" fill="#e8615c">
        <path d="M250 54 C250 38 230 34 224 46 C218 58 238 72 250 84 C262 72 282 58 276 46 C270 34 250 38 250 54 Z" />
      </g>
    </g>
  </svg>
));

const ApologiesFavicon = memo(() => (
  <svg viewBox="0 0 500 520" aria-hidden="true">
    <ellipse cx="278" cy="470" rx="105" ry="16" fill="#dff3c8" />
    <g stroke="#7a4a2b" strokeLinecap="round" strokeLinejoin="round">
      <path d="M165 234 C150 285 195 330 207 372" fill="none" strokeWidth="2.5" />
      <path d="M152 212 L178 212 L170 234 L160 234 Z" fill="#ef4b4b" stroke="#b23434" strokeWidth="3" />
      <g id="apologies-balloon">
        <path d="M165 215 C165 215 55 150 55 82 C55 45 85 25 115 25 C138 25 158 38 165 60 C172 38 192 25 215 25 C245 25 275 45 275 82 C275 150 165 215 165 215 Z" fill="#ef4b4b" stroke="#b23434" strokeWidth="4" />
        <ellipse cx="135" cy="90" rx="55" ry="42" fill="#fff" opacity=".12" stroke="none" />
        <circle cx="90" cy="70" r="9" fill="#fff" stroke="none" />
        <circle cx="78" cy="92" r="5.5" fill="#fff" stroke="none" />
        <circle cx="86" cy="108" r="4" fill="#fff" stroke="none" />
        <circle cx="190" cy="42" r="7" fill="#fff" stroke="none" />
        <circle cx="176" cy="56" r="4" fill="#fff" stroke="none" />
        <text x="165" y="132" textAnchor="middle" transform="rotate(-8 165 130)" fill="#fff" stroke="none" fontFamily="system-ui, sans-serif" fontSize="29" fontWeight="700" letterSpacing="2">I'M SORRY</text>
      </g>
      <g id="apologies-chick">
        <circle cx="322" cy="414" r="40" fill="#fbe45c" strokeWidth="3" />
        <circle cx="310" cy="400" r="4" fill="#2b1b12" stroke="none" />
        <circle cx="337" cy="400" r="4" fill="#2b1b12" stroke="none" />
        <circle cx="309" cy="398.5" r="1.4" fill="#fff" stroke="none" />
        <circle cx="336" cy="398.5" r="1.4" fill="#fff" stroke="none" />
        <ellipse cx="323" cy="412" rx="8" ry="5.5" fill="#f2989c" stroke="#d76f74" strokeWidth="1.5" />
        <ellipse cx="312" cy="456" rx="6" ry="4" fill="#f2989c" stroke="none" />
        <ellipse cx="340" cy="456" rx="6" ry="4" fill="#f2989c" stroke="none" />
      </g>
      <g id="apologies-bunny">
        <ellipse cx="268" cy="243" rx="17" ry="47" fill="#fff" strokeWidth="3" transform="rotate(-14 268 245)" />
        <ellipse cx="268" cy="248" rx="8.5" ry="29" fill="#f6aec3" stroke="none" />
        <ellipse cx="322" cy="248" rx="17" ry="47" fill="#fff" strokeWidth="3" transform="rotate(16 322 250)" />
        <ellipse cx="322" cy="253" rx="8.5" ry="29" fill="#f6aec3" stroke="none" />
        <ellipse cx="252" cy="418" rx="47" ry="52" fill="#fff" strokeWidth="3" />
        <ellipse cx="216" cy="464" rx="15" ry="9" fill="#fff" strokeWidth="2.5" />
        <ellipse cx="268" cy="468" rx="15" ry="9" fill="#fff" strokeWidth="2.5" />
        <ellipse cx="278" cy="312" rx="80" ry="74" fill="#fff" strokeWidth="3" />
        <path d="M236 283 q10 -8 20 -4 M302 297 q10 -6 20 -2" fill="none" strokeWidth="2.5" />
        <circle cx="246" cy="298" r="8.5" fill="#2b1b12" stroke="none" />
        <circle cx="243" cy="295" r="3" fill="#fff" stroke="none" />
        <circle cx="313" cy="313" r="8.5" fill="#2b1b12" stroke="none" />
        <circle cx="310" cy="310" r="3" fill="#fff" stroke="none" />
        <ellipse cx="219" cy="306" rx="9" ry="5.5" fill="#f6aec3" opacity=".85" stroke="none" />
        <ellipse cx="330" cy="332" rx="9" ry="5.5" fill="#f6aec3" opacity=".85" stroke="none" />
        <path d="M267 316 Q272 323 278 316 Q284 323 289 316" fill="none" strokeWidth="2.5" />
        <path d="M234 404 Q216 394 208 378" fill="none" stroke="#7a4a2b" strokeWidth="15" />
        <path d="M234 404 Q216 394 208 378" fill="none" stroke="#fff" strokeWidth="10" />
        <circle cx="207" cy="373" r="8" fill="#fff" strokeWidth="2.5" />
        <path d="M258 404 Q276 410 290 402" fill="none" stroke="#7a4a2b" strokeWidth="15" />
        <path d="M258 404 Q276 410 290 402" fill="none" stroke="#fff" strokeWidth="10" />
      </g>
      <ellipse cx="299" cy="424" rx="9" ry="14" fill="#fbe45c" strokeWidth="2.5" transform="rotate(-15 299 424)" />
    </g>
  </svg>
));

// Static data (never recreated)
const FAVORITES = [
  { title: "Apple", variant: "apple", icon: AppleFavicon, url: "https://www.apple.com" },
  { title: "iCloud", variant: "icloud", icon: ICloudFavicon, url: "https://www.icloud.com" },
  { title: "Google", variant: "google", icon: GoogleFavicon, url: "https://www.google.com" },
  { title: "Birthday ❤️", variant: "birthday", icon: BirthdayFavicon, url: TARGET_URL },
  { title: "Apologies ❤️", variant: "apologies", icon: ApologiesFavicon, url: APOLOGY_TARGET_URL },
];

const CUSTOMIZE_ROWS = [
  { id: "favorites", label: "Favorites", enabled: true },
  { id: "suggestions", label: "Suggestions", enabled: false },
  { id: "privacy", label: "Privacy Report", enabled: true },
  { id: "reading-list", label: "Reading List", enabled: true },
  { id: "recently-closed", label: "Recently Closed Tabs", enabled: true },
];

const SIDEBAR_ITEMS = [
  { id: "favorites", label: "Favorites", icon: FiStar },
  { id: "bookmarks", label: "Bookmarks", icon: FiBookmark },
  { id: "history", label: "History", icon: FiClock },
];


// ── Memoized child components ───────────────────────────────────
const Tab = memo(({ tab, isActive, onSelect, onClose, isOnlyTab }) => {
  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(tab.id);
    }
  };

  return (
    <div
      className={`sf__tab ${isActive ? "active" : ""}`}
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
      aria-label={`${tab.title} tab`}
      onClick={() => onSelect(tab.id)}
      onKeyDown={handleKeyDown}
    >
      <span className="sf__tab-title">{tab.title}</span>
      {!isOnlyTab && (
        <button
          type="button"
          className="sf__tab-close"
          onClick={(e) => onClose(tab.id, e)}
          onKeyDown={(event) => event.stopPropagation()}
          title={`Close ${tab.title} tab`}
          aria-label={`Close ${tab.title} tab`}
        >
          ×
        </button>
      )}
    </div>
  );
});

const TabsBar = memo(({ tabs, activeTabId, onSelectTab, onCloseTab }) => (
  <div className="sf__tabs-bar" role="tablist" aria-label="Safari Tabs">
    {tabs.map(tab => (
      <Tab
        key={tab.id}
        tab={tab}
        isActive={tab.id === activeTabId}
        onSelect={onSelectTab}
        onClose={onCloseTab}
        isOnlyTab={tabs.length === 1}
      />
    ))}
    <button
      type="button"
      className="sf__new-tab-btn"
      onClick={() => onSelectTab(null)}
      title="New Tab"
      aria-label="New Tab"
    >
      <FiPlus size={14}/>
    </button>
  </div>
));

const HistoryMenu = memo(({
  historyEntries,
  recentlyClosedTabs,
  canGoBack,
  canGoForward,
  onClear,
  onMoveHistory,
  onNavigate,
  onReopen,
}) => {
  return (
    <div className="sf__history-menu" role="menu">
      <div className="sf__history-item sf__history-item--muted" role="menuitem">Show All History</div>
      <div className="sf__history-actions">
        <button
          type="button"
          className="sf__history-item"
          onClick={() => onMoveHistory("back")}
          disabled={!canGoBack}
        >
          <FiArrowLeft size={12} aria-hidden="true" />
          <span>Back</span>
        </button>
        <button
          type="button"
          className="sf__history-item"
          onClick={() => onMoveHistory("forward")}
          disabled={!canGoForward}
        >
          <FiArrowRight size={12} aria-hidden="true" />
          <span>Forward</span>
        </button>
      </div>
      <div className="sf__history-item sf__history-item--muted" role="menuitem">Home</div>
      <button type="button" className="sf__history-item sf__history-item--disabled" disabled>
        Return to Search Results
      </button>
      <div className="sf__history-divider" />
      <div className="sf__history-submenu" role="menuitem">
        <span>Recently Closed</span>
        <span aria-hidden="true">›</span>
      </div>
      {recentlyClosedTabs.length === 0 ? (
        <div className="sf__history-submenu-item sf__history-submenu-item--empty">
          No Recently Closed Tabs
        </div>
      ) : (
        recentlyClosedTabs.map((tab) => (
          <div className="sf__history-submenu-item" key={tab.id}>
            {tab.title || tab.url || "Start Page"}
          </div>
        ))
      )}
      <button
        type="button"
        onClick={onReopen}
        disabled={recentlyClosedTabs.length === 0}
        className="sf__history-item sf__history-item--accent"
      >
        Reopen Last Closed Tab
      </button>
      <button type="button" className="sf__history-item sf__history-item--disabled" disabled>
        Reopen All Windows
      </button>
      <div className="sf__history-divider" />
      {historyEntries.length === 0 ? (
        <div className="sf__history-item sf__history-item--muted">
          No History
        </div>
      ) : (
        historyEntries.slice().reverse().map((entry, index) => (
          <button
            key={`${entry.url}-${index}`}
            type="button"
            onClick={() => onNavigate(entry)}
            className="sf__history-item"
          >
            {entry.title}
          </button>
        ))
      )}
      <button type="button" onClick={onClear} className="sf__history-item sf__history-item--warning">
        Clear History
      </button>
    </div>
  );
});

const EmptyState = memo(({ icon: Icon, children }) => (
  <div className="sf__empty-card">
    <Icon className="sf__empty-icon" size={24} strokeWidth={1.25} aria-hidden="true" />
    <p className="sf__empty-text">{children}</p>
  </div>
));

const CustomizePopover = memo(({ rows, backgroundImageEnabled, firstToggleRef, onToggle, onBackgroundImageToggle, onClose }) => {
  const [draggedId, setDraggedId] = useState(null);

  useEffect(() => {
    firstToggleRef.current?.focus();
  }, [firstToggleRef]);

  const handleDrop = (event) => {
    event.preventDefault();
    setDraggedId(null);
  };

  return (
    <div id="sf-customize-popover" className="sf__customize-popover" role="dialog" aria-label="Customize Start Page">
      <div className="sf__customize-header">
        <h3>Customize Start Page</h3>
        <button type="button" className="sf__customize-close" onClick={onClose} aria-label="Close Customize Start Page">
          <FiX size={15} />
        </button>
      </div>
      <p className="sf__customize-instruction">Drag to Reorder</p>
      <div className="sf__customize-rows">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className={`sf__customize-row${draggedId === row.id ? " is-dragging" : ""}`}
            draggable
            onDragStart={() => setDraggedId(row.id)}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <FiMenu className="sf__drag-icon" size={14} aria-hidden="true" />
            <span>{row.label}</span>
            <button
              type="button"
              ref={index === 0 ? firstToggleRef : undefined}
              className={`sf__toggle${row.enabled ? " is-on" : ""}`}
              role="switch"
              aria-checked={row.enabled}
              aria-label={`${row.label} ${row.enabled ? "on" : "off"}`}
              onClick={() => onToggle(row.id)}
            >
              <span />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="sf__background-row"
        onClick={onBackgroundImageToggle}
        aria-pressed={backgroundImageEnabled}
        aria-label={`Background Image ${backgroundImageEnabled ? "on" : "off"}`}
      >
        <span>Background Image</span>
        <span className={`sf__toggle${backgroundImageEnabled ? " is-on" : ""}`} aria-hidden="true">
          <span />
        </span>
      </button>
    </div>
  );
});

const StartPage = memo(({ bookmarks, recentlyClosedTabs, onNavigate }) => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [privacyExpanded, setPrivacyExpanded] = useState(false);
  const [customizeRows, setCustomizeRows] = useState(CUSTOMIZE_ROWS);
  const [backgroundImageEnabled, setBackgroundImageEnabled] = useState(true);
  const popoverRef = useRef(null);
  const editButtonRef = useRef(null);
  const firstToggleRef = useRef(null);

  const closeCustomizeAndFocus = useCallback(() => {
    setIsCustomizeOpen(false);
    setTimeout(() => editButtonRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!isCustomizeOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!popoverRef.current?.contains(event.target) && !editButtonRef.current?.contains(event.target)) {
        closeCustomizeAndFocus();
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeCustomizeAndFocus();
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeCustomizeAndFocus, isCustomizeOpen]);

  const openCustomize = () => {
    setShowWelcome(false);
    setIsCustomizeOpen(true);
  };

  const toggleCustomizeRow = (id) => {
    setCustomizeRows((currentRows) => currentRows.map((row) => (
      row.id === id ? { ...row, enabled: !row.enabled } : row
    )));
  };

  return (
    <div className="sf__start">
      <div className="sf__start-inner">
        {showWelcome && (
          <section className="sf__welcome-card">
            <button type="button" className="sf__welcome-close" onClick={() => setShowWelcome(false)} aria-label="Close Welcome">
              <FiX size={15} />
            </button>
            <h2>Welcome to Safari</h2>
            <p>Start browsing with a clean, private, and familiar place to begin.</p>
            <button type="button" className="sf__welcome-customize" onClick={openCustomize}>
              Customize Start Page
            </button>
          </section>
        )}

        <section className="sf__section">
          <h3 className="sf__section-title">Favorites</h3>
          <div className="sf__favs">
            {FAVORITES.map((favorite) => {
              const IconComponent = favorite.icon;
              return (
                <button key={favorite.title} type="button" className="sf__fav" onClick={() => onNavigate(favorite.url)}>
                  <span
                    className={`sf__fav-icon sf__fav-icon--${favorite.variant}`}
                  >
                    <IconComponent />
                  </span>
                  <span className="sf__fav-label">{favorite.title}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="sf__section">
          <h3 className="sf__section-title">Suggestions</h3>
          <EmptyState icon={FiGlobe}>
            Frequently Visited Websites and links shared with you in Messages<br />
            can automatically appear here, along with shared links that you pin.
          </EmptyState>
        </section>

        <section className="sf__section">
          <h3 className="sf__section-title">Privacy Report</h3>
          <div className="sf__privacy-card">
            <span className="sf__privacy-icon"><HiOutlineShieldCheck size={30} strokeWidth={1.4} /></span>
            <p className="sf__privacy-text">
              Safari has not encountered any trackers in the last thirty days. Safari can hide your IP address from known trackers.
            </p>
            <button type="button" className="sf__privacy-more" onClick={() => setPrivacyExpanded((expanded) => !expanded)}>
              {privacyExpanded ? "Show Less" : "Show More"}
            </button>
          </div>
        </section>

        <section className="sf__section">
          <h3 className="sf__section-title">Reading List</h3>
          <EmptyState icon={FiBookOpen}>Articles you save to your Reading List will appear here.</EmptyState>
        </section>

        <section className="sf__section">
          <h3 className="sf__section-title">Recently Closed Tabs</h3>
          {recentlyClosedTabs.length === 0 ? (
            <EmptyState icon={FiClock}>Tabs you close will appear here.</EmptyState>
          ) : (
            <div className="sf__recently-closed-list">
              {recentlyClosedTabs.map((tab) => (
                <div className="sf__recently-closed-item" key={tab.id}>
                  <FiClock size={14} aria-hidden="true" />
                  <span>{tab.title || tab.url || "Start Page"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {bookmarks.length > 0 && (
          <section className="sf__section">
            <h3 className="sf__section-title">Bookmarks</h3>
            <div className="sf__bookmarks">
              {bookmarks.map((bookmark, index) => (
                <button key={`${bookmark.url}-${index}`} type="button" className="sf__bookmark-btn" onClick={() => onNavigate(bookmark.url)}>
                  {bookmark.title}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {isCustomizeOpen && (
        <div ref={popoverRef}>
          <CustomizePopover
            rows={customizeRows}
            backgroundImageEnabled={backgroundImageEnabled}
            firstToggleRef={firstToggleRef}
            onToggle={toggleCustomizeRow}
            onBackgroundImageToggle={() => setBackgroundImageEnabled((enabled) => !enabled)}
            onClose={closeCustomizeAndFocus}
          />
        </div>
      )}
      <button
        ref={editButtonRef}
        type="button"
        className="sf__edit-btn"
        aria-pressed={isCustomizeOpen}
        aria-expanded={isCustomizeOpen}
        aria-controls="sf-customize-popover"
        onClick={() => setIsCustomizeOpen((open) => !open)}
      >
        Edit
      </button>
    </div>
  );
});

const BlockedPage = memo(({ url, onGoHome }) => (
  <div className="sf__blocked">
    <div className="sf__blocked-icon">🧭</div>
    <h2>Safari Can't Open the Page</h2>
    <p>
      Safari can't open <strong>"{url}"</strong> because web content cannot be loaded in this environment.
    </p>
    <button className="sf__blocked-back" onClick={onGoHome}>
      Go to Start Page
    </button>
  </div>
));

const BLOCKED_FALLBACK_TITLE = "Blocked Navigation";
const SAFARI_HISTORY_KINDS = new Set(["local", "iframe", "blocked"]);

function createSafariPage(navigation) {
  if (navigation.kind === "local") {
    return {
      kind: "local",
      url: navigation.command,
      title: navigation.title,
      isStart: false,
    };
  }

  if (navigation.kind === "iframe") {
    return {
      kind: "iframe",
      url: navigation.url,
      title: navigation.title,
      isStart: false,
    };
  }

  const safeUrl = typeof navigation.url === "string" && navigation.url
    ? navigation.url
    : TARGET_URL;
  const safeTitle = typeof navigation.title === "string" && navigation.title
    ? navigation.title
    : BLOCKED_FALLBACK_TITLE;

  return {
    kind: "blocked",
    url: safeUrl,
    title: safeTitle,
    isStart: false,
    ...(navigation.reason ? { reason: navigation.reason } : {}),
  };
}

function createSafariHistoryEntry(page) {
  return {
    url: page.url,
    title: page.title,
    kind: page.kind,
    ...(page.reason ? { reason: page.reason } : {}),
  };
}

function createStoredSafariPage(entry) {
  if (!entry || !SAFARI_HISTORY_KINDS.has(entry.kind)) return null;

  const url = typeof entry.url === "string" && entry.url ? entry.url : "";
  if (!url) return createSafariPage({ kind: "blocked" });

  const navigation = resolveSafariNavigation(url);
  if (entry.kind === "blocked") {
    if (navigation.kind === "blocked") return createSafariPage(navigation);
    if (navigation.kind === "iframe") {
      return createSafariPage({
        kind: "blocked",
        url: navigation.url,
        title: entry.title,
        reason: entry.reason,
      });
    }
    return createSafariPage({ kind: "blocked", reason: entry.reason });
  }

  if (navigation.kind !== entry.kind) return createSafariPage({ kind: "blocked" });

  return {
    kind: navigation.kind,
    url: navigation.kind === "local" ? navigation.command : navigation.url,
    title: typeof entry.title === "string" && entry.title
      ? entry.title
      : navigation.title,
    isStart: false,
  };
}

function createLegacySafariPage(entry) {
  const navigation = resolveSafariNavigation(entry?.url);
  return navigation.kind === "iframe"
    ? createSafariPage({ kind: "blocked" })
    : createSafariPage(navigation);
}

function createFramePage(snapshot) {
  const navigation = resolveSafariNavigation(snapshot?.url);
  if (!snapshot || snapshot.status !== "ready" || navigation.kind !== "iframe") return null;

  return {
    kind: "iframe",
    url: navigation.url,
    title: typeof snapshot.title === "string" && snapshot.title.trim()
      ? snapshot.title.trim()
      : navigation.title,
    isStart: false,
  };
}

function updateCurrentSafariPage(tab, page) {
  return {
    ...tab,
    ...page,
    history: tab.history.map((entry, index) => (
      index === tab.historyIndex ? { ...entry, ...page } : entry
    )),
  };
}

function visitSafariTabAfterPendingNavigation(tab, pendingNavigation, page) {
  const baseTab = pendingNavigation
    && tab.url === pendingNavigation.fromUrl
    && tab.url !== pendingNavigation.url
    ? visitSafariTab(tab, pendingNavigation.page)
    : tab;

  return visitSafariTab(baseTab, page);
}

const UnsupportedFrame = memo(({ url, onRetry, onGoHome }) => (
  <div className="sf__external-unsupported" role="alert">
    <h2>Safari Can't Open the Embedded Page</h2>
    <p>The embedded page could not be verified in this Safari window.</p>
    <div className="sf__external-unsupported-actions">
      <button type="button" autoFocus onClick={onRetry}>Retry</button>
      <a href={url} target="_blank" rel="noopener noreferrer">
        Open in Browser
      </a>
      <button type="button" onClick={onGoHome}>Go to Start Page</button>
    </div>
  </div>
));

function PageRenderer({ command, onNavigate }) {
  switch (command) {
    case "about":      return <AboutPage />;
    case "hackintosh": return <HackintoshPage />;
    case "cats":       return <CatsPage />;
    case "surprise":   return <SurprisePage onNavigate={onNavigate} />;
    case "games":      return <MemoryGame />;
    default:           return <BlockedPage url={command} onGoHome={() => onNavigate("")} />;
  }
}

export function SafariContent({ onClose, onMinimize, onZoom }) {
  // Получаем функцию для перетаскивания окна из контекста
  const { onTitleMouseDown } = useContext(WindowContext);

  const [tabs, setTabs] = useState(() => [
    createSafariTab(1, "Start Page", "", true)
  ]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [draftValue, setDraftValue] = useState("");
  const [historyEntries, setHistoryEntries] = useState([]);
  const [recentlyClosedTabs, setRecentlyClosedTabs] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [frameStatus, setFrameStatus] = useState("idle");
  const [reloadToken, setReloadToken] = useState(0);
  const nextTabId = useRef(2);
  const historyMenuRef = useRef(null);
  const historyButtonRef = useRef(null);
  const frameStatusByTabRef = useRef(new Map());
  const reloadTokensByTabRef = useRef(new Map());
  const frameNavigationRef = useRef(new Map());
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);

  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;
  
  const [bookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem("safari_bookmarks");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed.filter((bookmark) => (
          bookmark !== null
          && typeof bookmark === "object"
          && !Array.isArray(bookmark)
          && typeof bookmark.url === "string"
          && typeof bookmark.title === "string"
        ))
        : [];
    } catch { 
      return []; 
    }
  });

  const activeTab = useMemo(
    () => tabs.find(t => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  const getTabFrameStatus = useCallback((tab) => (
    tab && !tab.isStart && tab.kind === "iframe"
      ? frameStatusByTabRef.current.get(tab.id) || "loading"
      : "idle"
  ), []);

  const setTabFrameStatus = useCallback((tabId, status) => {
    frameStatusByTabRef.current.set(tabId, status);
    if (activeTabIdRef.current === tabId) setFrameStatus(status);
  }, []);

  useEffect(() => {
    setDraftValue(activeTab.url || "");
    setFrameStatus(getTabFrameStatus(activeTab));
  }, [activeTab.id, activeTab.isStart, activeTab.kind, activeTab.url, getTabFrameStatus]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((open) => !open);
    setIsHistoryOpen(false);
  }, []);

  const handleSidebarItem = useCallback((itemId) => {
    setActiveSidebarItem(itemId);
    setIsHistoryOpen(itemId === "history" ? (open) => !open : false);
  }, []);

  useEffect(() => {
    if (!isHistoryOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!historyMenuRef.current?.contains(event.target) && !historyButtonRef.current?.contains(event.target)) {
        setIsHistoryOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsHistoryOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isHistoryOpen]);

  const addTab = useCallback((url = "", title = "Start Page") => {
    const newTab = createSafariTab(nextTabId.current++, title, url, !url);
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setDraftValue(url);
    setFrameStatus("idle");
  }, []);

  const closeTab = useCallback((id, e) => {
    e?.stopPropagation();
    if (tabs.length === 1) return;
    const closedTab = tabs.find(tab => tab.id === id);
    if (!closedTab) return;

    const newTabs = tabs.filter(tab => tab.id !== id);
    setTabs(newTabs);
    setRecentlyClosedTabs(prev => [closedTab, ...prev]);
    frameStatusByTabRef.current.delete(id);
    reloadTokensByTabRef.current.delete(id);
    frameNavigationRef.current.delete(id);
    if (activeTabId === id) {
      const nextActiveTab = newTabs[0];
      setActiveTabId(nextActiveTab.id);
      setDraftValue(nextActiveTab.url || "");
      setFrameStatus(getTabFrameStatus(nextActiveTab));
    }
  }, [tabs, activeTabId, getTabFrameStatus]);

  const navigate = useCallback((target) => {
    const result = resolveSafariNavigation(target);
    if (result.kind === "empty") return;

    const page = createSafariPage(result);
    const tabId = activeTabIdRef.current;

    frameNavigationRef.current.delete(tabId);
    setTabs(prev => prev.map(tab => (
      tab.id === tabId ? visitSafariTab(tab, page) : tab
    )));
    setTabFrameStatus(tabId, page.kind === "iframe" ? "loading" : "idle");
    setHistoryEntries(prev => [...prev, createSafariHistoryEntry(page)]);
    setDraftValue(page.url);
  }, [setTabFrameStatus]);

  const goHome = useCallback(() => {
    const page = { kind: undefined, url: "", title: "Start Page", isStart: true };
    const tabId = activeTabIdRef.current;
    frameNavigationRef.current.delete(tabId);
    setTabs(prev => prev.map(tab => (
      tab.id === tabId ? visitSafariTab(tab, page) : tab
    )));
    setTabFrameStatus(tabId, "idle");
    setDraftValue("");
  }, [setTabFrameStatus]);

  const handleKey = useCallback((e) => {
    if (e.key === "Enter") navigate(draftValue);
  }, [draftValue, navigate]);

  const processFrameNavigation = useCallback((tabId, page) => {
    const currentTab = tabsRef.current.find(tab => tab.id === tabId);
    if (!currentTab || currentTab.isStart || currentTab.kind !== "iframe") return;

    const pendingNavigation = frameNavigationRef.current.get(tabId);
    const isPendingDuplicate = pendingNavigation
      && pendingNavigation.url === page.url
      && pendingNavigation.fromUrl === currentTab.url;
    const isCurrentUrl = page.url === currentTab.url;
    const isPendingReturn = isCurrentUrl
      && pendingNavigation
      && pendingNavigation.url !== page.url
      && pendingNavigation.fromUrl === currentTab.url;

    if (isPendingDuplicate || (isCurrentUrl && !isPendingReturn)) {
      setTabs(prev => prev.map(tab => (
        tab.id === tabId && !tab.isStart && tab.kind === "iframe"
          ? updateCurrentSafariPage(tab, { title: page.title })
          : tab
      )));
      setTabFrameStatus(tabId, "ready");
      if (activeTabIdRef.current === tabId) setDraftValue(page.url);
      return;
    }

    const nextToken = (pendingNavigation?.token || 0) + 1;
    frameNavigationRef.current.set(tabId, {
      url: page.url,
      fromUrl: currentTab.url,
      page,
      token: nextToken,
    });

    setTabs(prev => prev.map(tab => (
      tab.id === tabId && !tab.isStart && tab.kind === "iframe"
        ? visitSafariTabAfterPendingNavigation(tab, pendingNavigation, page)
        : tab
    )));
    setHistoryEntries(prev => [...prev, createSafariHistoryEntry(page)]);
    setTabFrameStatus(tabId, "loading");
    if (activeTabIdRef.current === tabId) setDraftValue(page.url);
  }, [setTabFrameStatus]);

  const handleFrameNavigate = useCallback((tabId, snapshot) => {
    const page = createFramePage(snapshot);
    if (!page) {
      setTabFrameStatus(tabId, "unsupported");
      return;
    }

    processFrameNavigation(tabId, page);
  }, [processFrameNavigation, setTabFrameStatus]);

  const handleFrameReady = useCallback((tabId, snapshot) => {
    const page = createFramePage(snapshot);
    if (!page) {
      setTabFrameStatus(tabId, "unsupported");
      return;
    }

    const currentTab = tabsRef.current.find(tab => tab.id === tabId);
    if (!currentTab || currentTab.isStart || currentTab.kind !== "iframe") return;
    if (page.url !== currentTab.url) {
      processFrameNavigation(tabId, page);
      return;
    }

    setTabs(prev => prev.map(tab => (
      tab.id === tabId && !tab.isStart && tab.kind === "iframe"
        ? updateCurrentSafariPage(tab, page)
        : tab
    )));
    setTabFrameStatus(tabId, "ready");
    if (activeTabIdRef.current === tabId) setDraftValue(page.url);
  }, [processFrameNavigation, setTabFrameStatus]);

  const handleFrameUnsupported = useCallback((tabId) => {
    setTabFrameStatus(tabId, "unsupported");
  }, [setTabFrameStatus]);

  const moveHistory = useCallback((direction) => {
    const currentTab = tabsRef.current.find(tab => tab.id === activeTabIdRef.current);
    if (!currentTab) return;

    const nextTab = moveSafariTabHistory(currentTab, direction);
    if (nextTab === currentTab) return;

    frameNavigationRef.current.delete(currentTab.id);
    const nextStatus = !nextTab.isStart && nextTab.kind === "iframe"
      ? currentTab.kind === "iframe" && nextTab.url === currentTab.url
        ? getTabFrameStatus(currentTab)
        : "loading"
      : "idle";

    setTabFrameStatus(currentTab.id, nextStatus);
    setTabs(prev => prev.map(tab => tab.id === currentTab.id ? nextTab : tab));
    setDraftValue(nextTab.url || "");
  }, [getTabFrameStatus, setTabFrameStatus]);

  const handleRefresh = useCallback(() => {
    const currentTab = tabsRef.current.find(tab => tab.id === activeTabIdRef.current);
    if (!currentTab) return;

    if (!currentTab.isStart && currentTab.kind === "iframe") {
      setTabFrameStatus(currentTab.id, "loading");
      const nextToken = (reloadTokensByTabRef.current.get(currentTab.id) || 0) + 1;
      reloadTokensByTabRef.current.set(currentTab.id, nextToken);
      setReloadToken(token => token + 1);
      return;
    }

    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  }, [setTabFrameStatus]);

  const handleSelectTab = useCallback((tabId) => {
    if (tabId === null) addTab();
    else {
      const selectedTab = tabs.find(tab => tab.id === tabId);
      if (!selectedTab) return;
      setActiveTabId(tabId);
      setDraftValue(selectedTab.url || "");
      setFrameStatus(getTabFrameStatus(selectedTab));
    }
  }, [addTab, getTabFrameStatus, tabs]);

  const reopenLastClosedTab = useCallback(() => {
    const { tab: reopenedTab, remaining } = reopenLastClosedSafariTab(
      recentlyClosedTabs,
      nextTabId.current
    );
    if (!reopenedTab) return;

    nextTabId.current += 1;
    setTabs(prev => [...prev, reopenedTab]);
    setRecentlyClosedTabs(remaining);
    setActiveTabId(reopenedTab.id);
    setDraftValue(reopenedTab.url || "");
    const reopenedStatus = !reopenedTab.isStart && reopenedTab.kind === "iframe"
      ? "loading"
      : "idle";
    frameStatusByTabRef.current.set(reopenedTab.id, reopenedStatus);
    setFrameStatus(reopenedStatus);
    setIsHistoryOpen(false);
  }, [recentlyClosedTabs]);

  const navigateFromHistory = useCallback((entry) => {
    const historyEntry = entry && typeof entry === "object" ? entry : { url: entry };
    const hasStoredKind = typeof historyEntry.kind === "string";
    const page = hasStoredKind
      ? createStoredSafariPage(historyEntry) || createSafariPage({ kind: "blocked" })
      : createLegacySafariPage(historyEntry);
    const tabId = activeTabIdRef.current;

    frameNavigationRef.current.delete(tabId);
    setTabs(prev => prev.map(tab => (
      tab.id === tabId ? visitSafariTab(tab, page) : tab
    )));
    setHistoryEntries(prev => [...prev, createSafariHistoryEntry(page)]);
    setTabFrameStatus(tabId, page.kind === "iframe" ? "loading" : "idle");
    setDraftValue(page.url);
    setIsHistoryOpen(false);
  }, [setTabFrameStatus]);

  const clearHistory = useCallback(() => {
    setHistoryEntries(clearSafariHistory());
    setIsHistoryOpen(false);
  }, []);

  const externalFrames = useMemo(() => (
    tabs
      .filter(tab => !tab.isStart && tab.kind === "iframe")
      .map(tab => (
        <ExternalSiteFrame
          key={tab.id}
          tabId={tab.id}
          url={tab.url}
          isActive={tab.id === activeTab.id}
          reloadToken={reloadTokensByTabRef.current.get(tab.id) || 0}
          onReady={(snapshot) => handleFrameReady(tab.id, snapshot)}
          onNavigate={(snapshot) => handleFrameNavigate(tab.id, snapshot)}
          onUnsupported={() => handleFrameUnsupported(tab.id)}
        />
      ))
  ), [
    tabs,
    activeTab.id,
    handleFrameReady,
    handleFrameNavigate,
    handleFrameUnsupported,
    reloadToken,
  ]);

  const renderContent = useMemo(() => {
    if (activeTab.isStart) {
      return <StartPage key={activeTab.id} bookmarks={bookmarks} recentlyClosedTabs={recentlyClosedTabs} onNavigate={navigate} />;
    }
    if (activeTab.kind === "local") {
      return <PageRenderer command={activeTab.url} onNavigate={navigate} />;
    }
    if (activeTab.kind === "iframe") {
      return frameStatus === "unsupported"
        ? <UnsupportedFrame url={activeTab.url || TARGET_URL} onRetry={handleRefresh} onGoHome={goHome} />
        : null;
    }
    return <BlockedPage url={activeTab.url || TARGET_URL} onGoHome={goHome} />;
  }, [
    activeTab.id,
    activeTab.isStart,
    activeTab.kind,
    activeTab.url,
    bookmarks,
    recentlyClosedTabs,
    navigate,
    frameStatus,
    handleRefresh,
    goHome,
  ]);

  const canGoBack = activeTab.historyIndex > 0;
  const canGoForward = activeTab.historyIndex < activeTab.history.length - 1;

  return (
    <div className="sf" style={{ backgroundImage: `url(${safariBg})` }}>
      <div className="sf__bg-overlay" />

      <div className="sf__toolbar">
        {/* Весь верхний блок тулбара становится перетаскиваемой областью */}
        <div 
          className="sf__toolbar-top"
          onMouseDown={(e) => !e.target.closest('.sf__tl, .sf__icon-btn, .sf__nav-btn, .sf__address-input, .sf__refresh-btn') && onTitleMouseDown(e)}
        >
          <div className="sf__toolbar-left">
            <div className="sf__tl-group">
              <button type="button" className="sf__tl sf__tl--close" onClick={onClose} title="Close" aria-label="Close window"/>
              <button type="button" className="sf__tl sf__tl--minimize" onClick={onMinimize} title="Minimize" aria-label="Minimize window"/>
              <button type="button" className="sf__tl sf__tl--zoom" onClick={onZoom} title="Zoom" aria-label="Zoom window"/>
            </div>
            <button
              type="button"
              className={`sf__icon-btn${isSidebarOpen ? " is-active" : ""}`}
              onClick={toggleSidebar}
              title="Toggle Sidebar"
              aria-label="Toggle Sidebar"
              aria-expanded={isSidebarOpen}
            >
              <TbLayoutSidebarLeftExpand size={16}/>
            </button>
          </div>

          <div className="sf__toolbar-center">
            <div className="sf__nav-buttons">
              <button
                type="button"
                className={`sf__nav-btn${canGoBack ? "" : " sf__nav-btn--disabled"}`}
                onClick={() => moveHistory("back")}
                disabled={!canGoBack}
                aria-label="Back"
              >
                <FiArrowLeft size={13}/>
              </button>
              <button
                type="button"
                className={`sf__nav-btn${canGoForward ? "" : " sf__nav-btn--disabled"}`}
                onClick={() => moveHistory("forward")}
                disabled={!canGoForward}
                aria-label="Forward"
              >
                <FiArrowRight size={13}/>
              </button>
            </div>

            <div className="sf__address">
              {activeTab.isStart ? (
                <FiSearch size={12} className="sf__address-icon"/>
              ) : (
                <HiOutlineLockClosed size={12} className="sf__address-icon sf__address-icon--lock"/>
              )}
              <input
                className="sf__address-input"
                placeholder="Search or enter website name"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onKeyDown={handleKey}
                onFocus={(e) => e.target.select()}
                spellCheck={false}
                title="Address"
                aria-label="Address"
              />
              <button type="button" className="sf__refresh-btn" onClick={handleRefresh} title="Reload" aria-label="Reload">
                <FiRefreshCw
                  size={11}
                  className={isLoading || frameStatus === "loading" ? "sf--spin" : ""}
                />
              </button>
            </div>
          </div>

          <div className="sf__toolbar-right">
            <button type="button" className="sf__icon-btn" title="Share" aria-label="Share"><FiShare2 size={14}/></button>
            <button type="button" className="sf__icon-btn" onClick={() => addTab()} title="New Tab" aria-label="New Tab"><FiPlus size={14}/></button>
            <button type="button" className="sf__icon-btn" title="Tab Overview" aria-label="Tab Overview"><FiGrid size={14}/></button>
            <button type="button" className="sf__icon-btn" title="Bookmark" aria-label="Bookmark">🔖</button>
            <button type="button" className="sf__icon-btn" title="View Settings" aria-label="View Settings"><BsSliders2 size={14}/></button>
          </div>
          </div>

        <TabsBar 
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onCloseTab={closeTab}
        />
      </div>

      <div className="sf__body">
        {isSidebarOpen && (
          <aside className="sf__sidebar" aria-label="Safari Sidebar">
            {SIDEBAR_ITEMS.map(({ id, label, icon: Icon }) => (
              <div
                key={id}
                ref={id === "history" ? historyMenuRef : undefined}
                className="sf__sidebar-item-wrap"
              >
                <button
                  ref={id === "history" ? historyButtonRef : undefined}
                  type="button"
                  className={`sf__sidebar-item${activeSidebarItem === id ? " is-active" : ""}`}
                  onClick={() => handleSidebarItem(id)}
                  aria-current={activeSidebarItem === id ? "page" : undefined}
                  aria-expanded={id === "history" ? isHistoryOpen : undefined}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span>{label}</span>
                </button>
                {id === "history" && isHistoryOpen && (
                  <HistoryMenu
                    historyEntries={historyEntries}
                    recentlyClosedTabs={recentlyClosedTabs}
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    onClear={clearHistory}
                    onMoveHistory={moveHistory}
                    onNavigate={navigateFromHistory}
                    onReopen={reopenLastClosedTab}
                  />
                )}
              </div>
            ))}
          </aside>
        )}
        <div className="sf__body-content">
          {externalFrames}
          {renderContent}
        </div>
      </div>
    </div>
  );
}
