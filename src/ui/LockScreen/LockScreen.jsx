import { useCallback, useEffect, useRef, useState } from "react";
import { isMailPasswordValid } from "@/features/mail/mailLock.js";

function formatTime(date) {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function LockScreen({ isLocked = true, onUnlock }) {
  const [now, setNow] = useState(() => new Date());
  const [isRevealed, setIsRevealed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const mountedRef = useRef(false);
  const isLockedRef = useRef(isLocked);
  const revealedRef = useRef(false);
  const busyRef = useRef(false);
  const loginRef = useRef(null);
  const passwordRef = useRef(null);
  const passPillRef = useRef(null);
  const focusTimerRef = useRef(null);
  const unlockTimerRef = useRef(null);
  const shakeTimerRef = useRef(null);
  const onUnlockRef = useRef(onUnlock);

  isLockedRef.current = isLocked;
  onUnlockRef.current = onUnlock;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearTimeout(focusTimerRef.current);
      clearTimeout(unlockTimerRef.current);
      clearTimeout(shakeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    clearTimeout(focusTimerRef.current);
    clearTimeout(unlockTimerRef.current);
    clearTimeout(shakeTimerRef.current);
    focusTimerRef.current = null;
    unlockTimerRef.current = null;
    shakeTimerRef.current = null;
    busyRef.current = false;
    revealedRef.current = false;
    setIsRevealed(false);
    setPassword("");
    setError("");
    setIsBusy(false);
    setIsShaking(false);

    if (!isLocked) return undefined;

    setNow(new Date());
    const clockTimer = setInterval(() => {
      if (mountedRef.current && isLockedRef.current) setNow(new Date());
    }, 1000);

    return () => clearInterval(clockTimer);
  }, [isLocked]);

  const reveal = useCallback(() => {
    if (!mountedRef.current || !isLockedRef.current || revealedRef.current) return;

    revealedRef.current = true;
    setIsRevealed(true);
    clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => {
      focusTimerRef.current = null;
      if (mountedRef.current && isLockedRef.current) passwordRef.current?.focus();
    }, 260);
  }, []);

  useEffect(() => {
    if (!isLocked) return undefined;

    const handleKeyDown = (event) => {
      if (!isLockedRef.current) return;

      event.stopImmediatePropagation();
      if (event.key !== "Tab") reveal();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isLocked, reveal]);

  useEffect(() => {
    if (!isLocked) return undefined;

    const eventTypes = [
      "pointermove",
      "pointerup",
      "pointercancel",
      "mousemove",
      "mouseup",
      "mouseleave",
    ];
    const isolateLockedEvent = (event) => event.stopPropagation();

    for (const eventType of eventTypes) {
      document.addEventListener(eventType, isolateLockedEvent, true);
      window.addEventListener(eventType, isolateLockedEvent, true);
    }

    return () => {
      for (const eventType of eventTypes) {
        document.removeEventListener(eventType, isolateLockedEvent, true);
        window.removeEventListener(eventType, isolateLockedEvent, true);
      }
    };
  }, [isLocked]);

  const stopLockedPointerEvent = useCallback((event) => {
    if (!isLockedRef.current) return;

    if (!loginRef.current?.contains(event.target)) {
      event.stopPropagation();
      if (event.type === "pointerdown") reveal();
    }
  }, [reveal]);

  const isolateLockedPointerEvent = useCallback((event) => {
    if (isLockedRef.current) event.stopPropagation();
  }, []);

  const triggerShake = useCallback(() => {
    clearTimeout(shakeTimerRef.current);
    if (passPillRef.current) {
      passPillRef.current.classList.remove("shake");
      void passPillRef.current.offsetWidth;
      passPillRef.current.classList.add("shake");
    }
    setIsShaking(true);
    shakeTimerRef.current = setTimeout(() => {
      shakeTimerRef.current = null;
      if (mountedRef.current) setIsShaking(false);
    }, 420);
  }, []);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    if (!isLockedRef.current || !revealedRef.current || busyRef.current) return;

    if (!password) {
      setError("");
      triggerShake();
      passwordRef.current?.focus();
      return;
    }

    if (!isMailPasswordValid(password)) {
      setError("Incorrect password");
      triggerShake();
      passwordRef.current?.focus();
      return;
    }

    busyRef.current = true;
    setIsBusy(true);
    setError("");
    clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => {
      unlockTimerRef.current = null;
      if (!mountedRef.current || !isLockedRef.current) return;

      busyRef.current = false;
      setIsBusy(false);
      setPassword("");
      passwordRef.current?.blur();
      onUnlockRef.current?.();
    }, 750);
  }, [password, triggerShake]);

  const lockClassName = [
    "lock-screen",
    isRevealed ? "lock-screen--revealed" : "",
    !isLocked ? "lock-screen--unlocked" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={lockClassName}
      aria-hidden={!isLocked}
      inert={!isLocked}
      onPointerDownCapture={stopLockedPointerEvent}
      onPointerDown={isolateLockedPointerEvent}
      onMouseDownCapture={stopLockedPointerEvent}
      onMouseDown={isolateLockedPointerEvent}
      onClick={isolateLockedPointerEvent}
    >
      <div className="wallpaper" aria-hidden="true" />

      <div className="menubar" aria-hidden="true">
        <span>U.S</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M4.5 9.5a11 11 0 0 1 15 0" />
          <path d="M7.5 13a6.5 6.5 0 0 1 9 0" />
          <circle cx="12" cy="17" r="1.3" fill="currentColor" stroke="none" />
        </svg>
        <svg viewBox="0 0 27 14" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="1" y="1.5" width="21" height="11" rx="3.2" />
          <rect x="3" y="3.5" width="14" height="7" rx="1.8" fill="currentColor" stroke="none" />
          <path d="M24.5 5v4" strokeLinecap="round" />
        </svg>
      </div>

      <div className="lock-ui" id="lock-ui">
        <div className="clock-block">
          <div className="date-line">{formatDate(now)}</div>
          <div className="time-stack">
            <span className="time-ghost" aria-hidden="true">{formatTime(now)}</span>
            <span className="time-glass">{formatTime(now)}</span>
          </div>
        </div>

        <div className="hint">Click or press any key to log in</div>

        <form
          className="login"
          ref={loginRef}
          autoComplete="off"
          onSubmit={handleSubmit}
        >
          <div className="avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="8.2" r="4.1" />
              <path d="M3.6 20.4a8.4 8.4 0 0 1 16.8 0Z" />
            </svg>
          </div>
          <div className="user-name">My Pretty Princess S</div>
          <div className={`pass-pill${isShaking ? " shake" : ""}`} ref={passPillRef}>
            <input
              id="password"
              ref={passwordRef}
              name="password"
              type="password"
              placeholder="Enter Password"
              aria-label="Password"
              autoComplete="off"
              disabled={!isLocked || !isRevealed || isBusy}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
                setIsShaking(false);
              }}
            />
            <button
              className={`go${isBusy ? " busy" : ""}`}
              type="submit"
              aria-label="Log in"
              disabled={!isLocked || !isRevealed || isBusy}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 12h14M13 6.5l5.5 5.5-5.5 5.5" />
              </svg>
            </button>
          </div>
          {error && <div className="lock-error" role="alert">{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default LockScreen;
