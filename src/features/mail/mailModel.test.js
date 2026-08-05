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
    categoryId: "primary",
    query: "",
    unreadOnly: true,
  });

  assert.ok(result.every((message) => message.unread));
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
