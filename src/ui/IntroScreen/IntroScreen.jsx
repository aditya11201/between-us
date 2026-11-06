import React, { useEffect, useRef, useState } from "react";
import { FaCloud } from "react-icons/fa";
import sharkAvatar from "@/assets/images/avatar/avatar-shark.png";
import { createStage } from "./introStage.js";
import {
  OPENING_MESSAGES,
  QUICK_REPLIES,
  buildOpeningTimeline,
  chooseReply,
  createChatState,
  receiveAnswers,
} from "./introChatModel.js";

// Temporary bypass; setting this to false restores the heart transition.
const SKIP_HEART_TRANSITION = true;

const PROFILE_ABOUT = [
  "I made this little MacBook for you, to express all the love I've always struggled to put into words.",
  "I hope that when you open it, you'll see just how much you mean to me and how deeply I've loved you.",
  "For my favorite girl, love youu 🤍",
];

// IntroScreen — Discord-style conversation over the Three.js heart stage.
// Opening Q&A reveals like live messages (question → typing → answer),
// then quick replies → typing → answers. "Can I open it?" reveals the entry card.
// Enter → stage.merge(3.2, done) → flash → onComplete() (auto-boot).
// WebGL/CDN failure or reduced-motion: flash-then-boot fallback, never stuck.
export default function IntroScreen({ onComplete }) {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const timeoutsRef = useRef([]);
  const audioCtxRef = useRef(null);
  const threadRef = useRef(null);
  const profileTriggerRef = useRef(null);
  const enteredRef = useRef(false);
  const entrySeenRef = useRef(false);
  const reducedMotionRef = useRef(null);

  if (reducedMotionRef.current === null) {
    reducedMotionRef.current = Boolean(
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    );
  }
  const reducedMotion = reducedMotionRef.current;

  const [clock, setClock] = useState("--:--");
  const [chat, setChat] = useState(createChatState);
  const [typing, setTyping] = useState(false);
  const [openingTyping, setOpeningTyping] = useState(false);
  const [revealed, setRevealed] = useState(() =>
    reducedMotion ? OPENING_MESSAGES.length : 0,
  );
  const [entered, setEntered] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [veiling, setVeiling] = useState(false);
  const [status, setStatus] = useState(
    "Two hearts still apart \u2014 one tap to unite them.",
  );
  const [statusOk, setStatusOk] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileAboutExpanded, setProfileAboutExpanded] = useState(false);

  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  // Live clock (v1 format)
  useEffect(() => {
    const tick = () => {
      try {
        setClock(
          new Date()
            .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
            .replace(".", ":")
        );
      } catch {
        /* ponytail: clock is decoration, never break intro */
      }
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  // Stage creation (CDN three; skipped on reduced-motion)
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;

    if (canvas && !reducedMotion) {
      (async () => {
        try {
          const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js");
          if (cancelled) return;
          const stage = createStage(canvas, THREE);
          if (cancelled) {
            stage.destroy();
            return;
          }
          stageRef.current = stage;
          requestAnimationFrame(() => canvas.classList.add("ready"));
        } catch (err) {
          console.warn("WebGL/three failed:", err?.message);
          canvas.style.display = "none";
        }
      })();
    }

    return () => {
      cancelled = true;
      stageRef.current?.destroy();
      stageRef.current = null;
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      try {
        audioCtxRef.current?.close?.();
      } catch {
        /* ponytail: audio cleanup best-effort */
      }
      audioCtxRef.current = null;
    };
  }, [reducedMotion]);

  // Opening conversation: one live-looking exchange at a time.
  useEffect(() => {
    if (reducedMotion) return;

    const timeline = buildOpeningTimeline(OPENING_MESSAGES);
    const ids = timeline.map((step) =>
      setTimeout(() => {
        if (step.typing !== undefined) setOpeningTyping(step.typing);
        if (step.show !== undefined) setRevealed(step.show);
      }, step.at),
    );

    return () => ids.forEach(clearTimeout);
  }, [reducedMotion]);

  // Escape closes the profile popover; click-outside is handled by the shell.
  useEffect(() => {
    if (!profileOpen) return;
    const onKey = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        profileTriggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [profileOpen]);

  const openingDone = revealed >= OPENING_MESSAGES.length;
  const visibleMessages = openingDone
    ? chat.messages
    : chat.messages.slice(0, revealed);
  const showTyping = typing || openingTyping;

  // Follow the newest message, not the entry card that sits after it.
  // scrollIntoView keeps the thread's own scroll container in charge.
  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;

    const allMessages = thread.querySelectorAll(".intro-chat__message");
    const entry = thread.querySelector(".intro-chat__entry");
    const typingEl = thread.querySelector(".intro-chat__typing");
    const lastMessage = allMessages[allMessages.length - 1];
    const entryAppeared = Boolean(entry) && !entrySeenRef.current;

    entrySeenRef.current = Boolean(entry);

    let target = typingEl || lastMessage;
    if (entryAppeared) target = entry;

    target?.scrollIntoView({ block: "end" });
  }, [visibleMessages.length, chat.entry, typing, openingTyping]);

  const pulse = (t, f, v) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f * 1.7, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.43);
  };

  const heartbeat = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const s = ctx.currentTime + 0.05;
    pulse(s, 82, 0.075);
    pulse(s + 0.24, 72, 0.055);
    pulse(s + 0.85, 82, 0.075);
    pulse(s + 1.09, 72, 0.055);
  };

  const handleReply = (replyId) => {
    if (!openingDone || entered || typing || chat.activeReply !== null) return;
    setChat((state) => chooseReply(state, replyId));
    setTyping(true);
    threadRef.current?.focus();
    later(() => {
      setChat((state) => receiveAnswers(state));
      setTyping(false);
    }, 700);
  };

  const toggleProfile = (event) => {
    event.stopPropagation();
    profileTriggerRef.current = event.currentTarget;
    setProfileOpen((open) => !open);
  };

  const handleEnter = () => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    if (SKIP_HEART_TRANSITION && onComplete) {
      onComplete();
      return;
    }
    setEntered(true);
    setStatus("Warmth approaching cold \u2014 keep this page open.");
    try {
      audioCtxRef.current =
        audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch {
      audioCtxRef.current = null;
    }
    heartbeat();

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      // done fires while the heart still spins; keep a short beat, then hand off.
      // No stage (fallback): keep it snappy, nothing to admire.
      later(() => {
        setFlashOn(true);
        later(() => {
          const msg = "\u2713 Both hearts united. Next: Apple logo \u2192 boot.";
          setStatus(msg);
          setStatusOk(true);
          setFlashOn(false);
          // Dissolve to black; BootScreen fades in over it.
          later(() => {
            setVeiling(true);
            later(() => {
              onComplete?.();
            }, 850);
          }, 700);
        }, 450);
      }, 450);
    };
    try {
      if (stageRef.current) {
        stageRef.current.merge(3.2, done);
      } else {
        later(done, 900);
      }
    } catch {
      later(done, 900);
    }
  };

  const busy = typing || chat.activeReply !== null;
  const visibleReplies = QUICK_REPLIES.filter((reply) => chat.replies.includes(reply.id));

  return (
    <div className="intro-screen" onClick={() => setProfileOpen(false)}>
      <canvas id="bg" ref={canvasRef}></canvas>
      <div className="ambient"></div>
      <div className="vignette"></div>
      <div className="grain"></div>
      <div className="menubar">
        <span>&#9679;</span>
        <span className="app">Between Us</span>
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
        <span className="sp"></span>
        <span id="clock">{clock}</span>
      </div>
      <div className={`stage${entered ? " leave" : ""}`}>
        <section className="intro-chat" aria-label="Between Us conversation">
          <div className="intro-chat__chrome" aria-hidden="true">
            <span className="intro-chat__dot intro-chat__dot--red"></span>
            <span className="intro-chat__dot intro-chat__dot--yellow"></span>
            <span className="intro-chat__dot intro-chat__dot--green"></span>
            <span className="intro-chat__chromeTitle">Direct Messages</span>
          </div>

          <div className="intro-chat__body">
            <aside className="intro-chat__rail" aria-hidden="true">
              <span className="intro-chat__railPill"></span>
              <span className="intro-chat__railIcon">
                <img src={sharkAvatar} alt="" />
              </span>
              <span className="intro-chat__railDivider"></span>
            </aside>

            <aside className="intro-chat__dms">
              <div className="intro-chat__dmHead">
                <h2>Direct Messages</h2>
              </div>
              <div className="intro-chat__dmDivider"></div>
              <div className="intro-chat__dmRow intro-chat__dmRow--active">
                <img src={sharkAvatar} alt="" />
                <span className="intro-chat__dmText">
                  <strong>User11201</strong>
                  <small>Between Us</small>
                </span>
              </div>
              <button
                type="button"
                className="intro-chat__userPanel"
                aria-haspopup="dialog"
                aria-expanded={profileOpen}
                aria-controls="intro-profile-popover"
                aria-label={
                  profileOpen ? "Close User11201 profile" : "Open User11201 profile"
                }
                onClick={toggleProfile}
              >
                <img src={sharkAvatar} alt="" />
                <span className="intro-chat__dmText">
                  <strong>User11201</strong>
                  <small className="intro-chat__online">Online</small>
                </span>
              </button>
            </aside>

            <main className="intro-chat__main">
              <header className="intro-chat__header">
                <span className="intro-chat__channelAvatar">
                  <img src={sharkAvatar} alt="" />
                  <span className="intro-chat__presence"></span>
                </span>
                <span className="intro-chat__channelText">
                  <h1 className="intro-chat__title">User11201</h1>
                  <p className="intro-chat__subtitle">Between Us</p>
                </span>
                <span className="intro-chat__today">Today</span>
                <button
                  type="button"
                  className="intro-chat__headerProfileTrigger"
                  aria-haspopup="dialog"
                  aria-expanded={profileOpen}
                  aria-controls="intro-profile-popover"
                  aria-label={
                    profileOpen ? "Close User11201 profile" : "Open User11201 profile"
                  }
                  onClick={toggleProfile}
                >
                  <img src={sharkAvatar} alt="" />
                </button>
              </header>

              <div className="intro-chat__threadWrap">
                <section
                  className="intro-chat__thread"
                  ref={threadRef}
                  role="log"
                  aria-label="Our conversation"
                  aria-live="polite"
                  aria-relevant="additions text"
                  tabIndex={0}
                >
                  <p className="intro-chat__divider">Today</p>
                  {visibleMessages.map((message, index) => {
                    const grouped =
                      index > 0 && visibleMessages[index - 1].role === message.role;
                    return (
                      <div
                        key={message.id}
                        className={`intro-chat__message intro-chat__message--${message.role}${
                          grouped ? " intro-chat__message--grouped" : ""
                        }`}
                      >
                        {grouped ? null : message.role === "outgoing" ? (
                          <span className="intro-chat__avatar intro-chat__avatar--you" aria-hidden="true">
                            Y
                          </span>
                        ) : (
                          <img className="intro-chat__avatar" src={sharkAvatar} alt="" />
                        )}
                        <div className="intro-chat__content">
                          {grouped ? null : (
                            <div className="intro-chat__meta">
                              <span className="intro-chat__author">
                                {message.role === "outgoing" ? "You" : "User11201"}
                              </span>
                              <span className="intro-chat__time">Today at 22:41</span>
                            </div>
                          )}
                          <p
                            className={`intro-chat__text${
                              message.bold ? " intro-chat__text--strong" : ""
                            }`}
                          >
                            <span className="intro-chat__srOnly">
                              {message.role === "outgoing" ? "You said: " : "User11201 said: "}
                            </span>
                            {message.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {showTyping && (
                    <div className="intro-chat__typing" role="status" aria-label="Typing a reply">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  )}
                  {chat.entry && (
                    <article className="intro-chat__entry">
                      <p className="intro-chat__kicker">READY WHEN YOU ARE</p>
                      <h2 className="intro-chat__entryTitle">Ready to step inside?</h2>
                      <p className="intro-chat__entryBody">
                        The door&rsquo;s open. Everything inside was made for her.
                      </p>
                      <button
                        className="intro-chat__enter"
                        type="button"
                        disabled={entered}
                        onClick={handleEnter}
                      >
                        {entered ? "Uniting two hearts\u2026" : "Enter Between Us"}
                      </button>
                      <p
                        className={`intro-chat__status${statusOk ? " intro-chat__status--ok" : ""}`}
                        role="status"
                      >
                        {status}
                      </p>
                    </article>
                  )}
                </section>
                <div className="intro-chat__fade" aria-hidden="true"></div>
              </div>

              <footer className="intro-chat__composer">
                <div className="intro-chat__replies" role="group" aria-label="Suggested questions">
                  {visibleReplies.map((reply) => (
                    <button
                      key={reply.id}
                      className="intro-chat__reply"
                      type="button"
                      disabled={entered || busy || !openingDone}
                      onClick={() => handleReply(reply.id)}
                    >
                      {reply.label}
                    </button>
                  ))}
                </div>
              </footer>
            </main>

            <aside className="intro-chat__profile">
              <div className="intro-chat__banner"></div>
              <div className="intro-chat__profileAvatarWrap">
                <img className="intro-chat__profileAvatar" src={sharkAvatar} alt="" />
                <span className="intro-chat__profilePresence"></span>
              </div>
              <h2 className="intro-chat__profileName">User11201</h2>
              <p className="intro-chat__handle">Between Us</p>
              <div className="intro-chat__profileDivider"></div>
              <p className="intro-chat__label">ABOUT</p>
              {PROFILE_ABOUT.map((paragraph) => (
                <p className="intro-chat__bio" key={paragraph}>
                  {paragraph}
                </p>
              ))}
            </aside>

            {profileOpen && (
              <aside
                className="intro-chat__profilePopover"
                id="intro-profile-popover"
                role="dialog"
                aria-label="User11201 profile"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="intro-chat__banner"></div>
                <div className="intro-chat__profileIdentity">
                  <div className="intro-chat__profileAvatarWrap">
                    <img className="intro-chat__profileAvatar" src={sharkAvatar} alt="" />
                    <span className="intro-chat__profilePresence"></span>
                  </div>
                  <span
                    className="intro-chat__cloudStatus"
                    role="img"
                    aria-label="Cloud badge"
                  >
                    <FaCloud aria-hidden="true" />
                  </span>
                </div>
                <h2 className="intro-chat__profileName">User11201</h2>
                <p className="intro-chat__handle">Between Us</p>
                <p className="intro-chat__bio intro-chat__online">Online</p>
                <div className="intro-chat__profileDivider"></div>
                <p className="intro-chat__label">ABOUT</p>
                <div className="intro-chat__aboutCopy" id="intro-profile-about">
                  {(profileAboutExpanded ? PROFILE_ABOUT : PROFILE_ABOUT.slice(0, 1)).map(
                    (paragraph) => (
                      <p className="intro-chat__bio" key={paragraph}>
                        {paragraph}
                      </p>
                    ),
                  )}
                </div>
                {PROFILE_ABOUT.length > 2 && (
                  <button
                    className="intro-chat__bioToggle"
                    type="button"
                    aria-controls="intro-profile-about"
                    aria-expanded={profileAboutExpanded}
                    onClick={() => setProfileAboutExpanded((expanded) => !expanded)}
                  >
                    {profileAboutExpanded ? "Show Less" : "View Full Bio"}
                  </button>
                )}
              </aside>
            )}
          </div>
        </section>
      </div>
      <div className={`flash${flashOn ? " on" : ""}`} id="flash"></div>
      <div className={`veil${veiling ? " on" : ""}`} aria-hidden="true"></div>
    </div>
  );
}
