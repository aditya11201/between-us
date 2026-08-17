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

test("shows the romantic proposal only in the Important mailbox", () => {
  const messages = createInitialMessages();
  const importantMessages = getVisibleMessages(messages, {
    mailboxId: "important",
    categoryId: "primary",
    query: "",
    unreadOnly: false,
  });
  const proposal = importantMessages[0];

  assert.deepEqual(importantMessages.map((message) => message.id), ["may-heart-proposal"]);
  assert.equal(proposal.sender, "From the depths of my heart");
  assert.equal(proposal.senderEmail, "myheart@gmail.com");
  assert.equal(proposal.toName, "Stasya Annesty");
  assert.equal(proposal.to, "stasyamyprincess@gmail.com");
  assert.equal(proposal.subject, "A moment i've long been waiting for");
  assert.equal(proposal.unread, true);
  assert.equal(
    proposal.body,
    "# A Question I’ve Been Waiting to Ask\n\nHey,\n\nI’ve been holding onto this question for quite a while.\n\nNot because I was unsure about how I feel, but because I wanted to wait for the right moment—the moment when I could finally ask you this with all the sincerity in my heart.\n\nSomewhere along the way, you became more than just someone I care about. You became someone I look forward to talking to, someone who makes ordinary days feel a little brighter, and someone whose presence has slowly become one of my favorite parts of life.\n\nAnd after all the moments we’ve shared, all the conversations, the laughter, the difficult days, and everything in between, I realized that I don’t want to only be someone who stays close to you.\n\nI want to be someone who gets to choose you openly.\n\nSomeone who gets to be there for your happiest days and your hardest ones. Someone you can laugh with, grow with, rest with, and hopefully call home in your own way.\n\nI can’t promise that I will always love you perfectly, but I can promise that I will keep learning how to love you better, gently, honestly, and wholeheartedly.\n\nSo after keeping this question in my heart for so long, I think this is finally the moment I’ve been waiting for.\n\n**May I be your boyfriend?**\n\nAnd more than that—\n\n**would you let me keep choosing you, this time not only as someone who loves you quietly, but as someone you choose too?**\n\nWith all my heart,\nMay Heart",
  );
  assert.equal(
    getVisibleMessages(messages, {
      mailboxId: "inbox",
      categoryId: "primary",
      query: "",
      unreadOnly: false,
    }).some((message) => message.id === "may-heart-proposal"),
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
