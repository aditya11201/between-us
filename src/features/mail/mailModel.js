import { matchesQuery } from "../../utils/search.js";

const SENT_MESSAGES_STORAGE_KEY = "between-us.mail.sent.v1";

function isStoredSentMessage(message) {
  return Boolean(message)
    && typeof message.id === "string"
    && typeof message.mailbox === "string"
    && typeof message.category === "string"
    && typeof message.sender === "string"
    && typeof message.senderEmail === "string"
    && typeof message.sentAt === "string"
    && Number.isFinite(Date.parse(message.sentAt))
    && typeof message.subject === "string"
    && typeof message.preview === "string"
    && typeof message.body === "string"
    && typeof message.to === "string"
    && typeof message.unread === "boolean"
    && typeof message.flagged === "boolean";
}

function isLegacyLocalSentMessage(message) {
  // v1 composer messages used UUID ids before the localSent marker existed.
  return typeof message?.id === "string"
    && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(message.id);
}

function isLocalSentMessage(message) {
  return message?.localSent === true || isLegacyLocalSentMessage(message);
}

export function loadSentMessages(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(SENT_MESSAGES_STORAGE_KEY);
    const messages = raw ? JSON.parse(raw) : [];
    return Array.isArray(messages)
      ? messages
        .filter((message) => isStoredSentMessage(message) && isLocalSentMessage(message))
        .map((message) => ({ ...message, localSent: true }))
      : [];
  } catch {
    return [];
  }
}

export function saveSentMessages(messages, storage = globalThis.localStorage) {
  try {
    if (!storage) return false;
    storage.setItem(
      SENT_MESSAGES_STORAGE_KEY,
      JSON.stringify(messages.filter(
        (message) => isStoredSentMessage(message) && isLocalSentMessage(message),
      )),
    );
    return true;
  } catch {
    return false;
  }
}

export function formatMessageListTime(message, now = new Date()) {
  if (!message.sentAt) return message.time ?? "";
  const sentAt = new Date(message.sentAt);
  if (!Number.isFinite(sentAt.getTime())) return message.time ?? "";

  if (
    sentAt.getFullYear() === now.getFullYear()
    && sentAt.getMonth() === now.getMonth()
    && sentAt.getDate() === now.getDate()
  ) {
    return sentAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return sentAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sentAt.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

export function formatMessageDetailTime(message) {
  if (!message.sentAt) return message.time ?? "";
  const sentAt = new Date(message.sentAt);
  if (!Number.isFinite(sentAt.getTime())) return message.time ?? "";

  return sentAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function updateMessage(messages, id, update) {
  const current = messages.find((message) => message.id === id);
  if (!current) return messages;

  return messages.map((message) => (
    message.id === id ? update(message) : message
  ));
}

export function getVisibleMessages(messages, { mailboxId, categoryId, query, unreadOnly }) {
  return messages.filter((message) => {
    const mailboxMatch = mailboxId === "flagged"
      ? message.flagged === true
      : message.mailbox === mailboxId;
    const categoryMatch = !categoryId || message.category === categoryId;
    const unreadMatch = !unreadOnly || message.unread;
    const textMatch = !String(query ?? "").trim() || matchesQuery(
      [message.sender, message.subject, message.preview].join(" "),
      query,
    );

    return mailboxMatch && categoryMatch && unreadMatch && textMatch;
  });
}

export function getMessageById(messages, id) {
  return messages.find((message) => message.id === id) ?? null;
}

export function getMailboxCount(messages, mailboxId) {
  return messages.filter((message) => mailboxId === "flagged"
    ? message.flagged === true
    : message.mailbox === mailboxId).length;
}

export function setMessageUnread(messages, id, unread) {
  return updateMessage(messages, id, (message) => ({ ...message, unread }));
}

export function toggleMessageFlag(messages, id) {
  return updateMessage(messages, id, (message) => ({
    ...message,
    flagged: !message.flagged,
  }));
}

export function moveMessage(messages, id, mailbox) {
  return updateMessage(messages, id, (message) => ({ ...message, mailbox }));
}
