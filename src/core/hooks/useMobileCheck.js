import { useState, useEffect } from "react";

export function useMobileCheck(breakpoint = 1023) {
  const query = `(max-width: ${breakpoint}px) and (orientation: portrait)`;
  const [showLandscapePrompt, setShowLandscapePrompt] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setShowLandscapePrompt(e.matches);
    setShowLandscapePrompt(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return showLandscapePrompt;
}