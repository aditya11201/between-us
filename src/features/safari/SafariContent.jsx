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
import { resolveSafariNavigation, TARGET_URL } from "./safariNavigation.js";
import {
  clearSafariHistory,
  createSafariTab,
  moveSafariTabHistory,
  reopenLastClosedSafariTab,
  visitSafariTab,
} from "./safariModel.js";

// ── Optimized favicons ───────────────────────────────
const AppleFavicon = memo(() => (
  <svg viewBox="0 0 60 60" width="30" height="30" fill="white">
    <path d="M42.56 46.5c-1.93 2.87-3.97 5.67-7.05 5.73-3.1.07-4.1-1.84-7.61-1.84-3.55 0-4.63 1.79-7.57 1.91-3.03.11-5.33-3.06-7.27-5.87C9.83 39.37 6.86 28.84 10.87 21.7c2.01-3.52 5.63-5.74 9.54-5.81 2.97-.05 5.78 2.01 7.62 2.01 1.8 0 5.23-2.48 8.82-2.1 1.5.06 5.71.6 8.42 4.58-.2.14-5.02 2.97-4.97 8.83.06 6.99 6.14 9.32 6.2 9.35-.06.16-.98 3.34-3.2 6.54M30.15 8.1c1.7-1.92 4.49-3.38 6.81-3.47.3 2.7-.78 5.44-2.4 7.38-1.6 1.97-4.24 3.5-6.83 3.29-.35-2.65.96-5.43 2.42-7.2"/>
  </svg>
));

const TextFavicon = memo(({ children, fontSize = 25 }) => (
  <svg viewBox="0 0 60 60" width="30" height="30" fill="currentColor" aria-hidden="true">
    <text x="30" y="40" textAnchor="middle" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif" fontSize={fontSize} fontWeight="700">
      {children}
    </text>
  </svg>
));

// Static data (never recreated)
const FAVORITES = [
  { title: "Apple", icon: AppleFavicon, bg: "#3a3a3c", url: "https://www.apple.com" },
  { title: "iCloud", icon: TextFavicon, iconProps: { fontSize: 22 }, bg: "#2384d7", url: "https://www.icloud.com" },
  { title: "Google", icon: TextFavicon, bg: "#fff", iconProps: { fontSize: 27 }, iconColor: "#4285f4", url: "https://www.google.com" },
  { title: "Birthday ❤️", icon: TextFavicon, iconProps: { fontSize: 20 }, bg: "#c45a8a", url: TARGET_URL },
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
                  <span className="sf__fav-icon" style={{ background: favorite.bg, color: favorite.iconColor || "#fff" }}>
                    <IconComponent {...favorite.iconProps}>{favorite.title.charAt(0)}</IconComponent>
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
