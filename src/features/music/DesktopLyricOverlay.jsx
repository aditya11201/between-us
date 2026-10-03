import React, { useEffect, useRef, useState } from "react";
import { useMusicPlayer } from "./MusicContent.jsx";
import { LYRIC_FX_MAX_ITEMS, LYRIC_FX_TTL_MS, pickLyricSpot } from "./lyricFx.js";

export function DesktopLyricOverlay() {
  const { lyricLines, activeLyricIndex, activeSong, isPlaying, lyricFxArmed, lyricFxSongId } = useMusicPlayer();
  const [items, setItems] = useState([]);
  const lastKeyRef = useRef(null);
  const idRef = useRef(0);

  const fxActive = lyricFxArmed && activeSong && lyricFxSongId === activeSong.id && isPlaying;

  useEffect(() => {
    setItems([]);
    lastKeyRef.current = null;
  }, [activeSong?.id, lyricFxArmed]);

  useEffect(() => {
    if (!fxActive || activeLyricIndex < 0) return;
    const line = lyricLines[activeLyricIndex];
    if (!line) return;
    const key = activeSong.id + ":" + activeLyricIndex;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    const spot = pickLyricSpot();
    const id = ++idRef.current;
    setItems((prev) => [...prev.slice(-(LYRIC_FX_MAX_ITEMS - 1)), { id, text: line.text, x: spot.x, y: spot.y, seed: (activeLyricIndex * 37) % 100 }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, LYRIC_FX_TTL_MS);
  }, [fxActive, activeLyricIndex, activeSong?.id]);

  if (!items.length) return null;

  return (
    <div className="lyric-fx" aria-hidden="true">
      {items.map((item) => (
        <div key={item.id} className="lyric-fx-line" style={{ left: item.x + "%", top: item.y + "%", "--fx-seed": item.seed }}>
          <span className="lyric-fx-text">{item.text}</span>
        </div>
      ))}
    </div>
  );
}
