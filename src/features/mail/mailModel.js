function updateMessage(messages, id, update) {
  const current = messages.find((message) => message.id === id);
  if (!current) return messages;

  return messages.map((message) => (
    message.id === id ? update(message) : message
  ));
}

export function getVisibleMessages(messages, { mailboxId, categoryId, query, unreadOnly }) {
  const normalizedQuery = query.trim().toLowerCase();

  return messages.filter((message) => {
    const mailboxMatch = mailboxId === "flagged"
      ? message.flagged === true
      : message.mailbox === mailboxId;
    const categoryMatch = !categoryId || message.category === categoryId;
    const unreadMatch = !unreadOnly || message.unread;
    const textMatch = !normalizedQuery || [
      message.sender,
      message.subject,
      message.preview,
    ].join(" ").toLowerCase().includes(normalizedQuery);

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
