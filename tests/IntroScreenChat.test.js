import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "vite";
import { setupHarness, unmountMount } from "./testUtils/harness.js";
import {
  installClock as installClockShared,
  advanceTimers as advanceClock,
} from "./testUtils/clock.js";

const { browserWindow, document, projectRoot } = setupHarness();

let vite;
let React;
let act;
let createRoot;
let IntroScreen;
let activeClock;
const mountedRoots = [];
const PROFILE_ABOUT = [
  "I made this little MacBook for you, to express all the love I've always struggled to put into words.",
  "I hope that when you open it, you'll see just how much you mean to me and how deeply I've loved you.",
  "For my favorite girl, love youu 🤍",
];

function installClock() {
  return (activeClock = installClockShared(browserWindow));
}

function installReducedMotion() {
  browserWindow.matchMedia = (query) => ({
    matches: query.includes("prefers-reduced-motion: reduce"),
    addEventListener() {},
    removeEventListener() {},
  });
}

async function renderIntro({ onComplete = () => {} } = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const mount = { container, root, unmounted: false };
  mountedRoots.push(mount);

  await act(async () => {
    root.render(React.createElement(IntroScreen, { onComplete }));
  });

  return mount;
}

async function advanceTimers(milliseconds) {
  await advanceClock(act, activeClock, milliseconds);
}

async function click(element) {
  await act(async () => {
    element.dispatchEvent(new browserWindow.MouseEvent("click", { bubbles: true }));
  });
}

function replies(container) {
  return [...container.querySelectorAll(".intro-chat__reply")];
}

function messages(container) {
  return [...container.querySelectorAll(".intro-chat__message")];
}

function visibleBubbleText(message) {
  return message.querySelector(".intro-chat__text").lastChild.textContent;
}

async function unmount(mount) {
  if (!mount.unmounted) {
    await unmountMount(act, mount);
    mount.unmounted = true;
  } else {
    mount.container.remove();
  }
}

before(async () => {
  vite = await createServer({
    configFile: `${projectRoot}vite.config.js`,
    server: { hmr: false, middlewareMode: true, ws: false },
    appType: "custom",
  });

  ({ default: React } = await import("react"));
  ({ act } = React);
  ({ createRoot } = await import("react-dom/client"));
  ({ default: IntroScreen } = await vite.ssrLoadModule(
    "/src/ui/IntroScreen/IntroScreen.jsx",
  ));
  browserWindow.HTMLElement.prototype.scrollIntoView = function scrollIntoView(options) {
    this.dataset.scrolled = options?.block ?? "auto";
  };
  installReducedMotion();
});

afterEach(async () => {
  for (const mount of mountedRoots.splice(0)) await unmount(mount);
  document.body.replaceChildren();
  activeClock?.restore();
  activeClock = null;
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

test("opens on the thirteen-message conversation with three quick replies", async () => {
  installClock();
  const mount = await renderIntro();

  assert.equal(
    mount.container.querySelector(".intro-chat__title").textContent,
    "User11201",
  );
  assert.equal(
    mount.container.querySelector(".intro-chat__subtitle").textContent,
    "Between Us",
  );
  assert.equal(messages(mount.container).length, 13);
  assert.match(
    messages(mount.container)[0].querySelector(".intro-chat__text").textContent,
    /^You said: So…/,
  );
  assert.match(
    messages(mount.container)[1].querySelector(".intro-chat__text").textContent,
    /^User11201 said: A personal MacBook/,
  );
  assert.deepEqual(
    replies(mount.container).map((button) => button.textContent),
    ["Why a MacBook?", "What if I forget?", "Can I open it? ♡"],
  );
  assert.equal(mount.container.querySelector(".intro-chat__entry"), null);
  assert.doesNotMatch(mount.container.textContent, /View all|Restart|Interactive story/);
});

test("opens the profile popover and expands the full bio", async () => {
  installClock();
  const mount = await renderIntro();
  const panel = mount.container.querySelector(".intro-chat__userPanel");
  assert.equal(
    mount.container.querySelector(".intro-chat__dmHead").textContent,
    "Direct Messages",
  );
  assert.equal(mount.container.querySelector(".intro-chat__divider").textContent, "Today");

  assert.equal(panel.getAttribute("aria-expanded"), "false");
  await click(panel);

  const popover = mount.container.querySelector(".intro-chat__profilePopover");
  assert.ok(popover);
  assert.equal(panel.getAttribute("aria-expanded"), "true");
  assert.equal(panel.getAttribute("aria-controls"), "intro-profile-popover");
  assert.match(popover.textContent, /User11201/);
  assert.match(popover.textContent, /Online/);
  assert.equal(popover.querySelector(".intro-chat__label--spaced"), null);
  assert.doesNotMatch(popover.textContent, /Just between us\./);
  const cloudStatus = popover.querySelector(".intro-chat__cloudStatus");
  assert.ok(cloudStatus);
  assert.equal(cloudStatus.getAttribute("aria-label"), "Cloud badge");
  assert.deepEqual(
    [...popover.querySelectorAll(".intro-chat__aboutCopy .intro-chat__bio")].map(
      (paragraph) => paragraph.textContent,
    ),
    PROFILE_ABOUT.slice(0, 1),
  );
  const bioToggle = popover.querySelector(".intro-chat__bioToggle");
  assert.equal(bioToggle.textContent, "View Full Bio");
  assert.equal(bioToggle.getAttribute("aria-expanded"), "false");
  assert.equal(bioToggle.getAttribute("aria-controls"), "intro-profile-about");

  await click(bioToggle);
  assert.equal(bioToggle.getAttribute("aria-expanded"), "true");
  assert.equal(bioToggle.textContent, "Show Less");
  assert.deepEqual(
    [...popover.querySelectorAll(".intro-chat__aboutCopy .intro-chat__bio")].map(
      (paragraph) => paragraph.textContent,
    ),
    PROFILE_ABOUT,
  );

  await click(bioToggle);
  assert.equal(bioToggle.getAttribute("aria-expanded"), "false");
  assert.deepEqual(
    [...popover.querySelectorAll(".intro-chat__aboutCopy .intro-chat__bio")].map(
      (paragraph) => paragraph.textContent,
    ),
    PROFILE_ABOUT.slice(0, 1),
  );
  assert.deepEqual(
    [...mount.container.querySelectorAll(".intro-chat__profile .intro-chat__bio")]
      .slice(0, PROFILE_ABOUT.length)
      .map((paragraph) => paragraph.textContent),
    PROFILE_ABOUT,
  );
  const profile = mount.container.querySelector(".intro-chat__profile");
  assert.equal(profile.querySelector(".intro-chat__label--spaced"), null);
  assert.doesNotMatch(profile.textContent, /Just between us\./);
  assert.doesNotMatch(
    popover.textContent,
    /Edit Profile|Do Not Disturb|Badges|Switch Accounts|Copy User ID|Game Collection/,
  );

  await click(popover);
  assert.ok(mount.container.querySelector(".intro-chat__profilePopover"));

  await click(mount.container.querySelector(".intro-chat__thread"));
  assert.equal(mount.container.querySelector(".intro-chat__profilePopover"), null);
  assert.equal(panel.getAttribute("aria-expanded"), "false");

  await click(panel);
  assert.ok(mount.container.querySelector(".intro-chat__profilePopover"));
  await act(async () => {
    document.dispatchEvent(
      new browserWindow.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });
  assert.equal(mount.container.querySelector(".intro-chat__profilePopover"), null);
});

test("opens the profile from the conversation header", async () => {
  installClock();
  const mount = await renderIntro();
  const trigger = mount.container.querySelector(
    ".intro-chat__headerProfileTrigger",
  );

  assert.ok(trigger);
  assert.equal(trigger.getAttribute("aria-haspopup"), "dialog");
  assert.equal(trigger.getAttribute("aria-expanded"), "false");

  await click(trigger);

  assert.ok(mount.container.querySelector(".intro-chat__profilePopover"));
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
});

test("returns focus to the profile trigger when Escape closes the popover", async () => {
  installClock();
  const mount = await renderIntro();
  const trigger = mount.container.querySelector(".intro-chat__userPanel");
  await click(trigger);
  const bioToggle = mount.container.querySelector(".intro-chat__bioToggle");
  bioToggle.focus();

  await act(async () => {
    document.dispatchEvent(
      new browserWindow.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });

  assert.equal(mount.container.querySelector(".intro-chat__profilePopover"), null);
  assert.equal(document.activeElement, trigger);
});

test("reveals the opening conversation like live messages", async () => {
  installClock();
  const originalMatchMedia = browserWindow.matchMedia;
  browserWindow.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });

  try {
    const mount = await renderIntro();

    assert.equal(messages(mount.container).length, 0);

    await advanceTimers(250);
    assert.equal(messages(mount.container).length, 1);

    await advanceTimers(400);
    assert.ok(mount.container.querySelector(".intro-chat__typing"));

    await advanceTimers(600);
    assert.equal(messages(mount.container).length, 2);
    assert.equal(mount.container.querySelector(".intro-chat__typing"), null);

    await advanceTimers(6550);
    assert.equal(messages(mount.container).length, 13);
    assert.ok(
      messages(mount.container)[8].classList.contains(
        "intro-chat__message--grouped",
      ),
    );
    assert.ok(replies(mount.container).every((button) => !button.disabled));
  } finally {
    browserWindow.matchMedia = originalMatchMedia;
  }
});

test("answers a quick reply after a typing pause and locks the other pills", async () => {
  installClock();
  const mount = await renderIntro();
  const why = replies(mount.container)[0];

  await click(why);

  assert.equal(messages(mount.container).length, 14);
  assert.equal(
    visibleBubbleText(messages(mount.container)[13]),
    "Why a MacBook?",
  );
  assert.ok(mount.container.querySelector(".intro-chat__typing"));
  assert.equal(replies(mount.container).length, 2);
  assert.ok(replies(mount.container).every((button) => button.disabled));
  const thread = mount.container.querySelector(".intro-chat__thread");
  assert.equal(thread.getAttribute("tabindex"), "0");
  assert.equal(document.activeElement, thread);

  await advanceTimers(700);

  assert.equal(messages(mount.container).length, 16);
  assert.equal(mount.container.querySelector(".intro-chat__typing"), null);
  assert.equal(document.activeElement, thread);
  assert.equal(
    visibleBubbleText(messages(mount.container)[14]),
    "Because that MacBook played an important part in bringing us closer. I wanted this place to feel like something that was already part of our story.",
  );
  assert.ok(replies(mount.container).every((button) => !button.disabled));
});

test("reveals the entry card last and keeps it last after another reply", async () => {
  installClock();
  const mount = await renderIntro();
  const open = replies(mount.container)[2];

  await click(open);
  await advanceTimers(700);

  const entry = mount.container.querySelector(".intro-chat__entry");
  const thread = mount.container.querySelector(".intro-chat__thread");
  assert.ok(entry);
  assert.equal(thread.lastElementChild, entry);
  assert.equal(entry.dataset.scrolled, "end");
  assert.equal(document.activeElement, thread);
  await advanceTimers(300);
  assert.equal(document.activeElement, thread);
  assert.equal(
    entry.querySelector(".intro-chat__enter").textContent,
    "Enter Between Us",
  );

  await click(replies(mount.container)[0]);
  await advanceTimers(700);

  assert.equal(thread.lastElementChild, entry);
  assert.equal(messages(mount.container).at(-1).dataset.scrolled, "end");
  assert.equal(
    visibleBubbleText(messages(mount.container).at(-1)),
    "It started from macweb.dev by gaminghackintosh. Then I turned that macOS-inspired experience into something that could only belong to us.",
  );
});

test("skips the heart transition and completes once from the entry button", async () => {
  installClock();
  const completions = [];
  const mount = await renderIntro({ onComplete: () => completions.push("complete") });

  await click(replies(mount.container)[2]);
  await advanceTimers(700);
  const enter = mount.container.querySelector(".intro-chat__enter");
  await act(async () => {
    const event = () => new browserWindow.MouseEvent("click", { bubbles: true });
    enter.dispatchEvent(event());
    enter.dispatchEvent(event());
  });

  assert.deepEqual(completions, ["complete"]);
  await advanceTimers(5000);
  assert.deepEqual(completions, ["complete"]);
});

test("clears pending reply timers when the intro unmounts", async () => {
  const clock = installClock();
  const mount = await renderIntro();

  await click(replies(mount.container)[0]);
  assert.ok(clock.activeTimerCount() > 0);
  await unmount(mount);

  assert.equal(clock.activeTimerCount(), 0);
  assert.equal(clock.activeIntervalCount(), 0);
});
