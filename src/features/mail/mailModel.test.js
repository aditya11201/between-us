import test from "node:test";
import assert from "node:assert/strict";
import { createInitialMessages } from "./mailData.js";
import {
  formatMessageDetailTime,
  formatMessageListTime,
  loadSentMessages,
  saveSentMessages,
  getMailboxCount,
  getMessageById,
  getVisibleMessages,
  moveMessage,
  setMessageUnread,
  toggleMessageFlag,
} from "./mailModel.js";

test("filters an inbox category by a case-insensitive query", () => {
  const result = getVisibleMessages(createInitialMessages(), {
    mailboxId: "inbox",
    categoryId: "primary",
    query: "PWETTY",
    unreadOnly: false,
  });

  assert.deepEqual(result.map((message) => message.id), ["apology-to-my-favorite-stranger"]);
});

test("keeps Important messages out of other mailboxes", () => {
  const messages = [
    ...createInitialMessages(),
    {
      id: "test-important-message",
      mailbox: "important",
      category: "primary",
      sender: "Test Sender",
      time: "Today",
      subject: "A Test Subject for Important",
      preview: "A test preview.",
      body: "A synthetic body.",
      to: "someone@example.com",
      unread: true,
      flagged: false,
    },
  ];

  const importantMessages = getVisibleMessages(messages, {
    mailboxId: "important",
    categoryId: "primary",
    query: "",
    unreadOnly: false,
  });

  assert.deepEqual(importantMessages.map((message) => message.id), ["test-important-message"]);

  assert.equal(
    getVisibleMessages(messages, {
      mailboxId: "inbox",
      categoryId: "primary",
      query: "",
      unreadOnly: false,
    }).some((message) => message.id === "test-important-message"),
    false,
  );
});
test("unread-only filtering excludes read messages", () => {
  const result = getVisibleMessages(createInitialMessages(), {
    mailboxId: "inbox",
    categoryId: null,
    query: "",
    unreadOnly: true,
  });

  assert.deepEqual(result.map((message) => message.id), ["favorite-stranger-first-times", "apology-to-my-favorite-stranger", "social", "payment", "account-update"]);
});

test("read-to-unread transition adds the message to unread-only results", () => {
  const initial = createInitialMessages();
  const unread = setMessageUnread(initial, "security", true);

  assert.deepEqual(
    getVisibleMessages(initial, {
      mailboxId: "inbox",
      categoryId: "primary",
      query: "",
      unreadOnly: true,
    }).map((message) => message.id),
    ["favorite-stranger-first-times", "apology-to-my-favorite-stranger"],
  );
  assert.deepEqual(
    getVisibleMessages(unread, {
      mailboxId: "inbox",
      categoryId: "primary",
      query: "",
      unreadOnly: true,
    }).map((message) => message.id),
    ["favorite-stranger-first-times", "apology-to-my-favorite-stranger", "security"],
  );
});

test("read and flag transitions do not mutate the original array", () => {
  const initial = createInitialMessages();
  const unread = setMessageUnread(initial, "apology-to-my-favorite-stranger", false);
  const flagged = toggleMessageFlag(unread, "apology-to-my-favorite-stranger");

  assert.equal(initial.find((message) => message.id === "apology-to-my-favorite-stranger").unread, true);
  assert.equal(unread.find((message) => message.id === "apology-to-my-favorite-stranger").unread, false);
  assert.equal(flagged.find((message) => message.id === "apology-to-my-favorite-stranger").flagged, true);
});

test("moving a message changes only its mailbox", () => {
  const initial = createInitialMessages();
  const moved = moveMessage(initial, "apology-to-my-favorite-stranger", "archive");
  const message = moved.find((item) => item.id === "apology-to-my-favorite-stranger");

  assert.equal(message.mailbox, "archive");
  assert.equal(initial.find((item) => item.id === "apology-to-my-favorite-stranger").mailbox, "inbox");
});

test("trash and junk moves appear in their exact target selectors", () => {
  const initial = createInitialMessages();
  const movedToTrash = moveMessage(initial, "apology-to-my-favorite-stranger", "trash");
  const movedToJunk = moveMessage(initial, "security", "junk");

  assert.deepEqual(
    getVisibleMessages(movedToTrash, {
      mailboxId: "trash",
      categoryId: "primary",
      query: "",
      unreadOnly: false,
    }).map((message) => message.id),
    ["apology-to-my-favorite-stranger"],
  );
  assert.deepEqual(
    getVisibleMessages(movedToJunk, {
      mailboxId: "junk",
      categoryId: "primary",
      query: "",
      unreadOnly: false,
    }).map((message) => message.id),
    ["security"],
  );
});

test("mailbox counts reflect post-transition moves", () => {
  const initial = createInitialMessages();
  const moved = moveMessage(moveMessage(initial, "apology-to-my-favorite-stranger", "trash"), "security", "junk");

  assert.equal(getMailboxCount(moved, "inbox"), 5);
  assert.equal(getMailboxCount(moved, "trash"), 2);
  assert.equal(getMailboxCount(moved, "junk"), 2);
});

test("unknown mailbox and no-result selectors return no messages", () => {
  const messages = createInitialMessages();

  assert.deepEqual(
    getVisibleMessages(messages, {
      mailboxId: "unknown-mailbox",
      categoryId: "primary",
      query: "",
      unreadOnly: false,
    }),
    [],
  );
  assert.deepEqual(
    getVisibleMessages(messages, {
      mailboxId: "inbox",
      categoryId: null,
      query: "not a real message",
      unreadOnly: false,
    }),
    [],
  );
});

test("flagged count and unknown ids are deterministic", () => {
  const initial = createInitialMessages();

  assert.equal(getMailboxCount(initial, "flagged"), 1);
  assert.strictEqual(setMessageUnread(initial, "missing", false), initial);
});

test("message lookup returns the message or null", () => {
  const messages = createInitialMessages();

  const message = getMessageById(messages, "apology-to-my-favorite-stranger");
  assert.equal(message.id, "apology-to-my-favorite-stranger");
  assert.equal(getMessageById(messages, "missing"), null);
});

test("keeps the original local sent time while list dates follow the current day", () => {
  const sentAt = new Date(2026, 10, 1, 14).toISOString();
  const message = { sentAt, time: "static" };

  assert.equal(
    formatMessageListTime(message, new Date(2026, 10, 1, 20)),
    "2:00 PM",
  );
  assert.equal(
    formatMessageListTime(message, new Date(2026, 10, 5, 20)),
    "Nov 1",
  );
  assert.equal(
    formatMessageListTime(message, new Date(2027, 0, 5, 20)),
    "Nov 1, 2026",
  );
  assert.equal(formatMessageDetailTime(message), "Nov 1, 2026, 2:00 PM");
  assert.equal(formatMessageListTime({ time: "Oct 30" }), "Oct 30");
});

test("persists valid sent messages and ignores broken local storage", () => {
  const records = new Map();
  const storage = {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
  };
  const message = {
    id: "local-message",
    localSent: true,
    mailbox: "sent",
    category: "primary",
    sender: "user11201@gmail.com",
    senderEmail: "user11201@gmail.com",
    sentAt: new Date().toISOString(),
    subject: "Saved locally",
    preview: "Local preview",
    body: "Local body",
    to: "friend@example.com",
    unread: false,
    flagged: false,
  };
  const seededMessage = {
    ...message,
    id: "apology-to-my-favorite-stranger",
    localSent: false,
  };

  assert.equal(saveSentMessages([message, seededMessage, { id: "invalid" }], storage), true);
  assert.deepEqual(loadSentMessages(storage), [message]);
  assert.deepEqual(loadSentMessages({ getItem: () => "not-json" }), []);
  const legacyMessage = {
    ...message,
    id: "550e8400-e29b-41d4-a716-446655440000",
  };
  delete legacyMessage.localSent;
  assert.deepEqual(
    loadSentMessages({ getItem: () => JSON.stringify([legacyMessage]) }),
    [{ ...legacyMessage, localSent: true }],
  );
  assert.equal(saveSentMessages([message], { setItem() { throw new Error("blocked"); } }), false);
});
