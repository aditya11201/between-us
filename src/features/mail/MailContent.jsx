import { useContext, useState } from "react";
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
import { WindowContext } from "@/windows";
import { CATEGORIES, MAILBOX_GROUPS, createInitialMessages } from "./mailData";
import {
  getMailboxCount,
  getMessageById,
  getVisibleMessages,
  setMessageUnread,
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
  const [messages, setMessages] = useState(createInitialMessages);
  const [mailboxId, setMailboxId] = useState("inbox");
  const [categoryId, setCategoryId] = useState("primary");
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [promoVisible, setPromoVisible] = useState(true);

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
  const selectedMessage = getMessageById(messages, selectedId);
  const unreadCount = visibleMessages.filter((message) => message.unread).length;

  const selectMailbox = (nextMailboxId) => {
    setMailboxId(nextMailboxId);
    setSelectedId(null);
  };

  const selectCategory = (nextCategoryId) => {
    setCategoryId(nextCategoryId);
    setSelectedId(null);
  };

  const toggleUnreadOnly = () => {
    setUnreadOnly((current) => !current);
    setSelectedId(null);
  };

  const selectMessage = (id) => {
    setSelectedId(id);
    setMessages((current) => setMessageUnread(current, id, false));
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
    const selectedIndex = visibleMessages.findIndex((message) => message.id === selectedId);
    const currentIndex = selectedIndex === -1
      ? event.key === "ArrowDown" ? -1 : 0
      : selectedIndex;
    const nextIndex = event.key === "ArrowDown"
      ? Math.min(visibleMessages.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1);

    selectMessage(visibleMessages[nextIndex].id);
  };

  return (
    <div className={`mail${sidebarCollapsed ? " mail--sidebar-collapsed" : ""}`}>
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
              aria-label="Maximize Mail window"
              title="Maximize Mail window"
            />
          </div>
          <button
            type="button"
            className="mail__sidebar-toggle mail__icon-button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          >
            <FiSidebar aria-hidden="true" />
          </button>
        </header>

        <div className="mail__sidebar-scroll">
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
            {sidebarCollapsed && (
              <button
                type="button"
                className="mail__icon-button"
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Show sidebar"
                title="Show sidebar"
              >
                <FiSidebar aria-hidden="true" />
              </button>
            )}
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
            <button
              type="button"
              className="mail__icon-button"
              aria-label="More list options"
              title="More list options"
            >
              <FiMoreHorizontal aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="mail__pills" aria-label="Mail categories">
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
              aria-label="Compose new message"
              title="Compose new message"
            >
              <FiEdit3 aria-hidden="true" />
            </button>
          </div>

          <div className="mail__tool-groups">
            <div className="mail__tool-group">
              <button type="button" className="mail__icon-button" disabled={!selectedMessage} aria-label="Reply" title="Reply">
                <FiCornerUpLeft aria-hidden="true" />
              </button>
              <button type="button" className="mail__icon-button" disabled={!selectedMessage} aria-label="Reply all" title="Reply all">
                <FiUsers aria-hidden="true" />
              </button>
              <button type="button" className="mail__icon-button" disabled={!selectedMessage} aria-label="Forward" title="Forward">
                <FiCornerUpRight aria-hidden="true" />
              </button>
            </div>
            <div className="mail__tool-group">
              <button type="button" className="mail__icon-button" disabled={!selectedMessage} aria-label="Archive" title="Archive">
                <FiArchive aria-hidden="true" />
              </button>
              <button type="button" className="mail__icon-button" disabled={!selectedMessage} aria-label="Delete" title="Delete">
                <FiTrash aria-hidden="true" />
              </button>
              <button type="button" className="mail__icon-button" disabled={!selectedMessage} aria-label="Move to junk" title="Move to junk">
                <FiTrash2 aria-hidden="true" />
              </button>
            </div>
            <div className="mail__tool-group">
              <button type="button" className="mail__icon-button" disabled={!selectedMessage} aria-label="Move message" title="Move message">
                <FiMove aria-hidden="true" />
                <FiChevronDown className="mail__tool-caret" aria-hidden="true" />
              </button>
            </div>
            <div className="mail__tool-group">
              <button type="button" className="mail__icon-button" disabled={!selectedMessage} aria-label="Flag message" title="Flag message">
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
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedId(null);
              }}
              placeholder="Search"
              aria-label="Search Mail"
            />
          </label>
        </header>

        <div className="mail__detail-body">
          {selectedMessage ? (
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
                <time className="mail__reader-date">Today {selectedMessage.time}</time>
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
