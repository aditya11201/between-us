import test from "node:test";
import assert from "node:assert/strict";
import { createInitialMessages } from "./mailData.js";
import {
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
    query: "LEARNING",
    unreadOnly: false,
  });

  assert.deepEqual(result.map((message) => message.id), ["learning"]);
});

test("unread-only filtering excludes read messages", () => {
  const result = getVisibleMessages(createInitialMessages(), {
    mailboxId: "inbox",
    categoryId: null,
    query: "",
    unreadOnly: true,
  });

  assert.deepEqual(result.map((message) => message.id), ["learning", "social", "payment"]);
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
    ["learning"],
  );
  assert.deepEqual(
    getVisibleMessages(unread, {
      mailboxId: "inbox",
      categoryId: "primary",
      query: "",
      unreadOnly: true,
    }).map((message) => message.id),
    ["learning", "security"],
  );
});

test("read and flag transitions do not mutate the original array", () => {
  const initial = createInitialMessages();
  const unread = setMessageUnread(initial, "learning", false);
  const flagged = toggleMessageFlag(unread, "learning");

  assert.equal(initial.find((message) => message.id === "learning").unread, true);
  assert.equal(unread.find((message) => message.id === "learning").unread, false);
  assert.equal(flagged.find((message) => message.id === "learning").flagged, true);
});

test("moving a message changes only its mailbox", () => {
  const initial = createInitialMessages();
  const moved = moveMessage(initial, "learning", "archive");
  const message = moved.find((item) => item.id === "learning");

  assert.equal(message.mailbox, "archive");
  assert.equal(initial.find((item) => item.id === "learning").mailbox, "inbox");
});

test("trash and junk moves appear in their exact target selectors", () => {
  const initial = createInitialMessages();
  const movedToTrash = moveMessage(initial, "learning", "trash");
  const movedToJunk = moveMessage(initial, "security", "junk");

  assert.deepEqual(
    getVisibleMessages(movedToTrash, {
      mailboxId: "trash",
      categoryId: "primary",
      query: "",
      unreadOnly: false,
    }).map((message) => message.id),
    ["learning"],
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
  const moved = moveMessage(moveMessage(initial, "learning", "trash"), "security", "junk");

  assert.equal(getMailboxCount(moved, "inbox"), 3);
  assert.equal(getMailboxCount(moved, "trash"), 2);
  assert.equal(getMailboxCount(moved, "junk"), 2);
});

test("empty and no-result selectors return no messages", () => {
  const messages = createInitialMessages();

  assert.deepEqual(
    getVisibleMessages(messages, {
      mailboxId: "account-inbox",
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

  assert.equal(getMessageById(messages, "learning").subject, "Continue your lesson today");
  assert.equal(getMessageById(messages, "missing"), null);
});
