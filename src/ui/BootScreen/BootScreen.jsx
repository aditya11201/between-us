import React, { useCallback, useEffect, useRef, useState } from "react";
import AppleLogo from "@/assets/icons/preloader/Apple_Logo_Test.svg";
import startupAudioUrl from "@/assets/audio/apple-mac-startup-soundchime.mp3";

// ════════════════════════════════════════════════════════════
//  BootScreen — Realistic macOS boot animation
// ══════════════════════════════════════════════════════════════

export default function BootScreen({ onComplete }) {
  const [showLogo, setShowLogo] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const startBootRef = useRef(null);

  const handleStart = useCallback(() => {
    startBootRef.current?.();
  }, []);

  useEffect(() => {
    const startupAudio = new Audio(startupAudioUrl);
    startupAudio.volume = 0.3;
    startupAudio.loop = false;

    let isUnmounted = false;
    let bootStarted = false;
    let gateReleased = false;
    let hasCompleted = false;
    let startTime = 0;
    let progressTimer = null;
    let progressInterval = null;
    let safetyTimer = null;
    let completionTimer = null;

    const completeBoot = () => {
      if (isUnmounted || hasCompleted) return;

      hasCompleted = true;
      if (progressInterval !== null) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      if (safetyTimer !== null) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }

      setProgress(100);
      setIsComplete(true);
      completionTimer = setTimeout(() => {
        completionTimer = null;
        if (!isUnmounted) onComplete();
      }, 300);
    };

    const releaseProgressGate = () => {
      if (gateReleased || isUnmounted) return;
      if (!bootStarted) return;

      gateReleased = true;
      startTime = performance.now();
      progressInterval = setInterval(() => {
        if (isUnmounted) return;

        const elapsed = performance.now() - startTime;
        let newProgress = 0;

        if (elapsed < 800) {
          newProgress = Math.min(30, (elapsed / 800) * 30);
        } else if (elapsed < 2200) {
          const t = (elapsed - 800) / 1400;

          newProgress = 30 + Math.min(55, t * 55);

          if (newProgress > 45 && newProgress < 47) newProgress = 45.5;
          if (newProgress > 70 && newProgress < 72) newProgress = 71;
        } else if (elapsed < 2800) {
          const t = (elapsed - 2200) / 600;

          newProgress = 85 + Math.min(10, t * 10);
        } else {
          newProgress =
            95 + Math.min(5, ((elapsed - 2800) / 400) * 5);
        }

        newProgress = Math.min(
          100,
          Math.floor(newProgress * 10) / 10
        );

        if (newProgress >= 100) {
          completeBoot();
        } else {
          setProgress(newProgress);
        }
      }, 50);

      progressTimer = setTimeout(() => {
        progressTimer = null;
        if (!isUnmounted) setShowProgress(true);
      }, 500);

      safetyTimer = setTimeout(() => {
        safetyTimer = null;
        if (!isUnmounted && !hasCompleted) completeBoot();
      }, 5000);
    };

    const startBoot = () => {
      if (isUnmounted || bootStarted) return;

      bootStarted = true;
      setIsStarted(true);

      try {
        const playResult = startupAudio.play();
        if (playResult && typeof playResult.catch === "function") {
          playResult.catch(() => releaseProgressGate());
        }
      } catch {
        releaseProgressGate();
      }
    };

    const logoTimer = setTimeout(() => {
      if (isUnmounted) return;

      setShowLogo(true);
    }, 150);

    startupAudio.addEventListener("ended", releaseProgressGate);
    startupAudio.addEventListener("error", releaseProgressGate);
    startBootRef.current = startBoot;

    return () => {
      isUnmounted = true;
      startBootRef.current = null;
      clearTimeout(logoTimer);
      if (progressTimer !== null) clearTimeout(progressTimer);
      if (safetyTimer !== null) clearTimeout(safetyTimer);
      if (completionTimer !== null) clearTimeout(completionTimer);
      if (progressInterval !== null) clearInterval(progressInterval);
      startupAudio.removeEventListener("ended", releaseProgressGate);
      startupAudio.removeEventListener("error", releaseProgressGate);
      startupAudio.pause();
    };
  }, [onComplete]);

  return (
    <div
      className={`boot-screen${
        isComplete ? " boot-screen--complete" : ""
      }`}
    >
      <div className="boot-bg" />

      <div className="boot-container">
        <button
          type="button"
          className={`boot-logo ${
            showLogo ? "boot-logo--show" : ""
          }`}
          aria-label="Start macOS"
          disabled={isStarted}
          onClick={handleStart}
        >
          <img
            src={AppleLogo}
            alt="Apple Logo"
            className="apple-logo"
            draggable={false}
            fetchPriority="high"
            decoding="async"
          />
        </button>

        {showProgress && (
          <div className="boot-progress">
            <div
              className="boot-progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
