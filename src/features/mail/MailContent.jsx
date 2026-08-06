import { useContext, useEffect, useRef, useState } from "react";
import {
  FiArchive,
  FiBell,
  FiChevronDown,
  FiChevronRight,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiEdit3,
  FiFileText,
  FiFilter,
  FiFlag,
  FiFolder,
  FiInbox,
  FiMoreHorizontal,
  FiMove,
  FiSearch,
  FiSend,
  FiShoppingCart,
  FiSidebar,
  FiTag,
  FiTrash,
  FiTrash2,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { useWindowManager } from "@/core/providers";
import { WindowContext } from "@/windows";
import { CATEGORIES, MAILBOX_GROUPS, createInitialMessages } from "./mailData";
import {
  getMailboxCount,
  getMessageById,
  getVisibleMessages,
  moveMessage,
  setMessageUnread,
  toggleMessageFlag,
} from "./mailModel";

const MAILBOX_ICONS = {
  inbox: FiInbox,
  flag: FiFlag,
  draft: FiFileText,
  sent: FiSend,
  junk: FiTrash2,
  trash: FiTrash,
  archive: FiArchive,
  folder: FiFolder,
};

const CATEGORY_ICONS = {
  person: FiUser,
  cart: FiShoppingCart,
  news: FiBell,
  megaphone: FiTag,
};

const MOVE_TARGETS = [
  { id: "inbox", label: "Inbox" },
  { id: "archive", label: "Archive" },
  { id: "trash", label: "Trash" },
  { id: "junk", label: "Junk" },
];

const COMPOSE_LABELS = {
  new: "New Message",
  reply: "Reply",
  "reply-all": "Reply All",
  forward: "Forward",
};

function getInitials(sender) {
  return sender
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getSenderAddress(sender) {
  return `${sender.toLowerCase().replace(/[^a-z0-9]+/g, "")}@example.com`;
}

export function MailContent({ onClose, onMinimize, onMaximize }) {
  const { onTitleMouseDown } = useContext(WindowContext);
  const { windows, activeWin } = useWindowManager();
  const mailRef = useRef(null);
  const wasNarrow = useRef(false);
  const [messages, setMessages] = useState(createInitialMessages);
  const [mailboxId, setMailboxId] = useState("inbox");
  const [categoryId, setCategoryId] = useState("primary");
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [promoVisible, setPromoVisible] = useState(true);
  const [view, setView] = useState("message");
  const [draft, setDraft] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const mailWindow = windows.find((window) => window.id === "mail");
  const isMailActive = activeWin === "mail";
  const isMaximized = mailWindow?.x === 0 && mailWindow?.y === 28;
  const maximizeLabel = isMaximized ? "Restore Mail window" : "Maximize Mail window";

  const activeMailbox = MAILBOX_GROUPS
    .flatMap((group) => group.items)
    .find((item) => item.id === mailboxId);
  const activeCategory = CATEGORIES.find((category) => category.id === categoryId);
  const visibleMessages = getVisibleMessages(messages, {
    mailboxId,
    categoryId,
    query,
    unreadOnly,
  });
  const selectedMessage = getMessageById(visibleMessages, selectedId);
  const selectedIsVisible = Boolean(selectedMessage);
  const unreadCount = visibleMessages.filter((message) => message.unread).length;

  const clearSelection = () => {
    setSelectedId(null);
    setMoreOpen(false);
    setMoveOpen(false);
  };

  useEffect(() => {
    if (selectedId && !selectedIsVisible) clearSelection();
  }, [selectedId, selectedIsVisible]);

  useEffect(() => {
    const element = mailRef.current;
    if (!element) return undefined;

    const mediaQuery = window.matchMedia("(max-width: 980px)");
    const updateNarrow = (width = element.getBoundingClientRect().width) => {
      const nextNarrow = width <= 980 || mediaQuery.matches;
      setIsNarrow(nextNarrow);
      if (nextNarrow && !wasNarrow.current) setSidebarCollapsed(true);
      wasNarrow.current = nextNarrow;
    };

    updateNarrow();
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(([entry]) => updateNarrow(entry.contentRect.width));
    const onMediaChange = () => updateNarrow();
    observer?.observe(element);
    mediaQuery.addEventListener?.("change", onMediaChange);

    return () => {
      observer?.disconnect();
      mediaQuery.removeEventListener?.("change", onMediaChange);
    };
  }, []);

  useEffect(() => {
    if (!moreOpen && !moveOpen && (!isMailActive || !isMaximized)) return undefined;

    const closeMenusOnOutsideClick = (event) => {
      if (!event.target.closest?.(".mail__menu-wrap")) {
        setMoreOpen(false);
        setMoveOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (moreOpen || moveOpen) {
        setMoreOpen(false);
        setMoveOpen(false);
        return;
      }
      if (!isMailActive || !isMaximized) return;
      onMaximize();
    };

    document.addEventListener("mousedown", closeMenusOnOutsideClick);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", closeMenusOnOutsideClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMailActive, isMaximized, moreOpen, moveOpen, onMaximize]);

  const selectMailbox = (nextMailboxId) => {
    setMailboxId(nextMailboxId);
    clearSelection();
  };

  const selectCategory = (nextCategoryId) => {
    setCategoryId(nextCategoryId);
    clearSelection();
  };

  const toggleUnreadOnly = () => {
    setUnreadOnly((current) => !current);
    clearSelection();
  };

  const selectMessage = (id) => {
    setView("message");
    setSelectedId(id);
    setMessages((current) => setMessageUnread(current, id, false));
  };

  const updateSelected = (transition) => {
    if (!selectedId) return;
    setMessages((current) => transition(current, selectedId));
  };

  const toggleSelectedFlag = () => {
    updateSelected(toggleMessageFlag);
  };

  const moveSelected = (mailbox) => {
    if (!selectedId) return;
    setMessages((current) => moveMessage(current, selectedId, mailbox));
    clearSelection();
  };

  const setSelectedRead = (unread) => {
    updateSelected((current, id) => setMessageUnread(current, id, unread));
    setMoreOpen(false);
  };

  const openCompose = (mode = "new") => {
    const message = selectedMessage;
    const prefix = mode === "reply" || mode === "reply-all" ? "Re: " : "Fwd: ";
    const senderAddress = message?.senderEmail
      || (message?.sender ? getSenderAddress(message.sender) : "sender@example.com");

    setDraft({
      mode,
      to: mode === "new" ? "" : senderAddress,
      subject: mode === "new" ? "" : `${prefix}${message?.subject || ""}`,
      body: mode === "forward" ? `\n\n--- Forwarded message ---\n${message?.body || ""}` : "",
    });
    setView("compose");
    setMoreOpen(false);
    setMoveOpen(false);
  };

  const closeCompose = () => {
    setDraft(null);
    setView("message");
  };

  const handleMessageKeyDown = (event) => {
    if (!visibleMessages.length) return;

    if (event.key === "Enter") {
      const focusedRow = event.target.closest('[role="option"]');
      const focusedId = focusedRow?.dataset.messageId ?? selectedId;
      const focusedMessage = visibleMessages.find((message) => message.id === focusedId);
      if (focusedMessage) {
        event.preventDefault();
        selectMessage(focusedMessage.id);
      }
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    const focusedRow = event.target.closest('[role="option"]');
    const activeId = focusedRow?.dataset.messageId ?? selectedId;
    const activeIndex = visibleMessages.findIndex((message) => message.id === activeId);
    const currentIndex = activeIndex === -1
      ? event.key === "ArrowDown" ? -1 : 0
      : activeIndex;
    const nextIndex = event.key === "ArrowDown"
      ? Math.min(visibleMessages.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1);
    const nextMessage = visibleMessages[nextIndex];

    selectMessage(nextMessage.id);
    event.currentTarget
      .querySelector(`[data-message-id="${nextMessage.id}"]`)
      ?.focus();
  };

  return (
    <div
      ref={mailRef}
      className={[
        "mail",
        isNarrow ? "mail--narrow" : "",
        sidebarCollapsed ? "mail--sidebar-collapsed" : "",
        isMaximized ? "mail--maximized" : "",
      ].filter(Boolean).join(" ")}
    >
      <div
        className="mail__window-controls"
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
            title="Close Mail window"
          />
          <button
            type="button"
            className="mail__traffic-light mail__traffic-light--minimize"
            onClick={onMinimize}
            aria-label="Minimize Mail window"
            title="Minimize Mail window"
          />
          <button
            type="button"
            className="mail__traffic-light mail__traffic-light--maximize"
            onClick={() => {
              onMaximize();
            }}
            aria-label={maximizeLabel}
            title={maximizeLabel}
          />
        </div>
      </div>

      <aside className="mail__sidebar" aria-label="Mailboxes">
        <header
          className="mail__titlebar"
          onMouseDown={(event) => {
            if (!event.target.closest("button")) onTitleMouseDown(event);
          }}
        >
          <button
            type="button"
            className="mail__sidebar-toggle mail__icon-button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            aria-expanded={!sidebarCollapsed}
            aria-controls="mail-sidebar-content"
            title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          >
            <FiSidebar aria-hidden="true" />
          </button>
        </header>

        <div id="mail-sidebar-content" className="mail__sidebar-scroll">
          {MAILBOX_GROUPS.map((group) => (
            <section className="mail__group" key={group.label}>
              <h2 className="mail__group-label">{group.label}</h2>
              {group.items.map((item) => {
                const Icon = MAILBOX_ICONS[item.icon] || FiFolder;
                const isSelected = item.id === mailboxId;
                const count = getMailboxCount(messages, item.id);

                return (
                  <button
                    type="button"
                    className={`mail__nav-item${isSelected ? " is-selected" : ""}`}
                    key={item.id}
                    onClick={() => selectMailbox(item.id)}
                    aria-current={isSelected ? "page" : undefined}
                    title={item.label}
                  >
                    <span className="mail__nav-caret" aria-hidden="true">
                      {item.disclosure && <FiChevronRight />}
                    </span>
                    <span className="mail__nav-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="mail__nav-label">{item.label}</span>
                    {count > 0 && <span className="mail__nav-count">{count}</span>}
                  </button>
                );
              })}
            </section>
          ))}
        </div>

        <footer className="mail__download">
          <div className="mail__download-bar" aria-hidden="true">
            <span />
          </div>
          <div className="mail__download-title">Downloading Messages</div>
          <div className="mail__download-sub">9,529 of 47,534</div>
        </footer>
      </aside>

      <section className="mail__list-col" aria-label="Mail message list">
        <header className="mail__list-header">
          <div className="mail__list-heading">
            <div className="mail__list-title">{activeMailbox?.label}</div>
            <div className="mail__list-sub">
              {activeCategory?.label} · {visibleMessages.length} messages, {unreadCount} unread
            </div>
          </div>
          <div className="mail__list-actions">
            <button
              type="button"
              className="mail__sidebar-restore mail__icon-button"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Show sidebar"
              aria-expanded={!sidebarCollapsed}
              aria-controls="mail-sidebar-content"
              title="Show sidebar"
            >
              <FiSidebar aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`mail__icon-button${unreadOnly ? " is-on" : ""}`}
              onClick={toggleUnreadOnly}
              aria-label="Show unread messages only"
              aria-pressed={unreadOnly}
              title="Show unread messages only"
            >
              <FiFilter aria-hidden="true" />
            </button>
            <div className="mail__menu-wrap">
              <button
                type="button"
                className="mail__icon-button"
                onClick={() => {
                  setMoreOpen((current) => !current);
                  setMoveOpen(false);
                }}
                aria-label="More list options"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                title="More list options"
              >
                <FiMoreHorizontal aria-hidden="true" />
              </button>
              {moreOpen && (
                <div className="mail__menu" role="menu" aria-label="More message actions">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!selectedMessage}
                    onClick={() => setSelectedRead(!selectedMessage?.unread)}
                  >
                    {selectedMessage?.unread ? "Mark as Read" : "Mark as Unread"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPromoVisible((current) => !current);
                      setMoreOpen(false);
                    }}
                  >
                    {promoVisible ? "Hide Categories" : "Show Categories"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="mail__pills" role="group" aria-label="Mail categories">
          {CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon] || FiTag;
            const isSelected = category.id === categoryId;

            return (
              <button
                type="button"
                className="mail__pill"
                key={category.id}
                onClick={() => selectCategory(category.id)}
                aria-label={category.label}
                aria-pressed={isSelected}
                title={category.label}
              >
                <Icon aria-hidden="true" />
                <span className="mail__pill-label">{category.label}</span>
              </button>
            );
          })}
        </div>

        {promoVisible && (
          <aside className="mail__promo">
            <h2>Mail Categories</h2>
            <p>Find the messages that matter most in Primary and organize everything else.</p>
            <p className="mail__promo-muted">Turn this off anytime from the options menu.</p>
            <div className="mail__promo-actions">
              <button
                type="button"
                className="mail__button mail__button--primary"
                onClick={() => setPromoVisible(false)}
              >
                Try Categories
              </button>
              <button
                type="button"
                className="mail__button"
                onClick={() => setPromoVisible(false)}
              >
                Turn Off
              </button>
            </div>
          </aside>
        )}

        <div
          className="mail__messages"
          role="listbox"
          tabIndex={0}
          aria-label="Mail messages"
          onKeyDown={handleMessageKeyDown}
        >
          {visibleMessages.length ? visibleMessages.map((message) => {
            const isSelected = message.id === selectedId;

            return (
              <button
                type="button"
                className={`mail__message${message.unread ? " is-unread" : " is-read"}${isSelected ? " is-selected" : ""}`}
                key={message.id}
                role="option"
                aria-selected={isSelected}
                aria-label={`${message.sender}: ${message.subject}`}
                data-message-id={message.id}
                onClick={() => selectMessage(message.id)}
              >
                <span className="mail__message-dot" aria-hidden="true" />
                <span className="mail__message-content">
                  <span className="mail__message-top">
                    <span className="mail__message-sender">{message.sender}</span>
                    {message.flagged && (
                      <FiFlag className="mail__message-flag" aria-hidden="true" />
                    )}
                    <span className="mail__message-time">{message.time}</span>
                  </span>
                  <span className="mail__message-subject">{message.subject}</span>
                  <span className="mail__message-preview">{message.preview}</span>
                </span>
              </button>
            );
          }) : (
            <div className="mail__empty-list" role="status">
              {query.trim() ? "No messages match your search" : "No messages in this mailbox"}
            </div>
          )}
        </div>
      </section>

      <section className="mail__detail" aria-label="Mail message detail">
        <header className="mail__detail-toolbar">
          <div className="mail__tool-group">
            <button
              type="button"
              className="mail__compose-button mail__icon-button"
              onClick={() => openCompose()}
              aria-label="Compose new message"
              title="Compose new message"
            >
              <FiEdit3 aria-hidden="true" />
            </button>
          </div>

          <div className="mail__tool-groups">
            <div className="mail__tool-group">
              <button
                type="button"
                className="mail__icon-button"
                disabled={!selectedMessage}
                onClick={() => openCompose("reply")}
                aria-label="Reply"
                title="Reply"
              >
                <FiCornerUpLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                className="mail__icon-button"
                disabled={!selectedMessage}
                onClick={() => openCompose("reply-all")}
                aria-label="Reply all"
                title="Reply all"
              >
                <FiUsers aria-hidden="true" />
              </button>
              <button
                type="button"
                className="mail__icon-button"
                disabled={!selectedMessage}
                onClick={() => openCompose("forward")}
                aria-label="Forward"
                title="Forward"
              >
                <FiCornerUpRight aria-hidden="true" />
              </button>
            </div>
            <div className="mail__tool-group">
              <button
                type="button"
                className="mail__icon-button"
                disabled={!selectedMessage}
                onClick={() => moveSelected("archive")}
                aria-label="Archive"
                title="Archive"
              >
                <FiArchive aria-hidden="true" />
              </button>
              <button
                type="button"
                className="mail__icon-button"
                disabled={!selectedMessage}
                onClick={() => moveSelected("trash")}
                aria-label="Delete"
                title="Delete"
              >
                <FiTrash aria-hidden="true" />
              </button>
              <button
                type="button"
                className="mail__icon-button"
                disabled={!selectedMessage}
                onClick={() => moveSelected("junk")}
                aria-label="Move to junk"
                title="Move to junk"
              >
                <FiTrash2 aria-hidden="true" />
              </button>
            </div>
            <div className="mail__tool-group">
              <div className="mail__menu-wrap">
                <button
                  type="button"
                  className="mail__icon-button"
                  disabled={!selectedMessage}
                  onClick={() => {
                    setMoveOpen((current) => !current);
                    setMoreOpen(false);
                  }}
                  aria-label="Move message"
                  aria-expanded={moveOpen}
                  aria-haspopup="menu"
                  title="Move message"
                >
                  <FiMove aria-hidden="true" />
                  <FiChevronDown className="mail__tool-caret" aria-hidden="true" />
                </button>
                {moveOpen && (
                  <div className="mail__menu" role="menu" aria-label="Move message">
                    {MOVE_TARGETS.map((target) => (
                      <button
                        type="button"
                        role="menuitem"
                        key={target.id}
                        onClick={() => moveSelected(target.id)}
                      >
                        {target.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mail__tool-group">
              <button
                type="button"
                className="mail__icon-button"
                disabled={!selectedMessage}
                onClick={toggleSelectedFlag}
                aria-label={selectedMessage?.flagged ? "Unflag message" : "Flag message"}
                aria-pressed={selectedMessage?.flagged || false}
                title={selectedMessage?.flagged ? "Unflag message" : "Flag message"}
              >
                <FiFlag aria-hidden="true" />
                <FiChevronDown className="mail__tool-caret" aria-hidden="true" />
              </button>
            </div>
          </div>

          <label className="mail__search">
            <span className="mail__visually-hidden">Search Mail</span>
            <FiSearch aria-hidden="true" />
            <input
              type="search"
              name="search"
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                clearSelection();
              }}
              placeholder="Search…"
              aria-label="Search Mail"
            />
          </label>
        </header>

        <div className="mail__detail-body">
          {view === "compose" && draft ? (
            <form
              className="mail__compose"
              onSubmit={(event) => {
                event.preventDefault();
                closeCompose();
              }}
            >
              <div className="mail__compose-heading">
                <h2>{COMPOSE_LABELS[draft.mode]}</h2>
                <p>Local draft</p>
              </div>
              <label htmlFor="mail-compose-to">
                To
                <input
                  id="mail-compose-to"
                  name="to"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={draft.to}
                  onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
                />
              </label>
              <label htmlFor="mail-compose-subject">
                Subject
                <input
                  id="mail-compose-subject"
                  name="subject"
                  type="text"
                  autoComplete="off"
                  value={draft.subject}
                  onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
                />
              </label>
              <label className="mail__compose-message" htmlFor="mail-compose-message">
                Message
                <textarea
                  id="mail-compose-message"
                  name="body"
                  autoComplete="off"
                  value={draft.body}
                  onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
                />
              </label>
              <div className="mail__compose-actions">
                <button type="submit" className="mail__button mail__button--primary">Send</button>
                <button type="button" className="mail__button" onClick={closeCompose}>Discard</button>
              </div>
            </form>
          ) : selectedMessage ? (
            <article className="mail__reader">
              <header className="mail__reader-head">
                <div className="mail__avatar" aria-hidden="true">{getInitials(selectedMessage.sender)}</div>
                <div className="mail__reader-meta">
                  <div className="mail__reader-subject">{selectedMessage.subject}</div>
                  <div className="mail__reader-from">
                    {selectedMessage.sender} &lt;{getSenderAddress(selectedMessage.sender)}&gt;
                  </div>
                  <div className="mail__reader-to">To: User &lt;{selectedMessage.to}&gt;</div>
                </div>
                <time className="mail__reader-date">{selectedMessage.time}</time>
              </header>
              <div className="mail__reader-body">
                {selectedMessage.body.split(/\n\n+/).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ) : (
            <div className="mail__no-selection" role="status">No Message Selected</div>
          )}
        </div>
      </section>
    </div>
  );
}
