import test from "node:test";
import assert from "node:assert/strict";
import {
  OPENING_MESSAGES,
  QUICK_REPLIES,
  buildOpeningTimeline,
  createChatState,
  chooseReply,
  receiveAnswers,
} from "../src/ui/IntroScreen/introChatModel.js";

function lastMessage(state) {
  return state.messages[state.messages.length - 1];
}

test("starts with the thirteen opening messages and three quick replies", () => {
  const state = createChatState();

  assert.equal(state.messages, OPENING_MESSAGES);
  assert.equal(state.messages.length, 13);
  assert.deepEqual(state.replies, ["why", "forget", "open"]);
  assert.equal(state.activeReply, null);
  assert.equal(state.entry, false);
  assert.equal(QUICK_REPLIES.length, 3);
});

test("choosing a reply adds the outgoing bubble and removes its pill", () => {
  const next = chooseReply(createChatState(), "why");

  assert.equal(next.messages.length, 14);
  assert.equal(lastMessage(next).role, "outgoing");
  assert.equal(lastMessage(next).text, "Why a MacBook?");
  assert.deepEqual(next.replies, ["forget", "open"]);
  assert.equal(next.activeReply, "why");
});

test("ignores a second choice until the answers arrive", () => {
  const waiting = chooseReply(createChatState(), "why");
  const ignored = chooseReply(waiting, "forget");

  assert.equal(ignored, waiting);
});

test("receiving answers appends both replies and clears the active reply", () => {
  const next = receiveAnswers(chooseReply(createChatState(), "why"));

  assert.equal(next.messages.length, 16);
  assert.deepEqual(
    next.messages.slice(-2).map((message) => message.role),
    ["incoming", "incoming"],
  );
  assert.equal(next.activeReply, null);
  assert.equal(next.entry, false);
});

test("the open reply unlocks the entry card", () => {
  const next = receiveAnswers(chooseReply(createChatState(), "open"));

  assert.equal(next.entry, true);
  assert.equal(next.messages.length, 16);
});

test("carries the approved answer copy for every quick reply", () => {
  assert.deepEqual(
    QUICK_REPLIES.map(({ id, answers }) => [id, answers]),
    [
      [
        "why",
        [
          "Because that MacBook played an important part in bringing us closer. I wanted this place to feel like something that was already part of our story.",
          "It started from macweb.dev by gaminghackintosh. Then I turned that macOS-inspired experience into something that could only belong to us.",
        ],
      ],
      [
        "forget",
        [
          "You won’t. But if you ever do, this place will remember for you.",
          "Nothing in here expires. Not the songs, not the photos, not the way I feel. ♡",
        ],
      ],
      [
        "open",
        ["Of course. I was hoping you’d ask. ♡", "Start anywhere. There’s no wrong turn."],
      ],
    ],
  );
});

test("ignores unknown and already used replies", () => {
  const state = createChatState();
  const waiting = chooseReply(state, "why");
  assert.equal(chooseReply(state, "missing"), state);
  assert.equal(chooseReply(waiting, "why"), waiting);
  assert.equal(receiveAnswers(state), state);
});

test("builds a reveal timeline with typing beats before each answer group", () => {
  const timeline = buildOpeningTimeline(OPENING_MESSAGES);

  assert.deepEqual(timeline[0], { at: 250, show: 1 });
  assert.deepEqual(timeline[1], { at: 650, typing: true });
  assert.deepEqual(timeline[2], { at: 1250, typing: false, show: 2 });
  assert.deepEqual(timeline.at(-1), { at: 7800, show: 13 });
  assert.equal(
    timeline.filter((step) => step.typing === true).length,
    5,
  );
});

test("builds no timeline for an empty conversation", () => {
  assert.deepEqual(buildOpeningTimeline([]), []);
});
