import React, { useEffect, useRef, useState } from "react";
import { createStage } from "./introStage.js";

// IntroScreen — v1 intro layer: macOS window card over Three.js particle hearts.
// Button flow: Enter → stage.merge(3.2, done) → flash → onComplete() (auto-boot).
// WebGL/CDN failure or reduced-motion: flash-then-boot fallback, never stuck.
export default function IntroScreen({ onComplete }) {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const timeoutsRef = useRef([]);
  const audioCtxRef = useRef(null);

  const [clock, setClock] = useState("--:--");
  const [entered, setEntered] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [veiling, setVeiling] = useState(false);
  const [status, setStatus] = useState("Two hearts still apart \u2014 press the button to unite them.");
  const [statusOk, setStatusOk] = useState(false);
  const [afterShow, setAfterShow] = useState(false);
  const [afterOk, setAfterOk] = useState(false);
  const [afterStatus, setAfterStatus] = useState("Uniting\u2026");

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
    if (!canvas) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
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
  }, []);

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

  const handleEnter = () => {
    if (entered) return;
    setEntered(true);
    setStatus("Warmth approaching cold \u2014 keep this page open.");
    setAfterStatus("Warmth approaching cold\u2026");
    setAfterShow(true);
    try {
      audioCtxRef.current =
        audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
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
          setAfterStatus(msg);
          setAfterOk(true);
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

  const handleReplay = () => location.reload();

  return (
    <div className="intro-screen">
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
        <section className="window" aria-label="Intro Between Us">
          <div className="titlebar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="t"></span>
          </div>
          <div className="body">
            <h1>
              Between <span className="thin">Us</span>
            </h1>
            <div className="eyebrow">
              If you ever doubt how much I love you, just open this MacBook.
              <br />
              Look at everything inside it, because I made all of it for you
            </div>
            <div className="desc">
              <div className="row">
                <b>What this project is</b>
                <span>
                  Between Us is a personal MacBook belonging to its maker, used as a place to keep
                  memories and as a medium to communicate with the person he loves most. Inside are
                  various photos, songs, notes, messages, and small things from the journey they
                  went through together &mdash; a journey that left many meaningful memories for its
                  maker. Every app, photo, song, message, and note in it holds a story and keeps
                  the memory of the moments they once shared.
                </span>
              </div>
              <div className="row">
                <b>Why a MacBook</b>
                <span>
                  This web experience is made to resemble a personal MacBook belonging to its maker,
                  because that device played an important role in connecting its maker with someone
                  he loves dearly. More than just a macOS simulation, every app inside is filled
                  with personal content holding pieces of his journey, moments, and stories. This
                  project was developed from{" "}
                  <a
                    href="https://github.com/gaminghackintosh/macweb.dev"
                    target="_blank"
                    rel="noopener"
                    style={{ color: "#fff" }}
                  >
                    macweb.dev
                  </a>
                  , a work by gaminghackintosh, then adapted into a more personal experience.
                </span>
              </div>
            </div>
            <button className="enter" type="button" disabled={entered} onClick={handleEnter}>
              {entered ? (
                "Uniting two hearts\u2026"
              ) : (
                <>
                  <span aria-hidden="true">&hearts;</span>&nbsp; Enter Between Us
                </>
              )}
            </button>
            <div className={`status${statusOk ? " ok" : ""}`} role="status">
              {status}
            </div>
          </div>
        </section>
      </div>
      <div id="afterbar" role="status" className={`${afterShow ? "show" : ""}${afterOk ? " ok" : ""}`}>
        <span id="afterStatus">{afterStatus}</span>
        <button id="replayBtn" type="button" onClick={handleReplay}>
          &#8635; Replay
        </button>
      </div>
      <div className={`flash${flashOn ? " on" : ""}`} id="flash"></div>
      <div className={`veil${veiling ? " on" : ""}`} aria-hidden="true"></div>
    </div>
  );
}
