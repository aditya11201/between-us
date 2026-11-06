export const OPENING_MESSAGES = [
  { id: "opening-1", role: "outgoing", text: "So… what exactly is Between Us?" },
  {
    id: "opening-2",
    role: "incoming",
    text: "A personal MacBook, made with love. I wanted to tell the woman I love how I feel in the most meaningful way I know.",
  },
  { id: "opening-3", role: "outgoing", text: "But it’s just a macOS-style website, right?" },
  {
    id: "opening-4",
    role: "incoming",
    text: "It’s more than that. It’s my own little love language — a place where I pour my heart into showing how deeply I admire, cherish, and love her.",
  },
  { id: "opening-5", role: "outgoing", text: "What’s inside?" },
  {
    id: "opening-6",
    role: "incoming",
    text: "Little pieces of my heart. Words I never found the courage to say out loud, messages written just for her, and countless little reminders of how much she matters to me.",
  },
  { id: "opening-7", role: "outgoing", text: "And all the photos and songs?" },
  {
    id: "opening-8",
    role: "incoming",
    text: "Each one holds a memory only the two of us could truly understand. A single picture, a familiar melody, or a short video can bring us right back to that moment — how we laughed, how we felt.",
  },
  {
    id: "opening-9",
    role: "incoming",
    text: "Every detail tells a part of our story. The beautiful moments, the silly ones, the laughter — everything that made our time together so special.",
  },
  { id: "opening-10", role: "outgoing", text: "Why go this far?" },
  {
    id: "opening-11",
    role: "incoming",
    text: "Because sometimes love isn’t just about saying “I love you.” Sometimes it’s about creating something with your whole heart, just to show someone how much they mean to you.",
  },
  {
    id: "opening-12",
    role: "incoming",
    text: "So this is it. A collection of memories, a thousand unspoken feelings, and a love letter made just for her.",
  },
  {
    id: "opening-13",
    role: "incoming",
    text: "A little place where our beautiful memories can live forever. 🤍",
    bold: true,
  },
];

export const QUICK_REPLIES = [
  {
    id: "why",
    label: "Why a MacBook?",
    answers: [
      "Because that MacBook played an important part in bringing us closer. I wanted this place to feel like something that was already part of our story.",
      "It started from macweb.dev by gaminghackintosh. Then I turned that macOS-inspired experience into something that could only belong to us.",
    ],
  },
  {
    id: "forget",
    label: "What if I forget?",
    answers: [
      "You won’t. But if you ever do, this place will remember for you.",
      "Nothing in here expires. Not the songs, not the photos, not the way I feel. ♡",
    ],
  },
  {
    id: "open",
    label: "Can I open it? ♡",
    answers: [
      "Of course. I was hoping you’d ask. ♡",
      "Start anywhere. There’s no wrong turn.",
    ],
    entry: true,
  },
];

export function createChatState() {
  return {
    messages: OPENING_MESSAGES,
    replies: QUICK_REPLIES.map((reply) => reply.id),
    activeReply: null,
    entry: false,
  };
}

export function chooseReply(state, replyId) {
  const reply = QUICK_REPLIES.find((item) => item.id === replyId);
  if (!reply || state.activeReply !== null || !state.replies.includes(replyId)) {
    return state;
  }

  return {
    ...state,
    messages: [
      ...state.messages,
      { id: `${replyId}-sent`, role: "outgoing", text: reply.label },
    ],
    replies: state.replies.filter((id) => id !== replyId),
    activeReply: replyId,
  };
}

export function receiveAnswers(state) {
  const reply = QUICK_REPLIES.find((item) => item.id === state.activeReply);
  if (!reply) return state;

  return {
    ...state,
    messages: [
      ...state.messages,
      ...reply.answers.map((text, index) => ({
        id: `${reply.id}-answer-${index + 1}`,
        role: "incoming",
        text,
      })),
    ],
    activeReply: null,
    entry: state.entry || Boolean(reply.entry),
  };
}

// Reveal script for the opening conversation: questions arrive, then a typing
// beat before each incoming group. Pure so the timing stays testable.
export function buildOpeningTimeline(messages) {
  if (!messages.length) return [];

  const steps = [{ at: 250, show: 1 }];
  let at = 250;

  for (let index = 1; index < messages.length; index += 1) {
    const grouped = messages[index].role === messages[index - 1].role;

    if (messages[index].role === "incoming" && !grouped) {
      at += 400;
      steps.push({ at, typing: true });
      at += 600;
      steps.push({ at, typing: false, show: index + 1 });
    } else {
      at += grouped ? 250 : 450;
      steps.push({ at, show: index + 1 });
    }
  }

  return steps;
}
