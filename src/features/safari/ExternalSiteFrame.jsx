import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  getExternalFrameSnapshot,
  subscribeExternalFrameNavigation,
} from "./externalSiteBridge.js";

const PROBE_TIMEOUT_MS = 10_000;

export function ExternalSiteFrame({
  tabId,
  url,
  isActive,
  reloadToken,
  onReady,
  onNavigate,
  onUnsupported,
}) {
  const iframeRef = useRef(null);
  const lifecycleRef = useRef({
    bridgeCleanup: null,
    timeoutId: null,
    cycle: 0,
    phase: "idle",
    onReady,
    onNavigate,
    onUnsupported,
  });
  const [isLoading, setIsLoading] = useState(true);
  const lifecycle = lifecycleRef.current;

  lifecycle.onReady = onReady;
  lifecycle.onNavigate = onNavigate;
  lifecycle.onUnsupported = onUnsupported;

  const clearBridge = useCallback(() => {
    const current = lifecycleRef.current;
    current.bridgeCleanup?.();
    current.bridgeCleanup = null;
  }, []);

  const clearProbeTimeout = useCallback(() => {
    const current = lifecycleRef.current;
    if (current.timeoutId === null) return;

    clearTimeout(current.timeoutId);
    current.timeoutId = null;
  }, []);

  const startProbeCycle = useCallback(() => {
    const current = lifecycleRef.current;
    clearBridge();
    clearProbeTimeout();
    current.cycle += 1;
    const cycle = current.cycle;
    current.phase = "probing";
    setIsLoading(true);
    current.timeoutId = setTimeout(() => {
      const latest = lifecycleRef.current;
      if (latest.cycle !== cycle || latest.phase !== "probing") return;

      latest.timeoutId = null;
      latest.phase = "unsupported";
      setIsLoading(false);
      latest.onUnsupported?.();
    }, PROBE_TIMEOUT_MS);

    return cycle;
  }, [clearBridge, clearProbeTimeout]);

  const handleFrameLoad = useCallback((event) => {
    const frame = event.currentTarget;
    const current = lifecycleRef.current;
    if (iframeRef.current !== frame) return;

    const cycle = current.phase === "probing"
      ? current.cycle
      : startProbeCycle();

    const frameWindow = frame.contentWindow;
    const snapshot = frameWindow
      ? getExternalFrameSnapshot(frameWindow, url)
      : { status: "inaccessible" };

    if (snapshot.status === "ready") {
      const latest = lifecycleRef.current;
      clearProbeTimeout();
      latest.phase = "ready";
      setIsLoading(false);
      latest.onReady?.(snapshot);

      if (lifecycleRef.current.cycle !== cycle || iframeRef.current !== frame) return;
      if (snapshot.isOpaque) return;

      clearBridge();

      lifecycleRef.current.bridgeCleanup = subscribeExternalFrameNavigation(
        frameWindow,
        (navigationSnapshot) => {
          const latest = lifecycleRef.current;
          if (latest.cycle !== cycle || iframeRef.current !== frame) return;

          if (navigationSnapshot.status === "unsupported") {
            latest.phase = "unsupported";
            latest.bridgeCleanup?.();
            latest.bridgeCleanup = null;
            latest.onUnsupported?.();
            return;
          }

          latest.onNavigate?.(navigationSnapshot);
        },
      );
      return;
    }

    if (snapshot.status !== "unsupported") return;

    clearProbeTimeout();
    lifecycleRef.current.phase = "unsupported";
    setIsLoading(false);
    lifecycleRef.current.onUnsupported?.();
  }, [clearBridge, clearProbeTimeout, startProbeCycle]);

  useLayoutEffect(() => {
    startProbeCycle();

    return () => {
      const latest = lifecycleRef.current;
      clearProbeTimeout();
      clearBridge();
      latest.phase = "idle";
    };
  }, [clearBridge, clearProbeTimeout, startProbeCycle, tabId, url, reloadToken]);

  return (
    <div
      className={`sf__external-frame${isActive ? "" : " sf__external-frame--inactive"}`}
      aria-hidden={!isActive}
    >
      <iframe
        key={`${tabId}:${url}:${reloadToken}`}
        ref={iframeRef}
        src={url}
        title={`Safari web content: ${url}`}
        allow="autoplay; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        className="sf__external-iframe"
        onLoad={handleFrameLoad}
      />
      {isLoading && (
        <div className="sf__external-loading" role="status" aria-live="polite">
          Loading…
        </div>
      )}
    </div>
  );
}
